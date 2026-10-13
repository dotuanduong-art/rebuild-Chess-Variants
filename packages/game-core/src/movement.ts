import { BOARD_SIZE } from '@variant-chess/shared-types';
import type { Coordinate, Piece, PieceId } from '@variant-chess/shared-types';
import type { Board } from './board.js';
import { getPiece, getPieceAt } from './board.js';
import { isInBounds } from './coordinates.js';

export interface MovementPattern {
  readonly fileDelta: number;
  readonly rankDelta: number;
  readonly maxSteps: number;
  readonly occupancy: 'empty' | 'enemy' | 'empty-or-enemy';
  readonly path: 'clear' | 'jump';
}

interface CandidateBase {
  readonly pieceId: PieceId;
  readonly from: Coordinate;
  readonly to: Coordinate;
  /** Traversed cells excluding origin; a jump contains only its landing cell. */
  readonly path: readonly Coordinate[];
}
export type MovementCandidate =
  | (CandidateBase & { readonly kind: 'move' })
  | (CandidateBase & { readonly kind: 'capture'; readonly targetId: PieceId });

// Contract only: no modifier registry, invocation, priority or effect handling yet.
export interface MovementModifier {
  readonly id: string;
  readonly modify: (
    context: Readonly<{ board: Board; piece: Piece }>,
    candidates: readonly MovementCandidate[],
  ) => readonly MovementCandidate[];
}

const ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
const DIAGONAL = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;
const KNIGHT = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
] as const;

/** Geometry only: no occupancy, threat map, check safety or action legality. */
export function generateMovementGeometry(piece: Piece): readonly MovementPattern[] {
  if (piece.currentType === 'pawn') {
    const forward = piece.controller === 'white' ? 1 : -1;
    const startRank = piece.controller === 'white' ? 1 : 13;
    return Object.freeze([
      Object.freeze({
        fileDelta: 0,
        rankDelta: forward,
        maxSteps: piece.position.rankIndex === startRank ? 2 : 1,
        occupancy: 'empty' as const,
        path: 'clear' as const,
      }),
      Object.freeze({
        fileDelta: -1,
        rankDelta: forward,
        maxSteps: 1,
        occupancy: 'enemy' as const,
        path: 'clear' as const,
      }),
      Object.freeze({
        fileDelta: 1,
        rankDelta: forward,
        maxSteps: 1,
        occupancy: 'enemy' as const,
        path: 'clear' as const,
      }),
    ]);
  }
  const deltas =
    piece.currentType === 'rook'
      ? ORTHOGONAL
      : piece.currentType === 'bishop'
        ? DIAGONAL
        : piece.currentType === 'knight'
          ? KNIGHT
          : [...ORTHOGONAL, ...DIAGONAL];
  const maxSteps =
    piece.currentType === 'king' || piece.currentType === 'knight' ? 1 : BOARD_SIZE - 1;
  const patterns: MovementPattern[] = deltas.map(([fileDelta, rankDelta]) =>
    Object.freeze({
      fileDelta,
      rankDelta,
      maxSteps,
      occupancy: 'empty-or-enemy' as const,
      path: piece.currentType === 'knight' ? ('jump' as const) : ('clear' as const),
    }),
  );
  if (piece.currentType === 'bishop') {
    for (const fileDelta of [-1, 1])
      patterns.push(
        Object.freeze({
          fileDelta,
          rankDelta: 0,
          maxSteps: 1,
          occupancy: 'empty-or-enemy',
          path: 'clear',
        }),
      );
  }
  return Object.freeze(patterns);
}

/** Base geometry + occupancy only. These candidates are not legal-action or threat results. */
export function generateBaseMoves(board: Board, pieceId: PieceId): readonly MovementCandidate[] {
  const piece = getPiece(board, pieceId);
  if (!piece) throw new RangeError(`Piece is not on the board: ${pieceId}`);
  const from = Object.freeze({ ...piece.position });
  const candidates: MovementCandidate[] = [];
  for (const pattern of generateMovementGeometry(piece)) {
    const path: Coordinate[] = [];
    for (let step = 1; step <= pattern.maxSteps; step++) {
      const to = Object.freeze({
        file: from.file + pattern.fileDelta * step,
        rankIndex: from.rankIndex + pattern.rankDelta * step,
      });
      if (!isInBounds(to)) break;
      path.push(to);
      const target = getPieceAt(board, to);
      const traversed = Object.freeze(pattern.path === 'jump' ? [to] : [...path]);
      if (target) {
        if (target.controller !== piece.controller && pattern.occupancy !== 'empty') {
          candidates.push(
            Object.freeze({
              pieceId,
              from,
              to,
              path: traversed,
              kind: 'capture',
              targetId: target.id,
            }),
          );
        }
        break;
      }
      if (pattern.occupancy !== 'enemy')
        candidates.push(Object.freeze({ pieceId, from, to, path: traversed, kind: 'move' }));
    }
  }
  return Object.freeze(candidates);
}
