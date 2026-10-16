import {
  createEffectRegistry,
  createEffectRuntime,
  SHIELD_PAYLOAD_SCHEMA,
  SHIELD_CAPTURE_DEFENSE_BINDINGS,
  SHIELD_CONSUMER_CONTRACT,
} from '@variant-chess/game-core';
import type {
  EffectDefinition,
  RulesetBundle,
  SkillPlanningContext,
  SkillPlan,
} from '@variant-chess/game-core';
import type { PlayerSide } from '@variant-chess/shared-types';

/** Explicitly bounded; no other Guardian ability or passive is registered. */
export const HOLY_SHIELD_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'guardian.holy-shield-only.experimental',
  version: '1.0.0',
});

const definition: EffectDefinition = {
  typeId: 'effect.shield',
  schemaVersion: '1.0.0',
  targets: ['piece'],
  category: 'buff',
  sourceAttribution: {
    kind: 'preserve-source',
    requiredRefs: ['variant', 'skill'],
    profile: {
      kind: 'player-originated-v1',
      sourceVariant: 'guardian',
      sourceSkill: 'guardian.holy_shield',
    },
  },
  ownership: { kind: 'source-player' },
  kingEligibility: { kind: 'allowed' },
  eligibility: { policyId: 'guardian.holy-shield.ordinary-v1', pieceOrigin: 'ordinary-original' },
  lifetime: {
    kind: 'producer-rounds',
    schemaVersion: '1.0.0',
    boundary: 'end',
    producers: [
      {
        id: 'guardian.holy-shield',
        version: '1.0.0',
        sourceVariant: 'guardian',
        sourceSkill: 'guardian.holy_shield',
        allowedRounds: [2],
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
  captureDefense: SHIELD_CONSUMER_CONTRACT.captureDefense,
  repetition: { projectionId: 'guardian.holy-shield.null-source-v1' },
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
  payloadSchema: SHIELD_PAYLOAD_SCHEMA,
};

/** Pure trusted planner: root owns debit, slots and execution of the returned operations. */
function planHolyShield({ state, actor, command }: SkillPlanningContext): SkillPlan {
  if (actor !== state.turn.sideToAct) throw new Error('WRONG_TURN');
  const profile = state.playerProfiles[actor];
  if (
    profile?.id !== HOLY_SHIELD_EXPERIMENTAL_PROFILE.id ||
    profile.version !== HOLY_SHIELD_EXPERIMENTAL_PROFILE.version
  )
    throw new Error('UNAUTHORIZED_VARIANT');
  if (command.skillId !== 'guardian.holy_shield') throw new Error('NOT_AVAILABLE');
  if (state.turn.skillUsed) throw new Error('SKILL_USED');
  if (state.ap[actor] < 4) throw new Error('INSUFFICIENT_AP');
  if (command.intent?.kind !== 'piece-target-v1') throw new Error('INVALID_SKILL_INTENT');
  const target = Object.hasOwn(state.board.pieces, command.intent.pieceId)
    ? state.board.pieces[command.intent.pieceId]
    : undefined;
  if (!target) throw new Error('PIECE_NOT_FOUND');
  if (target.controller !== actor) throw new Error('NOT_CONTROLLED');
  if (target.origin !== 'ordinary-original') throw new Error('UNSUPPORTED_UNIT');
  return {
    cost: 4,
    operations: [
      {
        kind: 'effect_apply',
        definitionId: 'effect.shield',
        definitionVersion: '1.0.0',
        target: { kind: 'piece', pieceId: target.id },
        sourcePlayer: actor,
        sourceVariant: 'guardian',
        sourceSkill: 'guardian.holy_shield',
        sourcePiece: null,
        sourceIncarnation: null,
        duration: {
          schemaVersion: '1.0.0',
          producerId: 'guardian.holy-shield',
          producerVersion: '1.0.0',
          rounds: 2,
        },
        payload: {},
        groupId: null,
      },
    ],
  };
}

/** Trusted match composition only; selections are pinned in both ruleset and initial state. */
export function createHolyShieldExperimentalRuleset(
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
    hash: `experimental-guardian-holy-shield-v1-w${Number(enabled.white)}-b${Number(enabled.black)}`,
    playerProfiles: Object.freeze({
      white: enabled.white ? HOLY_SHIELD_EXPERIMENTAL_PROFILE : null,
      black: enabled.black ? HOLY_SHIELD_EXPERIMENTAL_PROFILE : null,
    }),
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
      eligibility: {
        'guardian.holy-shield.ordinary-v1': (e, s) =>
          e.target.kind === 'piece' &&
          s.board.pieces[e.target.pieceId]?.origin === 'ordinary-original',
      },
    }),
    skills: Object.freeze({
      'guardian.holy_shield': Object.freeze({
        requiredProfile: HOLY_SHIELD_EXPERIMENTAL_PROFILE,
        plan: planHolyShield,
      }),
    }),
  });
}
