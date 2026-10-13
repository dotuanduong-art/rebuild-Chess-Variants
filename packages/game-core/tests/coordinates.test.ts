import { expect, it } from 'vitest';
import {
  coordinateFromAlgebraic,
  coordinateToAlgebraic,
  coordinateFromIndex,
  coordinateToIndex,
  isInBounds,
} from '../src/index.js';

it('converts canonical A1/H8/O15 coordinates and cell indexes', () => {
  expect(coordinateFromAlgebraic('A1')).toEqual({ file: 0, rankIndex: 0 });
  expect(coordinateFromAlgebraic('H8')).toEqual({ file: 7, rankIndex: 7 });
  expect(coordinateFromAlgebraic('O15')).toEqual({ file: 14, rankIndex: 14 });
  expect(coordinateToAlgebraic({ file: 14, rankIndex: 14 })).toBe('O15');
  expect(coordinateToIndex({ file: 7, rankIndex: 7 })).toBe(112);
  expect(coordinateFromIndex(224)).toEqual({ file: 14, rankIndex: 14 });
});

it.each([
  ['O1', 14],
  ['A15', 210],
  ['M3', 42],
  ['E12', 169],
] as const)('maps %s to independently worked cell index %i', (square, index) => {
  expect(coordinateToIndex(coordinateFromAlgebraic(square))).toBe(index);
  expect(coordinateToAlgebraic(coordinateFromIndex(index))).toBe(square);
});

it.each(['A0', 'A16', 'P1', 'a1', 'A01', ' A1', 'O15 ', '', 'AA1'])(
  'rejects noncanonical or out-of-board square %s',
  (square) => {
    expect(() => coordinateFromAlgebraic(square)).toThrow(RangeError);
  },
);

it.each([-1, 225, 1.5, NaN, Infinity])('rejects invalid cell index %s', (index) => {
  expect(() => coordinateFromIndex(index)).toThrow(RangeError);
});

it.each([
  { file: -1, rankIndex: 0 },
  { file: 15, rankIndex: 0 },
  { file: 0, rankIndex: 15 },
  { file: 0, rankIndex: -1 },
  { file: 0.5, rankIndex: 0 },
  { file: 0, rankIndex: NaN },
])('checks integer coordinate bounds %j', (position) => {
  expect(isInBounds(position)).toBe(false);
  expect(() => coordinateToAlgebraic(position)).toThrow(RangeError);
});

it('round-trips all 225 cells bijectively without changing coordinate inputs', () => {
  const squares = new Set<string>();
  for (let index = 0; index < 225; index++) {
    const position = coordinateFromIndex(index);
    expect(isInBounds(position)).toBe(true);
    expect(coordinateToIndex(position)).toBe(index);
    expect(coordinateFromAlgebraic(coordinateToAlgebraic(position))).toEqual(position);
    squares.add(coordinateToAlgebraic(position));
  }
  expect(squares.size).toBe(225);
});
