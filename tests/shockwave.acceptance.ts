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
  createBoard,
  createGame,
  resolveCommand,
  coordinateFromAlgebraic,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  fullStateHash,
  repetitionKey,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import {
  createShockwaveExperimentalRuleset,
  SKILL_AP_COSTS_V1,
} from '@variant-chess/game-variants';

/** Public package API acceptance. Only the reduced initial board is TRUSTED_TEST_ONLY; AP is never seeded. */
export function runShockwaveAcceptance(sourcePlayer: PlayerSide, matchId: string) {
  const opponent = sourcePlayer === 'white' ? 'black' : 'white';
  const rules = createShockwaveExperimentalRuleset({
    white: sourcePlayer === 'white',
    black: sourcePlayer === 'black',
  });
  const id = (role: string) => PieceIdSchema.parse(`${matchId}.${role}`);
  const square = (file: string, whiteRank: number) =>
    coordinateFromAlgebraic(`${file}${sourcePlayer === 'white' ? whiteRank : 16 - whiteRank}`);
  const ordinary = (
    role: string,
    controller: PlayerSide,
    file: string,
    whiteRank: number,
    type: PieceType,
  ): PieceInput => ({
    id: id(role),
    originalSide: controller,
    owner: controller,
    controller,
    origin: 'ordinary-original',
    baseType: type,
    currentType: type,
    position: square(file, whiteRank),
  });
  // TRUSTED_TEST_ONLY eight-piece board, not the official60-piece initial layout.
  const initial = createGame(
    {
      matchId,
      seed: 19,
      board: createBoard([
        ordinary('funding-rook', sourcePlayer, 'A', 1, 'rook'),
        ordinary('funding-victim', opponent, 'A', 4, 'rook'),
        ordinary('center', sourcePlayer, 'H', 8, 'rook'),
        ordinary('movable', opponent, 'I', 9, 'rook'),
        ordinary('blocked', opponent, 'G', 8, 'rook'),
        ordinary('obstacle', sourcePlayer, 'F', 8, 'pawn'),
        ordinary('source-king', sourcePlayer, 'H', 1, 'king'),
        ordinary('opponent-king', opponent, 'H', 15, 'king'),
      ]),
    },
    rules,
  );
  assert.deepEqual(initial.ap, { white: 0, black: 0 });
  assert.deepEqual(initial.effects, []);
  assert.deepEqual(Object.keys(rules.skills!), ['dragon_sentinel.shockwave']);
  assert.equal(
    initial.playerProfiles[sourcePlayer]?.id,
    'dragon-sentinel.shockwave-only.experimental',
  );
  assert.equal(initial.playerProfiles[opponent], null);
  assert.equal(SKILL_AP_COSTS_V1['dragon_sentinel.shockwave'], 4);
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
      assert.notStrictEqual(restored, state);
      const continuation = resolveCommand(restored, input, rules);
      assert.deepEqual(
        continuation,
        result,
        'independently restored branch must match every committed step/events',
      );
      restored = continuation.state;
    }
    inputs.push(input);
    events.push(...result.events);
    state = result.state;
    return result;
  };
  const waitTurn = () => {
    const actor = state.turn.sideToAct;
    if (!state.turn.mainMoveUsed) {
      const king =
        state.board.pieces[id(actor === sourcePlayer ? 'source-king' : 'opponent-king')]!;
      submit({
        kind: 'move',
        pieceId: king.id,
        to: { file: king.position.file + 1, rankIndex: king.position.rankIndex },
      });
    }
    if (state.turn.sideToAct === actor) submit({ kind: 'end' });
    assert.notEqual(state.turn.sideToAct, actor);
  };
  if (sourcePlayer === 'black') waitTurn();
  const capture = submit({ kind: 'move', pieceId: id('funding-rook'), to: square('A', 4) });
  assert.equal(capture.events.filter((e) => e.kind === 'capture_committed').length, 1);
  assert.equal(state.ap[sourcePlayer], 4, 'approved Rook capture4 is the only source funding');
  assert.equal(state.ap[opponent], 3, 'approved owner Rook loss3, no passive/reward invention');
  waitTurn();
  waitTurn();
  assert.equal(state.turn.sideToAct, sourcePlayer);
  const funded = state;
  const snapshot = encodeSnapshot(state);
  restored = decodeSnapshot(snapshot, rules);
  assert.equal(encodeSnapshot(cloneSnapshot(state, rules)), snapshot);
  assert.equal(fullStateHash(restored).digest, fullStateHash(state).digest);
  const cast = submit({
    kind: 'skill',
    skillId: 'dragon_sentinel.shockwave',
    intent: { kind: 'piece-target-v1', pieceId: id('center') },
  });
  assert.deepEqual(
    cast.events.map((e) => e.kind),
    ['skill_used', 'ap_changed', 'pieces_repositioned'],
  );
  assert.deepEqual(cast.events[0]!.payload, {
    actor: sourcePlayer,
    skillId: 'dragon_sentinel.shockwave',
    actualCost: 4,
  });
  assert.equal(state.ap[sourcePlayer], 0);
  assert.equal(state.ap[opponent], 3);
  assert.deepEqual(state.turn, { ...funded.turn, skillUsed: true, mainMoveUsed: false });
  assert.equal(state.terminal.status, 'ongoing');
  assert.deepEqual(state.effects, []);
  assert.deepEqual(state.board.pieces[id('movable')], {
    ...funded.board.pieces[id('movable')],
    position: square('J', 10),
  });
  for (const role of ['center', 'blocked', 'obstacle', 'source-king', 'opponent-king'])
    assert.deepEqual(state.board.pieces[id(role)], funded.board.pieces[id(role)]);
  assert.deepEqual(cast.events[2]!.payload, {
    centerPieceId: id('center'),
    cause: {
      kind: 'shockwave-v1',
      source: {
        sourcePlayer,
        sourceVariant: 'dragon_sentinel',
        sourceSkill: 'dragon_sentinel.shockwave',
        sourcePiece: null,
        sourceIncarnation: null,
      },
    },
    moves: [{ pieceId: id('movable'), from: square('I', 9), to: square('J', 10) }],
  });
  assert.equal(
    new Set(state.board.cells.filter(Boolean)).size,
    Object.keys(state.board.pieces).length,
  );
  const beforeRejected = encodeSnapshot(state);
  assert.deepEqual(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: sourcePlayer }, command: { kind: 'end' } },
      rules,
    ),
    { ok: false, code: 'MAIN_MOVE_REQUIRED', events: [] },
  );
  assert.equal(encodeSnapshot(state), beforeRejected);
  waitTurn(); // Mandatory ordinary move; only then does source turn finish.
  const semanticKey = repetitionKey(state);
  const recorded = recordReplay(initial, inputs, rules);
  if (!recorded.ok) assert.fail(recorded.code);
  const replay = executeReplay(recorded.archive, rules);
  if (!replay.ok) assert.fail(replay.code);
  assert.deepEqual(replay.events, events);
  assert.deepEqual(replay.state, state);
  assert.deepEqual(restored, state);
  assert.notStrictEqual(restored, state);
  const finalHash = fullStateHash(state).digest,
    restoredHash = fullStateHash(restored!).digest;
  assert.equal(restoredHash, finalHash);
  assert.equal(fullStateHash(replay.state).digest, finalHash);
  assert.equal(repetitionKey(restored!), semanticKey);
  assert.equal(repetitionKey(replay.state), semanticKey);
  assert.deepEqual(
    recorded.archive.steps.flatMap((step) => step.events),
    events,
  );
  return {
    sourcePlayer,
    earnedAP: 4,
    castCost: 4,
    displaced: 1,
    blocked: 1,
    finalAP: state.ap,
    finalHash,
    restoredHash,
    semanticKey,
    commandCount: inputs.length,
  };
}
