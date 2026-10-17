import type { RootCommand, PieceInput, GameState } from '@variant-chess/shared-types';
import type { RulesetBundle, DerivedOperation } from '@variant-chess/game-core';
import {
  coordinateFromAlgebraic as at,
  queryLegalMainActions,
  createEffectRegistry,
  createEffectRuntime,
  runtimeRepetitionProjection,
  sanctuaryRepetitionProjection,
} from '@variant-chess/game-core';
import {
  createSanctuaryExperimentalRuleset,
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
} from '../src/index.js';
import { game, unit } from './holy-shield.fixture.js';
import { run } from './holy-shield.fixture.js';
export { run } from './holy-shield.fixture.js';
export { unit } from './holy-shield.fixture.js';

export const sanctuaryCast = (cell = 'H8'): Extract<RootCommand, { kind: 'skill' }> => ({
  kind: 'skill',
  skillId: 'guardian.sanctuary',
  intent: { kind: 'cell-target-v1', cell: at(cell) },
});
// TRUSTED_TEST_ONLY reduced board/AP; the public acceptance runner starts at AP0.
export const sanctuaryGame = (
  rules: RulesetBundle = createSanctuaryExperimentalRuleset({ white: true, black: true }),
  ap = 20,
  pieces: readonly PieceInput[] = [
    unit('victim', 'pawn', 'H8'),
    unit('attacker', 'rook', 'H10', 'black'),
    unit('wk', 'king', 'A1'),
    unit('bk', 'king', 'O15', 'black'),
  ],
  matchId = 'sanctuary',
) => game(rules, ap, pieces, matchId);

export function finishSanctuaryTurn(state: GameState, rules: RulesetBundle): GameState {
  const side = state.turn.sideToAct;
  if (!state.turn.mainMoveUsed) {
    const move = queryLegalMainActions(state, rules).find(
      (m) => state.board.pieces[m.pieceId]!.currentType === 'king' && !('targetId' in m),
    );
    if (!move) throw Error('FIXTURE_NO_KING_MOVE');
    state = run(state, rules, { kind: 'move', pieceId: move.pieceId, to: move.to }).state;
  }
  if (state.turn.sideToAct === side) state = run(state, rules, { kind: 'end' }).state;
  return state;
}

/** TRUSTED_TEST_ONLY consumer composition; no production multi-Variant/Guardian factory. */
export function sanctuaryComposition(operations: readonly DerivedOperation[]): RulesetBundle {
  const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const shield = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const bomb = createLiveChargeExperimentalRuleset({ white: true, black: true });
  const registry = createEffectRegistry(
    [base, shield, bomb].flatMap((r) => r.effectRegistry!.definitions),
  );
  const runtime = createEffectRuntime(registry, {
    restrictions: base.effectRuntime!.restrictions!,
    captureDefense: shield.effectRuntime!.captureDefense!,
    deathReactions: bomb.effectRuntime!.deathReactions!,
    eligibility: {
      ...base.effectRuntime!.eligibility,
      ...shield.effectRuntime!.eligibility,
      ...bomb.effectRuntime!.eligibility,
    },
  });
  return {
    ...base,
    hash: 'trusted-test-only-sanctuary-consumers-v1',
    effectRegistry: registry,
    effectRuntime: runtime,
    repetition: runtimeRepetitionProjection(runtime, sanctuaryRepetitionProjection),
    skills: { ...base.skills, 'test-only.attach': { cost: 0, operations } },
  };
}

export function testAttachment(
  kind: 'shield' | 'bomb' | 'stun',
  pieceId: string,
  sourcePlayer: 'white' | 'black',
): DerivedOperation {
  const variant = kind === 'bomb' ? 'dynamite' : 'guardian';
  const skill =
    kind === 'bomb'
      ? 'dynamite.live_charge'
      : kind === 'shield'
        ? 'guardian.holy_shield'
        : 'guardian.sanctuary';
  return {
    kind: 'effect_apply',
    definitionId: kind === 'bomb' ? 'effect.bomb.charge' : `effect.${kind}`,
    definitionVersion: '1.0.0',
    target: { kind: 'piece', pieceId: pieceId as never },
    sourcePlayer,
    sourceVariant: variant,
    sourceSkill: skill,
    sourcePiece: null,
    sourceIncarnation: null,
    payload: {},
    groupId: null,
    ...(kind === 'bomb'
      ? {}
      : {
          duration: {
            schemaVersion: '1.0.0' as const,
            producerId: kind === 'shield' ? 'guardian.holy-shield' : 'guardian.sanctuary.stun',
            producerVersion: '1.0.0',
            rounds: kind === 'shield' ? 2 : 1,
          },
        }),
  };
}
