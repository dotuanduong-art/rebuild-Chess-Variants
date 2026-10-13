import { Color, PieceType, type TerminalResult } from 'game-core';
import {
  type CommandContext,
  type CommittedRoomEvent,
  GameService,
  type Player,
  type Room,
} from './game.service.js';

interface StartedRoom {
  room: Room;
  white: Player;
  black: Player;
  whiteContext: CommandContext;
  blackContext: CommandContext;
}

function startRoom(
  service: GameService,
  onAsyncEvent?: (event: CommittedRoomEvent) => void,
): StartedRoom {
  const created = service.createRoom('socket_white');
  const joined = service.joinRoom(created.roomCode, 'socket_black');
  expect(joined.success).toBe(true);
  expect(service.startMatch(created.roomCode, onAsyncEvent).success).toBe(true);

  const room = service.getRoom(created.roomCode)!;
  const white = room.players.find((player) => player.color === Color.White)!;
  const black = room.players.find((player) => player.color === Color.Black)!;
  return {
    room,
    white,
    black,
    whiteContext: service.resolveCommandContext(
      white.socketId,
      room.code,
      white.publicPlayerRef,
    )!,
    blackContext: service.resolveCommandContext(
      black.socketId,
      room.code,
      black.publicPlayerRef,
    )!,
  };
}

function createLobbyRoom(
  service: GameService,
  phase: Room['phase'],
): StartedRoom {
  const created = service.createRoom('socket_white');
  expect(service.joinRoom(created.roomCode, 'socket_black').success).toBe(true);
  const room = service.getRoom(created.roomCode)!;
  room.phase = phase;
  const white = room.players.find((player) => player.color === Color.White)!;
  const black = room.players.find((player) => player.color === Color.Black)!;
  return {
    room,
    white,
    black,
    whiteContext: service.resolveCommandContext(
      white.socketId,
      room.code,
      white.publicPlayerRef,
    )!,
    blackContext: service.resolveCommandContext(
      black.socketId,
      room.code,
      black.publicPlayerRef,
    )!,
  };
}

function eventPayloads(
  event: CommittedRoomEvent | undefined,
  eventName: string,
): Record<string, unknown>[] {
  return (
    event?.deliveries
      .filter((delivery) => delivery.event === eventName)
      .map((delivery) => delivery.payload) ?? []
  );
}

function deliveryCount(
  events: CommittedRoomEvent[],
  eventName: string,
): number {
  return events
    .flatMap((event) => event.deliveries)
    .filter((delivery) => delivery.event === eventName).length;
}

function stateHash(room: Room): string {
  return JSON.stringify(room.match!.toSerializable());
}

describe('GameService terminal funnel', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('D-02 T1: starts the White chess clock at START_MATCH and emits one terminal', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const asyncEvents: CommittedRoomEvent[] = [];
    const { room } = startRoom(service, (event) => asyncEvents.push(event));

    jest.advanceTimersByTime(900_000);

    expect(room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: Color.Black,
      loser: Color.White,
      reason: 'clock_timeout',
    });
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('D-02 T2: exempts White ply 0 from only the hard timer', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const { room } = startRoom(service);

    jest.advanceTimersByTime(60_000);

    expect(room.phase).toBe('playing');
    expect(room.match!.getGameState().terminalResult).toBeNull();
  });

  it('D-02 T3/T15: gives Black ply 1 a 15s hard deadline and logs turn_timeout once', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const { room, whiteContext } = startRoom(service);
    const asyncEvents: CommittedRoomEvent[] = [];

    jest.advanceTimersByTime(5_000);
    expect(service.makeMove(whiteContext, 'A2', 'A3').success).toBe(true);
    expect(
      service.passSkill(whiteContext, (event) => asyncEvents.push(event))
        .success,
    ).toBe(true);
    jest.advanceTimersByTime(14_999);
    expect(room.phase).toBe('playing');
    jest.advanceTimersByTime(1);

    expect(room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: Color.White,
      loser: Color.Black,
      reason: 'turn_timeout',
    });
    expect(
      room
        .match!.getGameState()
        .actionHistory.getAll()
        .filter(
          (entry) =>
            entry.action.type === 'GAME_OVER' &&
            entry.action.result.reason === 'turn_timeout',
        ),
    ).toHaveLength(1);
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('D-02 T7: using a skill mid-ply does not reset the hard deadline', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const asyncEvents: CommittedRoomEvent[] = [];
    const service = new GameService();
    const { room, whiteContext, blackContext } = startRoom(service, (event) =>
      asyncEvents.push(event),
    );
    room.match!.setVariants(null, 'lightning');
    room.match!.getGameState().blackAP = 3;
    expect(
      service.endTurn(whiteContext, (event) => asyncEvents.push(event)).success,
    ).toBe(true);

    jest.advanceTimersByTime(10_000);
    expect(
      service.useSkill(
        blackContext,
        'lightning_thunder_trap',
        [{ type: 'cell', position: { col: 4, row: 4 } }],
        (event) => asyncEvents.push(event),
      ).success,
    ).toBe(true);
    expect(room.match!.getPlyIndex()).toBe(1);
    jest.advanceTimersByTime(4_999);
    expect(room.phase).toBe('playing');
    jest.advanceTimersByTime(1);

    expect(room.match!.getGameState().terminalResult?.reason).toBe(
      'turn_timeout',
    );
    expect(room.match!.getGameState().terminalResult?.loser).toBe(Color.Black);
  });

  it('D-02 T11: timeout and surrender in the same tick produce one terminal', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const { room, whiteContext, blackContext } = startRoom(service);
    expect(service.endTurn(whiteContext).success).toBe(true);
    jest.setSystemTime(new Date('2026-01-01T00:00:15Z'));

    expect(service.surrender(blackContext).success).toBe(true);
    jest.runOnlyPendingTimers();

    expect(
      room
        .match!.getGameState()
        .actionHistory.getAll()
        .filter((entry) => entry.action.type === 'GAME_OVER'),
    ).toHaveLength(1);
    expect(room.match!.getGameState().terminalResult?.reason).toBe('surrender');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('D-02 T12: ignores a callback carrying the previous ply token', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const service = new GameService();
    const { room, whiteContext } = startRoom(service);
    const staleCallback = timeoutSpy.mock.calls[0][0];

    expect(service.endTurn(whiteContext).success).toBe(true);
    staleCallback();

    expect(room.phase).toBe('playing');
    expect(room.match!.getPlyIndex()).toBe(1);
    expect(room.match!.getGameState().terminalResult).toBeNull();
    expect(jest.getTimerCount()).toBe(1);
    timeoutSpy.mockRestore();
  });

  it('D-02 T14: Electric Terrain expiry skips and stuns without terminal', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const { room, whiteContext } = startRoom(service);
    const match = room.match!;
    match.setVariants('lightning', null);
    match.getGameState().whiteAP = 8;

    expect(
      service.useSkill(whiteContext, 'lightning_electric_terrain', []).success,
    ).toBe(true);
    jest.advanceTimersByTime(3_000);

    expect(match.getCurrentTurn()).toBe(Color.Black);
    expect(match.getGameState().terminalResult).toBeNull();
    expect(
      match
        .getGameState()
        .actionHistory.getAll()
        .filter((entry) => entry.action.type === 'GAME_OVER'),
    ).toHaveLength(0);
  });

  it('allows the non-active player to surrender and publishes the canonical result once', () => {
    const service = new GameService();
    const { room, blackContext } = startRoom(service);
    expect(room.match!.getCurrentTurn()).toBe(Color.White);

    const result = service.surrender(blackContext);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const expected: TerminalResult = {
      outcome: 'win',
      winner: Color.White,
      loser: Color.Black,
      reason: 'surrender',
    };
    expect(result.winner).toBe(Color.White);
    expect(room.phase).toBe('finished');
    expect(room.match!.getGameState().terminalResult).toEqual(expected);
    expect(eventPayloads(result.event, 'match-ended')).toEqual([
      { winner: Color.White, reason: 'surrender', terminalResult: expected },
      { winner: Color.White, reason: 'surrender', terminalResult: expected },
    ]);
  });

  test.each([
    [Color.White, Color.Black],
    [Color.Black, Color.White],
  ])('uses the canonical winner when %s surrenders', (loser, winner) => {
    const service = new GameService();
    const started = startRoom(service);
    const context =
      loser === Color.White ? started.whiteContext : started.blackContext;

    const result = service.surrender(context);

    expect(result).toEqual(expect.objectContaining({ success: true, winner }));
    expect(started.room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner,
      loser,
      reason: 'surrender',
    });
  });

  it('rejects a non-seat or forged command context without changing the match', () => {
    const service = new GameService();
    const { room, whiteContext } = startRoom(service);
    const before = stateHash(room);

    const result = service.surrender({
      ...whiteContext,
      playerId: 'attacker-controlled-id',
      socketId: 'attacker-socket',
    });

    expect(result).toEqual({
      success: false,
      error: 'Match or command context is no longer valid',
    });
    expect(stateHash(room)).toBe(before);
    expect(room.phase).toBe('playing');
  });

  it('publishes a King capture from the core pipeline through the same funnel', () => {
    const service = new GameService();
    const { room, blackContext } = startRoom(service);
    const state = room.match!.getGameState();
    state.currentTurn = Color.Black;
    state.board.setPiece(
      { col: 5, row: 5 },
      {
        id: 'service-white-king',
        type: PieceType.King,
        color: Color.White,
        effects: [],
      },
    );
    state.board.setPiece(
      { col: 5, row: 6 },
      {
        id: 'service-black-rook',
        type: PieceType.Rook,
        color: Color.Black,
        effects: [],
      },
    );

    const result = service.makeMove(blackContext, 'F7', 'F6');

    expect(result.success).toBe(true);
    expect(room.phase).toBe('finished');
    expect(state.terminalResult).toEqual({
      outcome: 'win',
      winner: Color.Black,
      loser: Color.White,
      reason: 'king_captured',
    });
    expect(eventPayloads(result.event, 'match-ended')).toHaveLength(2);
    expect(eventPayloads(result.event, 'match-ended')[0]).toEqual({
      winner: Color.Black,
      reason: 'king_captured',
      terminalResult: state.terminalResult,
    });
    const afterCapture = stateHash(room);
    expect(service.surrender(blackContext)).toEqual({
      success: false,
      error: 'Match is already finished',
    });
    expect(stateHash(room)).toBe(afterCapture);
  });

  it('funnels the existing chess-clock timeout and clears every timer', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const asyncEvents: CommittedRoomEvent[] = [];
    const { room, whiteContext } = startRoom(service, (event) =>
      asyncEvents.push(event),
    );

    expect(
      service.makeMove(whiteContext, 'A2', 'A3', (event) =>
        asyncEvents.push(event),
      ).success,
    ).toBe(true);
    const timedOutColor = room.match!.getCurrentTurn();
    const expectedWinner =
      timedOutColor === Color.White ? Color.Black : Color.White;
    jest.advanceTimersByTime(900_000);

    expect(room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: expectedWinner,
      loser: timedOutColor,
      reason: 'clock_timeout',
    });
    expect(room.phase).toBe('finished');
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('funnels an active-match disconnect expiry and keeps the room reconnectable', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { room, white } = startRoom(service);
    const asyncEvents: CommittedRoomEvent[] = [];

    service.handleDisconnect(white.socketId, (event) =>
      asyncEvents.push(event),
    );
    jest.advanceTimersByTime(60_000);

    expect(service.getRoom(room.code)).toBe(room);
    expect(room.phase).toBe('finished');
    expect(room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: Color.Black,
      loser: Color.White,
      reason: 'forfeit_disconnect',
    });
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('is first-write-wins across surrender, disconnect expiry, and later commands', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { room, white, blackContext, whiteContext } = startRoom(service);
    const asyncEvents: CommittedRoomEvent[] = [];
    service.handleDisconnect(white.socketId, (event) =>
      asyncEvents.push(event),
    );

    const first = service.surrender(blackContext);
    const afterFirst = stateHash(room);
    const second = service.surrender(whiteContext);
    jest.advanceTimersByTime(600_000);

    expect(first).toEqual(
      expect.objectContaining({ success: true, winner: Color.White }),
    );
    expect(second).toEqual({
      success: false,
      error: 'Match is already finished',
    });
    expect(room.match!.getGameState().terminalResult?.reason).toBe('surrender');
    expect(stateHash(room)).toBe(afterFirst);
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('lets surrender win a race with a scheduled clock timeout', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const { room, whiteContext, blackContext } = startRoom(service);
    const asyncEvents: CommittedRoomEvent[] = [];
    expect(
      service.makeMove(whiteContext, 'A2', 'A3', (event) =>
        asyncEvents.push(event),
      ).success,
    ).toBe(true);

    const surrender = service.surrender(blackContext);
    const afterSurrender = stateHash(room);
    jest.advanceTimersByTime(900_000);

    expect(surrender).toEqual(
      expect.objectContaining({ success: true, winner: Color.White }),
    );
    expect(room.match!.getGameState().terminalResult?.reason).toBe('surrender');
    expect(stateHash(room)).toBe(afterSurrender);
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects service commands after terminal without state or event mutation', () => {
    const service = new GameService();
    const { room, whiteContext } = startRoom(service);
    expect(service.surrender(whiteContext).success).toBe(true);
    const before = stateHash(room);
    const asyncEvents: CommittedRoomEvent[] = [];

    const results = [
      service.makeMove(whiteContext, 'A2', 'A3', (event) =>
        asyncEvents.push(event),
      ),
      service.useSkill(whiteContext, 'lightning_thunder_trap', [], (event) =>
        asyncEvents.push(event),
      ),
      service.passSkill(whiteContext, (event) => asyncEvents.push(event)),
      service.endTurn(whiteContext, (event) => asyncEvents.push(event)),
      service.sacrificePiece(
        whiteContext,
        { col: 0, row: 1 },
        'w_pawn_0',
        (event) => asyncEvents.push(event),
      ),
      service.surrender(whiteContext),
    ];

    expect(results.every((result) => result.success === false)).toBe(true);
    expect(stateHash(room)).toBe(before);
    expect(asyncEvents).toHaveLength(0);
  });

  it('promotes a terminal result created during an end-turn reaction', () => {
    const service = new GameService();
    const { room, whiteContext } = startRoom(service);
    const state = room.match!.getGameState();
    const whiteKingPosition = { col: 7, row: 0 };
    const whiteKing = state.board.getPiece(whiteKingPosition)!;
    room.match!.getEventBus().on({
      id: 'service-terminal-on-turn-end',
      eventType: 'OnTurnEnd',
      priority: 0,
      source: 'test',
      handler: (_event, enqueue) => {
        enqueue({
          type: 'DESTROY_PIECE',
          pieceId: whiteKing.id,
          position: whiteKingPosition,
          reason: 'capture',
        });
      },
    });

    const result = service.endTurn(whiteContext);

    expect(result.success).toBe(true);
    expect(room.phase).toBe('finished');
    expect(state.terminalResult).toEqual({
      outcome: 'win',
      winner: Color.Black,
      loser: Color.White,
      reason: 'king_captured',
    });
    expect(eventPayloads(result.event, 'match-ended')).toHaveLength(2);
  });

  it('returns finished state and terminalResult on reconnect', () => {
    const service = new GameService();
    const { room, white, whiteContext } = startRoom(service);
    expect(service.surrender(whiteContext).success).toBe(true);

    const reconnect = service.handleReconnect(
      room.code,
      white.id,
      'socket_white_reconnected',
    );
    const snapshot = service.getReconnectSnapshot(room.code, Color.White);

    expect(reconnect.success).toBe(true);
    expect(snapshot?.roomPhase).toBe('finished');
    expect(snapshot?.matchState?.status).toBe('finished');
    expect(snapshot?.matchState?.terminalResult?.reason).toBe('surrender');
    expect(snapshot?.matchState?.terminalResult?.winner).toBe(Color.Black);
  });

  test.each([
    [Color.White, Color.Black],
    [Color.Black, Color.White],
  ])(
    'snapshots disconnected %s even if player colors and order mutate',
    (disconnectedColor, expectedWinner) => {
      jest.useFakeTimers();
      const service = new GameService();
      const { room, white, black } = startRoom(service);
      const disconnected = disconnectedColor === Color.White ? white : black;
      const asyncEvents: CommittedRoomEvent[] = [];

      service.handleDisconnect(disconnected.socketId, (event) =>
        asyncEvents.push(event),
      );
      disconnected.color = expectedWinner;
      room.players.reverse();
      jest.advanceTimersByTime(60_000);

      expect(room.match!.getGameState().terminalResult).toEqual({
        outcome: 'win',
        winner: expectedWinner,
        loser: disconnectedColor,
        reason: 'forfeit_disconnect',
      });
      expect(deliveryCount(asyncEvents, 'match-ended')).toBe(2);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('cancels the matching active forfeit timer on reconnect', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { room, white } = startRoom(service);
    const asyncEvents: CommittedRoomEvent[] = [];
    service.handleDisconnect(white.socketId, (event) =>
      asyncEvents.push(event),
    );

    expect(
      service.handleReconnect(room.code, white.id, 'socket_white_reconnected'),
    ).toEqual(expect.objectContaining({ success: true }));
    jest.advanceTimersByTime(60_000);

    expect(room.match!.getGameState().terminalResult).toBeNull();
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(0);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('keeps per-player forfeit timers independent and lets the first expiry win', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { room, white, black } = startRoom(service);
    const asyncEvents: CommittedRoomEvent[] = [];
    const sink = (event: CommittedRoomEvent): void => {
      asyncEvents.push(event);
    };

    service.handleDisconnect(white.socketId, sink);
    jest.advanceTimersByTime(1_000);
    service.handleDisconnect(black.socketId, sink);
    jest.advanceTimersByTime(59_000);
    jest.advanceTimersByTime(60_000);

    expect(room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: Color.Black,
      loser: Color.White,
      reason: 'forfeit_disconnect',
    });
    expect(deliveryCount(asyncEvents, 'match-ended')).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['waiting', 'draft', 'reveal', 'loading'] as const)(
    'uses lobby cleanup rather than terminal forfeit during %s',
    (phase) => {
      jest.useFakeTimers();
      const service = new GameService();
      const { room, white, black } = createLobbyRoom(service, phase);
      const asyncEvents: CommittedRoomEvent[] = [];

      service.handleDisconnect(white.socketId, (event) =>
        asyncEvents.push(event),
      );
      jest.advanceTimersByTime(60_000);

      expect(room.match).toBeNull();
      expect(service.getRoom(room.code)).toBeUndefined();
      expect(deliveryCount(asyncEvents, 'match-ended')).toBe(0);
      expect(
        asyncEvents
          .flatMap((event) => event.deliveries)
          .filter(
            (delivery) =>
              delivery.socketId === black.socketId &&
              delivery.event === 'lobby-closed',
          ),
      ).toEqual([
        {
          socketId: black.socketId,
          event: 'lobby-closed',
          payload: {
            publicPlayerRef: white.publicPlayerRef,
            reason: 'player_disconnected',
          },
        },
      ]);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('cancels lobby cleanup on reconnect and rejects reconnect after closure', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const first = createLobbyRoom(service, 'draft');
    service.handleDisconnect(first.white.socketId);

    expect(
      service.handleReconnect(
        first.room.code,
        first.white.id,
        'socket_white_reconnected',
      ),
    ).toEqual(expect.objectContaining({ success: true }));
    jest.advanceTimersByTime(60_000);
    expect(service.getRoom(first.room.code)).toBe(first.room);

    const second = createLobbyRoom(service, 'loading');
    service.handleDisconnect(second.white.socketId);
    jest.advanceTimersByTime(60_000);

    expect(
      service.handleReconnect(
        second.room.code,
        second.white.id,
        'too_late_socket',
      ),
    ).toEqual({ success: false, error: 'Room not found' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not let a loading callback start a match for a disconnected lobby', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { room, white } = createLobbyRoom(service, 'reveal');
    let startResult: ReturnType<GameService['startMatch']> | undefined;
    expect(
      service.beginLoading(room.code, () => {
        startResult = service.startMatch(room.code);
      }).success,
    ).toBe(true);
    service.handleDisconnect(white.socketId);

    jest.advanceTimersByTime(5_000);
    expect(startResult).toBeUndefined();
    expect(room.match).toBeNull();
    jest.advanceTimersByTime(55_000);
    expect(service.getRoom(room.code)).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resumes a deferred phase transition when the disconnected player returns', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { room, white } = createLobbyRoom(service, 'reveal');
    let startResult: ReturnType<GameService['startMatch']> | undefined;
    service.beginLoading(room.code, () => {
      startResult = service.startMatch(room.code);
    });
    service.handleDisconnect(white.socketId);
    jest.advanceTimersByTime(5_000);
    expect(startResult).toBeUndefined();

    const reconnect = service.handleReconnect(
      room.code,
      white.id,
      'socket_white_reconnected',
    );

    expect(reconnect.success).toBe(true);
    expect(startResult).toEqual(expect.objectContaining({ success: true }));
    expect(room.match?.getStatus()).toBe('playing');
    jest.advanceTimersByTime(60_000);
    expect(service.getRoom(room.code)).toBe(room);
    expect(jest.getTimerCount()).toBe(1);
  });
});
