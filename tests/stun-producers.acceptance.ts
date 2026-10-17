import assert from 'node:assert/strict';
import { PieceIdSchema } from '@variant-chess/shared-types';
import type {
  GameState,
  PlayerSide,
  PieceInput,
  PieceType,
  RootCommand,
  TrustedInput,
  DomainEvent,
} from '@variant-chess/shared-types';
import {
  createBoard,
  createGame,
  resolveCommand,
  coordinateFromAlgebraic,
  generateBaseMoves,
  queryCaptureThreats,
  queryLegalMainActions,
  decodeEffectRecords,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  fullStateHash,
  repetitionKey,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import {
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
} from '@variant-chess/game-variants';

/** Public package API acceptance. Trusted reduced board only; AP starts0 and all funding is committed capture. */
function runAcceptance(kind: 'chains' | 'seal', sourcePlayer: PlayerSide, matchId: string) {
  const chains = kind === 'chains';
  const cost = chains ? 5 : 6;
  const variant = chains ? 'nephalem' : 'angel';
  const skill = chains ? 'nephalem.judgment_chains' : 'angel.holy_seal';
  const producer = chains ? 'nephalem.judgment-chains' : 'angel.holy-seal';
  const factory = chains
    ? createJudgmentChainsExperimentalRuleset
    : createHolySealExperimentalRuleset;
  const rules = factory({ white: sourcePlayer === 'white', black: sourcePlayer === 'black' });
  const opponent = sourcePlayer === 'white' ? 'black' : 'white';
  const id = (role: string) => PieceIdSchema.parse(`${matchId}.${role}`);
  const square = (file: string, rank: number) =>
    coordinateFromAlgebraic(`${file}${sourcePlayer === 'white' ? rank : 16 - rank}`);
  const ordinary = (
    role: string,
    owner: PlayerSide,
    file: string,
    rank: number,
    type: PieceType,
  ): PieceInput => ({
    id: id(role),
    originalSide: owner,
    owner,
    controller: owner,
    baseType: type,
    currentType: type,
    origin: 'ordinary-original',
    position: square(file, rank),
  });
  // TRUSTED_TEST_ONLY: six/seven ordinary units, not the official60-piece starting layout.
  // Chains earns5 from Queen; Seal earns3+3 from two Knights. No invented rewards/AP setup.
  const initial = createGame(
    {
      matchId,
      seed: 19,
      board: createBoard([
        ordinary('funding-rook', sourcePlayer, 'A', 1, 'rook'),
        ordinary('funding-one', opponent, 'A', 4, chains ? 'queen' : 'knight'),
        ...(chains ? [] : [ordinary('funding-two', opponent, 'A', 6, 'knight')]),
        ordinary('bearer', opponent, 'O', 15, 'rook'),
        ordinary('bait', sourcePlayer, 'O', 12, 'pawn'),
        ordinary('source-king', sourcePlayer, 'H', 1, 'king'),
        ordinary('opponent-king', opponent, 'H', 15, 'king'),
      ]),
    },
    rules,
  );
  assert.deepEqual(initial.ap, { white: 0, black: 0 });
  assert.deepEqual(initial.effects, []);
  assert.deepEqual(Object.keys(rules.skills!), [skill]);
  assert.equal(initial.playerProfiles[opponent], null);
  assert.deepEqual(
    rules.effectRegistry!.definitions.map((d) => d.typeId),
    ['effect.stun'],
  );
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
      assert.notStrictEqual(restored, state, 'restore branch stays independently allocated');
      const continuation = resolveCommand(restored, input, rules);
      assert.deepEqual(
        continuation,
        result,
        'every restored step preserves exact events/hash/state',
      );
      restored = continuation.state;
    }
    inputs.push(input);
    events.push(...result.events);
    state = result.state;
    return result;
  };
  const reject = (command: RootCommand, code: string) => {
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
  const waitTurn = () => {
    const acting = state.turn.sideToAct;
    if (!state.turn.mainMoveUsed) {
      const king =
        state.board.pieces[id(acting === sourcePlayer ? 'source-king' : 'opponent-king')]!;
      submit({
        kind: 'move',
        pieceId: king.id,
        to: { file: king.position.file + 1, rankIndex: king.position.rankIndex },
      });
    }
    if (state.turn.sideToAct === acting) submit({ kind: 'end' });
    assert.notEqual(state.turn.sideToAct, acting);
  };
  if (sourcePlayer === 'black') waitTurn();
  submit({ kind: 'move', pieceId: id('funding-rook'), to: square('A', 4) });
  assert.equal(state.ap[sourcePlayer], chains ? 5 : 3);
  assert.equal(state.ap[opponent], chains ? 4 : 2);
  waitTurn();
  waitTurn();
  if (!chains) {
    submit({ kind: 'move', pieceId: id('funding-rook'), to: square('A', 6) });
    assert.equal(state.ap[sourcePlayer], 6);
    assert.equal(state.ap[opponent], 4);
    waitTurn();
    waitTurn();
  }
  const earnedAP = state.ap[sourcePlayer];
  assert.equal(earnedAP, cost);
  const castOrdinal = chains ? 2 : 3;
  assert.ok(
    queryCaptureThreats(state, opponent, rules).some(
      (m) => m.pieceId === id('bearer') && m.targetId === id('bait'),
    ),
  );
  const cast = submit({
    kind: 'skill',
    skillId: skill,
    intent: { kind: 'piece-target-v1', pieceId: id('bearer') },
  });
  assert.equal(state.ap[sourcePlayer], 0);
  assert.deepEqual(state.turn, {
    sideToAct: sourcePlayer,
    plyIndex: (castOrdinal - 1) * 2 + Number(sourcePlayer === 'black'),
    roundIndex: castOrdinal,
    mainMoveUsed: false,
    skillUsed: true,
  });
  assert.deepEqual(
    cast.events.map((e) => e.kind),
    ['skill_used', 'ap_changed', 'effect_applied'],
  );
  assert.deepEqual(cast.events[0]!.payload, {
    actor: sourcePlayer,
    skillId: skill,
    actualCost: cost,
  });
  const attached = decodeEffectRecords(state.effects, rules.effectRegistry!, state);
  assert.equal(attached.length, 1);
  const effect = attached[0]!;
  assert.deepEqual(
    {
      definition: effect.definitionId,
      source: [
        effect.sourcePlayer,
        effect.sourceVariant,
        effect.sourceSkill,
        effect.sourcePiece,
        effect.sourceIncarnation,
      ],
      target: effect.target,
      lifetime: effect.lifetime,
      duration: effect.duration,
      anchor: effect.timingAnchor,
      deadline: effect.deadline,
      payload: effect.payload,
    },
    {
      definition: 'effect.stun',
      source: [sourcePlayer, variant, skill, null, null],
      target: { kind: 'piece', pieceId: id('bearer') },
      lifetime: { kind: 'rounds', rounds: 3, boundary: 'end' },
      duration: {
        schemaVersion: '1.0.0',
        producerId: producer,
        producerVersion: '1.0.0',
        rounds: 3,
      },
      anchor: { side: sourcePlayer, boundary: 'end', ordinal: castOrdinal },
      deadline: { side: sourcePlayer, boundary: 'end', ordinal: castOrdinal + 3 },
      payload: {},
    },
  );
  const snapshot = encodeSnapshot(state, rules.effectRegistry);
  restored = decodeSnapshot(snapshot, rules);
  assert.equal(
    fullStateHash(restored, rules.effectRegistry).digest,
    fullStateHash(state, rules.effectRegistry).digest,
  );
  assert.equal(encodeSnapshot(cloneSnapshot(state, rules), rules.effectRegistry), snapshot);
  waitTurn(); // cast boundary must preserve all N3 metadata
  assert.deepEqual(decodeEffectRecords(state.effects, rules.effectRegistry!, state), attached);
  const semanticKey = Object.keys(state.history.repetition).find(
    (k) => JSON.parse(k).effects.length === 1,
  )!;
  assert.ok(semanticKey);
  assert.deepEqual(JSON.parse(semanticKey).effects[0].data, {
    target: { kind: 'piece', position: square('O', 15) },
    remaining: { side: sourcePlayer, boundary: 'end', remaining: 3 },
    source: { player: sourcePlayer, variant, skill, piece: null, incarnation: null },
  });
  const move: RootCommand = { kind: 'move', pieceId: id('bearer'), to: square('O', 14) };
  const capture: RootCommand = { kind: 'move', pieceId: id('bearer'), to: square('O', 12) };
  assert.ok(
    generateBaseMoves(state.board, id('bearer')).some(
      (m) => m.kind === 'capture' && m.targetId === id('bait'),
    ),
  );
  reject(move, 'INVALID_MOVE');
  reject(capture, 'INVALID_MOVE');
  assert.ok(queryLegalMainActions(state, rules).every((m) => m.pieceId !== id('bearer')));
  assert.ok(queryCaptureThreats(state, opponent, rules).every((m) => m.pieceId !== id('bearer')));
  for (let sourceEnds = 1; sourceEnds <= 3; sourceEnds++) {
    waitTurn(); // opponent never owns this source clock
    assert.equal(state.effects.length, 1);
    waitTurn(); // source end+1, end+2, then end+3
    assert.equal(state.effects.length, sourceEnds === 3 ? 0 : 1);
  }
  assert.ok(queryLegalMainActions(state, rules).some((m) => m.pieceId === id('bearer')));
  assert.ok(
    queryCaptureThreats(state, opponent, rules).some(
      (m) => m.pieceId === id('bearer') && m.targetId === id('bait'),
    ),
  );
  submit(move);
  assert.deepEqual(state.board.pieces[id('bearer')]!.position, square('O', 14));
  assert.deepEqual(
    events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
    ['expired'],
  );
  const replay = recordReplay(initial, inputs, rules);
  if (!replay.ok) assert.fail(replay.code);
  const executed = executeReplay(replay.archive, rules);
  if (!executed.ok) assert.fail(executed.code);
  assert.deepEqual(executed.events, events);
  assert.deepEqual(executed.state, state);
  assert.deepEqual(restored, state);
  assert.notStrictEqual(restored, state);
  const finalHash = fullStateHash(state, rules.effectRegistry).digest;
  const restoredHash = fullStateHash(restored!, rules.effectRegistry).digest;
  assert.equal(restoredHash, finalHash);
  assert.equal(fullStateHash(executed.state, rules.effectRegistry).digest, finalHash);
  assert.equal(repetitionKey(restored!), repetitionKey(state));
  assert.equal(repetitionKey(executed.state), repetitionKey(state));
  return {
    sourcePlayer,
    earnedAP,
    castCost: cost,
    remainingAP: state.ap[sourcePlayer],
    semanticKey,
    finalHash,
    restoredHash,
    commandCount: inputs.length,
    expiryOrdinal: castOrdinal + 3,
  };
}

export const runJudgmentChainsAcceptance = (sourcePlayer: PlayerSide, matchId: string) =>
  runAcceptance('chains', sourcePlayer, matchId);
export const runHolySealAcceptance = (sourcePlayer: PlayerSide, matchId: string) =>
  runAcceptance('seal', sourcePlayer, matchId);
