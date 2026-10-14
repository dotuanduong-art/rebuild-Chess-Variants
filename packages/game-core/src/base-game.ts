import type { Coordinate, PieceId, PlayerSide } from '@variant-chess/shared-types';
import { createBoard, getPiece } from './board.js';
import type { Board } from './board.js';
import { generateBaseMoves } from './movement.js';
import { createAPState, debitAP, awardPromotionAP, settleDeathAP } from './ap.js';
import type { APState, APRejection } from './ap.js';

export interface TurnState {
  readonly sideToAct: PlayerSide;
  readonly plyIndex: number;
  readonly roundIndex: number;
  readonly mainMoveUsed: boolean;
  readonly skillUsed: boolean;
}
export interface TurnBoundary {
  readonly kind: 'turnEnd' | 'turnStart';
  readonly side: PlayerSide;
  readonly plyIndex: number;
  readonly roundIndex: number;
}
/** Ruleset functions live outside serializable state. Only the approved normal policy is enabled here. */
export interface TurnPolicy {
  readonly canUseMainMove: (turn: TurnState) => boolean;
  readonly canUseSkill: (turn: TurnState) => boolean;
  readonly shouldAutoEnd: (turn: TurnState) => boolean;
}
export const NORMAL_TURN_POLICY: TurnPolicy = Object.freeze({
  canUseMainMove: (turn: TurnState) => !turn.mainMoveUsed,
  canUseSkill: (turn: TurnState) => !turn.skillUsed,
  shouldAutoEnd: (turn: TurnState) => turn.mainMoveUsed && turn.skillUsed,
});
export interface BasePosition {
  readonly board: Board;
  readonly turn: TurnState;
  readonly terminal: BaseTerminal;
  readonly ap: APState;
}
export type BaseTerminal =
  | { readonly status: 'ongoing' }
  | { readonly status: 'won'; readonly reason: 'king_captured'; readonly winner: PlayerSide };
export type BaseRejection =
  | 'USE_ROOT_TRANSACTION'
  | APRejection
  | 'TERMINAL'
  | 'WRONG_TURN'
  | 'MAIN_MOVE_REQUIRED'
  | 'MAIN_MOVE_USED'
  | 'INVALID_MOVE'
  | 'NOT_CONTROLLED'
  | 'SKILL_USED'
  | 'PIECE_NOT_FOUND'
  | 'PROTECTED_KING';
export type BaseOperationResult =
  | {
      readonly ok: true;
      readonly value: BasePosition;
      readonly boundaries: readonly TurnBoundary[];
    }
  | { readonly ok: false; readonly code: BaseRejection };

export function createBasePosition(board: Board, ap: APState = createAPState()): BasePosition {
  return Object.freeze({
    board: createBoard(Object.values(board.pieces)),
    terminal: Object.freeze({ status: 'ongoing' }),
    ap: createAPState(ap),
    turn: Object.freeze({
      sideToAct: 'white',
      plyIndex: 0,
      roundIndex: 1,
      mainMoveUsed: false,
      skillUsed: false,
    }),
  });
}

function nextTurn(position: BasePosition): BaseOperationResult {
  const old = position.turn;
  const plyIndex = old.plyIndex + 1;
  if (!Number.isSafeInteger(plyIndex)) return { ok: false, code: 'NUMBER_RANGE' };
  const turn: TurnState = Object.freeze({
    sideToAct: old.sideToAct === 'white' ? 'black' : 'white',
    plyIndex,
    roundIndex: Math.floor(plyIndex / 2) + 1,
    mainMoveUsed: false,
    skillUsed: false,
  });
  return Object.freeze({
    ok: true,
    value: Object.freeze({ ...position, turn }),
    boundaries: Object.freeze([
      Object.freeze({
        kind: 'turnEnd' as const,
        side: old.sideToAct,
        plyIndex: old.plyIndex,
        roundIndex: old.roundIndex,
      }),
      Object.freeze({
        kind: 'turnStart' as const,
        side: turn.sideToAct,
        plyIndex,
        roundIndex: turn.roundIndex,
      }),
    ]),
  });
}

export function endBaseTurn(position: BasePosition, actor: PlayerSide): BaseOperationResult {
  if (Object.hasOwn(position, 'matchId')) return { ok: false, code: 'USE_ROOT_TRANSACTION' };
  if (position.terminal.status !== 'ongoing') return { ok: false, code: 'TERMINAL' };
  if (position.turn.sideToAct !== actor) return { ok: false, code: 'WRONG_TURN' };
  if (
    !position.turn.mainMoveUsed &&
    Object.values(position.board.pieces).some(
      (piece) =>
        piece.controller === actor && generateBaseMoves(position.board, piece.id).length > 0,
    )
  )
    return { ok: false, code: 'MAIN_MOVE_REQUIRED' };
  return nextTurn(position);
}

export function applyBaseMainMove(
  position: BasePosition,
  actor: PlayerSide,
  pieceId: PieceId,
  to: Coordinate,
): BaseOperationResult {
  if (Object.hasOwn(position, 'matchId')) return { ok: false, code: 'USE_ROOT_TRANSACTION' };
  if (position.terminal.status !== 'ongoing') return { ok: false, code: 'TERMINAL' };
  if (position.turn.sideToAct !== actor) return { ok: false, code: 'WRONG_TURN' };
  if (!NORMAL_TURN_POLICY.canUseMainMove(position.turn))
    return { ok: false, code: 'MAIN_MOVE_USED' };
  const piece = getPiece(position.board, pieceId);
  if (!piece || piece.controller !== actor) return { ok: false, code: 'NOT_CONTROLLED' };
  const candidate = generateBaseMoves(position.board, pieceId).find(
    (move) => move.to.file === to.file && move.to.rankIndex === to.rankIndex,
  );
  if (!candidate) return { ok: false, code: 'INVALID_MOVE' };
  const captured =
    candidate.kind === 'capture' ? getPiece(position.board, candidate.targetId) : undefined;
  const promotes =
    captured?.currentType !== 'king' &&
    piece.currentType === 'pawn' &&
    candidate.to.rankIndex === (actor === 'white' ? 14 : 0);
  const board = createBoard(
    Object.values(position.board.pieces)
      .filter((entry) => candidate.kind !== 'capture' || entry.id !== candidate.targetId)
      .map((entry) =>
        entry.id === pieceId
          ? {
              ...entry,
              position: candidate.to,
              currentType: promotes ? ('queen' as const) : entry.currentType,
            }
          : entry,
      ),
  );
  const terminal: BaseTerminal =
    captured?.currentType === 'king'
      ? Object.freeze({ status: 'won', reason: 'king_captured', winner: actor })
      : position.terminal;
  // The candidate alone never reaches accounting: occupancy removal has succeeded in this local snapshot.
  const deathReward = captured
    ? settleDeathAP(position.ap, {
        status: 'committed',
        reason: 'capture',
        victim: captured,
        capturingController: actor,
      })
    : { ok: true as const, value: position.ap };
  if (!deathReward.ok) return deathReward;
  const reward =
    promotes && terminal.status === 'ongoing'
      ? awardPromotionAP(deathReward.value, actor)
      : deathReward;
  if (!reward.ok) return reward;
  const value = Object.freeze({
    ...position,
    board,
    terminal,
    ap: reward.value,
    turn: Object.freeze({ ...position.turn, mainMoveUsed: true }),
  });
  return completeAction(value);
}

function completeAction(value: BasePosition): BaseOperationResult {
  return value.terminal.status === 'ongoing' && NORMAL_TURN_POLICY.shouldAutoEnd(value.turn)
    ? nextTurn(value)
    : Object.freeze({ ok: true, value, boundaries: Object.freeze([]) });
}

/** Trusted core operation for an already-authorized destruction. Not a client command or Variant resolver. */
export function applyBaseDestruction(
  position: BasePosition,
  pieceId: PieceId,
): BaseOperationResult {
  if (Object.hasOwn(position, 'matchId')) return { ok: false, code: 'USE_ROOT_TRANSACTION' };
  if (position.terminal.status !== 'ongoing') return { ok: false, code: 'TERMINAL' };
  const victim = getPiece(position.board, pieceId);
  if (!victim) return { ok: false, code: 'PIECE_NOT_FOUND' };
  if (victim.currentType === 'king') return { ok: false, code: 'PROTECTED_KING' };
  const board = createBoard(
    Object.values(position.board.pieces).filter((piece) => piece.id !== pieceId),
  );
  const reward = settleDeathAP(position.ap, { status: 'committed', reason: 'destruction', victim });
  if (!reward.ok) return reward;
  return Object.freeze({
    ok: true,
    value: Object.freeze({ ...position, board, ap: reward.value }),
    boundaries: Object.freeze([]),
  });
}

/** Records an already validated/resolved synthetic or normal skill, not a Variant executor. */
export function commitNormalSkillUsage(
  position: BasePosition,
  actor: PlayerSide,
  actualCost: number,
): BaseOperationResult {
  if (Object.hasOwn(position, 'matchId')) return { ok: false, code: 'USE_ROOT_TRANSACTION' };
  if (position.terminal.status !== 'ongoing') return { ok: false, code: 'TERMINAL' };
  if (position.turn.sideToAct !== actor) return { ok: false, code: 'WRONG_TURN' };
  if (!NORMAL_TURN_POLICY.canUseSkill(position.turn)) return { ok: false, code: 'SKILL_USED' };
  const debit = debitAP(position.ap, actor, actualCost);
  if (!debit.ok) return debit;
  return completeAction(
    Object.freeze({
      ...position,
      ap: debit.value,
      turn: Object.freeze({ ...position.turn, skillUsed: true }),
    }),
  );
}
