import {
  createEffectRegistry,
  createEffectRuntime,
  STUN_CONSUMER_CONTRACT,
  STUN_PAYLOAD_SCHEMA,
  STUN_RESTRICTION_BINDINGS,
} from '@variant-chess/game-core';
import type {
  EffectDefinition,
  RulesetBundle,
  SkillPlanningContext,
  SkillPlan,
} from '@variant-chess/game-core';
import type { PlayerSide } from '@variant-chess/shared-types';

export const JUDGMENT_CHAINS_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'nephalem.judgment-chains-only.experimental',
  version: '1.0.0',
});
export const HOLY_SEAL_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'angel.holy-seal-only.experimental',
  version: '1.0.0',
});

const chains = Object.freeze({
  variant: 'nephalem',
  skill: 'nephalem.judgment_chains',
  producer: 'nephalem.judgment-chains',
  cost: 5,
  profile: JUDGMENT_CHAINS_EXPERIMENTAL_PROFILE,
});
const seal = Object.freeze({
  variant: 'angel',
  skill: 'angel.holy_seal',
  producer: 'angel.holy-seal',
  cost: 6,
  profile: HOLY_SEAL_EXPERIMENTAL_PROFILE,
});

// Private construction only; each public factory pins exactly one approved source pair.
function createStunRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
  pinned: typeof chains | typeof seal,
): RulesetBundle {
  if (
    Object.keys(enabled).length !== 2 ||
    typeof enabled.white !== 'boolean' ||
    typeof enabled.black !== 'boolean'
  )
    throw new Error('INVALID_PROFILE_SELECTION');
  const eligibilityId = `${pinned.producer}.ordinary-v1`;
  const definition: EffectDefinition = {
    typeId: STUN_CONSUMER_CONTRACT.definitionId,
    schemaVersion: '1.0.0',
    targets: STUN_CONSUMER_CONTRACT.targets,
    category: STUN_CONSUMER_CONTRACT.category,
    sourceAttribution: {
      kind: 'preserve-source',
      requiredRefs: ['variant', 'skill'],
      profile: {
        kind: 'player-originated-v1',
        sourceVariant: pinned.variant,
        sourceSkill: pinned.skill,
      },
    },
    ownership: STUN_CONSUMER_CONTRACT.ownership,
    kingEligibility: { kind: 'denied' },
    eligibility: { policyId: eligibilityId, pieceOrigin: 'ordinary-original' },
    lifetime: {
      kind: 'producer-rounds',
      schemaVersion: '1.0.0',
      boundary: 'end',
      producers: [
        {
          id: pinned.producer,
          version: '1.0.0',
          sourceVariant: pinned.variant,
          sourceSkill: pinned.skill,
          allowedRounds: [3],
          requireCaster: false,
          supportsIncarnation: false,
        },
      ],
    },
    stacking: {
      key: 'type-source-identity-target',
      mode: 'refresh',
      payload: 'preserve',
      source: 'preserve',
      deadline: 'reset',
      mergePolicyId: null,
    },
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
    removalPermissions: ['expired', 'target_destroyed', 'match_terminal'],
    relocation: { kind: 'retargetable', constraints: [] },
    visibility: STUN_CONSUMER_CONTRACT.visibility,
    capabilities: [],
    triggers: [],
    actionRestrictions: STUN_CONSUMER_CONTRACT.actionRestrictions,
    repetition: { projectionId: `${pinned.producer}.null-source-v1` },
    repetitionProjector: (e, c) => ({
      target: c.target,
      remaining: c.remainingLifetime,
      source: {
        player: e.sourcePlayer,
        variant: e.sourceVariant,
        skill: e.sourceSkill,
        piece: e.sourcePiece,
        incarnation: e.sourceIncarnation ?? null,
      },
    }),
    payloadSchema: STUN_PAYLOAD_SCHEMA,
  };
  const registry = createEffectRegistry([definition]);
  function plan({ state, actor, command }: SkillPlanningContext): SkillPlan {
    if (actor !== state.turn.sideToAct) throw new Error('WRONG_TURN');
    const profile = state.playerProfiles[actor];
    if (profile?.id !== pinned.profile.id || profile.version !== pinned.profile.version)
      throw new Error('UNAUTHORIZED_VARIANT');
    if (command.skillId !== pinned.skill) throw new Error('NOT_AVAILABLE');
    if (state.turn.skillUsed) throw new Error('SKILL_USED');
    if (state.ap[actor] < pinned.cost) throw new Error('INSUFFICIENT_AP');
    if (command.intent?.kind !== 'piece-target-v1') throw new Error('INVALID_SKILL_INTENT');
    const target = Object.hasOwn(state.board.pieces, command.intent.pieceId)
      ? state.board.pieces[command.intent.pieceId]
      : undefined;
    if (!target) throw new Error('PIECE_NOT_FOUND');
    if (target.controller === actor) throw new Error('NOT_ENEMY_CONTROLLED');
    if (target.origin !== 'ordinary-original') throw new Error('UNSUPPORTED_UNIT');
    if (target.currentType === 'king') throw new Error('EFFECT_KING_INELIGIBLE');
    return {
      cost: pinned.cost,
      operations: [
        {
          kind: 'effect_apply',
          definitionId: 'effect.stun',
          definitionVersion: '1.0.0',
          target: { kind: 'piece', pieceId: target.id },
          sourcePlayer: actor,
          sourceVariant: pinned.variant,
          sourceSkill: pinned.skill,
          sourcePiece: null,
          sourceIncarnation: null,
          duration: {
            schemaVersion: '1.0.0',
            producerId: pinned.producer,
            producerVersion: '1.0.0',
            rounds: 3,
          },
          payload: {},
          groupId: null,
        },
      ],
    };
  }
  return Object.freeze({
    version: '1.0.0',
    hash: `experimental-${pinned.producer.replace('.', '-')}-v1-w${Number(enabled.white)}-b${Number(enabled.black)}`,
    playerProfiles: Object.freeze({
      white: enabled.white ? pinned.profile : null,
      black: enabled.black ? pinned.profile : null,
    }),
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      restrictions: STUN_RESTRICTION_BINDINGS,
      eligibility: {
        [eligibilityId]: (e, s) =>
          e.target.kind === 'piece' &&
          s.board.pieces[e.target.pieceId]?.origin === 'ordinary-original',
      },
    }),
    skills: Object.freeze({
      [pinned.skill]: Object.freeze({ requiredProfile: pinned.profile, plan }),
    }),
  });
}

/** Trusted selections; only Judgment Chains is available, never full Nephalem. */
export function createJudgmentChainsExperimentalRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
): RulesetBundle {
  return createStunRuleset(enabled, chains);
}

/** Trusted selections; only Holy Seal is available, never full Angel. */
export function createHolySealExperimentalRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
): RulesetBundle {
  return createStunRuleset(enabled, seal);
}
