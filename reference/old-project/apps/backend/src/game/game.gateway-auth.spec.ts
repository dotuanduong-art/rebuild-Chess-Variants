import { Test, type TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { accessToken, type AccessToken } from '../auth/auth.contract.js';
import { AuthSessionRegistry } from '../auth/auth-session.registry.js';
import { AUTH_PROVIDER } from '../auth/auth.tokens.js';
import { SupabaseAuthProvider } from '../auth/supabase-auth.provider.js';
import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';
import { Color } from 'game-core';

describe('GameGateway authentication', () => {
  const googleToken = accessToken(createJwt('google_session'));
  const magicLinkToken = accessToken(createJwt('magic_link_session'));
  let gateway: GameGateway;
  let service: GameService;
  let module: TestingModule;
  let socketEmit: jest.Mock;

  beforeEach(async () => {
    const accountByToken = new Map<AccessToken, string>([
      [googleToken, 'alice_account'],
      [magicLinkToken, 'bob_account'],
    ]);
    const provider = new SupabaseAuthProvider(
      { url: 'https://project.supabase.co', anonKey: 'public_anon_key' },
      jest.fn().mockImplementation((_url, init: RequestInit) => {
        const authorization = (init.headers as Record<string, string>)
          .authorization;
        const token = accessToken(authorization.replace('Bearer ', ''));
        const accountId = accountByToken.get(token);
        return Promise.resolve(
          accountId
            ? new Response(JSON.stringify({ id: accountId }), { status: 200 })
            : new Response(null, { status: 401 }),
        );
      }),
    );
    module = await Test.createTestingModule({
      providers: [
        GameGateway,
        GameService,
        AuthSessionRegistry,
        { provide: AUTH_PROVIDER, useValue: provider },
      ],
    }).compile();
    gateway = module.get(GameGateway);
    service = module.get(GameService);
    socketEmit = jest.fn();
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: socketEmit }),
    } as never;
  });

  afterEach(async () => {
    await module.close();
  });

  it.each([
    ['Google', googleToken],
    ['email magic-link', magicLinkToken],
  ])(
    'verifies a Supabase %s session during the socket handshake',
    async (_kind, token) => {
      const client = socket('socket_authenticated', token);

      await gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('authenticated');
    },
  );

  it('E0 accepts a socket without a credential as a guest', async () => {
    const client = socket('socket_invalid', accessToken('invalid'));

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('authenticated');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('binds create/reconnect to the principal and rotates the reconnect credential', async () => {
    const alice = socket('socket_alice', googleToken);
    await gateway.handleConnection(alice);
    gateway.handleCreateRoom(alice);
    const created = emittedPayload(alice, 'room-created');
    const originalReconnectToken = created.reconnectToken as string;
    expect(created.publicPlayerRef).toEqual(expect.any(String));
    expect(created.publicPlayerRef).not.toBe(created.playerId);

    const bob = socket('socket_bob', magicLinkToken);
    await gateway.handleConnection(bob);
    gateway.handleReconnect(bob, {
      roomCode: created.roomCode as string,
      playerId: created.playerId as string,
      reconnectToken: originalReconnectToken,
    });

    expect(bob.emit).toHaveBeenCalledWith('error', {
      message: 'Reconnect credential rejected',
    });
    expect(
      service.getRoom(created.roomCode as string)?.players[0]?.socketId,
    ).toBe('socket_alice');

    const aliceReplacement = socket('socket_alice_replacement', googleToken);
    await gateway.handleConnection(aliceReplacement);
    gateway.handleReconnect(aliceReplacement, {
      roomCode: created.roomCode as string,
      playerId: created.playerId as string,
      reconnectToken: originalReconnectToken,
    });
    const reconnected = emittedPayload(aliceReplacement, 'reconnected');

    expect(reconnected.reconnectToken).toEqual(expect.any(String));
    expect(reconnected.reconnectToken).not.toBe(originalReconnectToken);
    expect(reconnected.publicPlayerRef).toBe(created.publicPlayerRef);
    expect(
      service.getRoom(created.roomCode as string)?.players[0]?.socketId,
    ).toBe('socket_alice_replacement');
  });

  it('uses the authenticated seat instead of a spoofed playerId for commands', async () => {
    const alice = socket('socket_alice', googleToken);
    const bob = socket('socket_bob', magicLinkToken);
    await gateway.handleConnection(alice);
    await gateway.handleConnection(bob);
    gateway.handleCreateRoom(alice);
    const created = emittedPayload(alice, 'room-created');
    gateway.handleJoinRoom(bob, { roomCode: created.roomCode as string });
    const joined = emittedPayload(bob, 'room-joined');
    service.startMatch(created.roomCode as string);

    gateway.handleMove(bob, {
      roomCode: created.roomCode as string,
      playerId: created.playerId as string,
      from: 'A2',
      to: 'A3',
    });

    expect(bob.emit).toHaveBeenCalledWith('move-rejected', {
      reason: 'Requester does not control this action',
    });
    expect(
      service.getRoom(created.roomCode as string)?.match?.getCurrentTurn(),
    ).toBe(Color.White);
    expect(socketEmit).not.toHaveBeenCalledWith('move-made', expect.anything());

    gateway.handleMove(alice, {
      roomCode: created.roomCode as string,
      playerId: joined.playerId as string,
      from: 'A2',
      to: 'A3',
    });

    expect(
      service
        .getRoom(created.roomCode as string)
        ?.match?.getGameState()
        .board.getPiece({ col: 0, row: 2 }),
    ).toBeDefined();
    expect(socketEmit).toHaveBeenCalledWith(
      'move-made',
      expect.objectContaining({ from: 'A2', to: 'A3' }),
    );
    service.clearTurnTimeout(created.roomCode as string);
  });

  it('uses the authenticated surrendering seat instead of a spoofed playerId', async () => {
    const alice = socket('socket_alice', googleToken);
    const bob = socket('socket_bob', magicLinkToken);
    await gateway.handleConnection(alice);
    await gateway.handleConnection(bob);
    gateway.handleCreateRoom(alice);
    const created = emittedPayload(alice, 'room-created');
    gateway.handleJoinRoom(bob, { roomCode: created.roomCode as string });
    const joined = emittedPayload(bob, 'room-joined');
    service.startMatch(created.roomCode as string);

    gateway.handleSurrender(alice, {
      roomCode: created.roomCode as string,
      playerId: joined.playerId as string,
    });

    const room = service.getRoom(created.roomCode as string)!;
    expect(room.match!.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: Color.Black,
      loser: Color.White,
      reason: 'surrender',
    });
    expect(socketEmit).toHaveBeenCalledWith('match-ended', {
      winner: Color.Black,
      reason: 'surrender',
      terminalResult: room.match!.getGameState().terminalResult,
    });
  });
});

function socket(id: string, token: AccessToken): Socket {
  const broadcast = { emit: jest.fn() };
  return {
    id,
    handshake: { auth: { guestId: token } },
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn(),
    to: jest.fn().mockReturnValue(broadcast),
  } as unknown as Socket;
}

function createJwt(sessionId: string): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
      'base64url',
    ),
    Buffer.from(JSON.stringify({ session_id: sessionId })).toString(
      'base64url',
    ),
    'signature',
  ].join('.');
}

function emittedPayload(
  client: Socket,
  event: string,
): Record<string, unknown> {
  const call = (client.emit as jest.Mock).mock.calls.find(
    ([emittedEvent]) => emittedEvent === event,
  );
  expect(call).toBeDefined();
  return call[1] as Record<string, unknown>;
}
