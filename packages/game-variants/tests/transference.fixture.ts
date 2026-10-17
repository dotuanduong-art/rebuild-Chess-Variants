import type { GameState, PieceInput, PlayerSide, RootCommand } from '@variant-chess/shared-types';
import {
  createGame,
  createBoard,
  encodeEffectRecords,
  cloneSnapshot,
  repetitionKey,
} from '@variant-chess/game-core';
import type { EffectInstance, RulesetBundle } from '@variant-chess/game-core';
import { createTransferenceExperimentalRuleset } from '../src/index.js';
import { unit } from './holy-shield.fixture.js';
export { unit, run, finish } from './holy-shield.fixture.js';

export const transfer = (alliedPieceId = 'ally', enemyPieceId = 'enemy'): RootCommand => ({
  kind: 'skill',
  skillId: 'turtle.transference',
  intent: {
    kind: 'two-piece-target-v1',
    alliedPieceId: alliedPieceId as never,
    enemyPieceId: enemyPieceId as never,
  },
});

/** TRUSTED_TEST_ONLY registered initial attachments; never another castable producer or seeded positive-path AP. */
export function attachment(
  kind: 'shield' | 'stun' | 'charge',
  target = 'ally',
  source: PlayerSide = 'white',
  suffix = kind,
): EffectInstance {
  const shield = kind === 'shield',
    bomb = kind === 'charge';
  return {
    id: `initial-${suffix}-${source}`,
    definitionId: bomb ? 'effect.bomb.charge' : `effect.${kind}`,
    definitionVersion: '1.0.0',
    target: { kind: 'piece', pieceId: target as never },
    sourcePlayer: source,
    sourceVariant: bomb ? 'dynamite' : shield ? 'guardian' : 'nephalem',
    sourceSkill: bomb
      ? 'dynamite.live_charge'
      : shield
        ? 'guardian.holy_shield'
        : 'nephalem.judgment_chains',
    sourcePiece: null,
    sourceIncarnation: null,
    appliedSequence: source === 'white' ? 1 : 2,
    timingAnchor: { side: source, boundary: 'end', ordinal: source === 'white' ? 1 : 0 },
    lifetime: bomb
      ? { kind: 'permanent' }
      : { kind: 'rounds', rounds: shield ? 2 : 3, boundary: 'end' },
    deadline: bomb
      ? null
      : { side: source, boundary: 'end', ordinal: (source === 'white' ? 1 : 0) + (shield ? 2 : 3) },
    ...(bomb
      ? {}
      : {
          duration: {
            schemaVersion: '1.0.0' as const,
            producerId: shield ? 'guardian.holy-shield' : 'nephalem.judgment-chains',
            producerVersion: '1.0.0',
            rounds: shield ? 2 : 3,
          },
        }),
    payload: {},
    groupId: null,
  };
}

export function transferenceGame(
  rules: RulesetBundle = createTransferenceExperimentalRuleset({ white: true, black: true }),
  effects: readonly EffectInstance[] = [attachment('shield')],
  ap = 4,
  pieces: readonly PieceInput[] = [
    unit('ally', 'rook', 'A4'),
    unit('enemy', 'rook', 'O12', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ],
  matchId = 'transference',
): GameState {
  const created = createGame(
    { matchId, seed: 31, board: createBoard(pieces), ap: { white: ap, black: ap } },
    rules,
  );
  const initial = { ...created, counters: { ...created.counters, operation: effects.length } };
  const seeded = effects.map((e, index) => ({
    ...e,
    id: `${matchId}:operation:${index + 1}`,
    appliedSequence: 0,
  }));
  const state = {
    ...initial,
    effects: encodeEffectRecords(seeded, rules.effectRegistry!, initial),
  };
  state.history = { ...state.history, repetition: { [repetitionKey(state, rules.repetition)]: 1 } };
  return cloneSnapshot(state, rules);
}
