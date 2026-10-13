import { Color, Match } from 'game-core';

function clockState(match: Match): string {
  const state = match.getGameState();
  return JSON.stringify({
    whiteTimeLeft: state.whiteTimeLeft,
    blackTimeLeft: state.blackTimeLeft,
    lastMoveTimestamp: state.lastMoveTimestamp,
    plyIndex: state.plyIndex,
    turnStartedAtMs: state.turnStartedAtMs,
    deadline: match.nextDeadline(),
  });
}

describe('G1.6 clock characterization', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('T10: applies the existing +5s increment after elapsed leaves less than 60s', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const match = new Match();
    match.start();
    expect(
      match.makeMove(Color.White, { col: 0, row: 1 }, { col: 0, row: 2 })
        .success,
    ).toBe(true);
    expect(
      match.submitAction(
        { type: 'PASS_SKILL', player: Color.White },
        Color.White,
      ).success,
    ).toBe(true);
    match.getGameState().blackTimeLeft = 60_000;

    jest.advanceTimersByTime(1_000);
    expect(
      match.makeMove(Color.Black, { col: 0, row: 13 }, { col: 0, row: 12 })
        .success,
    ).toBe(true);
    expect(
      match.submitAction(
        { type: 'PASS_SKILL', player: Color.Black },
        Color.Black,
      ).success,
    ).toBe(true);

    expect(match.getGameState().blackTimeLeft).toBe(64_000);
  });

  it('T6: rejected wrong-turn move, skill, and pass leave clock state unchanged', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const match = new Match();
    match.start();
    const before = clockState(match);

    jest.advanceTimersByTime(5_000);
    expect(
      match.makeMove(Color.Black, { col: 0, row: 1 }, { col: 0, row: 2 })
        .success,
    ).toBe(false);
    expect(
      match.useSkill(Color.Black, 'lightning_thunder_trap', []).success,
    ).toBe(false);
    expect(
      match.submitAction(
        { type: 'PASS_SKILL', player: Color.Black },
        Color.Black,
      ).success,
    ).toBe(false);

    expect(clockState(match)).toBe(before);
  });
});
