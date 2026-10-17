import { expect, it } from 'vitest';
import { runSanctuaryAcceptance } from './sanctuary.acceptance.js';

it.each(['white', 'black'] as const)('real Sanctuary public AP0 acceptance for %s', (side) => {
  const result = runSanctuaryAcceptance(side, `sanctuary-public-${side}`);
  expect(result).toMatchObject({
    sourcePlayer: side,
    earnedAP: 5,
    cost: 5,
    regionRounds: 3,
    stunRounds: 1,
    finalRegions: 0,
    finalEffects: 0,
  });
});

it('coherent piece/match renaming preserves Sanctuary semantic final position', () => {
  const a = runSanctuaryAcceptance('white', 'public-alpha-a');
  const b = runSanctuaryAcceptance('white', 'public-alpha-b');
  expect(a.repetitionKey).toBe(b.repetitionKey);
  expect(a.fullHash).not.toBe(b.fullHash);
});
