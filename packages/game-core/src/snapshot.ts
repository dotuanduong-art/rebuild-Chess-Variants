import { GameStateSchema } from '@variant-chess/shared-types';
import type { GameState } from '@variant-chess/shared-types';
import { assertGameState, assertRulesetProfiles, deepFreeze, BASE_RULESET_ID } from './state.js';
import type { RulesetIdentity } from './state.js';
import { canonicalEncode, fingerprint } from './canonical.js';
import { validateSnapshotEffects } from './effects.js';
import type { EffectRegistry } from './effects.js';
import { validateSnapshotDelayedActions } from './delayed-actions.js';
import type { DelayedActionRegistry } from './delayed-actions.js';

export function encodeSnapshot(
  state: GameState,
  effectRegistry?: EffectRegistry,
  delayedRegistry?: DelayedActionRegistry,
): string {
  canonicalEncode(state);
  assertGameState(state);
  validateSnapshotEffects(state, effectRegistry);
  validateSnapshotDelayedActions(state, delayedRegistry);
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
  ruleset: RulesetIdentity & {
    readonly effectRegistry?: EffectRegistry;
    readonly delayedRegistry?: DelayedActionRegistry;
  } = BASE_RULESET_ID,
): GameState {
  const state = GameStateSchema.parse(JSON.parse(encoded));
  assertGameState(state);
  if (state.rulesetVersion !== ruleset.version || state.rulesetHash !== ruleset.hash)
    throw new Error('RULESET_MISMATCH');
  assertRulesetProfiles(state, ruleset);
  validateSnapshotEffects(state, ruleset.effectRegistry);
  validateSnapshotDelayedActions(state, ruleset.delayedRegistry);
  return deepFreeze(state);
}
export function cloneSnapshot(
  state: GameState,
  ruleset: RulesetIdentity & {
    readonly effectRegistry?: EffectRegistry;
    readonly delayedRegistry?: DelayedActionRegistry;
  } = BASE_RULESET_ID,
): GameState {
  return decodeSnapshot(
    encodeSnapshot(state, ruleset.effectRegistry, ruleset.delayedRegistry),
    ruleset,
  );
}
export interface FullStateHash {
  readonly kind: 'full-gameplay';
  readonly algorithm: 'fnv1a64-v1';
  readonly digest: string;
}
export function fullStateHash(
  state: GameState,
  effectRegistry?: EffectRegistry,
  delayedRegistry?: DelayedActionRegistry,
): FullStateHash {
  return {
    kind: 'full-gameplay',
    algorithm: 'fnv1a64-v1',
    digest: fingerprint(encodeSnapshot(state, effectRegistry, delayedRegistry)),
  };
}
