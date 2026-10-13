import {
  Color,
  Match,
  PieceType,
  ViewerRole,
  projectMatchView,
  type Effect,
} from 'game-core';
import { GameService } from './game.service';

describe('G1.8 service-level adversarial characterizations', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('E15 [D-01,Q-23] keeps one terminal when timeout and surrender share a tick', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const service = new GameService();
    const { roomCode, white, black } = startRoom(service);
    const room = service.getRoom(roomCode)!;
    const whiteContext = service.resolveCommandContext(
      white.socketId,
      roomCode,
      white.publicPlayerRef,
    )!;
    const blackContext = service.resolveCommandContext(
      black.socketId,
      roomCode,
      black.publicPlayerRef,
    )!;

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
    expect(room.phase).toBe('finished');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('K1 [G1.7] gives Earth exile of a Puppet-controlled piece to its effective owner', () => {
    const match = new Match(() => 1_000);
    const state = match.getGameState();
    const controlledPiece = {
      id: 'earth-exile-puppet-controlled',
      type: PieceType.Pawn,
      color: Color.White,
      effects: [puppetControl(Color.Black, 'earth-exile-puppet-controlled')],
    };

    // Earth stores the original enemy snapshot; Puppet changes effective ownership.
    state.variantState.shadowedPieces = [
      {
        pieceSnapshot: controlledPiece,
        originalPosition: { col: 4, row: 4 },
        reservationPieceId: 'earth-reservation',
      },
    ];

    const white = projectMatchView(match, ViewerRole.WHITE);
    const black = projectMatchView(match, ViewerRole.BLACK);

    expect(JSON.stringify(white.variantState)).not.toContain(
      controlledPiece.id,
    );
    expect(JSON.stringify(black.variantState)).toContain(controlledPiece.id);
  });

  it('E19 [D-06] snapshots disconnect color before a lobby reorder', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const { roomCode, white, black } = startRoom(service);
    const room = service.getRoom(roomCode)!;

    service.handleDisconnect(white.socketId);
    white.color = Color.Black;
    black.color = Color.White;
    room.players.reverse();
    jest.advanceTimersByTime(60_000);

    expect(room.match!.getGameState().terminalResult).toEqual(
      expect.objectContaining({
        winner: Color.Black,
        loser: Color.White,
        reason: 'forfeit_disconnect',
      }),
    );
  });
});

function startRoom(service: GameService) {
  const created = service.createRoom('g1_8_white_socket');
  service.joinRoom(created.roomCode, 'g1_8_black_socket');
  const room = service.getRoom(created.roomCode)!;
  expect(service.startMatch(created.roomCode).success).toBe(true);
  const white = room.players.find((player) => player.color === Color.White)!;
  const black = room.players.find((player) => player.color === Color.Black)!;
  return { roomCode: created.roomCode, white, black };
}

function puppetControl(controller: Color, pieceId: string): Effect {
  return {
    id: 'g1_8_puppet_control',
    type: 'puppet_control',
    duration: 7,
    remainingDuration: 7,
    tickTiming: 'turnEnd',
    sourcePlayer: controller,
    targetType: 'piece',
    targetId: pieceId,
    stackingRule: 'refresh',
    isDebuff: false,
    metadata: { controlledBy: controller },
  };
}
