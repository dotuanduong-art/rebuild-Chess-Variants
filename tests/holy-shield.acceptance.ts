import assert from 'node:assert/strict';
import { PieceIdSchema } from '@variant-chess/shared-types';
import type {
  DomainEvent,
  GameState,
  PieceInput,
  PlayerSide,
  RootCommand,
  TrustedInput,
} from '@variant-chess/shared-types';
import {
  createBoard,
  createGame,
  resolveCommand,
  coordinateFromAlgebraic,
  generateBaseMoves,
  decodeEffectRecords,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import { createHolyShieldExperimentalRuleset } from '@variant-chess/game-variants';

/** Developer acceptance scenario. Only setup is test-only; every subsequent action is a real root command. */
export function runHolyShieldAcceptance(sourcePlayer: PlayerSide, matchId: string) {
  const opponent = sourcePlayer === 'white' ? 'black' : 'white';
  const rules = createHolyShieldExperimentalRuleset({
    white: sourcePlayer === 'white',
    black: sourcePlayer === 'black',
  });
  const id = (role: string) => PieceIdSchema.parse(`${matchId}.${role}`);
  const square = (file: string, whiteRank: number) =>
    coordinateFromAlgebraic(`${file}${sourcePlayer === 'white' ? whiteRank : 16 - whiteRank}`);
  const ordinary = (
    role: string,
    owner: PlayerSide,
    file: string,
    whiteRank: number,
    type: 'rook' | 'king',
  ): PieceInput => ({
    id: id(role),
    originalSide: owner,
    owner,
    controller: owner,
    baseType: type,
    currentType: type,
    origin: 'ordinary-original',
    position: square(file, whiteRank),
  });
  // TRUSTED_TEST_ONLY: reduced five-piece initial board, not the official 60-piece starting layout.
  // AP is NOT seeded: createGame uses the approved AP=0 baseline; funding comes from a committed Rook capture.
  const initial = createGame(
    {
      matchId,
      seed: 19,
      board: createBoard([
        ordinary('bearer', sourcePlayer, 'A', 1, 'rook'),
        ordinary('funding-rook', opponent, 'A', 4, 'rook'),
        ordinary('attacker', opponent, 'A', 7, 'rook'),
        ordinary('source-king', sourcePlayer, 'H', 1, 'king'),
        ordinary('opponent-king', opponent, 'H', 15, 'king'),
      ]),
    },
    rules,
  );
  assert.deepEqual(initial.ap, { white: 0, black: 0 });
  assert.deepEqual(Object.keys(rules.skills!), ['guardian.holy_shield']);
  assert.deepEqual(
    rules.effectRegistry!.definitions.map((d) => d.typeId),
    ['effect.shield'],
  );
  assert.equal(initial.playerProfiles[opponent], null);
  assert.equal(initial.playerProfiles[sourcePlayer]?.id, 'guardian.holy-shield-only.experimental');

  let state = initial;
  let restored: GameState | undefined;
  const inputs: TrustedInput[] = [];
  const committedEvents: DomainEvent[] = [];
  const submit = (command: RootCommand) => {
    const input: TrustedInput = {
      authority: { kind: 'player', side: state.turn.sideToAct },
      command,
    };
    const result = resolveCommand(state, input, rules);
    if (!result.ok) assert.fail(result.code);
    if (restored) {
      const continuation = resolveCommand(restored, input, rules);
      assert.deepEqual(
        continuation,
        result,
        'restored continuation must preserve exact events and state',
      );
      restored = continuation.state;
    }
    inputs.push(input);
    committedEvents.push(...result.events);
    state = result.state;
    return result;
  };
  const reject = (raw: unknown, code: string) => {
    const before = encodeSnapshot(state, rules.effectRegistry);
    const rejected = resolveCommand(state, raw, rules);
    assert.deepEqual(rejected, { ok: false, code, events: [] });
    assert.equal(
      encodeSnapshot(state, rules.effectRegistry),
      before,
      'rollback includes AP/slots/effects/RNG/IDs/history',
    );
  };
  const waitTurn = () => {
    const acting = state.turn.sideToAct;
    const king = state.board.pieces[id(acting === sourcePlayer ? 'source-king' : 'opponent-king')]!;
    submit({
      kind: 'move',
      pieceId: king.id,
      to: { file: king.position.file + 1, rankIndex: king.position.rankIndex },
    });
    if (state.turn.sideToAct === acting) submit({ kind: 'end' });
    assert.notEqual(state.turn.sideToAct, acting);
  };
  const shield = () => decodeEffectRecords(state.effects, rules.effectRegistry!, state);
  const skill = (target = id('bearer')): RootCommand => ({
    kind: 'skill',
    skillId: 'guardian.holy_shield',
    intent: { kind: 'piece-target-v1', pieceId: target },
  });

  if (sourcePlayer === 'black') waitTurn(); // White first, legal move plus voluntary End.
  submit({ kind: 'move', pieceId: id('bearer'), to: square('A', 4) });
  assert.equal(state.ap[sourcePlayer], 4, 'approved Rook capture reward, no grant or passive');
  assert.equal(state.ap[opponent], 3, 'approved Rook loss reward to its owner');
  assert.equal(state.board.pieces[id('funding-rook')], undefined);
  submit({ kind: 'end' }); // Keep the earned AP for the next source turn.
  waitTurn();
  assert.equal(state.turn.sideToAct, sourcePlayer);
  const funded = state;
  const playerInput = (command: unknown) => ({
    authority: { kind: 'player', side: sourcePlayer },
    command,
  });
  reject(
    playerInput({
      kind: 'skill',
      skillId: 'guardian.holy_shield',
      intent: { kind: 'piece-target-v1', pieceId: [id('bearer')] },
    }),
    'INVALID_COMMAND',
  );
  for (const skillId of [
    'guardian.holy_aura',
    'guardian.sanctuary',
    'guardian.divine_shield',
    'dynamite.live_charge',
    'dynamite.landmine',
  ])
    reject(playerInput({ kind: 'skill', skillId }), 'NOT_AVAILABLE');

  const cast = submit(skill());
  assert.deepEqual(
    state.ap,
    sourcePlayer === 'white' ? { white: 0, black: 3 } : { white: 3, black: 0 },
  );
  assert.deepEqual(state.turn, {
    sideToAct: sourcePlayer,
    plyIndex: sourcePlayer === 'white' ? 2 : 3,
    roundIndex: 2,
    mainMoveUsed: false,
    skillUsed: true,
  });
  assert.deepEqual(
    cast.events.map((e) => e.kind),
    ['skill_used', 'ap_changed', 'effect_applied'],
  );
  assert.deepEqual(cast.events[0]!.payload, {
    actor: sourcePlayer,
    skillId: 'guardian.holy_shield',
    actualCost: 4,
  });
  const attached = shield()[0]!;
  assert.equal(shield().length, 1);
  assert.deepEqual(
    {
      definition: attached.definitionId,
      source: [
        attached.sourcePlayer,
        attached.sourceVariant,
        attached.sourceSkill,
        attached.sourcePiece,
        attached.sourceIncarnation,
      ],
      target: attached.target,
      lifetime: attached.lifetime,
      anchor: attached.timingAnchor,
      deadline: attached.deadline,
      payload: attached.payload,
      group: attached.groupId,
    },
    {
      definition: 'effect.shield',
      source: [sourcePlayer, 'guardian', 'guardian.holy_shield', null, null],
      target: { kind: 'piece', pieceId: id('bearer') },
      lifetime: { kind: 'rounds', rounds: 2, boundary: 'end' },
      anchor: { side: sourcePlayer, boundary: 'end', ordinal: 2 },
      deadline: { side: sourcePlayer, boundary: 'end', ordinal: 4 },
      payload: {},
      group: null,
    },
  );

  const snapshot = encodeSnapshot(state, rules.effectRegistry);
  restored = decodeSnapshot(snapshot, rules);
  assert.equal(encodeSnapshot(cloneSnapshot(state, rules), rules.effectRegistry), snapshot);
  waitTurn(); // Source end2: no cast-boundary tick; mandatory main move remains separate from the skill.
  assert.deepEqual(shield(), [attached]);
  const readyKey = Object.keys(state.history.repetition).find((key) => {
    const value = JSON.parse(key);
    return value.sideToAct === opponent && value.effects.length === 1;
  });
  assert.ok(readyKey, 'root must count the Shield position at ActionReady');
  assert.deepEqual(JSON.parse(readyKey).effects[0].data, {
    target: { kind: 'piece', position: square('A', 4) },
    remaining: { side: sourcePlayer, boundary: 'end', remaining: 2 },
    source: {
      player: sourcePlayer,
      variant: 'guardian',
      skill: 'guardian.holy_shield',
      piece: null,
      incarnation: null,
    },
  });
  const capture: RootCommand = { kind: 'move', pieceId: id('attacker'), to: square('A', 4) };
  assert.ok(
    generateBaseMoves(state.board, id('attacker')).some(
      (move) => move.kind === 'capture' && move.targetId === id('bearer'),
    ),
    'clear-path Rook capture has valid base geometry/occupancy',
  );
  reject(
    { authority: { kind: 'player', side: opponent }, command: skill(id('attacker')) },
    'UNAUTHORIZED_VARIANT',
  );
  reject({ authority: { kind: 'player', side: opponent }, command: capture }, 'CAPTURE_DEFENDED');
  reject({ authority: { kind: 'player', side: opponent }, command: capture }, 'CAPTURE_DEFENDED');
  for (let round = 0; round < 2; round++) {
    waitTurn(); // Opponent completes its move+End.
    assert.equal(shield().length, 1, 'opponent boundaries must not expire the source-end Shield');
    waitTurn(); // Source completes end3, then end4.
    assert.equal(shield().length, round === 0 ? 1 : 0);
  }
  assert.deepEqual(
    committedEvents
      .filter((event) => event.kind === 'effect_removed')
      .map((event) => event.payload.reason),
    ['expired'],
  );
  const captured = submit(capture);
  assert.equal(captured.events.filter((e) => e.kind === 'capture_committed').length, 1);
  assert.equal(state.board.pieces[id('bearer')], undefined);
  assert.deepEqual(
    state.ap,
    sourcePlayer === 'white' ? { white: 3, black: 7 } : { white: 7, black: 3 },
  );

  const replay = recordReplay(initial, inputs, rules);
  if (!replay.ok) assert.fail(replay.code);
  const executed = executeReplay(replay.archive, rules);
  if (!executed.ok) assert.fail(executed.code);
  assert.deepEqual(executed.events, committedEvents);
  assert.deepEqual(executed.state, state);
  const finalHash = fullStateHash(state, rules.effectRegistry).digest;
  assert.equal(fullStateHash(executed.state, rules.effectRegistry).digest, finalHash);
  assert.deepEqual(restored, state);

  return {
    sourcePlayer,
    startingAP: initial.ap,
    earnedAP: funded.ap[sourcePlayer],
    castCost: 4,
    durationRounds: 2,
    sourceEndDeadline: attached.deadline!.ordinal,
    captureRejection: 'CAPTURE_DEFENDED',
    committedOnlyReplay: true,
    readyKey,
    finalHash,
    funded,
    rules,
    kingId: id('source-king'),
    committedCommands: inputs.length,
  } as const;
}
