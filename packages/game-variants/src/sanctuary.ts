import { SANCTUARY_ENGINE_VERSION } from '@variant-chess/shared-types';
import type { PlayerSide } from '@variant-chess/shared-types';
import {
  sanctuaryRepetitionProjection,
  createEffectRegistry,
  createEffectRuntime,
  runtimeRepetitionProjection,
  STUN_CONSUMER_CONTRACT,
  STUN_PAYLOAD_SCHEMA,
  STUN_RESTRICTION_BINDINGS,
} from '@variant-chess/game-core';
import type { EffectDefinition } from '@variant-chess/game-core';
import type { RulesetBundle, SkillPlanningContext, SkillPlan } from '@variant-chess/game-core';
import { SKILL_AP_COSTS_V2 } from './config/skill-costs.js';

export const SANCTUARY_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'guardian.sanctuary-only.experimental',
  version: '1.0.0',
});
const cost = SKILL_AP_COSTS_V2['guardian.sanctuary'];

function planSanctuary({ state, actor, command }: SkillPlanningContext): SkillPlan {
  const profile = state.playerProfiles[actor];
  if (actor !== state.turn.sideToAct) throw new Error('WRONG_TURN');
  if (
    profile?.id !== SANCTUARY_EXPERIMENTAL_PROFILE.id ||
    profile.version !== SANCTUARY_EXPERIMENTAL_PROFILE.version
  )
    throw new Error('UNAUTHORIZED_VARIANT');
  if (command.skillId !== 'guardian.sanctuary') throw new Error('NOT_AVAILABLE');
  if (state.turn.skillUsed) throw new Error('SKILL_USED');
  if (state.ap[actor] < cost) throw new Error('INSUFFICIENT_AP');
  if (command.intent?.kind !== 'cell-target-v1') throw new Error('INVALID_SKILL_INTENT');
  return {
    cost,
    operations: [{ kind: 'sanctuary_cast', schemaVersion: '1.0.0', center: command.intent.cell }],
  };
}

export function createSanctuaryExperimentalRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
): RulesetBundle {
  if (
    Object.keys(enabled).length !== 2 ||
    typeof enabled.white !== 'boolean' ||
    typeof enabled.black !== 'boolean'
  )
    throw new Error('INVALID_PROFILE_SELECTION');
  const definition: EffectDefinition = {
    typeId: 'effect.stun',
    schemaVersion: '1.0.0',
    category: STUN_CONSUMER_CONTRACT.category,
    targets: ['piece'],
    sourceAttribution: {
      kind: 'preserve-source',
      requiredRefs: ['variant', 'skill'],
      profile: {
        kind: 'player-originated-v1',
        sourceVariant: 'guardian',
        sourceSkill: 'guardian.sanctuary',
      },
    },
    ownership: { kind: 'source-player' },
    kingEligibility: { kind: 'denied' },
    eligibility: { policyId: 'guardian.sanctuary.ordinary-v1', pieceOrigin: 'ordinary-original' },
    lifetime: {
      kind: 'producer-rounds',
      schemaVersion: '1.0.0',
      boundary: 'end',
      producers: [
        {
          id: 'guardian.sanctuary.stun',
          version: '1.0.0',
          sourceVariant: 'guardian',
          sourceSkill: 'guardian.sanctuary',
          allowedRounds: [1],
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
    visibility: { kind: 'public' },
    capabilities: [],
    triggers: [],
    actionRestrictions: STUN_CONSUMER_CONTRACT.actionRestrictions,
    repetition: { projectionId: 'guardian.sanctuary.null-source-v1' },
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
  const runtime = createEffectRuntime(registry, {
    restrictions: STUN_RESTRICTION_BINDINGS,
    eligibility: {
      'guardian.sanctuary.ordinary-v1': (e, s) =>
        e.target.kind === 'piece' &&
        s.board.pieces[e.target.pieceId]?.origin === 'ordinary-original',
    },
  });
  return Object.freeze({
    engineVersion: SANCTUARY_ENGINE_VERSION,
    version: '1.0.0',
    hash: `experimental-guardian-sanctuary-v1-w${Number(enabled.white)}-b${Number(enabled.black)}`,
    playerProfiles: Object.freeze({
      white: enabled.white ? SANCTUARY_EXPERIMENTAL_PROFILE : null,
      black: enabled.black ? SANCTUARY_EXPERIMENTAL_PROFILE : null,
    }),
    sanctuary: Object.freeze({
      kind: 'sanctuary-v1',
      requiredProfile: SANCTUARY_EXPERIMENTAL_PROFILE,
    } as const),
    effectRegistry: registry,
    effectRuntime: runtime,
    repetition: runtimeRepetitionProjection(runtime, sanctuaryRepetitionProjection),
    skills: Object.freeze({
      'guardian.sanctuary': Object.freeze({
        requiredProfile: SANCTUARY_EXPERIMENTAL_PROFILE,
        plan: planSanctuary,
      }),
    }),
  });
}
