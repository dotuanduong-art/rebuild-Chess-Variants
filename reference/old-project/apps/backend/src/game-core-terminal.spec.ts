import {
  Action,
  Color,
  createTerminalResult,
  GameState,
  Match,
  PieceType,
  TerminalReason,
} from 'game-core';

const winReasons = [
  'king_captured',
  'clock_timeout',
  'turn_timeout',
  'surrender',
  'forfeit_disconnect',
] as const satisfies readonly TerminalReason[];

function terminalEventCounter(match: Match): { count: () => number } {
  let events = 0;
  match.getEventBus().on({
    id: 'terminal-counter',
    eventType: 'OnGameOver',
    priority: 0,
    source: 'test',
    handler: () => {
      events += 1;
    },
  });
  return { count: () => events };
}

function stateHash(match: Match): string {
  const state = match.getGameState();
  return JSON.stringify({
    state: state.toSerializable(),
    moveHistory: match.getMoveHistory(),
  });
}

describe('terminal result and transition', () => {
  test.each(
    winReasons.flatMap((reason) => [
      { reason, subject: Color.White, winner: Color.Black },
      { reason, subject: Color.Black, winner: Color.White },
    ]),
  )('$reason makes $subject lose to $winner', ({ reason, subject, winner }) => {
    const match = new Match();
    match.start();
    const events = terminalEventCounter(match);

    const result = createTerminalResult(reason, subject);
    const transition = match.finish(result);

    expect(result).toEqual({
      outcome: 'win',
      winner,
      loser: subject,
      reason,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(transition).toEqual({
      success: true,
      applied: true,
      result,
      actions: [{ type: 'GAME_OVER', result }],
    });
    expect(match.getStatus()).toBe('finished');
    expect(match.getWinner()).toBe(winner);
    expect(match.getGameState().terminalResult).toEqual(result);
    expect(events.count()).toBe(1);
    expect(
      match
        .getGameState()
        .actionHistory.getAll()
        .filter((entry) => entry.action.type === 'GAME_OVER'),
    ).toHaveLength(1);
  });

  test.each([
    {
      reason: 'threefold_repetition' as const,
      expected: {
        outcome: 'draw',
        winner: null,
        reason: 'threefold_repetition',
      },
    },
    {
      reason: 'abandoned' as const,
      expected: {
        outcome: 'abandoned',
        winner: null,
        reason: 'abandoned',
        subject: null,
      },
    },
  ])(
    '$reason has no winner and preserves its distinct outcome',
    ({ reason, expected }) => {
      const match = new Match();
      match.start();
      const events = terminalEventCounter(match);
      const result = createTerminalResult(reason);

      expect(match.finish(result)).toEqual(
        expect.objectContaining({
          success: true,
          applied: true,
          result,
        }),
      );
      expect(result).toEqual(expected);
      expect(match.getWinner()).toBeNull();
      expect(match.getGameState().terminalResult).toEqual(expected);
      expect(events.count()).toBe(1);
    },
  );

  it('is first-write-wins and leaves state, events, history, AP, and clocks unchanged on retries', () => {
    const match = new Match();
    match.start();
    const events = terminalEventCounter(match);
    const original = createTerminalResult('surrender', Color.White);

    expect(match.finish(original).applied).toBe(true);
    const before = stateHash(match);
    const historyCount = match.getGameState().actionHistory.getAll().length;
    const apAndClocks = {
      whiteAP: match.getGameState().whiteAP,
      blackAP: match.getGameState().blackAP,
      whiteTimeLeft: match.getGameState().whiteTimeLeft,
      blackTimeLeft: match.getGameState().blackTimeLeft,
    };

    for (const retry of [
      createTerminalResult('surrender', Color.White),
      createTerminalResult('clock_timeout', Color.Black),
    ]) {
      expect(match.finish(retry)).toEqual({
        success: true,
        applied: false,
        result: original,
        actions: [],
      });
      expect(stateHash(match)).toBe(before);
      expect(match.getGameState().actionHistory.getAll()).toHaveLength(
        historyCount,
      );
      expect({
        whiteAP: match.getGameState().whiteAP,
        blackAP: match.getGameState().blackAP,
        whiteTimeLeft: match.getGameState().whiteTimeLeft,
        blackTimeLeft: match.getGameState().blackTimeLeft,
      }).toEqual(apAndClocks);
      expect(events.count()).toBe(1);
    }
  });

  it('rejects a terminal transition while waiting without mutation', () => {
    const match = new Match();
    const before = stateHash(match);

    expect(match.finish(createTerminalResult('abandoned'))).toEqual({
      success: false,
      applied: false,
      result: null,
      reason: 'Match is not in progress',
      actions: [],
    });
    expect(stateHash(match)).toBe(before);
  });

  it('routes a valid core surrender through the terminal transition', () => {
    const match = new Match();
    match.start();
    const events = terminalEventCounter(match);

    const result = match.submitAction(
      { type: 'SURRENDER', player: Color.White },
      Color.White,
    );

    expect(result.success).toBe(true);
    expect(result.actions.map((action) => action.type)).toEqual([
      'SURRENDER',
      'GAME_OVER',
    ]);
    expect(match.getGameState().terminalResult).toEqual(
      createTerminalResult('surrender', Color.White),
    );
    expect(events.count()).toBe(1);
  });

  it('routes a King capture through the terminal transition', () => {
    const match = new Match();
    match.start();
    const state = match.getGameState();
    const events = terminalEventCounter(match);
    const whiteKingPosition = { col: 5, row: 5 };
    const blackRookPosition = { col: 5, row: 6 };
    state.currentTurn = Color.Black;
    state.board.setPiece(whiteKingPosition, {
      id: 'terminal-white-king',
      type: PieceType.King,
      color: Color.White,
      effects: [],
    });
    state.board.setPiece(blackRookPosition, {
      id: 'terminal-black-rook',
      type: PieceType.Rook,
      color: Color.Black,
      effects: [],
    });

    const result = match.makeMove(
      Color.Black,
      blackRookPosition,
      whiteKingPosition,
    );

    expect(result.success).toBe(true);
    expect(state.terminalResult).toEqual(
      createTerminalResult('king_captured', Color.White),
    );
    expect(events.count()).toBe(1);
  });

  it('lets Phoenix rebirth before terminal and ends only after the reborn King dies', () => {
    const match = new Match();
    match.setVariants('phoenix', 'lightning');
    match.start();
    const events = terminalEventCounter(match);
    const state = match.getGameState();
    const firstKing = state.board.getPiece({ col: 7, row: 0 })!;

    match.submitAction({
      type: 'DESTROY_PIECE',
      pieceId: firstKing.id,
      position: { col: 7, row: 0 },
      reason: 'capture',
    });

    expect(state.status).toBe('playing');
    expect(state.terminalResult).toBeNull();
    expect(events.count()).toBe(0);

    const rebornKing = state.board.getPiece({ col: 7, row: 0 })!;
    match.submitAction({
      type: 'DESTROY_PIECE',
      pieceId: rebornKing.id,
      position: { col: 7, row: 0 },
      reason: 'capture',
    });

    expect(state.terminalResult).toEqual(
      createTerminalResult('king_captured', Color.White),
    );
    expect(events.count()).toBe(1);
  });

  it('awards simultaneous King deaths to the active player with one terminal event', () => {
    const match = new Match();
    match.start();
    const state = match.getGameState();
    const events = terminalEventCounter(match);
    const whiteKingPos = { col: 7, row: 0 };
    const blackKingPos = { col: 7, row: 14 };
    const whiteKing = state.board.getPiece(whiteKingPos)!;
    const blackKing = state.board.getPiece(blackKingPos)!;

    match.getEventBus().on({
      id: 'destroy-opposing-king-in-same-chain',
      eventType: 'OnPieceDestroyed',
      priority: 0,
      source: 'test',
      handler: (event, enqueue) => {
        const destroyedPiece = event.payload.pieceSnapshot as { id?: unknown };
        if (destroyedPiece.id === whiteKing.id) {
          enqueue({
            type: 'DESTROY_PIECE',
            pieceId: blackKing.id,
            position: blackKingPos,
            reason: 'test_chain',
          });
        }
      },
    });

    const result = match.submitAction({
      type: 'DESTROY_PIECE',
      pieceId: whiteKing.id,
      position: whiteKingPos,
      reason: 'test_chain',
    });

    expect(result.success).toBe(true);
    expect(state.currentTurn).toBe(Color.White);
    expect(state.terminalResult).toEqual(
      createTerminalResult('king_captured', Color.Black),
    );
    expect(events.count()).toBe(1);
    expect(
      state.actionHistory
        .getAll()
        .filter((entry) => entry.action.type === 'GAME_OVER'),
    ).toHaveLength(1);
  });

  it('rejects every player root command after terminal without mutation', () => {
    const match = new Match();
    match.start();
    match.finish(createTerminalResult('abandoned'));
    const state = match.getGameState();
    const pawn = state.board.getPiece({ col: 0, row: 1 })!;
    const actions: Action[] = [
      {
        type: 'MOVE_PIECE',
        pieceId: pawn.id,
        from: { col: 0, row: 1 },
        to: { col: 0, row: 2 },
      },
      {
        type: 'USE_SKILL',
        player: Color.White,
        skillId: 'missing',
        targets: [],
      },
      { type: 'PASS_SKILL', player: Color.White },
      { type: 'SURRENDER', player: Color.White },
    ];

    for (const action of actions) {
      const before = stateHash(match);
      expect(match.submitAction(action, Color.White)).toEqual({
        success: false,
        reason: 'Match is not in progress',
        actions: [],
      });
      expect(stateHash(match)).toBe(before);
    }
  });

  it('round-trips terminalResult and exposes it without revealing hidden board data', () => {
    const match = new Match();
    match.start();
    const state = match.getGameState();
    state.board.addCellEffect(
      { col: 4, row: 4 },
      {
        id: 'hidden-terminal-probe',
        type: 'thunder_trap',
        duration: 1,
        remainingDuration: 1,
        tickTiming: 'turnEnd',
        sourcePlayer: Color.White,
        targetType: 'cell',
        targetId: '4,4',
        stackingRule: 'ignore',
        isDebuff: true,
        isHidden: true,
        metadata: {},
      },
    );
    const terminalResult = createTerminalResult('threefold_repetition');
    match.finish(terminalResult);

    const serialized = state.toSerializable();
    const restored = GameState.fromSerializable(serialized);
    const restoredFromMismatchedLegacyWinner = GameState.fromSerializable({
      ...serialized,
      winner: Color.White,
    });
    const blackView = match.serializeForPlayer(Color.Black);

    expect(restored.terminalResult).toEqual(terminalResult);
    expect(restored.winner).toBeNull();
    expect(restoredFromMismatchedLegacyWinner.winner).toBeNull();
    expect(blackView.terminalResult).toEqual(terminalResult);
    expect(blackView.board.cellEffects?.['4,4']).toBeUndefined();
  });
});
