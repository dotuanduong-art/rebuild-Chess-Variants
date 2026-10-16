import {
  BOMB_CONSUMER_CONTRACTS,
  BOMB_PAYLOAD_SCHEMA,
  BOMB_DEATH_REACTION_BINDINGS,
  createEffectRegistry,
  createEffectRuntime,
  decodeEffectRecords,
} from '@variant-chess/game-core';
import type {
  EffectDefinition,
  EffectRegistry,
  RulesetBundle,
  SkillPlanningContext,
  SkillPlan,
} from '@variant-chess/game-core';
import type { PlayerSide } from '@variant-chess/shared-types';

/** Bounded experimental profile, never the full Dynamite Variant. */
export const LIVE_CHARGE_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'dynamite.live-charge-only.experimental',
  version: '1.0.0',
});

const consumer = BOMB_CONSUMER_CONTRACTS.charge;
const definition: EffectDefinition = {
  typeId: consumer.definitionId,
  schemaVersion: '1.0.0',
  targets: consumer.targets,
  category: consumer.category,
  family: consumer.family,
  sourceAttribution: {
    kind: 'preserve-source',
    requiredRefs: ['variant', 'skill'],
    profile: {
      kind: 'player-originated-v1',
      sourceVariant: 'dynamite',
      sourceSkill: 'dynamite.live_charge',
    },
  },
  ownership: consumer.ownership,
  kingEligibility: { kind: 'denied' },
  eligibility: { policyId: 'dynamite.live-charge.ordinary-v1', pieceOrigin: 'ordinary-original' },
  lifetime: consumer.lifetime,
  stacking: consumer.stacking,
  removal: {
    expired: 'cleanup-only',
    cleansed: 'cleanup-only',
    dispelled: 'cleanup-only',
    consumed: 'cleanup-only',
    replaced: 'cleanup-only',
    target_destroyed: 'cleanup-only',
    source_invalidated: 'cleanup-only',
    link_broken: 'cleanup-only',
    match_terminal: 'cleanup-only',
  },
  removalPermissions: ['target_destroyed', 'match_terminal'],
  relocation: { kind: 'retargetable', constraints: [] },
  visibility: consumer.visibility,
  capabilities: consumer.capabilities,
  deathReaction: consumer.deathReaction,
  triggers: [],
  repetition: { projectionId: 'dynamite.live-charge.null-source-v1' },
  repetitionProjector: (e, c) => ({
    target: c.target,
    lifetime: e.lifetime,
    source: {
      player: e.sourcePlayer,
      variant: e.sourceVariant,
      skill: e.sourceSkill,
      piece: e.sourcePiece,
      incarnation: e.sourceIncarnation ?? null,
    },
  }),
  payloadSchema: BOMB_PAYLOAD_SCHEMA,
};

/** Pure trusted plan; the existing root alone owns cost, slot and effect mutation. */
export function planLiveCharge(
  { state, actor, command }: SkillPlanningContext,
  registry: EffectRegistry,
): SkillPlan {
  if (actor !== state.turn.sideToAct) throw new Error('WRONG_TURN');
  const profile = state.playerProfiles[actor];
  if (
    profile?.id !== LIVE_CHARGE_EXPERIMENTAL_PROFILE.id ||
    profile.version !== LIVE_CHARGE_EXPERIMENTAL_PROFILE.version
  )
    throw new Error('UNAUTHORIZED_VARIANT');
  if (command.skillId !== 'dynamite.live_charge') throw new Error('NOT_AVAILABLE');
  if (state.turn.skillUsed) throw new Error('SKILL_USED');
  if (state.ap[actor] < 3) throw new Error('INSUFFICIENT_AP');
  if (command.intent?.kind !== 'piece-target-v1') throw new Error('INVALID_SKILL_INTENT');
  const target = Object.hasOwn(state.board.pieces, command.intent.pieceId)
    ? state.board.pieces[command.intent.pieceId]
    : undefined;
  if (!target) throw new Error('PIECE_NOT_FOUND');
  if (target.controller !== actor) throw new Error('NOT_CONTROLLED');
  if (target.origin !== 'ordinary-original') throw new Error('UNSUPPORTED_UNIT');
  if (target.currentType === 'king') throw new Error('EFFECT_KING_INELIGIBLE');
  if (
    decodeEffectRecords(state.effects, registry, state).some(
      (e) =>
        e.target.kind === 'piece' &&
        e.target.pieceId === target.id &&
        registry.get(e.definitionId).family?.id === consumer.family.id,
    )
  )
    throw new Error('TARGET_ALREADY_BOMBED');
  return {
    cost: 3,
    operations: [
      {
        kind: 'effect_apply',
        definitionId: consumer.definitionId,
        definitionVersion: '1.0.0',
        target: { kind: 'piece', pieceId: target.id },
        sourcePlayer: actor,
        sourceVariant: 'dynamite',
        sourceSkill: 'dynamite.live_charge',
        sourcePiece: null,
        sourceIncarnation: null,
        payload: {},
        groupId: null,
      },
    ],
  };
}

/** Trusted match selection only: no client toggle and no passive/setup attachment. */
export function createLiveChargeExperimentalRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
): RulesetBundle {
  if (
    Object.keys(enabled).length !== 2 ||
    typeof enabled.white !== 'boolean' ||
    typeof enabled.black !== 'boolean'
  )
    throw new Error('INVALID_PROFILE_SELECTION');
  const registry = createEffectRegistry([definition]);
  return Object.freeze({
    version: '1.0.0',
    hash: `experimental-dynamite-live-charge-v1-w${Number(enabled.white)}-b${Number(enabled.black)}`,
    playerProfiles: Object.freeze({
      white: enabled.white ? LIVE_CHARGE_EXPERIMENTAL_PROFILE : null,
      black: enabled.black ? LIVE_CHARGE_EXPERIMENTAL_PROFILE : null,
    }),
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      deathReactions: BOMB_DEATH_REACTION_BINDINGS,
      eligibility: {
        'dynamite.live-charge.ordinary-v1': (e, s) =>
          e.target.kind === 'piece' &&
          s.board.pieces[e.target.pieceId]?.origin === 'ordinary-original',
      },
    }),
    skills: Object.freeze({
      'dynamite.live_charge': Object.freeze({
        requiredProfile: LIVE_CHARGE_EXPERIMENTAL_PROFILE,
        plan: (context: SkillPlanningContext) => planLiveCharge(context, registry),
      }),
    }),
  });
}
