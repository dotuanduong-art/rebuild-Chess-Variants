import { expect, it } from 'vitest';
import { runLiveChargeAcceptance } from './live-charge.acceptance.js';

it.each(['white', 'black'] as const)(
  'completes the exported-API AP0/cast/capture/blast/restore/replay workflow for %s',
  (side) => {
    const result = runLiveChargeAcceptance(side, `acceptance-${side}`);
    expect(result.ap).toEqual(side === 'white' ? { white: 5, black: 11 } : { white: 11, black: 5 });
    expect(result.explosionCount).toBe(1);
    expect(result.commandCount).toBe(side === 'white' ? 7 : 9);
  },
);

it('normalizes renamed matches/pieces/allocation IDs while preserving Bomb family/category/source/permanence', () => {
  const a = runLiveChargeAcceptance('white', 'allocation-a');
  const b = runLiveChargeAcceptance('white', 'allocation-b', 37);
  expect(a.semanticKey).toBe(b.semanticKey);
  expect(a.finalHash).not.toEqual(b.finalHash);
  expect(JSON.parse(a.semanticKey).effects).toEqual([
    {
      definitionId: 'effect.bomb.charge',
      definitionVersion: '1.0.0',
      family: { id: 'bomb', policy: 'unique-target-ignore' },
      category: 'buff',
      data: {
        target: { kind: 'piece', position: { file: 3, rankIndex: 3 } },
        lifetime: { kind: 'permanent' },
        source: {
          player: 'white',
          variant: 'dynamite',
          skill: 'dynamite.live_charge',
          piece: null,
          incarnation: null,
        },
      },
    },
  ]);
});
