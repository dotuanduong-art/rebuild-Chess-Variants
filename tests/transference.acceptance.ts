import assert from 'node:assert/strict';
import type { GameState, PlayerSide, RootCommand, TrustedInput } from '@variant-chess/shared-types';
import {
  createGame,
  createBoard,
  coordinateFromAlgebraic as at,
  encodeEffectRecords,
  decodeEffectRecords,
  repetitionKey,
  cloneSnapshot,
  resolveCommand,
  recordReplay,
  executeReplay,
  fullStateHash,
  queryLegalMainActions,
  queryCaptureThreats,
} from '@variant-chess/game-core';
import type { EffectInstance } from '@variant-chess/game-core';
import { createTransferenceExperimentalRuleset } from '@variant-chess/game-variants';

/** Public APIs only. TRUSTED_TEST_ONLY reduced board/registered initial attachments, normal AP0. */
export function runTransferenceAcceptance(sourcePlayer: PlayerSide, matchId: string) {
  const opponent = sourcePlayer === 'white' ? 'black' : 'white';
  const rules = createTransferenceExperimentalRuleset({
    white: sourcePlayer === 'white',
    black: sourcePlayer === 'black',
  });
  const square = (file: string, rank: number) =>
    at(file + (sourcePlayer === 'white' ? rank : 16 - rank));
  const piece = (
    id: string,
    type: 'rook' | 'knight' | 'king',
    side: PlayerSide,
    file: string,
    rank: number,
  ) => ({
    id,
    currentType: type,
    baseType: type,
    originalSide: side,
    owner: side,
    controller: side,
    origin: 'ordinary-original' as const,
    position: square(file, rank),
  });
  const created = createGame(
    {
      matchId,
      seed: 31,
      board: createBoard([
        piece('funding', 'rook', sourcePlayer, 'A', 1),
        piece('fund', 'rook', opponent, 'A', 4),
        piece('ally', 'knight', sourcePlayer, 'H', 8),
        piece('enemy', 'rook', opponent, 'K', 8),
        piece('shield-probe', 'rook', sourcePlayer, 'K', 5),
        piece('source-king', 'king', sourcePlayer, 'H', 1),
        piece('other-king', 'king', opponent, 'O', 15),
      ]),
    },
    rules,
  );
  assert.deepEqual(created.ap, { white: 0, black: 0 });
  const seeded = { ...created, counters: { ...created.counters, operation: 2 } };
  const initialEffects: EffectInstance[] = (
    [
      ['shield', 'ally', sourcePlayer],
      ['stun', 'enemy', opponent],
    ] as const
  ).map(([kind, target, source], i) => {
    const shield = kind === 'shield',
      rounds = shield ? 2 : 3,
      ordinal = source === 'white' ? 1 : 0;
    return {
      id: `${matchId}:operation:${i + 1}`,
      definitionId: `effect.${kind}`,
      definitionVersion: '1.0.0',
      target: { kind: 'piece', pieceId: target as never },
      sourcePlayer: source,
      sourceVariant: shield ? 'guardian' : 'nephalem',
      sourceSkill: shield ? 'guardian.holy_shield' : 'nephalem.judgment_chains',
      sourcePiece: null,
      sourceIncarnation: null,
      duration: {
        schemaVersion: '1.0.0',
        producerId: shield ? 'guardian.holy-shield' : 'nephalem.judgment-chains',
        producerVersion: '1.0.0',
        rounds,
      },
      appliedSequence: 0,
      timingAnchor: { side: source, boundary: 'end', ordinal },
      lifetime: { kind: 'rounds', rounds, boundary: 'end' },
      deadline: { side: source, boundary: 'end', ordinal: ordinal + rounds },
      payload: {},
      groupId: null,
    };
  });
  const setup = {
    ...seeded,
    effects: encodeEffectRecords(initialEffects, rules.effectRegistry!, seeded),
  };
  setup.history = { ...setup.history, repetition: { [repetitionKey(setup, rules.repetition)]: 1 } };
  const initial = cloneSnapshot(setup, rules);
  let state: GameState = initial,
    restored = cloneSnapshot(initial, rules);
  const inputs: TrustedInput[] = [],
    events = [] as import('@variant-chess/shared-types').DomainEvent[];
  const commit = (command: RootCommand) => {
    const input: TrustedInput = {
      authority: { kind: 'player', side: state.turn.sideToAct },
      command,
    };
    const result = resolveCommand(state, input, rules),
      independent = resolveCommand(restored, input, rules);
    assert.deepEqual(result, independent);
    if (!result.ok) throw Error(result.code);
    state = result.state;
    restored = cloneSnapshot(independent.ok ? independent.state : initial, rules);
    inputs.push(input);
    events.push(...result.events);
    return result;
  };
  const move = (id: string, file: string, rank: number) =>
    commit({ kind: 'move', pieceId: id as never, to: square(file, rank) });
  if (sourcePlayer === 'black') {
    move('other-king', 'N', 15);
    commit({ kind: 'end' });
  }
  move('funding', 'A', 4);
  assert.equal(state.ap[sourcePlayer], 4);
  assert.equal(state.ap[opponent], 3);
  commit({ kind: 'end' });
  move('other-king', sourcePlayer === 'white' ? 'N' : 'M', 15);
  commit({ kind: 'end' });
  const before = decodeEffectRecords(state.effects, rules.effectRegistry!, state);
  const swap = commit({
    kind: 'skill',
    skillId: 'turtle.transference',
    intent: {
      kind: 'two-piece-target-v1',
      alliedPieceId: 'ally' as never,
      enemyPieceId: 'enemy' as never,
    },
  });
  assert.equal(state.ap[sourcePlayer], 0);
  assert.equal(state.turn.skillUsed, true);
  assert.equal(state.turn.mainMoveUsed, false);
  assert.deepEqual(
    decodeEffectRecords(state.effects, rules.effectRegistry!, state),
    before.map((e) => ({
      ...e,
      target: {
        kind: 'piece',
        pieceId: e.target.kind === 'piece' && e.target.pieceId === 'ally' ? 'enemy' : 'ally',
      },
    })),
  );
  assert.equal(swap.events.filter((e) => e.kind === 'transference_committed').length, 1);
  assert.equal(
    swap.events.some((e) =>
      [
        'effect_applied',
        'effect_removed',
        'effect_refreshed',
        'bomb_exploded',
        'move_committed',
        'capture_committed',
      ].includes(e.kind),
    ),
    false,
  );
  assert.equal(
    queryLegalMainActions(state, rules).some((m) => m.pieceId === 'ally'),
    false,
  );
  assert.equal(
    queryCaptureThreats(state, sourcePlayer, rules).some((m) => m.pieceId === 'ally'),
    false,
  );
  const defended = resolveCommand(
    state,
    {
      authority: { kind: 'player', side: sourcePlayer },
      command: { kind: 'move', pieceId: 'shield-probe', to: square('K', 8) },
    },
    rules,
  );
  assert.deepEqual(defended, { ok: false, code: 'CAPTURE_DEFENDED', events: [] });
  assert.equal(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: sourcePlayer }, command: { kind: 'end' } },
      rules,
    ).ok,
    false,
  );
  move('source-king', 'I', 1);
  assert.equal(state.turn.sideToAct, opponent);
  const recorded = recordReplay(initial, inputs, rules);
  if (!recorded.ok) throw Error(recorded.code);
  const replay = executeReplay(recorded.archive, rules);
  if (!replay.ok) throw Error(replay.code);
  assert.deepEqual(replay.state, state);
  assert.deepEqual(replay.events, events);
  assert.deepEqual(
    fullStateHash(replay.state, rules.effectRegistry),
    fullStateHash(state, rules.effectRegistry),
  );
  return {
    sourcePlayer,
    earnedAP: 4,
    cost: 4,
    swappedEffects: 2,
    engineVersion: state.engineVersion,
    fullHash: fullStateHash(state, rules.effectRegistry).digest,
  };
}
