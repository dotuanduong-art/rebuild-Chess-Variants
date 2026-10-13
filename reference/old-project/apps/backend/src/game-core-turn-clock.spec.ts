import {
  Color,
  HARD_TURN_TIMEOUT_MS,
  INITIAL_CHESS_CLOCK_MS,
  TurnClock,
  type TurnClockState,
} from 'game-core';

function createState(overrides: Partial<TurnClockState> = {}): TurnClockState {
  return {
    whiteTimeLeft: INITIAL_CHESS_CLOCK_MS,
    blackTimeLeft: INITIAL_CHESS_CLOCK_MS,
    plyIndex: 0,
    turnStartedAtMs: 0,
    clockActiveColor: null,
    ...overrides,
  };
}

describe('TurnClock', () => {
  it('T1/T2: starts the chess clock at White ply 0 without a hard deadline', () => {
    const state = createState();
    const clock = new TurnClock(state);

    clock.startPly(Color.White, 0, 1_000);

    expect(clock.nextDeadline()).toEqual({
      atMs: 1_000 + INITIAL_CHESS_CLOCK_MS,
      loser: Color.White,
      reason: 'clock_timeout',
      plyIndex: 0,
    });
  });

  it('T3: gives the first Black ply a 15 second hard deadline', () => {
    const state = createState();
    const clock = new TurnClock(state);

    clock.startPly(Color.Black, 1, 5_000);

    expect(clock.nextDeadline()).toEqual({
      atMs: 5_000 + HARD_TURN_TIMEOUT_MS,
      loser: Color.Black,
      reason: 'turn_timeout',
      plyIndex: 1,
    });
  });

  it('T4: gives a later White ply a 15 second hard deadline', () => {
    const state = createState();
    const clock = new TurnClock(state);

    clock.startPly(Color.White, 2, 20_000);

    expect(clock.nextDeadline()?.reason).toBe('turn_timeout');
    expect(clock.nextDeadline()?.atMs).toBe(35_000);
  });

  it('T5: supports 20 alternating plies committed at 14 seconds', () => {
    const state = createState();
    const clock = new TurnClock(state);
    let now = 0;
    clock.startPly(Color.White, 0, now);

    for (let plyIndex = 0; plyIndex < 20; plyIndex++) {
      now += 14_000;
      expect(clock.nextDeadline()!.atMs).toBeGreaterThan(now);
      clock.endPly(now);
      const nextColor = plyIndex % 2 === 0 ? Color.Black : Color.White;
      clock.startPly(nextColor, plyIndex + 1, now);
    }

    expect(state.whiteTimeLeft).toBe(INITIAL_CHESS_CLOCK_MS - 140_000);
    expect(state.blackTimeLeft).toBe(INITIAL_CHESS_CLOCK_MS - 140_000);
    expect(state.plyIndex).toBe(20);
  });

  it('T8: chooses chess-clock timeout when only 8 seconds remain', () => {
    const state = createState({ whiteTimeLeft: 8_000 });
    const clock = new TurnClock(state);

    clock.startPly(Color.White, 2, 50_000);

    expect(clock.nextDeadline()).toEqual({
      atMs: 58_000,
      loser: Color.White,
      reason: 'clock_timeout',
      plyIndex: 2,
    });
  });

  it('T9: gives chess clock priority when both deadlines are equal', () => {
    const state = createState({ blackTimeLeft: HARD_TURN_TIMEOUT_MS });
    const clock = new TurnClock(state);

    clock.startPly(Color.Black, 3, 100_000);

    expect(clock.nextDeadline()?.reason).toBe('clock_timeout');
    expect(clock.nextDeadline()?.atMs).toBe(115_000);
  });
});
