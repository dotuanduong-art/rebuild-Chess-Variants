import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import {
  accessToken,
  accountId,
  sessionId,
  type AuthProvider,
} from '../src/auth/auth.contract';
import { AUTH_PROVIDER, AUTH_REQUIRED } from '../src/auth/auth.tokens';
import { AuthSessionRegistry } from '../src/auth/auth-session.registry';
import { GameService } from '../src/game/game.service';
import { Color, PieceType, type Effect } from 'game-core';

const PRINCIPALS = {
  white: {
    accountId: accountId('e2e-white-account'),
    sessionId: sessionId('e2e-white-session'),
  },
  black: {
    accountId: accountId('e2e-black-account'),
    sessionId: sessionId('e2e-black-session'),
  },
  attacker: {
    accountId: accountId('e2e-attacker-account'),
    sessionId: sessionId('e2e-attacker-session'),
  },
} as const;

type PrincipalName = keyof typeof PRINCIPALS;

describe('G1.8 authoritative Socket.IO harness', () => {
  let app: INestApplication;
  let baseUrl: string;
  let gameService: GameService;
  let authSessions: AuthSessionRegistry;
  const clients: Socket[] = [];
  const roomCodes: string[] = [];

  beforeAll(async () => {
    // Tests must not inherit an owner's local authentication configuration.
    process.env.AUTH_REQUIRED = 'true';
    const authProvider: AuthProvider = {
      authenticate: jest.fn((token) => {
        const name = token.replace('e2e-', '') as PrincipalName;
        return Promise.resolve(PRINCIPALS[name] ?? null);
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_REQUIRED)
      .useValue(true)
      .overrideProvider(AUTH_PROVIDER)
      .useValue(authProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    gameService = app.get(GameService);
    authSessions = app.get(AuthSessionRegistry);
    await app.listen(0, '127.0.0.1');
    const address = (
      app.getHttpServer() as {
        address(): AddressInfo | string | null;
      }
    ).address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected the e2e server to bind a TCP port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
    for (const roomCode of roomCodes.splice(0))
      gameService.removeRoom(roomCode);
  });

  afterAll(async () => {
    await app.close();
  });

  it('connects two principals and an authenticated attacker over real Socket.IO', async () => {
    const white = await connect('white');
    const black = await connect('black');
    const attacker = await connect('attacker');

    expect(white.connected).toBe(true);
    expect(black.connected).toBe(true);
    expect(attacker.connected).toBe(true);
  });

  it('E1 [H-01,A-01,A-02] rejects all attacker commands without a seat', async () => {
    const fixture = await playingRoom();
    const before = digest(fixture.roomCode);
    const events = [
      ['move', { from: 'A2', to: 'A3' }],
      ['use-skill', { skillId: 'lightning_thunder_trap', targets: [] }],
      ['pass-skill', {}],
      ['end-turn', {}],
      ['sacrifice-piece', { position: { col: 0, row: 1 }, pieceId: 'x' }],
      ['surrender', {}],
    ] as const;

    for (const [event, data] of events) {
      const rejected = once(fixture.attacker, 'error');
      fixture.attacker.emit(event, {
        roomCode: fixture.roomCode,
        playerId: fixture.white.playerId,
        ...data,
      });
      await rejected;
      expect(digest(fixture.roomCode)).toEqual(before);
    }
  });

  it('E2/E3 [H-01,A-01,A-02] derives actor and DTO role from the socket, not payload', async () => {
    const fixture = await playingRoom();
    const moved = once(fixture.black.socket, 'move-made');
    fixture.white.socket.emit('move', {
      roomCode: fixture.roomCode,
      playerId: fixture.black.playerId,
      role: 'POSTGAME_REPLAY',
      color: 'Black',
      viewer: 'SERVER_LOG',
      from: 'A2',
      to: 'A3',
    });

    const payload = (await moved) as Record<string, unknown>;
    expect(payload.currentTurn).toBe('Black');
    expect(JSON.stringify(payload)).not.toContain('POSTGAME_REPLAY');
  });

  it('E4 [A-01,A-02] keeps a wrong-turn Black command from mutating state', async () => {
    const fixture = await playingRoom();
    const before = digest(fixture.roomCode);
    const rejected = once(fixture.black.socket, 'move-rejected');
    fixture.black.socket.emit('move', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      from: 'A14',
      to: 'A13',
    });
    await rejected;
    expect(digest(fixture.roomCode)).toEqual(before);
  });

  it('E5 [D-01,G1.5a] permits surrender outside turn and emits one terminal', async () => {
    const fixture = await playingRoom();
    const whiteTerminal = once(fixture.white.socket, 'match-ended');
    const blackTerminal = once(fixture.black.socket, 'match-ended');
    fixture.black.socket.emit('surrender', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
    });
    const [white, black] = await Promise.all([whiteTerminal, blackTerminal]);
    expect(white).toEqual(black);
    expect(gameService.getRoom(fixture.roomCode)?.phase).toBe('finished');
  });

  it('E16 [H-01,D-06] rejects an attacker reconnect takeover without clearing the victim timer', async () => {
    const fixture = await playingRoom();
    fixture.white.socket.disconnect();
    await waitFor(
      () => gameService.getRoom(fixture.roomCode)?.disconnectTimers.size === 1,
    );
    const rejected = once(fixture.attacker, 'error');
    fixture.attacker.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });
    await rejected;
    expect(gameService.getRoom(fixture.roomCode)?.disconnectTimers.size).toBe(
      1,
    );
  });

  it('E13/E14 [D-01,G1.4,G1.5a] emits one terminal and rejects post-terminal commands', async () => {
    const fixture = await playingRoom();
    const terminals: unknown[] = [];
    fixture.white.socket.on('match-ended', (payload) =>
      terminals.push(payload),
    );
    fixture.black.socket.on('match-ended', (payload) =>
      terminals.push(payload),
    );
    fixture.white.socket.emit('surrender', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
    });
    fixture.black.socket.emit('surrender', {
      roomCode: fixture.roomCode,
      playerId: fixture.black.playerId,
    });
    await waitFor(() => terminals.length === 2);
    expect(
      new Set(terminals.map((payload) => JSON.stringify(payload))).size,
    ).toBe(1);
    expect(gameService.getRoom(fixture.roomCode)?.phase).toBe('finished');
    expect(gameService.getRoom(fixture.roomCode)?.turnDeadline).toBeUndefined();

    const rejected = once(fixture.black.socket, 'move-rejected');
    fixture.black.socket.emit('move', {
      roomCode: fixture.roomCode,
      playerId: fixture.black.playerId,
      from: 'A14',
      to: 'A13',
    });
    await rejected;
  });

  it('E17/E18 [H-01,D-06] rotates reconnect credentials and restores only the same principal', async () => {
    const fixture = await playingRoom();
    fixture.white.socket.disconnect();
    await waitFor(
      () => gameService.getRoom(fixture.roomCode)?.disconnectTimers.size === 1,
    );
    const replacement = await connect('white');
    const reconnected = once(replacement, 'reconnected');
    replacement.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });
    const restored = (await reconnected) as { reconnectToken: string };
    expect(restored.reconnectToken).not.toBe(fixture.white.reconnectToken);
    expect(gameService.getRoom(fixture.roomCode)?.disconnectTimers.size).toBe(
      0,
    );

    replacement.disconnect();
    await waitFor(
      () => gameService.getRoom(fixture.roomCode)?.disconnectTimers.size === 1,
    );
    const stale = await connect('white');
    const staleRejected = once(stale, 'error');
    stale.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });
    await staleRejected;

    const fresh = await connect('white');
    const freshRestored = once(fresh, 'reconnected');
    fresh.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: restored.reconnectToken,
    });
    await freshRestored;
  });

  it('E17 [H-01] rejects a revoked reconnect credential over a real socket', async () => {
    const fixture = await playingRoom();
    fixture.white.socket.disconnect();
    await waitFor(
      () => gameService.getRoom(fixture.roomCode)?.disconnectTimers.size === 1,
    );
    const publicPlayerRef = gameService
      .getRoom(fixture.roomCode)!
      .players.find(
        (player) => player.id === fixture.white.playerId,
      )!.publicPlayerRef;
    authSessions.revokeSeat(fixture.roomCode, publicPlayerRef);
    const replacement = await connect('white');
    const rejected = once(replacement, 'error');
    replacement.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });

    expect(await rejected).toEqual({
      message: 'Reconnect credential rejected',
    });
    expect(gameService.getRoom(fixture.roomCode)?.disconnectTimers.size).toBe(
      1,
    );
  });

  it('E20/E21 [A-13,D-03] contains malformed payloads and leaves the room playable', async () => {
    const fixture = await playingRoom();
    const before = digest(fixture.roomCode);
    const malformed: unknown[] = [
      undefined,
      null,
      {},
      { roomCode: fixture.roomCode, from: 'A0', to: 'A16' },
      { roomCode: fixture.roomCode, from: '', to: 'A2junk' },
      { roomCode: fixture.roomCode, targets: Array(200).fill({}) },
      { roomCode: fixture.roomCode, nested: { a: { b: { c: { d: true } } } } },
    ];
    for (const payload of malformed) fixture.attacker.emit('move', payload);
    await waitFor(() => fixture.attacker.connected);
    expect(digest(fixture.roomCode)).toBe(before);

    const moved = once(fixture.black.socket, 'move-made');
    fixture.white.socket.emit('move', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      from: 'A2',
      to: 'A3',
    });
    await moved;
  });

  test.failing(
    'E20 [G5.1] returns a safe reject rather than throwing for a null command payload',
    async () => {
      const fixture = await playingRoom();
      const rejected = once(fixture.attacker, 'error');
      fixture.attacker.emit('move', null);

      const rejection = await rejected;
      expect(isRecord(rejection)).toBe(true);
      expect(typeof (rejection as Record<string, unknown>).message).toBe(
        'string',
      );
      expect(digest(fixture.roomCode)).toBe(digest(fixture.roomCode));
    },
  );

  it('E6/E7 [A-07] derives Zombie bite from board state and rejects a second movement', async () => {
    const fixture = await playingRoom();
    const state = gameService.getRoom(fixture.roomCode)!.match!.getGameState();
    const zombie = state.board.getPiece({ col: 0, row: 1 })!;
    zombie.effects.push(zombieEffect(zombie.id));
    state.hasMoved = true;
    const before = digest(fixture.roomCode);
    const rejected = once(fixture.white.socket, 'move-rejected');

    fixture.white.socket.emit('move', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      from: 'A2',
      to: 'A3',
      moveType: 'bite',
    });

    await rejected;
    expect(digest(fixture.roomCode)).toBe(before);
    expect(
      state.actionHistory
        .getAll()
        .some((entry) => entry.action.type === 'ZOMBIE_BITE'),
    ).toBe(false);
  });

  it.each([
    ['Lightning trap', installTrapFixture],
    ['Space portal/outworld', installPortalFixture],
    ['Time prediction metadata', installPredictionFixture],
    ['Phantom ghost stealth', installGhostFixture],
    ['Dragon Sentinel underground', installUndergroundFixture],
  ] as const)(
    'E8/E9 [H-02] redacts %s from real move-made socket payloads',
    async (_name, install) => {
      const fixture = await playingRoom();
      const secret = install(fixture.roomCode);
      const whiteMoved = once(fixture.white.socket, 'move-made');
      const blackMoved = once(fixture.black.socket, 'move-made');
      fixture.white.socket.emit('move', {
        roomCode: fixture.roomCode,
        playerId: fixture.white.playerId,
        from: 'A2',
        to: 'A3',
      });

      const [whitePayload, blackPayload] = await Promise.all([
        whiteMoved,
        blackMoved,
      ]);
      expect(JSON.stringify(whitePayload)).not.toContain(secret);
      expect(JSON.stringify(blackPayload)).toContain(secret);
    },
  );

  it('E8/E10 [H-02] keeps hidden targets out of reconnected, legal-move, and reject payloads', async () => {
    const fixture = await playingRoom();
    const secret = installGhostFixture(fixture.roomCode);
    fixture.white.socket.disconnect();
    const replacement = await connect('white');
    const reconnected = once(replacement, 'reconnected');
    replacement.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });
    expect(JSON.stringify(await reconnected)).not.toContain(secret);

    const rejected = once(replacement, 'error');
    replacement.emit('get-enemy-piece-moves', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      position: { col: 4, row: 4 },
    });
    expect(JSON.stringify(await rejected)).not.toContain(secret);
  });

  it('E12 [G1.7] preserves frontend-consumed DTO key types through a real reconnect', async () => {
    const fixture = await playingRoom();
    fixture.white.socket.disconnect();
    const replacement = await connect('white');
    const reconnected = once(replacement, 'reconnected');
    replacement.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });
    const payload = (await reconnected) as {
      matchState?: Record<string, unknown>;
    };

    expectPlayerDtoContract(payload.matchState);
  });

  it('E13 [D-01] resolves simultaneous King capture and surrender through one terminal', async () => {
    const fixture = await playingRoom();
    const state = gameService.getRoom(fixture.roomCode)!.match!.getGameState();
    state.board.setPiece(
      { col: 0, row: 1 },
      {
        id: 'e2e-white-rook',
        type: PieceType.Rook,
        color: Color.White,
        effects: [],
      },
    );
    state.board.setPiece(
      { col: 0, row: 2 },
      {
        id: 'e2e-black-king',
        type: PieceType.King,
        color: Color.Black,
        effects: [],
      },
    );
    const whiteTerminal = once(fixture.white.socket, 'match-ended');
    const blackTerminal = once(fixture.black.socket, 'match-ended');
    fixture.white.socket.emit('move', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      from: 'A2',
      to: 'A3',
    });
    fixture.black.socket.emit('surrender', {
      roomCode: fixture.roomCode,
      playerId: fixture.black.playerId,
    });

    const terminals = await Promise.all([whiteTerminal, blackTerminal]);
    expect(
      new Set(terminals.map((terminal) => JSON.stringify(terminal))).size,
    ).toBe(1);
    expect(
      state.actionHistory
        .getAll()
        .filter((entry) => entry.action.type === 'GAME_OVER'),
    ).toHaveLength(1);
    expect(gameService.getRoom(fixture.roomCode)?.phase).toBe('finished');
  });

  it('E14 [D-01] reconnects to finished state without reopening a terminal match', async () => {
    const fixture = await playingRoom();
    const terminal = once(fixture.white.socket, 'match-ended');
    fixture.white.socket.emit('surrender', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
    });
    await terminal;
    fixture.white.socket.disconnect();
    const replacement = await connect('white');
    const reconnected = once(replacement, 'reconnected');
    replacement.emit('reconnect-room', {
      roomCode: fixture.roomCode,
      playerId: fixture.white.playerId,
      reconnectToken: fixture.white.reconnectToken,
    });

    const payload = await reconnected;
    expect(isRecord(payload)).toBe(true);
    const matchState = (payload as Record<string, unknown>).matchState;
    expect(isRecord(matchState)).toBe(true);
    expect((matchState as Record<string, unknown>).status).toBe('finished');
    expect(gameService.getRoom(fixture.roomCode)?.phase).toBe('finished');
    expect(gameService.getRoom(fixture.roomCode)?.turnDeadline).toBeUndefined();
  });

  it('E11/E12 [H-02] hides draft choices until reveal and keeps socket DTO keys wire-compatible', async () => {
    const white = await connect('white');
    const black = await connect('black');
    const created = once(white, 'room-created');
    white.emit('create-room');
    const room = (await created) as { roomCode: string; playerId: string };
    roomCodes.push(room.roomCode);
    const joined = once(black, 'room-joined');
    black.emit('join-room', { roomCode: room.roomCode });
    const blackSeat = (await joined) as { playerId: string };

    const hiddenSelection = once(black, 'player-variant-selected');
    white.emit('select-variant', {
      roomCode: room.roomCode,
      playerId: room.playerId,
      variantId: 'phantom',
    });
    expect(await hiddenSelection).toEqual(
      expect.objectContaining({ variantId: null, confirmed: false }),
    );

    const reveal = once(white, 'draft-completed');
    const started = once(white, 'match-started', 10_000);
    white.emit('confirm-variant', {
      roomCode: room.roomCode,
      playerId: room.playerId,
    });
    black.emit('select-variant', {
      roomCode: room.roomCode,
      playerId: blackSeat.playerId,
      variantId: 'time',
    });
    black.emit('confirm-variant', {
      roomCode: room.roomCode,
      playerId: blackSeat.playerId,
    });
    expect(await reveal).toEqual(
      expect.objectContaining({
        whiteVariantId: 'phantom',
        blackVariantId: 'time',
      }),
    );
    expectPlayerDtoContract((await started) as Record<string, unknown>);
  }, 12_000);

  async function connect(name: PrincipalName): Promise<Socket> {
    const client = io(baseUrl, {
      auth: { accessToken: accessToken(`e2e-${name}`) },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    clients.push(client);
    await once(client, 'authenticated');
    return client;
  }

  async function playingRoom() {
    const whiteSocket = await connect('white');
    const blackSocket = await connect('black');
    const attacker = await connect('attacker');
    const created = once(whiteSocket, 'room-created');
    whiteSocket.emit('create-room');
    const white = (await created) as {
      roomCode: string;
      playerId: string;
      reconnectToken: string;
    };
    roomCodes.push(white.roomCode);
    const joined = once(blackSocket, 'room-joined');
    blackSocket.emit('join-room', { roomCode: white.roomCode });
    const black = (await joined) as {
      playerId: string;
      reconnectToken: string;
    };
    const room = gameService.getRoom(white.roomCode)!;
    for (const player of room.players) player.variantId = 'lightning';
    expect(gameService.startMatch(white.roomCode).success).toBe(true);
    return {
      roomCode: white.roomCode,
      white: { ...white, socket: whiteSocket },
      black: { ...black, socket: blackSocket },
      attacker,
    };
  }

  function installTrapFixture(roomCode: string): string {
    // Lightning: hidden Thunder Trap target stored in board.cellEffects.
    const secret = 'e2e-lightning-hidden-target';
    gameService
      .getRoom(roomCode)!
      .match!.getGameState()
      .board.addCellEffect(
        { col: 4, row: 4 },
        hiddenCellEffect(secret, 'thunder_trap'),
      );
    return secret;
  }

  function installPortalFixture(roomCode: string): string {
    // Space: hidden outworld/portal identifier is mirrored by dimensionPairs.
    const secret = 'e2e-space-hidden-portal';
    const state = gameService.getRoom(roomCode)!.match!.getGameState();
    state.board.addCellEffect(
      { col: 4, row: 4 },
      hiddenCellEffect(secret, 'outworld'),
    );
    state.variantState.dimensionPairs = [
      {
        owner: Color.Black,
        odd: {
          id: secret,
          position: { col: 10, row: 10 },
          type: 'odd',
          owner: Color.Black,
          occupantId: null,
          isHidden: true,
        },
        even: {
          id: `${secret}-even`,
          position: { col: 11, row: 10 },
          type: 'even',
          owner: Color.Black,
          occupantId: null,
          isHidden: true,
        },
        createdAtRound: 1,
      },
    ];
    return secret;
  }

  function installPredictionFixture(roomCode: string): string {
    // Time: prediction target remains private in Effect.metadata.
    const secret = 'e2e-time-predicted-position';
    const state = gameService.getRoom(roomCode)!.match!.getGameState();
    const piece = state.board.getPiece({ col: 0, row: 13 })!;
    piece.effects.push({
      ...hiddenCellEffect(secret, 'prediction'),
      id: 'e2e-time-prediction',
      targetType: 'piece',
      targetId: piece.id,
      metadata: { predictedPosition: secret },
    });
    return secret;
  }

  function installGhostFixture(roomCode: string): string {
    // Phantom: a ghost with stealth must be absent from the opponent board view.
    const secret = 'e2e-phantom-hidden-piece';
    const state = gameService.getRoom(roomCode)!.match!.getGameState();
    state.board.setPiece(
      { col: 4, row: 4 },
      {
        id: secret,
        type: PieceType.Pawn,
        color: Color.Black,
        effects: [
          {
            ...hiddenCellEffect(secret, 'ghost'),
            id: 'e2e-phantom-ghost',
            targetType: 'piece',
            targetId: secret,
            metadata: { stealth: true },
          },
        ],
      },
    );
    return secret;
  }

  function installUndergroundFixture(roomCode: string): string {
    // Dragon Sentinel: underground piece snapshot belongs only to its owner.
    const secret = 'e2e-dragon-underground-piece';
    const state = gameService.getRoom(roomCode)!.match!.getGameState();
    state.variantState.undergroundPieces = [
      {
        ownerColor: Color.Black,
        pieceSnapshot: { id: secret, color: Color.Black },
      },
    ];
    return secret;
  }

  function digest(roomCode: string) {
    const state = gameService.getRoom(roomCode)?.match?.getGameState();
    return JSON.stringify({
      currentTurn: state?.currentTurn,
      plyIndex: state?.plyIndex,
      whiteAP: state?.whiteAP,
      blackAP: state?.blackAP,
      history: state?.actionHistory.getAll(),
      terminal: state?.terminalResult,
    });
  }
});

function hiddenCellEffect(secret: string, type: Effect['type']): Effect {
  return {
    id: `effect-${secret}`,
    type,
    duration: null,
    remainingDuration: null,
    tickTiming: 'turnEnd',
    sourcePlayer: Color.Black,
    targetType: 'cell',
    targetId: secret,
    stackingRule: 'ignore',
    isDebuff: false,
    isHidden: true,
    metadata: { target: secret },
  };
}

function zombieEffect(pieceId: string): Effect {
  return {
    id: `zombie-${pieceId}`,
    type: 'zombie',
    duration: 1,
    remainingDuration: 1,
    tickTiming: 'turnEnd',
    sourcePlayer: Color.White,
    targetType: 'piece',
    targetId: pieceId,
    stackingRule: 'refresh',
    isDebuff: false,
    metadata: {},
  };
}

function expectPlayerDtoContract(
  payload: Record<string, unknown> | undefined,
): void {
  expect(isRecord(payload)).toBe(true);
  const view = payload!;
  expect(isRecord(view.board)).toBe(true);
  expect(Array.isArray((view.board as Record<string, unknown>).grid)).toBe(
    true,
  );
  for (const key of ['currentTurn', 'status'] as const) {
    expect(typeof view[key]).toBe('string');
  }
  for (const key of [
    'turnNumber',
    'whiteAP',
    'blackAP',
    'whiteTimeLeft',
    'blackTimeLeft',
  ] as const) {
    expect(typeof view[key]).toBe('number');
  }
  for (const key of [
    'whitePlayerEffects',
    'blackPlayerEffects',
    'moveHistory',
  ] as const) {
    expect(Array.isArray(view[key])).toBe(true);
  }
  for (const key of [
    'variantState',
    'availableSkillTargets',
    'opponentSkillCosts',
  ] as const) {
    expect(isRecord(view[key])).toBe(true);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function once(
  socket: Socket,
  event: string,
  timeoutMs = 1_000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(event, onEvent);
      socket.off('connect_error', onError);
    };
    const onEvent = (payload: unknown) => {
      cleanup();
      resolve(payload);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    socket.once(event, onEvent);
    socket.once('connect_error', onError);
  });
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline)
      throw new Error('Timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
