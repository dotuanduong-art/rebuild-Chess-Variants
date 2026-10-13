import { CONTRACT_SCHEMA_VERSION } from '@variant-chess/shared-types';

export const CORE_API_VERSION = CONTRACT_SCHEMA_VERSION;

// Identity only. Gameplay planner/state interfaces belong to Phase 01B and later.
export interface VariantPluginDescriptor {
  readonly id: string;
  readonly version: string;
}
