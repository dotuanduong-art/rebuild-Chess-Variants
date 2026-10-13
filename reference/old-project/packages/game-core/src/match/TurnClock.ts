import { Color } from "../pieces/Piece";

export const INITIAL_CHESS_CLOCK_MS = 15 * 60 * 1000;
export const HARD_TURN_TIMEOUT_MS = 15_000;
export const LOW_TIME_INCREMENT_MS = 5_000;
export const LOW_TIME_THRESHOLD_MS = 60_000;

export type ClockTimeoutReason = "clock_timeout" | "turn_timeout";

export interface TurnDeadline {
  atMs: number;
  loser: Color;
  reason: ClockTimeoutReason;
  plyIndex: number;
}

export interface TurnClockState {
  whiteTimeLeft: number;
  blackTimeLeft: number;
  plyIndex: number;
  turnStartedAtMs: number;
  clockActiveColor: Color | null;
}

export class TurnClock {
  constructor(private readonly state: TurnClockState) {}

  startPly(color: Color, plyIndex: number, nowMs: number): void {
    this.state.clockActiveColor = color;
    this.state.plyIndex = plyIndex;
    this.state.turnStartedAtMs = nowMs;
  }

  endPly(nowMs: number): void {
    const color = this.state.clockActiveColor;
    if (color === null) return;

    const elapsed = Math.max(0, nowMs - this.state.turnStartedAtMs);
    const remaining = Math.max(0, this.remainingFor(color) - elapsed);
    this.setRemainingFor(
      color,
      remaining > 0 && remaining < LOW_TIME_THRESHOLD_MS
        ? remaining + LOW_TIME_INCREMENT_MS
        : remaining,
    );
    this.state.clockActiveColor = null;
  }

  endPlyWithoutClockChange(): void {
    this.state.clockActiveColor = null;
  }

  nextDeadline(): TurnDeadline | null {
    const loser = this.state.clockActiveColor;
    if (loser === null) return null;

    const remainingClock = this.remainingFor(loser);
    const hardTimeout =
      this.state.plyIndex === 0 && loser === Color.White
        ? Number.POSITIVE_INFINITY
        : HARD_TURN_TIMEOUT_MS;

    return {
      atMs: this.state.turnStartedAtMs + Math.min(remainingClock, hardTimeout),
      loser,
      reason: remainingClock <= hardTimeout ? "clock_timeout" : "turn_timeout",
      plyIndex: this.state.plyIndex,
    };
  }

  private remainingFor(color: Color): number {
    return color === Color.White
      ? this.state.whiteTimeLeft
      : this.state.blackTimeLeft;
  }

  private setRemainingFor(color: Color, remainingMs: number): void {
    if (color === Color.White) {
      this.state.whiteTimeLeft = remainingMs;
    } else {
      this.state.blackTimeLeft = remainingMs;
    }
  }
}
