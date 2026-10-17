import { expect, it } from 'vitest';
import { runTransferenceAcceptance } from './transference.acceptance.js';

it.each(['white', 'black'] as const)(
  'real exported Turtle AP0 acceptance, restore and replay for %s',
  (side) => {
    expect(runTransferenceAcceptance(side, `transference-public-${side}`)).toMatchObject({
      sourcePlayer: side,
      earnedAP: 4,
      cost: 4,
      swappedEffects: 2,
      engineVersion: '0.8.0',
    });
  },
);
