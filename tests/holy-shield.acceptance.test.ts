import { expect, it } from 'vitest';
import { runHolyShieldAcceptance } from './holy-shield.acceptance.js';
import {
  createBoard,
  resolveCommand,
  encodeSnapshot,
  decodeEffectRecords,
} from '@variant-chess/game-core';
import type { GameState } from '@variant-chess/shared-types';

it.each(['white', 'black'] as const)(
  'accepts the public-API Holy Shield workflow for %s',
  (side) => {
    const evidence = runHolyShieldAcceptance(side, `acceptance-${side}`);
    expect(evidence).toMatchObject({
      sourcePlayer: side,
      startingAP: { white: 0, black: 0 },
      earnedAP: 4,
      castCost: 4,
      durationRounds: 2,
      sourceEndDeadline: 4,
      captureRejection: 'CAPTURE_DEFENDED',
      committedOnlyReplay: true,
    });
  },
);

it('preserves semantic repetition across coherently renamed public-API runs', () => {
  const left = runHolyShieldAcceptance('white', 'semantic-left');
  const right = runHolyShieldAcceptance('white', 'semantic-right');
  expect(left.readyKey).toBe(right.readyKey);
  expect(left.finalHash).not.toBe(right.finalHash);
});

it('accepts an ordinary King but rejects the same chess type with unsupported or missing provenance', () => {
  const { funded, rules, kingId } = runHolyShieldAcceptance('white', 'king-eligibility');
  const input = {
    authority: { kind: 'player', side: 'white' },
    command: {
      kind: 'skill',
      skillId: 'guardian.holy_shield',
      intent: { kind: 'piece-target-v1', pieceId: kingId },
    },
  };
  const accepted = resolveCommand(funded, input, rules);
  expect(accepted.ok).toBe(true);
  if (!accepted.ok) throw new Error(accepted.code);
  expect(accepted.state.ap.white).toBe(0);
  expect(
    decodeEffectRecords(accepted.state.effects, rules.effectRegistry!, accepted.state)[0]?.target,
  ).toEqual({ kind: 'piece', pieceId: kingId });
  for (const origin of ['special', 'summoned', null] as const) {
    // TRUSTED_TEST_ONLY negative setup branch. Never mutate funded or run this altered board in the positive replay.
    const board = createBoard(
      Object.values(funded.board.pieces).map((piece) => {
        if (piece.id !== kingId) return piece;
        if (origin) return { ...piece, origin };
        const { origin: omitted, ...unclassified } = piece;
        void omitted;
        return unclassified;
      }),
    );
    const unsupported: GameState = { ...funded, board: board as GameState['board'] };
    const before = encodeSnapshot(unsupported, rules.effectRegistry);
    expect(resolveCommand(unsupported, input, rules)).toEqual({
      ok: false,
      code: 'UNSUPPORTED_UNIT',
      events: [],
    });
    expect(encodeSnapshot(unsupported, rules.effectRegistry)).toBe(before);
  }
});
