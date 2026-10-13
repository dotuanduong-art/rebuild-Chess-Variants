import { BOARD_CELL_COUNT, BOARD_SIZE, PieceSchema } from '@variant-chess/shared-types';
import type {
  Coordinate,
  Piece,
  PieceId,
  PieceInput,
  PieceType,
  PlayerSide,
} from '@variant-chess/shared-types';
import { coordinateToIndex } from './coordinates.js';

export interface Board {
  readonly cells: readonly (PieceId | null)[];
  readonly pieces: Readonly<Record<string, Piece>>;
}

export function createBoard(input: readonly PieceInput[] = []): Board {
  const cells: (PieceId | null)[] = Array<PieceId | null>(BOARD_CELL_COUNT).fill(null);
  const pieces: Record<string, Piece> = {};
  for (const entry of input) {
    const piece = PieceSchema.parse(entry);
    if (Object.hasOwn(pieces, piece.id)) throw new Error(`Duplicate piece identity: ${piece.id}`);
    const index = coordinateToIndex(piece.position);
    if (cells[index] !== null) throw new Error(`Cell is occupied: ${index}`);
    cells[index] = piece.id;
    pieces[piece.id] = piece;
  }
  return Object.freeze({ cells: Object.freeze(cells), pieces: Object.freeze(pieces) });
}

export function getPiece(board: Board, id: PieceId): Piece | undefined {
  return Object.hasOwn(board.pieces, id) ? board.pieces[id] : undefined;
}

export function getPieceAt(board: Board, position: Coordinate): Piece | undefined {
  const id = board.cells[coordinateToIndex(position)];
  return id == null ? undefined : getPiece(board, id);
}

const BACK_RANK: readonly PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'queen',
  'bishop',
  'knight',
  'rook',
  'bishop',
  'knight',
  'rook',
];

export function createInitialBoard(): Board {
  const pieces: PieceInput[] = [];
  for (const side of ['white', 'black'] as const satisfies readonly PlayerSide[]) {
    for (let file = 0; file < BOARD_SIZE; file++) {
      const backType = BACK_RANK[file];
      if (!backType) throw new Error('Initial layout is incomplete');
      for (const [currentType, rankIndex] of [
        [backType, side === 'white' ? 0 : 14],
        ['pawn', side === 'white' ? 1 : 13],
      ] as const) {
        pieces.push({
          id: `${side}-${String.fromCharCode(65 + file)}${rankIndex + 1}`,
          originalSide: side,
          owner: side,
          controller: side,
          baseType: currentType,
          currentType,
          position: { file, rankIndex },
        });
      }
    }
  }
  return createBoard(pieces);
}
