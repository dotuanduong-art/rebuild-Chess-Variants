import { expect, it } from 'vitest';
import { coordinateFromAlgebraic as at, sanctuaryCells } from '../src/index.js';

it('B3-03 uses the literal clipped3x3 public cells without wraparound', () => {
  expect(sanctuaryCells(at('A1'))).toEqual(['A1', 'B1', 'A2', 'B2'].map(at));
  expect(sanctuaryCells(at('O15'))).toEqual(['N14', 'O14', 'N15', 'O15'].map(at));
  expect(sanctuaryCells(at('H8'))).toEqual(
    ['G7', 'H7', 'I7', 'G8', 'H8', 'I8', 'G9', 'H9', 'I9'].map(at),
  );
});

it('the public membership query neither mutates nor freezes a caller-owned center', () => {
  const center = { file: 0, rankIndex: 0 };
  const cells = sanctuaryCells(center);
  expect(Object.isFrozen(center)).toBe(false);
  expect(Object.isFrozen(cells)).toBe(true);
  center.file = 14;
  expect(cells).toEqual(['A1', 'B1', 'A2', 'B2'].map(at));
});
