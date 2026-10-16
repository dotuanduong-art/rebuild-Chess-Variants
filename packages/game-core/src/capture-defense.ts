import type { GameState, Piece } from '@variant-chess/shared-types';
import type { EffectInstance } from './effects.js';
import { decodeEffectRecords } from './effects.js';
import type { RulesetBundle } from './transaction.js';
import { cloneData, deepFreeze } from './canonical.js';

export interface CaptureDefenseContext {
  readonly state: GameState;
  readonly attacker: Piece;
  readonly victim: Piece;
  readonly instance: EffectInstance;
}
/** Pure permission check. False means reject the entire root, never consume an attachment. */
export type CaptureDefense = (context: CaptureDefenseContext) => boolean;

/** Private shared seam; callers validate state/runtime before querying. */
export function captureDefenseDecision(
  state: GameState,
  attacker: Piece,
  victim: Piece,
  ruleset: RulesetBundle,
  instances?: readonly EffectInstance[],
): 'allow' | 'reject' | 'unsupported' {
  const runtime = ruleset.effectRuntime;
  if (!runtime) return 'allow';
  const defenses = (instances ?? decodeEffectRecords(state.effects, runtime.registry, state))
    .filter(
      (instance) =>
        instance.target.kind === 'piece' &&
        instance.target.pieceId === victim.id &&
        runtime.registry.get(instance.definitionId).captureDefense,
    )
    .sort(
      (a, b) => a.appliedSequence - b.appliedSequence || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  // No Shield-vs-redirect/cancel ordering has been approved. Do not invoke either callback.
  if (defenses.length && ruleset.interceptors?.length) return 'unsupported';
  for (const instance of defenses) {
    const declaration = runtime.registry.get(instance.definitionId).captureDefense!;
    if (
      runtime.captureDefense![declaration.policyId]!(
        deepFreeze(cloneData({ state, attacker, victim, instance })),
      ) !== true
    )
      return 'reject';
  }
  return 'allow';
}

export function assertCandidateCaptureAllowed(
  state: GameState,
  attacker: Piece,
  victim: Piece,
  ruleset: RulesetBundle,
): void {
  const decision = captureDefenseDecision(state, attacker, victim, ruleset);
  if (decision === 'unsupported') throw new Error('UNSUPPORTED_RUNTIME');
  if (decision === 'reject') throw new Error('CAPTURE_DEFENDED');
}
