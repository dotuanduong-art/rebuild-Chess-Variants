import { expect, it } from 'vitest';
import { runShockwaveAcceptance } from './shockwave.acceptance.js';

it.each(['white', 'black'] as const)(
  'completes real Shockwave AP0/funding/blocked-and-valid push/restore/replay for %s',
  (side) => {
    const result = runShockwaveAcceptance(side, `shockwave-${side}`);
    expect(result.earnedAP).toBe(4);
    expect(result.castCost).toBe(4);
    expect(result.finalAP).toEqual(
      side === 'white' ? { white: 0, black: 3 } : { white: 3, black: 0 },
    );
    expect(result.displaced).toBe(1);
    expect(result.blocked).toBe(1);
    expect(result.restoredHash).toBe(result.finalHash);
  },
);

it('normalizes actual exported-API displacement under coherent match/piece identity renaming', () => {
  const a = runShockwaveAcceptance('white', 'alpha-a'),
    b = runShockwaveAcceptance('white', 'alpha-b');
  expect(a.semanticKey).toBe(b.semanticKey);
  expect(a.finalHash).not.toBe(b.finalHash);
});
