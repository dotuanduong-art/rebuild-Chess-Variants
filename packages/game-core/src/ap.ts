import type { Piece, PieceType, PlayerSide } from '@variant-chess/shared-types';

const PIECE_AP = Object.freeze({
  pawn: Object.freeze({ captureReward: 2, pieceLossReward: 1 }),
  knight: Object.freeze({ captureReward: 3, pieceLossReward: 2 }),
  bishop: Object.freeze({ captureReward: 3, pieceLossReward: 2 }),
  rook: Object.freeze({ captureReward: 4, pieceLossReward: 3 }),
  queen: Object.freeze({ captureReward: 5, pieceLossReward: 4 }),
  king: Object.freeze({ captureReward: 0, pieceLossReward: 0 }),
});

export function getPieceAPValue(
  type: PieceType,
): Readonly<{ captureReward: number; pieceLossReward: number }> {
  return PIECE_AP[type];
}

export type APState = Readonly<Record<PlayerSide, number>>;
export type APRejection =
  'INVALID_COST' | 'INSUFFICIENT_AP' | 'NUMBER_RANGE' | 'UNAPPROVED_REMOVAL';
export type APResult =
  | { readonly ok: true; readonly value: APState }
  | { readonly ok: false; readonly code: APRejection };

/** Normal baseline has no approved source of debt. MAX_SAFE_INTEGER is a representation guard, not a gameplay cap. */
export function createAPState(input: APState = { white: 0, black: 0 }): APState {
  if (![input.white, input.black].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new RangeError('Baseline AP must be nonnegative safe integers');
  }
  return Object.freeze({ white: input.white, black: input.black });
}

export function debitAP(ap: APState, actor: PlayerSide, actualCost: number): APResult {
  if (!Number.isSafeInteger(actualCost) || actualCost < 0)
    return { ok: false, code: 'INVALID_COST' };
  if (ap[actor] < actualCost) return { ok: false, code: 'INSUFFICIENT_AP' };
  return { ok: true, value: createAPState({ ...ap, [actor]: ap[actor] - actualCost }) };
}

export function awardPromotionAP(ap: APState, controller: PlayerSide): APResult {
  const value = ap[controller] + 3;
  if (!Number.isSafeInteger(value)) return { ok: false, code: 'NUMBER_RANGE' };
  return { ok: true, value: createAPState({ ...ap, [controller]: value }) };
}

/** Trusted reducer facts, never MovementCandidates. Call once per committed death; dedup belongs to 01B-3. */
export type DeathOutcome =
  | { readonly status: 'candidate' | 'canceled' }
  | {
      readonly status: 'committed';
      readonly reason: 'capture';
      readonly victim: Piece;
      readonly capturingController: PlayerSide;
    }
  | { readonly status: 'committed'; readonly reason: 'destruction'; readonly victim: Piece };

export function settleDeathAP(ap: APState, outcome: DeathOutcome): APResult {
  if (outcome.status !== 'committed') return { ok: true, value: createAPState(ap) };
  if (outcome.reason !== 'capture' && outcome.reason !== 'destruction')
    return { ok: false, code: 'UNAPPROVED_REMOVAL' };
  // King capture stops all AP resolution; destruction eligibility is checked by the operation layer.
  if (outcome.victim.currentType === 'king') return { ok: true, value: createAPState(ap) };
  const { captureReward, pieceLossReward } = getPieceAPValue(outcome.victim.currentType);
  const next = { ...ap };
  next[outcome.victim.owner] += pieceLossReward;
  if (outcome.reason === 'capture') next[outcome.capturingController] += captureReward;
  if (![next.white, next.black].every(Number.isSafeInteger))
    return { ok: false, code: 'NUMBER_RANGE' };
  return { ok: true, value: createAPState(next) };
}
