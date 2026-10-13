import { expect, it } from 'vitest';
import {
  createBoard,
  createInitialBoard,
  getPiece,
  getPieceAt,
  coordinateFromAlgebraic,
} from '../src/index.js';
import { PieceIdSchema } from '@variant-chess/shared-types';
import { piece } from './fixtures.js';

it('creates 225 cells and the approved 60-piece layout with unique stable identities', () => {
  const board = createInitialBoard();
  expect(board.cells).toHaveLength(225);
  expect(Object.values(board.pieces)).toHaveLength(60);
  expect(new Set(Object.values(board.pieces).map((piece) => piece.id)).size).toBe(60);
  expect(board.cells.filter((id) => id === null)).toHaveLength(165);
  const backRank = [
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
  for (const [side, rank, pawnRank] of [
    ['white', 1, 2],
    ['black', 15, 14],
  ] as const) {
    expect(
      'ABCDEFGHIJKLMNO'
        .split('')
        .map((file) => getPieceAt(board, coordinateFromAlgebraic(`${file}${rank}`))?.currentType),
    ).toEqual(backRank);
    expect(
      'ABCDEFGHIJKLMNO'
        .split('')
        .map(
          (file) => getPieceAt(board, coordinateFromAlgebraic(`${file}${pawnRank}`))?.currentType,
        ),
    ).toEqual(Array(15).fill('pawn'));
    expect(Object.values(board.pieces).filter((piece) => piece.owner === side)).toHaveLength(30);
    expect(getPieceAt(board, coordinateFromAlgebraic(`H${rank}`))).toMatchObject({
      originalSide: side,
      owner: side,
      controller: side,
      baseType: 'king',
      currentType: 'king',
    });
  }
  expect(createInitialBoard()).toEqual(board);
});

it('validates identity uniqueness, occupancy and piece coordinate bounds', () => {
  expect(() => createBoard([piece('same', 'rook', 'A1'), piece('same', 'knight', 'B1')])).toThrow(
    'Duplicate piece identity',
  );
  expect(() => createBoard([piece('one', 'rook', 'A1'), piece('two', 'knight', 'A1')])).toThrow(
    'occupied',
  );
  expect(() =>
    createBoard([{ ...piece('one', 'rook', 'A1'), position: { file: 15, rankIndex: 0 } }]),
  ).toThrow();
  expect(() => getPieceAt(createBoard(), { file: -1, rankIndex: 0 })).toThrow(RangeError);
});

it('keeps identity, original side, owner, controller and types separate across rebuilt positions', () => {
  const input = piece('stable', 'pawn', 'H2', 'white', 'black');
  const first = createBoard([input]);
  const second = createBoard([
    { ...input, currentType: 'queen', position: coordinateFromAlgebraic('H15') },
  ]);
  expect(getPieceAt(first, coordinateFromAlgebraic('H2'))).toMatchObject({
    id: 'stable',
    originalSide: 'black',
    owner: 'black',
    controller: 'white',
    baseType: 'pawn',
    currentType: 'pawn',
  });
  expect(getPieceAt(second, coordinateFromAlgebraic('H15'))).toMatchObject({
    id: 'stable',
    owner: 'black',
    controller: 'white',
    baseType: 'pawn',
    currentType: 'queen',
  });
  expect(first.cells.filter((id) => id !== null)).toEqual(['stable']);
  expect(input.position).toEqual({ file: 7, rankIndex: 1 });
});

it('copies and freezes data without freezing or aliasing the input', () => {
  const position = { file: 0, rankIndex: 0 };
  const input = { ...piece('piece', 'rook', 'A1'), position };
  const board = createBoard([input]);
  position.file = 2;
  expect(getPiece(board, PieceIdSchema.parse('piece'))?.position).toEqual({
    file: 0,
    rankIndex: 0,
  });
  expect(Object.isFrozen(input)).toBe(false);
  expect(Object.isFrozen(board)).toBe(true);
  expect(Object.isFrozen(board.cells)).toBe(true);
  expect(Object.isFrozen(board.pieces)).toBe(true);
  expect(Object.isFrozen(getPiece(board, PieceIdSchema.parse('piece')))).toBe(true);
  expect(Object.isFrozen(getPieceAt(board, coordinateFromAlgebraic('A1'))?.position)).toBe(true);
});

it('handles object-prototype names as ordinary identities and round-trips JSON data', () => {
  const board = createBoard([piece('constructor', 'rook', 'A1')]);
  expect(getPiece(board, PieceIdSchema.parse('constructor'))?.currentType).toBe('rook');
  expect(getPiece(createBoard(), PieceIdSchema.parse('constructor'))).toBeUndefined();
  const restored = createBoard(Object.values(JSON.parse(JSON.stringify(board)).pieces));
  expect(restored).toEqual(board);
});
