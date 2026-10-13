import {
  accessToken,
  accountId,
  type AuthPrincipal,
  type AuthProvider,
  type PlayerIdentity,
  publicPlayerRef,
  reconnectToken,
  sessionId,
  toPublicPlayerDto,
  toPublicRoomDto,
  toPublicSpectatorDto,
} from './auth.contract.js';

class FakeAuthProvider implements AuthProvider {
  constructor(
    private readonly sessions: ReadonlyMap<ReturnType<typeof accessToken>, AuthPrincipal>,
  ) {}

  async authenticate(token: ReturnType<typeof accessToken>): Promise<AuthPrincipal | null> {
    return this.sessions.get(token) ?? null;
  }
}

describe('auth contract', () => {
  const principal: AuthPrincipal = {
    accountId: accountId('account_secret'),
    sessionId: sessionId('session_secret'),
  };

  it('keeps provider-specific verification behind AuthProvider', async () => {
    const provider: AuthProvider = new FakeAuthProvider(
      new Map([[accessToken('access_secret'), principal]]),
    );

    await expect(provider.authenticate(accessToken('access_secret'))).resolves.toEqual(principal);
    await expect(provider.authenticate(accessToken('invalid'))).resolves.toBeNull();
  });

  it('projects player, room and spectator DTOs through explicit public allowlists', () => {
    const identity: PlayerIdentity = {
      publicPlayerRef: publicPlayerRef('public_player_1'),
      session: {
        principal,
        reconnectToken: reconnectToken('reconnect_secret'),
      },
    };

    const payloads = [
      toPublicPlayerDto(identity),
      toPublicRoomDto([identity]),
      toPublicSpectatorDto([identity]),
    ];

    expect(payloads).toEqual([
      { publicPlayerRef: 'public_player_1' },
      { players: [{ publicPlayerRef: 'public_player_1' }] },
      { players: [{ publicPlayerRef: 'public_player_1' }] },
    ]);
    for (const payload of payloads) {
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain('account_secret');
      expect(serialized).not.toContain('session_secret');
      expect(serialized).not.toContain('reconnect_secret');
      expect(serialized).not.toContain('access_secret');
    }
  });
});
