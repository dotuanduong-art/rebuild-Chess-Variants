import {
  accessToken,
  accountId,
  publicPlayerRef,
  reconnectToken,
  sessionId,
  type AccessToken,
  type AuthPrincipal,
  type AuthProvider,
  type ReconnectToken,
} from './auth.contract.js';
import { AuthSessionRegistry } from './auth-session.registry.js';

class FakeAuthProvider implements AuthProvider {
  constructor(private readonly principals: ReadonlyMap<AccessToken, AuthPrincipal>) {}

  async authenticate(token: AccessToken): Promise<AuthPrincipal | null> {
    return this.principals.get(token) ?? null;
  }
}

describe('AuthSessionRegistry', () => {
  const aliceToken = accessToken('alice_access');
  const bobToken = accessToken('bob_access');
  const alice: AuthPrincipal = {
    accountId: accountId('alice_account'),
    sessionId: sessionId('alice_session'),
  };
  const bob: AuthPrincipal = {
    accountId: accountId('bob_account'),
    sessionId: sessionId('bob_session'),
  };
  let issuedTokens: ReconnectToken[];
  let registry: AuthSessionRegistry;

  beforeEach(() => {
    issuedTokens = [
      reconnectToken('reconnect_1'),
      reconnectToken('reconnect_2'),
      reconnectToken('reconnect_3'),
    ];
    registry = new AuthSessionRegistry(
      new FakeAuthProvider(
        new Map([
          [aliceToken, alice],
          [bobToken, bob],
        ]),
      ),
      () => issuedTokens.shift()!,
    );
  });

  it('authenticates a socket and binds its principal to a new seat', async () => {
    await expect(registry.authenticateSocket('socket_alice', aliceToken)).resolves.toEqual(alice);

    expect(
      registry.bindSeat(
        'socket_alice',
        'ROOM01',
        publicPlayerRef('player_public'),
      ),
    ).toEqual({ success: true, reconnectToken: reconnectToken('reconnect_1') });
    expect(registry.getBoundPlayerRef('socket_alice', 'ROOM01')).toBe(
      publicPlayerRef('player_public'),
    );
  });

  it('drops the active seat lookup when the socket disconnects', async () => {
    await registry.authenticateSocket('socket_alice', aliceToken);
    registry.bindSeat('socket_alice', 'ROOM01', publicPlayerRef('player_public'));

    registry.disconnectSocket('socket_alice');

    expect(registry.getBoundPlayerRef('socket_alice', 'ROOM01')).toBeUndefined();
  });

  it('rejects a different principal attempting to resume the same player seat', async () => {
    await registry.authenticateSocket('socket_alice', aliceToken);
    const bound = registry.bindSeat(
      'socket_alice',
      'ROOM01',
      publicPlayerRef('player_public'),
    );
    expect(bound.success).toBe(true);
    await registry.authenticateSocket('socket_bob', bobToken);

    expect(
      registry.authorizeSeat(
        'socket_bob',
        'ROOM01',
        publicPlayerRef('player_public'),
        reconnectToken('reconnect_1'),
      ),
    ).toEqual({ success: false, error: 'Reconnect credential rejected' });
  });

  it('rotates a reconnect credential after use and can revoke the replacement', async () => {
    await registry.authenticateSocket('socket_alice', aliceToken);
    registry.bindSeat(
      'socket_alice',
      'ROOM01',
      publicPlayerRef('player_public'),
    );
    registry.disconnectSocket('socket_alice');
    await registry.authenticateSocket('socket_alice_new', aliceToken);

    expect(
      registry.authorizeSeat(
        'socket_alice_new',
        'ROOM01',
        publicPlayerRef('player_public'),
        reconnectToken('reconnect_1'),
      ),
    ).toEqual({ success: true });
    // Authorization alone does not consume the credential. A room/player failure
    // between authorization and commit can be retried safely.
    expect(
      registry.authorizeSeat(
        'socket_alice_new',
        'ROOM01',
        publicPlayerRef('player_public'),
        reconnectToken('reconnect_1'),
      ),
    ).toEqual({ success: true });
    expect(
      registry.rotateSeat(
        'socket_alice_new',
        'ROOM01',
        publicPlayerRef('player_public'),
      ),
    ).toEqual({ success: true, reconnectToken: reconnectToken('reconnect_2') });
    expect(
      registry.authorizeSeat(
        'socket_alice_new',
        'ROOM01',
        publicPlayerRef('player_public'),
        reconnectToken('reconnect_1'),
      ),
    ).toEqual({ success: false, error: 'Reconnect credential rejected' });

    registry.revokeSeat('ROOM01', publicPlayerRef('player_public'));
    expect(
      registry.authorizeSeat(
        'socket_alice_new',
        'ROOM01',
        publicPlayerRef('player_public'),
        reconnectToken('reconnect_2'),
      ),
    ).toEqual({ success: false, error: 'Reconnect credential rejected' });
  });
});
