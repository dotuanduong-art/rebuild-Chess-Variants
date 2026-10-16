import { CORE_API_VERSION } from '@variant-chess/game-core';
import type { VariantPluginDescriptor } from '@variant-chess/game-core';

export const PLUGIN_API_VERSION = CORE_API_VERSION;
export type VariantPlugin = VariantPluginDescriptor;
export {
  createHolyShieldExperimentalRuleset,
  HOLY_SHIELD_EXPERIMENTAL_PROFILE,
} from './holy-shield.js';
export {
  createLiveChargeExperimentalRuleset,
  LIVE_CHARGE_EXPERIMENTAL_PROFILE,
} from './live-charge.js';
