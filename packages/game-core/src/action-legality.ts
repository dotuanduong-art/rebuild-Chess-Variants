import type { GameState, Piece, PieceId, PlayerSide } from '@variant-chess/shared-types';
import type { EffectInstance } from './effects.js';
import { decodeEffectRecords } from './effects.js';
import type { RulesetBundle } from './transaction.js';
import type { MovementCandidate } from './movement.js';
import { generateBaseMoves } from './movement.js';
import { assertEffectRuntimeState } from './effect-runtime.js';
import { assertGameState, BASE_RULESET_ID } from './state.js';
import { cloneData, deepFreeze } from './canonical.js';
import { captureDefenseDecision } from './capture-defense.js';

export type EffectActionKind =
  'main-action' | 'capture-threat' | 'forced-reposition' | 'skill-target';
export interface ActionRestrictionContext {
  readonly state: GameState;
  readonly piece: Piece;
  readonly instance: EffectInstance | null;
  readonly actionKind: EffectActionKind;
  readonly candidate: MovementCandidate | null;
}
export type ActionRestriction = (context: ActionRestrictionContext) => boolean;
export interface RulesetLegalityPolicy {
  readonly id: string;
  readonly actionKinds: readonly EffectActionKind[];
  readonly allows: ActionRestriction;
}
function context(state: GameState, ruleset: RulesetBundle, committed = true) {
  if (committed) assertGameState(state);
  if (state.rulesetHash !== ruleset.hash || state.rulesetVersion !== ruleset.version)
    throw new Error('RULESET_MISMATCH');
  const runtime = ruleset.effectRuntime;
  if (runtime && runtime.registry !== ruleset.effectRegistry) throw new Error('INVALID_RULESET');
  if (state.effects.length && !runtime) throw new Error('UNSUPPORTED_RUNTIME');
  if (runtime) assertEffectRuntimeState(state, runtime, !!ruleset.repetition);
  const policies = [...(ruleset.legalityPolicies ?? [])].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  if (
    new Set(policies.map((p) => p.id)).size !== policies.length ||
    policies.some(
      (p) =>
        !p.id ||
        typeof p.allows !== 'function' ||
        p.actionKinds.some(
          (k) =>
            !['main-action', 'capture-threat', 'forced-reposition', 'skill-target'].includes(k),
        ),
    )
  )
    throw new Error('INVALID_LEGALITY_POLICY');
  return {
    instances: runtime ? decodeEffectRecords(state.effects, runtime.registry, state) : [],
    policies,
  };
}
function allows(
  state: GameState,
  ruleset: RulesetBundle,
  validated: ReturnType<typeof context>,
  piece: Piece,
  actionKind: EffectActionKind,
  candidate: MovementCandidate | null,
): boolean {
  const frozen = (instance: EffectInstance | null) =>
    deepFreeze(cloneData({ state, piece, instance, actionKind, candidate }));
  for (const policy of validated.policies)
    if (policy.actionKinds.includes(actionKind) && policy.allows(frozen(null)) !== true)
      return false;
  const runtime = ruleset.effectRuntime;
  for (const instance of validated.instances) {
    if (instance.target.kind !== 'piece' || instance.target.pieceId !== piece.id) continue;
    const restrictions = [
      ...(runtime!.registry.get(instance.definitionId).actionRestrictions ?? []),
    ].sort((a, b) => (a.policyId < b.policyId ? -1 : a.policyId > b.policyId ? 1 : 0));
    for (const restriction of restrictions)
      if (
        restriction.actionKind === actionKind &&
        runtime!.restrictions![restriction.policyId]!(frozen(instance)) !== true
      )
        return false;
  }
  return true;
}
/** Restriction boundary only. True does not implement or authorize a forced/skill operation. */
export function effectAllowsAction(
  state: GameState,
  pieceId: PieceId,
  actionKind: EffectActionKind,
  ruleset: RulesetBundle = BASE_RULESET_ID,
): boolean {
  if (!['main-action', 'capture-threat', 'forced-reposition', 'skill-target'].includes(actionKind))
    throw new Error('UNSUPPORTED_RUNTIME');
  const validated = context(state, ruleset);
  const piece = Object.hasOwn(state.board.pieces, pieceId)
    ? state.board.pieces[pieceId]
    : undefined;
  if (!piece) throw new Error('PIECE_NOT_FOUND');
  return allows(state, ruleset, validated, piece, actionKind, null);
}
export function queryLegalMainActions(
  state: GameState,
  ruleset: RulesetBundle = BASE_RULESET_ID,
  side: PlayerSide = state.turn.sideToAct,
): readonly MovementCandidate[] {
  return legalMainActions(state, ruleset, side, true);
}
/** Private package seam for the root candidate whose history is appended only at commit. Same legality, no committed-history assertion. */
export function queryCandidateMainActions(
  state: GameState,
  ruleset: RulesetBundle,
  side: PlayerSide,
): readonly MovementCandidate[] {
  return legalMainActions(state, ruleset, side, false);
}
function legalMainActions(
  state: GameState,
  ruleset: RulesetBundle,
  side: PlayerSide,
  committed: boolean,
): readonly MovementCandidate[] {
  const validated = context(state, ruleset, committed);
  if (
    state.terminal.status !== 'ongoing' ||
    side !== state.turn.sideToAct ||
    state.turn.mainMoveUsed
  )
    return Object.freeze([]);
  return Object.freeze(
    pieces(state, side).flatMap((piece) =>
      generateBaseMoves(state.board, piece.id).filter(
        (move) =>
          allows(state, ruleset, validated, piece, 'main-action', move) &&
          (move.kind !== 'capture' ||
            captureDefenseDecision(
              state,
              piece,
              state.board.pieces[move.targetId]!,
              ruleset,
              validated.instances,
            ) === 'allow'),
      ),
    ),
  );
}
/** Current enemy-occupied capture geometry, not an empty-square attack map or root action/turn legality. */
export function queryCaptureThreats(
  state: GameState,
  side: PlayerSide,
  ruleset: RulesetBundle = BASE_RULESET_ID,
): readonly Extract<MovementCandidate, { kind: 'capture' }>[] {
  const validated = context(state, ruleset);
  return Object.freeze(
    pieces(state, side).flatMap((piece) =>
      generateBaseMoves(state.board, piece.id).filter(
        (move): move is Extract<MovementCandidate, { kind: 'capture' }> =>
          move.kind === 'capture' &&
          allows(state, ruleset, validated, piece, 'capture-threat', move),
      ),
    ),
  );
}
function pieces(state: GameState, side: PlayerSide) {
  return Object.values(state.board.pieces)
    .filter((p) => p.controller === side)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
