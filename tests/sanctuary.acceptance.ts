import assert from 'node:assert/strict';
import { PieceIdSchema } from '@variant-chess/shared-types';
import type {
  PlayerSide,
  PieceInput,
  PieceType,
  RootCommand,
  TrustedInput,
  DomainEvent,
} from '@variant-chess/shared-types';
import {
  createGame,
  createBoard,
  coordinateFromAlgebraic,
  resolveCommand,
  cloneSnapshot,
  encodeSnapshot,
  decodeSnapshot,
  decodeEffectRecords,
  querySanctuaryRegions,
  effectAllowsAction,
  queryCaptureThreats,
  fullStateHash,
  repetitionKey,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import { createSanctuaryExperimentalRuleset } from '@variant-chess/game-variants';

/** Public package APIs only. TRUSTED_TEST_ONLY seven-piece board; AP is always earned from AP0. */
export function runSanctuaryAcceptance(sourcePlayer: PlayerSide, matchId: string) {
  const opponent = sourcePlayer === 'white' ? 'black' : 'white';
  const rules = createSanctuaryExperimentalRuleset({
    white: sourcePlayer === 'white',
    black: sourcePlayer === 'black',
  });
  const id = (role: string) => PieceIdSchema.parse(`${matchId}.${role}`);
  const cell = (file: string, whiteRank: number) =>
    coordinateFromAlgebraic(`${file}${sourcePlayer === 'white' ? whiteRank : 16 - whiteRank}`);
  const piece = (
    role: string,
    side: PlayerSide,
    type: PieceType,
    file: string,
    rank: number,
  ): PieceInput => ({
    id: id(role),
    originalSide: side,
    owner: side,
    controller: side,
    origin: 'ordinary-original',
    baseType: type,
    currentType: type,
    position: cell(file, rank),
  });
  const initial = createGame(
    {
      matchId,
      seed: 23,
      board: createBoard([
        piece('funding', sourcePlayer, 'rook', 'A', 1),
        piece('fund', opponent, 'queen', 'A', 4),
        piece('victim', sourcePlayer, 'pawn', 'H', 8),
        piece('threat-target', sourcePlayer, 'pawn', 'I', 8),
        piece('attacker', opponent, 'rook', 'H', 10),
        piece('source-king', sourcePlayer, 'king', 'H', 1),
        piece('opponent-king', opponent, 'king', 'O', 15),
      ]),
    },
    rules,
  );
  assert.deepEqual(initial.ap, { white: 0, black: 0 });
  let state = initial,
    restored = cloneSnapshot(initial, rules);
  const inputs: TrustedInput[] = [],
    events: DomainEvent[] = [];
  function commit(command: RootCommand) {
    const input: TrustedInput = {
      authority: { kind: 'player', side: state.turn.sideToAct },
      command,
    };
    const result = resolveCommand(state, input, rules);
    const independent = resolveCommand(restored, input, rules);
    assert.deepEqual(independent, result);
    if (!result.ok) throw Error(result.code);
    if (!independent.ok) throw Error(independent.code);
    state = result.state;
    restored = independent.state;
    assert.notEqual(state, restored);
    inputs.push(input);
    events.push(...result.events);
    return result;
  }
  function finish() {
    const side = state.turn.sideToAct;
    if (!state.turn.mainMoveUsed) {
      const ownKing =
        state.board.pieces[id(side === sourcePlayer ? 'source-king' : 'opponent-king')]!;
      commit({
        kind: 'move',
        pieceId: ownKing.id,
        to: { ...ownKing.position, file: ownKing.position.file + (side === sourcePlayer ? 1 : -1) },
      });
    }
    if (state.turn.sideToAct === side) commit({ kind: 'end' });
  }
  if (sourcePlayer === 'black') finish();
  commit({ kind: 'move', pieceId: id('funding'), to: cell('A', 4) });
  assert.equal(state.ap[sourcePlayer], 5);
  assert.equal(state.ap[opponent], 4);
  finish();
  finish();
  const cast = commit({
    kind: 'skill',
    skillId: 'guardian.sanctuary',
    intent: { kind: 'cell-target-v1', cell: cell('H', 8) },
  });
  assert.equal(state.ap[sourcePlayer], 0);
  assert.equal(state.turn.mainMoveUsed, false);
  const region = querySanctuaryRegions(state)[0]!;
  assert.deepEqual(region.source, {
    sourcePlayer,
    sourceVariant: 'guardian',
    sourceSkill: 'guardian.sanctuary',
    sourcePiece: null,
    sourceIncarnation: null,
  });
  assert.equal(region.deadline.ordinal - region.anchor.ordinal, 3);
  assert.equal(cast.events.filter((e) => e.kind === 'sanctuary_created').length, 1);
  const beforeInvalid = encodeSnapshot(state, rules.effectRegistry);
  assert.deepEqual(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: sourcePlayer }, command: { kind: 'end' } },
      rules,
    ),
    { ok: false, code: 'MAIN_MOVE_REQUIRED', events: [] },
  );
  assert.equal(encodeSnapshot(state, rules.effectRegistry), beforeInvalid);
  restored = decodeSnapshot(beforeInvalid, rules);
  finish();
  const capture = commit({ kind: 'move', pieceId: id('attacker'), to: cell('H', 8) });
  const stun = decodeEffectRecords(state.effects, rules.effectRegistry!, state)[0]!;
  assert.equal(stun.definitionId, 'effect.stun');
  assert.deepEqual(stun.target, { kind: 'piece', pieceId: id('attacker') });
  assert.deepEqual(stun.payload, {});
  assert.equal(stun.sourcePlayer, sourcePlayer);
  assert.equal(stun.sourceVariant, 'guardian');
  assert.equal(stun.sourceSkill, 'guardian.sanctuary');
  assert.equal(stun.sourcePiece, null);
  assert.equal(stun.sourceIncarnation, null);
  assert.equal(stun.deadline!.ordinal - stun.timingAnchor.ordinal, 1);
  assert.equal(stun.deadline!.side, sourcePlayer);
  assert.equal(capture.events.filter((e) => e.kind === 'sanctuary_reacted').length, 1);
  assert.equal(effectAllowsAction(state, id('attacker'), 'main-action', rules), false);
  assert.equal(effectAllowsAction(state, id('attacker'), 'capture-threat', rules), false);
  assert(!queryCaptureThreats(state, opponent, rules).some((m) => m.pieceId === id('attacker')));
  assert.equal(state.ap[sourcePlayer], 1); // Pawn owner loss reward only
  assert.equal(state.ap[opponent], 6); // Queen loss4 + ordinary Pawn capture2
  finish(); // opponent end cannot tick source-relative Stun
  assert.equal(state.effects.length, 1);
  finish(); // next source end expires Stun, region still active independently
  assert.equal(state.effects.length, 0);
  assert.equal(querySanctuaryRegions(state).length, 1);
  assert(
    queryCaptureThreats(state, opponent, rules).some(
      (m) => m.pieceId === id('attacker') && m.targetId === id('threat-target'),
    ),
  );
  for (let remaining = 0; querySanctuaryRegions(state).length; remaining++) {
    assert(remaining < 6);
    finish();
  }
  assert.equal(state.effects.length, 0);
  assert.equal(events.filter((e) => e.kind === 'sanctuary_reacted').length, 1);
  assert.equal(
    events.filter((e) => e.kind === 'sanctuary_removed' && e.payload.reason === 'expired').length,
    1,
  );
  const recorded = recordReplay(initial, inputs, rules);
  if (!recorded.ok) throw Error(recorded.code);
  assert.deepEqual(recorded.state, state);
  const replay = executeReplay(recorded.archive, rules);
  if (!replay.ok) throw Error(replay.code);
  assert.deepEqual(replay.events, events);
  assert.deepEqual(replay.state, state);
  assert.deepEqual(
    fullStateHash(replay.state, rules.effectRegistry),
    fullStateHash(state, rules.effectRegistry),
  );
  return {
    sourcePlayer,
    earnedAP: 5,
    cost: 5,
    regionRounds: 3,
    stunRounds: 1,
    finalRegions: querySanctuaryRegions(state).length,
    finalEffects: state.effects.length,
    fullHash: fullStateHash(state, rules.effectRegistry).digest,
    repetitionKey: repetitionKey(state, rules.repetition),
  };
}
