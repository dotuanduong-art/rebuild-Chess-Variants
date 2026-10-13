import { Color, oppositeColor } from '../pieces/Piece';

export type TerminalReason =
  | 'king_captured'
  | 'clock_timeout'
  | 'turn_timeout'
  | 'surrender'
  | 'forfeit_disconnect'
  | 'threefold_repetition'
  | 'abandoned';

export type WinTerminalReason = Exclude<
  TerminalReason,
  'threefold_repetition' | 'abandoned'
>;

export type TerminalResult =
  | Readonly<{
      outcome: 'win';
      winner: Color;
      loser: Color;
      reason: WinTerminalReason;
    }>
  | Readonly<{
      outcome: 'draw';
      winner: null;
      reason: 'threefold_repetition';
    }>
  | Readonly<{
      outcome: 'abandoned';
      winner: null;
      reason: 'abandoned';
      subject: Color | null;
    }>;

export function createTerminalResult(
  reason: TerminalReason,
  subject: Color | null = null
): TerminalResult {
  if (reason === 'threefold_repetition') {
    return Object.freeze({
      outcome: 'draw' as const,
      winner: null,
      reason,
    });
  }

  if (reason === 'abandoned') {
    return Object.freeze({
      outcome: 'abandoned' as const,
      winner: null,
      reason,
      subject,
    });
  }

  if (subject === null) {
    throw new Error(`Terminal reason ${reason} requires a subject color`);
  }

  return Object.freeze({
    outcome: 'win' as const,
    winner: oppositeColor(subject),
    loser: subject,
    reason,
  });
}

export function restoreTerminalResult(result: TerminalResult): TerminalResult {
  if (result.outcome === 'win') {
    return createTerminalResult(result.reason, result.loser);
  }
  if (result.outcome === 'draw') {
    return createTerminalResult(result.reason);
  }
  return createTerminalResult(result.reason, result.subject);
}
