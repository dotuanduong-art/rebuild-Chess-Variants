import { GameStateSchema } from '@variant-chess/shared-types';
import type { GameState } from '@variant-chess/shared-types';
import { assertGameState, deepFreeze, BASE_RULESET_ID } from './state.js';
import type { RulesetIdentity } from './state.js';
import { canonicalEncode, fingerprint } from './canonical.js';
import { validateSnapshotEffects } from './effects.js';
import type { EffectRegistry } from './effects.js';

export function encodeSnapshot(state: GameState, effectRegistry?: EffectRegistry): string {
  canonicalEncode(state);
  assertGameState(state);
  validateSnapshotEffects(state, effectRegistry);
  return canonicalEncode({
    ...state,
    effects: [...state.effects].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    delayedActions: [...state.delayedActions].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
  });
}
export function decodeSnapshot(
  encoded: string,
  ruleset: RulesetIdentity & { readonly effectRegistry?: EffectRegistry } = BASE_RULESET_ID,
): GameState {
  const state = GameStateSchema.parse(JSON.parse(encoded));
  assertGameState(state);
  if (state.rulesetVersion !== ruleset.version || state.rulesetHash !== ruleset.hash)
    throw new Error('RULESET_MISMATCH');
  validateSnapshotEffects(state, ruleset.effectRegistry);
  return deepFreeze(state);
}
export function cloneSnapshot(
  state: GameState,
  ruleset: RulesetIdentity & { readonly effectRegistry?: EffectRegistry } = BASE_RULESET_ID,
): GameState {
  return decodeSnapshot(encodeSnapshot(state, ruleset.effectRegistry), ruleset);
}
export interface FullStateHash {
  readonly kind: 'full-gameplay';
  readonly algorithm: 'fnv1a64-v1';
  readonly digest: string;
}
export function fullStateHash(state: GameState, effectRegistry?: EffectRegistry): FullStateHash {
  return {
    kind: 'full-gameplay',
    algorithm: 'fnv1a64-v1',
    digest: fingerprint(encodeSnapshot(state, effectRegistry)),
  };
}
