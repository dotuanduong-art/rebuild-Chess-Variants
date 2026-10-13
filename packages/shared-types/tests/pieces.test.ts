import { expect, it } from 'vitest';
import { CoordinateSchema, PieceSchema } from '../src/index.js';

const input = {
  id: 'stable-piece',
  originalSide: 'black',
  owner: 'black',
  controller: 'white',
  baseType: 'pawn',
  currentType: 'queen',
  position: { file: 7, rankIndex: 14 },
} as const;

it('validates a serializable piece without merging owner/controller or base/current type', () => {
  const piece = PieceSchema.parse(JSON.parse(JSON.stringify(input)));
  expect(piece).toEqual(input);
  expect(Object.isFrozen(piece)).toBe(true);
  expect(Object.isFrozen(piece.position)).toBe(true);
  expect(Object.isFrozen(input)).toBe(false);
});

it.each([
  { ...input, id: '' },
  { ...input, owner: 'neutral' },
  { ...input, controller: 'neutral' },
  { ...input, originalSide: 'neutral' },
  { ...input, baseType: 'titan' },
  { ...input, currentType: 'titan' },
  { ...input, position: { file: 7, rankIndex: 15 } },
  { ...input, position: { file: 7.5, rankIndex: 0 } },
  { ...input, effects: [] },
])('rejects invalid identities/types/positions or out-of-scope fields %j', (value) => {
  expect(PieceSchema.safeParse(value).success).toBe(false);
});

it('rejects nonfinite or unknown coordinate fields', () => {
  expect(CoordinateSchema.safeParse({ file: Infinity, rankIndex: 0 }).success).toBe(false);
  expect(CoordinateSchema.safeParse({ file: 0, rankIndex: 0, rank: 1 }).success).toBe(false);
});
