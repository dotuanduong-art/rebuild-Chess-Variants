import { Color, PieceType } from 'game-core';
import type { Socket } from 'socket.io';
import type { AuthSessionRegistry } from '../auth/auth-session.registry.js';
import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';

describe('G1.7 projected socket delivery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('C6: projects state and action payload separately for both seats', () => {
    const fixture = startedRoom();
    const context = fixture.service.resolveCommandContext(
      'socket-white',
      fixture.roomCode,
      fixture.white.publicPlayerRef,
    );
    expect(context).not.toBeNull();

    const result = fixture.service.useSkill(
      context!,
      'lightning_thunder_trap',
      [{ type: 'cell', position: { col: 4, row: 4 } }],
    );
    expect(result.success).toBe(true);

    const whitePayload = deliveryPayload(result.event, 'socket-white');
    const blackPayload = deliveryPayload(result.event, 'socket-black');
    expect(JSON.stringify(whitePayload)).toContain('4,4');
    expect(JSON.stringify(blackPayload)).not.toContain('4,4');
    expect(actionTypes(blackPayload.actions)).toContain('APPLY_EFFECT');
  });

  it('C6: legal-move query cannot inspect a piece absent from the seat view', () => {
    const fixture = startedRoom();
    const state = fixture.room.match!.getGameState();
    state.board.setPiece(
      { col: 4, row: 4 },
      {
        id: 'hidden-black-piece',
        type: PieceType.Pawn,
        color: Color.Black,
        effects: [
          {
            id: 'hidden-black-effect',
            type: 'ghost',
            duration: 2,
            remainingDuration: 2,
            tickTiming: 'turnEnd',
            sourcePlayer: Color.Black,
            targetType: 'piece',
            targetId: 'hidden-black-piece',
            stackingRule: 'refresh',
            isDebuff: false,
            metadata: { stealth: true },
          },
        ],
      },
    );
    const context = fixture.service.resolveCommandContext(
      'socket-white',
      fixture.roomCode,
      fixture.white.publicPlayerRef,
    );

    expect(fixture.service.getLegalMoves(context!, { col: 4, row: 4 })).toEqual(
      {
        success: false,
        error: 'Position is not visible',
      },
    );
  });

  it('C7: does not return an internal rejection reason to the client', () => {
    const fixture = startedRoom();
    const gateway = gatewayFor(fixture.service);
    const clientEmit = jest.fn();
    const client = socket('socket-white', clientEmit);
    jest.spyOn(fixture.room.match!, 'useSkill').mockReturnValue({
      success: false,
      reason: 'hidden target black-trap-square',
      actions: [],
    });

    gateway.handleUseSkill(client, {
      roomCode: fixture.roomCode,
      playerId: fixture.white.id,
      skillId: 'lightning_thunder_trap',
      targets: [{ type: 'cell', position: { col: 4, row: 4 } }],
    });

    expect(clientEmit).toHaveBeenCalledWith('skill-rejected', {
      reason: 'Skill rejected',
    });
    expect(JSON.stringify(clientEmit.mock.calls)).not.toContain(
      'black-trap-square',
    );
  });

  it('C9: ignores spoofed playerId and role when selecting a socket view', () => {
    const fixture = startedRoom();
    const gateway = gatewayFor(fixture.service);
    const emitted = new Map<string, jest.Mock>([
      ['socket-white', jest.fn()],
      ['socket-black', jest.fn()],
    ]);
    gateway.server = {
      to: jest.fn((socketId: string) => ({ emit: emitted.get(socketId)! })),
    } as never;
    const client = socket('socket-white');

    gateway.handleUseSkill(client, {
      roomCode: fixture.roomCode,
      playerId: fixture.black.id,
      skillId: 'lightning_thunder_trap',
      targets: [{ type: 'cell', position: { col: 4, row: 4 } }],
      role: 'POSTGAME_REPLAY',
    } as Parameters<GameGateway['handleUseSkill']>[1]);

    const whitePayload = emittedPayload(
      emitted.get('socket-white')!,
      'skill-used',
    );
    const blackPayload = emittedPayload(
      emitted.get('socket-black')!,
      'skill-used',
    );
    expect(JSON.stringify(whitePayload)).toContain('4,4');
    expect(JSON.stringify(blackPayload)).not.toContain('4,4');
  });
});

function startedRoom() {
  const service = new GameService(() => 1_000);
  const created = service.createRoom('socket-white');
  service.joinRoom(created.roomCode, 'socket-black');
  const room = service.getRoom(created.roomCode)!;
  const white = room.players.find((player) => player.color === Color.White)!;
  const black = room.players.find((player) => player.color === Color.Black)!;
  white.variantId = 'lightning';
  expect(service.startMatch(created.roomCode).success).toBe(true);
  room.match!.getGameState().whiteAP = 10;
  return { service, roomCode: created.roomCode, room, white, black };
}

function gatewayFor(service: GameService): GameGateway {
  const authSessions = {
    getPrincipal: jest.fn().mockReturnValue({}),
    getBoundPlayerRef: jest.fn(
      (socketId: string, roomCode: string) =>
        service
          .getRoom(roomCode)
          ?.players.find((player) => player.socketId === socketId)
          ?.publicPlayerRef,
    ),
  } as unknown as AuthSessionRegistry;
  const gateway = new GameGateway(service, authSessions);
  gateway.server = {
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  } as never;
  return gateway;
}

function socket(id: string, emit = jest.fn()): Socket {
  return { id, emit } as unknown as Socket;
}

function actionTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((action: unknown) => {
    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      typeof action.type === 'string'
    ) {
      return [action.type];
    }
    return [];
  });
}

function emittedPayload(
  emit: jest.Mock,
  event: string,
): Record<string, unknown> {
  const calls = emit.mock.calls as unknown as Array<
    [string, Record<string, unknown>]
  >;
  const call = calls.find(([emittedEvent]) => emittedEvent === event);
  expect(call).toBeDefined();
  return call![1];
}

function deliveryPayload(
  event:
    | {
        deliveries: Array<{
          socketId: string;
          payload: Record<string, unknown>;
        }>;
      }
    | undefined,
  socketId: string,
): Record<string, unknown> {
  const delivery = event?.deliveries.find(
    (candidate) => candidate.socketId === socketId,
  );
  expect(delivery).toBeDefined();
  return delivery!.payload;
}
