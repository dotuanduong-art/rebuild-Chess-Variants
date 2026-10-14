import { expect, it } from 'vitest';
import { createAPState, debitAP, getPieceAPValue, awardPromotionAP } from '../src/index.js';
import type { PieceType } from '@variant-chess/shared-types';

it.each([
  ['pawn', 2, 1],
  ['knight', 3, 2],
  ['bishop', 3, 2],
  ['rook', 4, 3],
  ['queen', 5, 4],
  ['king', 0, 0],
] as const)(
  'P00-06/12: %s has exactly the approved capture/loss magnitudes',
  (type: PieceType, captureReward, pieceLossReward) => {
    expect(getPieceAPValue(type)).toEqual({ captureReward, pieceLossReward });
  },
);

it('awards promotion to the specified controller and rejects arithmetic overflow without clamping', () => {
  const ap = createAPState({ white: 0, black: 40 });
  expect(awardPromotionAP(ap, 'black')).toEqual({ ok: true, value: { white: 0, black: 43 } });
  expect(
    awardPromotionAP(createAPState({ white: Number.MAX_SAFE_INTEGER, black: 0 }), 'white'),
  ).toEqual({ ok: false, code: 'NUMBER_RANGE' });
});

it('P00-06: starts both pools at zero; normal spending never creates unapproved debt', () => {
  expect(createAPState()).toEqual({ white: 0, black: 0 });
  const ap = createAPState({ white: 1000000, black: 7 });
  expect(debitAP(ap, 'white', 999999)).toEqual({ ok: true, value: { white: 1, black: 7 } });
  expect(ap).toEqual({ white: 1000000, black: 7 });
  expect(debitAP(ap, 'black', 8)).toEqual({ ok: false, code: 'INSUFFICIENT_AP' });
  expect(() => createAPState({ white: -1, black: 0 })).toThrow(RangeError);
  for (const cost of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(debitAP(ap, 'black', cost)).toEqual({ ok: false, code: 'INVALID_COST' });
  }
});
