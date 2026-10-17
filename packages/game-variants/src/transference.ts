import { TRANSFERENCE_ENGINE_VERSION } from '@variant-chess/shared-types';
import type { PlayerSide } from '@variant-chess/shared-types';
import {
  createEffectRegistry,
  createEffectRuntime,
  runtimeRepetitionProjection,
  preflightTransference,
} from '@variant-chess/game-core';
import type { RulesetBundle, SkillPlanningContext, SkillPlan } from '@variant-chess/game-core';
import { createHolyShieldExperimentalRuleset } from './holy-shield.js';
import { createLiveChargeExperimentalRuleset } from './live-charge.js';
import { createJudgmentChainsExperimentalRuleset } from './stun-producers.js';
import { SKILL_AP_COSTS_V3 } from './config/skill-costs.js';

export const TRANSFERENCE_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'turtle.transference-only.experimental',
  version: '1.0.0',
});
const cost = SKILL_AP_COSTS_V3['turtle.transference'];

function planTransference(context: SkillPlanningContext): SkillPlan {
  if (context.state.turn.skillUsed) throw new Error('SKILL_USED');
  if (context.state.ap[context.actor] < cost) throw new Error('INSUFFICIENT_AP');
  if (!context.ruleset) throw new Error('INVALID_RULESET');
  return {
    cost,
    operations: [
      preflightTransference(context.state, context.actor, context.command, context.ruleset)
        .operation,
    ],
  };
}

export function createTransferenceExperimentalRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
): RulesetBundle {
  if (
    Object.keys(enabled).length !== 2 ||
    typeof enabled.white !== 'boolean' ||
    typeof enabled.black !== 'boolean'
  )
    throw new Error('INVALID_PROFILE_SELECTION');
  // Retained consumer definitions/bindings only. No other producer's skills or player profiles are installed.
  const consumers = [
    createJudgmentChainsExperimentalRuleset({ white: false, black: false }),
    createHolyShieldExperimentalRuleset({ white: false, black: false }),
    createLiveChargeExperimentalRuleset({ white: false, black: false }),
  ];
  const registry = createEffectRegistry(consumers.flatMap((r) => r.effectRegistry!.definitions));
  const runtime = createEffectRuntime(registry, {
    restrictions: consumers[0]!.effectRuntime!.restrictions!,
    captureDefense: consumers[1]!.effectRuntime!.captureDefense!,
    deathReactions: consumers[2]!.effectRuntime!.deathReactions!,
    eligibility: Object.assign({}, ...consumers.map((r) => r.effectRuntime!.eligibility)),
  });
  const rules: RulesetBundle = {
    engineVersion: TRANSFERENCE_ENGINE_VERSION,
    version: '1.0.0',
    hash: `experimental-turtle-transference-v1-w${Number(enabled.white)}-b${Number(enabled.black)}`,
    playerProfiles: Object.freeze({
      white: enabled.white ? TRANSFERENCE_EXPERIMENTAL_PROFILE : null,
      black: enabled.black ? TRANSFERENCE_EXPERIMENTAL_PROFILE : null,
    }),
    transference: Object.freeze({
      kind: 'transference-v1',
      requiredProfile: TRANSFERENCE_EXPERIMENTAL_PROFILE,
      cost,
    }),
    effectRegistry: registry,
    effectRuntime: runtime,
    repetition: runtimeRepetitionProjection(runtime),
    skills: Object.freeze({
      'turtle.transference': Object.freeze({
        requiredProfile: TRANSFERENCE_EXPERIMENTAL_PROFILE,
        plan: planTransference,
      }),
    }),
  };
  return Object.freeze(rules);
}
