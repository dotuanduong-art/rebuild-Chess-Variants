import { expect, it } from 'vitest';
import { PieceIdSchema, PieceSchema } from '@variant-chess/shared-types';
import {
  createBoard,
  coordinateToAlgebraic,
  generateBaseMoves,
  generateMovementGeometry,
} from '../src/index.js';
import { piece } from './fixtures.js';
import type { PieceType } from '@variant-chess/shared-types';
import type { Board } from '../src/index.js';

function destinations(board: Board, id = 'mover'): string[] {
  return generateBaseMoves(board, PieceIdSchema.parse(id))
    .map((move) => coordinateToAlgebraic(move.to))
    .sort();
}

const straight = [
  'A8',
  'B8',
  'C8',
  'D8',
  'E8',
  'F8',
  'G8',
  'I8',
  'J8',
  'K8',
  'L8',
  'M8',
  'N8',
  'O8',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'H7',
  'H9',
  'H10',
  'H11',
  'H12',
  'H13',
  'H14',
  'H15',
];
const diagonal = [
  'A1',
  'B2',
  'C3',
  'D4',
  'E5',
  'F6',
  'G7',
  'I9',
  'J10',
  'K11',
  'L12',
  'M13',
  'N14',
  'O15',
  'A15',
  'B14',
  'C13',
  'D12',
  'E11',
  'F10',
  'G9',
  'I7',
  'J6',
  'K5',
  'L4',
  'M3',
  'N2',
  'O1',
];
const knight = ['F7', 'F9', 'G6', 'G10', 'I6', 'I10', 'J7', 'J9'];

it.each([
  ['rook', straight],
  ['bishop', [...diagonal, 'G8', 'I8']],
  ['queen', [...straight, ...diagonal]],
  ['knight', knight],
  ['king', ['G7', 'G8', 'G9', 'H7', 'H9', 'I7', 'I8', 'I9']],
  ['pawn', ['H9']],
] as const)('generates the complete literal %s pattern from H8', (type, expected) => {
  const board = createBoard([piece('mover', type, 'H8')]);
  expect(destinations(board)).toEqual([...expected].sort());
});

it('describes controlled Pawn geometry independently of board occupancy or action legality', () => {
  const pawn = PieceSchema.parse(piece('pawn', 'pawn', 'H2', 'white', 'black'));
  expect(generateMovementGeometry(pawn)).toEqual([
    { fileDelta: 0, rankDelta: 1, maxSteps: 2, occupancy: 'empty', path: 'clear' },
    { fileDelta: -1, rankDelta: 1, maxSteps: 1, occupancy: 'enemy', path: 'clear' },
    { fileDelta: 1, rankDelta: 1, maxSteps: 1, occupancy: 'enemy', path: 'clear' },
  ]);
});

it('blocks a Pawn double step at either intermediate or destination occupancy and never captures forward', () => {
  for (const controller of ['white', 'black'] as const) {
    expect(
      destinations(
        createBoard([piece('mover', 'pawn', 'H2'), piece('blocker', 'rook', 'H3', controller)]),
      ),
    ).toEqual([]);
    expect(
      destinations(
        createBoard([piece('mover', 'pawn', 'H2'), piece('blocker', 'rook', 'H4', controller)]),
      ),
    ).toEqual(['H3']);
  }
});

it.each([
  ['H2', 'white', ['H3', 'H4']],
  ['H3', 'white', ['H4']],
  ['H14', 'black', ['H12', 'H13']],
  ['H13', 'black', ['H12']],
  ['H14', 'white', ['H15']],
  ['H2', 'black', ['H1']],
  ['H15', 'white', []],
  ['H1', 'black', []],
] as const)(
  'uses controller %s/%s direction and starting rank, not owner or original side',
  (square, controller, expected) => {
    const owner = controller === 'white' ? 'black' : 'white';
    expect(destinations(createBoard([piece('mover', 'pawn', square, controller, owner)]))).toEqual(
      [...expected].sort(),
    );
  },
);

it('uses both controllers for friendly/enemy capture while preserving both owners (B1-01)', () => {
  const board = createBoard([
    piece('mover', 'pawn', 'H2', 'white', 'black'),
    piece('enemy', 'rook', 'G3', 'black', 'white'),
    piece('friendly', 'rook', 'I3', 'white', 'black'),
  ]);
  expect(destinations(board)).toEqual(['G3', 'H3', 'H4']);
  expect(
    generateBaseMoves(board, PieceIdSchema.parse('mover')).filter(
      (move) => move.kind === 'capture',
    ),
  ).toMatchObject([{ targetId: 'enemy' }]);
});

it('handles Black diagonal captures and Pawn edge clipping', () => {
  const board = createBoard([
    piece('mover', 'pawn', 'O14', 'black', 'white'),
    piece('enemy', 'queen', 'N13'),
  ]);
  expect(destinations(board)).toEqual(['N13', 'O12', 'O13']);
  expect(
    destinations(
      createBoard([piece('mover', 'pawn', 'A2'), piece('enemy', 'rook', 'B3', 'black')]),
    ),
  ).toEqual(['A3', 'A4', 'B3']);
});

it('stops sliding at the first friendly blocker or enemy capture target', () => {
  const board = createBoard([
    piece('mover', 'rook', 'H8'),
    piece('east', 'pawn', 'K8'),
    piece('west', 'pawn', 'F8'),
    piece('north', 'pawn', 'H11', 'black'),
    piece('south', 'pawn', 'H5', 'black'),
  ]);
  expect(destinations(board)).toEqual(
    ['G8', 'H5', 'H6', 'H7', 'H9', 'H10', 'H11', 'I8', 'J8'].sort(),
  );
  const captures = generateBaseMoves(board, PieceIdSchema.parse('mover')).filter(
    (move) => move.kind === 'capture',
  );
  expect(captures.map((move) => move.targetId).sort()).toEqual(['north', 'south']);
  expect(
    captures.find((move) => move.targetId === 'north')?.path.map(coordinateToAlgebraic),
  ).toEqual(['H9', 'H10', 'H11']);
});

it('gives Bishop exactly one horizontal step with normal blocker/capture behavior', () => {
  const board = createBoard([
    piece('mover', 'bishop', 'H8'),
    piece('friend', 'pawn', 'G8'),
    piece('enemy', 'queen', 'I8', 'black'),
  ]);
  expect(destinations(board)).toEqual([...diagonal, 'I8'].sort());
  expect(destinations(board)).not.toContain('J8');
  expect(destinations(board)).not.toContain('H7');
  expect(destinations(board)).not.toContain('H9');
});

it('stops diagonal sliding at the first occupant', () => {
  const board = createBoard([
    piece('mover', 'bishop', 'H8'),
    piece('friend', 'pawn', 'F6'),
    piece('enemy', 'rook', 'K11', 'black'),
  ]);
  expect(destinations(board)).toContain('G7');
  expect(destinations(board)).not.toContain('F6');
  expect(destinations(board)).not.toContain('E5');
  expect(destinations(board)).toContain('K11');
  expect(destinations(board)).not.toContain('L12');
});

it('Knight jumps intermediate occupants but respects friendly and enemy landing occupancy', () => {
  const board = createBoard([
    piece('mover', 'knight', 'H8'),
    piece('intermediate', 'pawn', 'H9'),
    piece('friend', 'pawn', 'F7'),
    piece('enemy', 'rook', 'J9', 'black'),
  ]);
  expect(destinations(board)).toEqual(['F9', 'G6', 'G10', 'I6', 'I10', 'J7', 'J9'].sort());
  expect(
    generateBaseMoves(board, PieceIdSchema.parse('mover')).find(
      (move) => coordinateToAlgebraic(move.to) === 'J9',
    ),
  ).toMatchObject({ kind: 'capture', targetId: 'enemy', path: [{ file: 9, rankIndex: 8 }] });
});

it.each([
  ['king', ['A2', 'B1', 'B2']],
  ['knight', ['B3', 'C2']],
  ['pawn', ['A2']],
] as const)('clips %s at A1', (type, expected) => {
  expect(destinations(createBoard([piece('mover', type, 'A1')]))).toEqual([...expected].sort());
});

it.each(['rook', 'bishop', 'queen', 'knight', 'king', 'pawn'] satisfies PieceType[])(
  'keeps every %s edge candidate in bounds and unique',
  (type) => {
    for (const square of ['A1', 'O1', 'A15', 'O15']) {
      const moves = generateBaseMoves(
        createBoard([piece('mover', type, square)]),
        PieceIdSchema.parse('mover'),
      );
      const labels = moves.map((move) => coordinateToAlgebraic(move.to));
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels).not.toContain(square);
      for (const move of moves) {
        expect(move.to.file).toBeGreaterThanOrEqual(0);
        expect(move.to.file).toBeLessThan(15);
        expect(move.to.rankIndex).toBeGreaterThanOrEqual(0);
        expect(move.to.rankIndex).toBeLessThan(15);
      }
    }
  },
);

it('does not implement self-check legality, castling or en passant', () => {
  const kingBoard = createBoard([
    piece('mover', 'king', 'H1'),
    piece('rook', 'rook', 'O1'),
    piece('attacker', 'rook', 'H15', 'black'),
  ]);
  expect(destinations(kingBoard)).toEqual(['G1', 'G2', 'H2', 'I1', 'I2']);
  const pinned = createBoard([
    piece('king', 'king', 'H1'),
    piece('mover', 'rook', 'H2'),
    piece('enemy', 'rook', 'H15', 'black'),
  ]);
  expect(destinations(pinned)).toContain('G2');
  const pawnBoard = createBoard([
    piece('mover', 'pawn', 'H8'),
    piece('adjacent', 'pawn', 'I8', 'black'),
  ]);
  expect(destinations(pawnBoard)).toEqual(['H9']);
});

it('treats enemy King as a capture target without ending a game or transforming a Pawn', () => {
  const board = createBoard([piece('mover', 'pawn', 'H14'), piece('king', 'king', 'I15', 'black')]);
  expect(
    generateBaseMoves(board, PieceIdSchema.parse('mover')).find((move) => move.kind === 'capture'),
  ).toMatchObject({ targetId: 'king', to: { file: 8, rankIndex: 14 } });
  expect(board.pieces['mover']?.currentType).toBe('pawn');
  expect(board.pieces['king']?.position).toEqual({ file: 8, rankIndex: 14 });
});

it('uses current type rather than base type and rejects missing identities', () => {
  const board = createBoard([{ ...piece('mover', 'pawn', 'H8'), currentType: 'knight' }]);
  expect(destinations(board)).toEqual([...knight].sort());
  expect(board.pieces['mover']?.baseType).toBe('pawn');
  expect(() => generateBaseMoves(board, PieceIdSchema.parse('missing'))).toThrow(RangeError);
});

it('does not mutate a mutable input snapshot or alias its positions in output', () => {
  const board = JSON.parse(JSON.stringify(createBoard([piece('mover', 'rook', 'H8')]))) as Board;
  const before = JSON.stringify(board);
  const first = generateBaseMoves(board, PieceIdSchema.parse('mover'));
  const second = generateBaseMoves(board, PieceIdSchema.parse('mover'));
  expect(first).toEqual(second);
  expect(JSON.stringify(board)).toBe(before);
  expect(first[0]?.from).not.toBe(board.pieces['mover']?.position);
  expect(Object.isFrozen(first)).toBe(true);
  for (const candidate of first) {
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.path)).toBe(true);
    expect(Object.isFrozen(candidate.from)).toBe(true);
    expect(Object.isFrozen(candidate.to)).toBe(true);
  }
});

it('resolves Pawn quiet steps and enemy diagonal captures without moving any piece', () => {
  const board = createBoard([
    piece('pawn', 'pawn', 'H2'),
    piece('enemy', 'rook', 'G3', 'black'),
    piece('ally', 'rook', 'I3'),
  ]);
  const before = JSON.stringify(board);
  const moves = generateBaseMoves(board, PieceIdSchema.parse('pawn'));
  expect(moves.map((move) => `${move.kind}:${coordinateToAlgebraic(move.to)}`).sort()).toEqual([
    'capture:G3',
    'move:H3',
    'move:H4',
  ]);
  expect(moves.find((move) => move.kind === 'capture')).toMatchObject({
    targetId: 'enemy',
    from: { file: 7, rankIndex: 1 },
    to: { file: 6, rankIndex: 2 },
  });
  expect(JSON.stringify(board)).toBe(before);
});
