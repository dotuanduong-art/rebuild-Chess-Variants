import assert from 'node:assert/strict';
import { PieceIdSchema } from '@variant-chess/shared-types';
import type {
  DomainEvent,
  GameState,
  PieceInput,
  PieceType,
  PlayerSide,
  RootCommand,
  TrustedInput,
} from '@variant-chess/shared-types';
import {
  createGame,
  createBoard,
  coordinateFromAlgebraic,
  resolveCommand,
  decodeEffectRecords,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import { createLiveChargeExperimentalRuleset } from '@variant-chess/game-variants';

/** Developer-facing acceptance: package exports only; no synthetic skill or effect injection. */
export function runLiveChargeAcceptance(player: PlayerSide, matchId: string, allocationNoise = 0) {
  const opponent = player === 'white' ? 'black' : 'white';
  const rules = createLiveChargeExperimentalRuleset({
    white: player === 'white',
    black: player === 'black',
  });
  const id = (role: string) => PieceIdSchema.parse(`${matchId}.${role}`);
  const square = (file: string, rank: number) =>
    coordinateFromAlgebraic(`${file}${player === 'white' ? rank : 16 - rank}`);
  const unit = (
    role: string,
    side: PlayerSide,
    type: PieceType,
    file: string,
    rank: number,
  ): PieceInput => ({
    id: id(role),
    baseType: type,
    currentType: type,
    originalSide: side,
    owner: side,
    controller: side,
    origin: 'ordinary-original',
    position: square(file, rank),
  });
  // TRUSTED_TEST_ONLY: reduced seven-piece board, not the standard 60-piece layout.
  // Optional allocation noise is solely an equivalence-test fixture. AP starts0, earned by real capture.
  const created = createGame(
    {
      matchId,
      seed: 19,
      board: createBoard([
        unit('bearer', player, 'rook', 'D', 1),
        unit('funding-knight', opponent, 'knight', 'D', 3),
        unit('attacker', opponent, 'rook', 'D', 7),
        unit('ally', player, 'knight', 'C', 4),
        unit('enemy', opponent, 'bishop', 'E', 5),
        unit('king', player, 'king', 'H', 1),
        unit('opponent-king', opponent, 'king', 'B', 5),
      ]),
    },
    rules,
  );
  const initial: GameState = allocationNoise
    ? { ...created, counters: { ...created.counters, operation: allocationNoise } }
    : created;
  assert.deepEqual(initial.ap, { white: 0, black: 0 });
  assert.deepEqual(initial.effects, []);
  assert.deepEqual(Object.keys(rules.skills!), ['dynamite.live_charge']);
  assert.deepEqual(
    rules.effectRegistry!.definitions.map((d) => d.typeId),
    ['effect.bomb.charge'],
  );
  assert.equal(initial.playerProfiles[player]?.id, 'dynamite.live-charge-only.experimental');
  assert.equal(initial.playerProfiles[opponent], null);
  let state = initial;
  let restored: GameState | undefined;
  const inputs: TrustedInput[] = [];
  const events: DomainEvent[] = [];
  const submit = (command: RootCommand) => {
    const input: TrustedInput = {
      authority: { kind: 'player', side: state.turn.sideToAct },
      command,
    };
    const result = resolveCommand(state, input, rules);
    if (!result.ok) assert.fail(result.code);
    if (restored) {
      assert.notStrictEqual(
        restored,
        state,
        'restored branch must remain independent across every command',
      );
      const continuation = resolveCommand(restored, input, rules);
      assert.deepEqual(continuation, result);
      restored = continuation.state;
    }
    inputs.push(input);
    events.push(...result.events);
    state = result.state;
    return result;
  };
  const reject = (command: unknown, code: string) => {
    const before = encodeSnapshot(state, rules.effectRegistry);
    assert.deepEqual(
      resolveCommand(
        state,
        { authority: { kind: 'player', side: state.turn.sideToAct }, command },
        rules,
      ),
      { ok: false, code, events: [] },
    );
    assert.equal(encodeSnapshot(state, rules.effectRegistry), before);
  };
  const cast: RootCommand = {
    kind: 'skill',
    skillId: 'dynamite.live_charge',
    intent: { kind: 'piece-target-v1', pieceId: id('bearer') },
  };
  if (player === 'black') {
    submit({ kind: 'move', pieceId: id('attacker'), to: square('D', 8) });
    submit({ kind: 'end' });
  }
  submit({ kind: 'move', pieceId: id('bearer'), to: square('D', 3) });
  assert.equal(state.ap[player], 3, 'approved Knight capture reward, no AP grant/passive');
  assert.equal(state.ap[opponent], 2, 'Knight loss AP to its owner');
  submit({ kind: 'end' });
  reject(
    { ...cast, intent: { kind: 'piece-target-v1', pieceId: id('attacker') } },
    'UNAUTHORIZED_VARIANT',
  );
  submit({ kind: 'move', pieceId: id('opponent-king'), to: square('C', 5) });
  submit({ kind: 'end' });
  reject(
    { ...cast, intent: { kind: 'piece-target-v1', pieceId: [id('bearer')] } },
    'INVALID_COMMAND',
  );
  for (const skillId of [
    'dynamite.landmine',
    'dynamite.detonation',
    'guardian.holy_shield',
    'guardian.sanctuary',
  ])
    reject({ ...cast, skillId }, 'NOT_AVAILABLE');
  const beforeTurn = state.turn;
  const result = submit(cast);
  assert.equal(state.ap[player], 0);
  assert.equal(state.ap[opponent], 2);
  assert.deepEqual(state.turn, { ...beforeTurn, skillUsed: true });
  assert.deepEqual(
    result.events.map((e) => e.kind),
    ['skill_used', 'ap_changed', 'effect_applied'],
  );
  assert.deepEqual(result.events[0]!.payload, {
    actor: player,
    skillId: 'dynamite.live_charge',
    actualCost: 3,
  });
  const attached = decodeEffectRecords(state.effects, rules.effectRegistry!, state);
  assert.equal(attached.length, 1);
  assert.deepEqual(
    {
      id: attached[0]!.definitionId,
      target: attached[0]!.target,
      source: [
        attached[0]!.sourcePlayer,
        attached[0]!.sourceVariant,
        attached[0]!.sourceSkill,
        attached[0]!.sourcePiece,
        attached[0]!.sourceIncarnation,
      ],
      lifetime: attached[0]!.lifetime,
      deadline: attached[0]!.deadline,
      duration: attached[0]!.duration ?? null,
      payload: attached[0]!.payload,
      group: attached[0]!.groupId,
    },
    {
      id: 'effect.bomb.charge',
      target: { kind: 'piece', pieceId: id('bearer') },
      source: [player, 'dynamite', 'dynamite.live_charge', null, null],
      lifetime: { kind: 'permanent' },
      deadline: null,
      duration: null,
      payload: {},
      group: null,
    },
  );
  const encoded = encodeSnapshot(state, rules.effectRegistry);
  restored = decodeSnapshot(encoded, rules);
  assert.equal(encodeSnapshot(cloneSnapshot(state, rules), rules.effectRegistry), encoded);
  submit({ kind: 'move', pieceId: id('bearer'), to: square('D', 4) }); // Both slots used: auto-end.
  assert.equal(state.turn.sideToAct, opponent);
  const semanticKey = Object.keys(state.history.repetition).find(
    (key) => JSON.parse(key).effects.length === 1,
  )!;
  assert.ok(semanticKey);
  const exploded = submit({ kind: 'move', pieceId: id('attacker'), to: square('D', 4) });
  const explosion = exploded.events.filter((e) => e.kind === 'bomb_exploded');
  assert.equal(explosion.length, 1);
  assert.deepEqual(explosion[0]!.payload.center, square('D', 4));
  assert.deepEqual(explosion[0]!.payload.source, {
    sourcePlayer: player,
    sourceVariant: 'dynamite',
    sourceSkill: 'dynamite.live_charge',
    sourcePiece: null,
    sourceIncarnation: null,
  });
  assert.deepEqual(
    [...explosion[0]!.payload.targets].sort(),
    [id('ally'), id('attacker'), id('enemy')].sort(),
  );
  assert.deepEqual(
    Object.keys(state.board.pieces).sort(),
    [id('king'), id('opponent-king')].sort(),
  );
  assert.deepEqual(
    state.ap,
    player === 'white' ? { white: 5, black: 11 } : { white: 11, black: 5 },
  );
  assert.deepEqual(state.effects, []);
  assert.equal(state.terminal.status, 'ongoing');
  assert.deepEqual(state, restored, 'exact restored continuation through source-bearing blast');
  assert.equal(
    encodeSnapshot(
      decodeSnapshot(encodeSnapshot(state, rules.effectRegistry), rules),
      rules.effectRegistry,
    ),
    encodeSnapshot(state, rules.effectRegistry),
  );
  const recorded = recordReplay(initial, inputs, rules);
  if (!recorded.ok) assert.fail(recorded.code);
  const replayed = executeReplay(recorded.archive, rules);
  if (!replayed.ok) assert.fail(replayed.code);
  assert.deepEqual(replayed.state, state);
  assert.deepEqual(replayed.events, events);
  assert.deepEqual(
    fullStateHash(replayed.state, rules.effectRegistry),
    fullStateHash(state, rules.effectRegistry),
  );
  return {
    ap: state.ap,
    semanticKey,
    finalHash: fullStateHash(state, rules.effectRegistry),
    explosionCount: explosion.length,
    commandCount: inputs.length,
  };
}
