import type { PieceInput, RootCommand } from '@variant-chess/shared-types';
import type { RulesetBundle } from '@variant-chess/game-core';
import { createShockwaveExperimentalRuleset } from '../src/index.js';
import { game, unit } from './holy-shield.fixture.js';

export const shockwaveCast = (center = 'center'): Extract<RootCommand, { kind: 'skill' }> => ({
  kind: 'skill',
  skillId: 'dragon_sentinel.shockwave',
  intent: { kind: 'piece-target-v1', pieceId: center as never },
});
// TRUSTED_TEST_ONLY reduced board/AP fixture. AP0 gameplay acceptance is separate.
export const shockwaveGame = (
  rules: RulesetBundle = createShockwaveExperimentalRuleset({ white: true, black: true }),
  ap = 20,
  pieces: readonly PieceInput[] = [
    unit('center', 'rook', 'H8'),
    unit('enemy', 'rook', 'I8', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ],
  matchId = 'shockwave',
) => game(rules, ap, pieces, matchId);
