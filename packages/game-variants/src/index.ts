import { CORE_API_VERSION } from '@variant-chess/game-core';
import type { VariantPluginDescriptor } from '@variant-chess/game-core';

export const PLUGIN_API_VERSION = CORE_API_VERSION;
export type VariantPlugin = VariantPluginDescriptor;
export {
  createTransferenceExperimentalRuleset,
  TRANSFERENCE_EXPERIMENTAL_PROFILE,
} from './transference.js';
export { SKILL_AP_COSTS_V1, SKILL_AP_COSTS_V2, SKILL_AP_COSTS_V3 } from './config/skill-costs.js';
export { createSanctuaryExperimentalRuleset, SANCTUARY_EXPERIMENTAL_PROFILE } from './sanctuary.js';
export { createShockwaveExperimentalRuleset, SHOCKWAVE_EXPERIMENTAL_PROFILE } from './shockwave.js';
export {
  createJudgmentChainsExperimentalRuleset,
  JUDGMENT_CHAINS_EXPERIMENTAL_PROFILE,
  createHolySealExperimentalRuleset,
  HOLY_SEAL_EXPERIMENTAL_PROFILE,
} from './stun-producers.js';
export {
  createHolyShieldExperimentalRuleset,
  HOLY_SHIELD_EXPERIMENTAL_PROFILE,
} from './holy-shield.js';
export {
  createLiveChargeExperimentalRuleset,
  LIVE_CHARGE_EXPERIMENTAL_PROFILE,
} from './live-charge.js';
