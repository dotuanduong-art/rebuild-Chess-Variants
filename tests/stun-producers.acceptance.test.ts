import { expect, it } from 'vitest';
import { runJudgmentChainsAcceptance, runHolySealAcceptance } from './stun-producers.acceptance.js';

it.each(['white', 'black'] as const)(
  'funds/casts/expires/replays real Judgment Chains for %s via package exports',
  (side) => {
    const result = runJudgmentChainsAcceptance(side, `chains-${side}`);
    expect(result.earnedAP).toBe(5);
    expect(result.castCost).toBe(5);
    expect(result.remainingAP).toBe(0);
    expect(result.restoredHash).toBe(result.finalHash);
  },
);
it.each(['white', 'black'] as const)(
  'funds/casts/expires/replays real Holy Seal for %s via package exports',
  (side) => {
    const result = runHolySealAcceptance(side, `seal-${side}`);
    expect(result.earnedAP).toBe(6);
    expect(result.castCost).toBe(6);
    expect(result.remainingAP).toBe(0);
    expect(result.restoredHash).toBe(result.finalHash);
  },
);
it.each([
  ['Chains', runJudgmentChainsAcceptance],
  ['Seal', runHolySealAcceptance],
] as const)('%s real ActionReady projections survive renamed match/piece allocations', (_, run) => {
  const a = run('white', 'alpha-a');
  const b = run('white', 'alpha-b');
  expect(a.semanticKey).toBe(b.semanticKey);
  expect(a.finalHash).not.toBe(b.finalHash);
});
