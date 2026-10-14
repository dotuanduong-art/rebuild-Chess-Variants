import { expect, it } from 'vitest';
import type { PieceType } from '@variant-chess/shared-types';
import { createAPState, settleDeathAP, createBoard } from '../src/index.js';
import { piece } from './fixtures.js';

it.each([
  ['pawn', 3],
  ['knight', 5],
  ['bishop', 5],
  ['rook', 7],
  ['queen', 9],
  ['king', 0],
] as const)(
  'B2-01/P00-06: committed %s capture gives both rewards to the same player when owner differs from victim controller',
  (type: PieceType, totalReward) => {
    const victim = Object.values(
      createBoard([piece('victim', type, 'H8', 'black', 'white')]).pieces,
    )[0]!;
    const ap = createAPState();
    const result = settleDeathAP(ap, {
      status: 'committed',
      reason: 'capture',
      victim,
      capturingController: 'white',
    });
    expect(result).toEqual({ ok: true, value: { white: totalReward, black: 0 } });
    expect(ap).toEqual({ white: 0, black: 0 });
  },
);

it('P00-08/B2-01: candidate and canceled outcomes never award AP', () => {
  const ap = createAPState({ white: 9, black: 4 });
  for (const status of ['candidate', 'canceled'] as const) {
    expect(settleDeathAP(ap, { status })).toEqual({ ok: true, value: { white: 9, black: 4 } });
  }
});

it.each(['pawn', 'knight', 'bishop', 'rook', 'queen'] as const)(
  'Q-14: %s destruction credits only owner, never controller or caster',
  (type) => {
    const victim = Object.values(
      createBoard([piece('v', type, 'A1', 'black', 'white')]).pieces,
    )[0]!;
    const expected = { pawn: 1, knight: 2, bishop: 2, rook: 3, queen: 4 }[type];
    expect(
      settleDeathAP(createAPState(), { status: 'committed', reason: 'destruction', victim }),
    ).toEqual({ ok: true, value: { white: expected, black: 0 } });
  },
);

it.each(['despawn', 'exile', 'transformation', 'sacrifice'])(
  'B2-01: %s is not implicitly a rewarded death',
  (reason) => {
    const victim = Object.values(createBoard([piece('v', 'queen', 'A1')]).pieces)[0]!;
    // Runtime defensive guard as well as a closed, compiler-enforced reason union.
    // @ts-expect-error unapproved removal causes are outside this contract
    expect(settleDeathAP(createAPState(), { status: 'committed', reason, victim })).toEqual({
      ok: false,
      code: 'UNAPPROVED_REMOVAL',
    });
  },
);
