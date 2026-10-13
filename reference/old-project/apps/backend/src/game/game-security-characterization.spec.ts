import { Color, Match } from 'game-core';
import { Socket } from 'socket.io';
import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';

describe('authoritative protocol security characterization', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test.failing('H-01: rejects a command when the socket impersonates another playerId', () => {
    jest.useFakeTimers();
    const service = new GameService();
    const gateway = new GameGateway(service);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    const { roomCode, playerId: whitePlayerId } = service.createRoom('socket_white');
    service.joinRoom(roomCode, 'socket_black');
    service.startMatch(roomCode);

    const attacker = {
      id: 'socket_black',
      emit: jest.fn(),
    } as any as Socket;

    gateway.handleMove(attacker, {
      roomCode,
      playerId: whitePlayerId,
      from: 'A2',
      to: 'A3',
    });

    expect(attacker.emit).toHaveBeenCalledWith(
      'move-rejected',
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });

  test('A-01: rejects a move submitted by the wrong-turn requester', () => {
    const match = new Match();
    match.start();

    const result = match.makeMove(
      Color.Black,
      { col: 0, row: 1 },
      { col: 0, row: 2 },
    );

    expect(result.success).toBe(false);
  });

  test('A-02: rejects a skill submitted by the wrong-turn player', () => {
    const match = new Match();
    match.setVariants('lightning', 'guardian');
    match.start();
    const state = match.getGameState();
    const targetPosition = { col: 3, row: 13 };
    const target = state.board.getPiece(targetPosition)!;
    state.blackAP = 4;

    const result = match.useSkill(Color.Black, 'guardian_shield', [
      { type: 'piece', position: targetPosition, pieceId: target.id },
    ]);

    expect(result.success).toBe(false);
  });

  test('A-02: rejects a skill pass submitted by the wrong-turn player', () => {
    const match = new Match();
    match.start();

    const result = match.submitAction({
      type: 'PASS_SKILL',
      player: Color.Black,
    }, Color.Black);

    expect(result.success).toBe(false);
  });

  test('H-02: redacts a hidden trap target from opponent action history', () => {
    const match = new Match();
    match.setVariants('lightning', null);
    match.start();
    match.getGameState().whiteAP = 3;

    const result = match.useSkill(Color.White, 'lightning_thunder_trap', [
      { type: 'cell', position: { col: 4, row: 4 } },
    ]);
    expect(result.success).toBe(true);

    const opponentState = match.serializeForPlayer(Color.Black);
    expect(opponentState.board.cellEffects?.['4,4']).toBeUndefined();
    expect(JSON.stringify(opponentState.actionHistory)).not.toContain('4,4');
  });
});
