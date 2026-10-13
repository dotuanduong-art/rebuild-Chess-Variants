import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  reconnectToken,
  accountId,
  sessionId,
  type AccessToken,
  type AccountId,
  type AuthPrincipal,
  type AuthProvider,
  type PublicPlayerRef,
  type ReconnectToken,
} from './auth.contract.js';
import { AUTH_PROVIDER, RECONNECT_TOKEN_FACTORY } from './auth.tokens.js';

type ReconnectTokenFactory = () => ReconnectToken;

interface SeatBinding {
  accountId: AccountId;
  reconnectToken: ReconnectToken | null;
}

interface ActiveSeat {
  roomCode: string;
  playerRef: PublicPlayerRef;
}

type CredentialResult =
  | { success: true; reconnectToken: ReconnectToken }
  | { success: false; error: string };

@Injectable()
export class AuthSessionRegistry {
  private readonly principalsBySocket = new Map<string, AuthPrincipal>();
  private readonly seats = new Map<string, SeatBinding>();
  private readonly activeSeatsBySocket = new Map<string, ActiveSeat>();
  private readonly createReconnectToken: ReconnectTokenFactory;

  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    @Optional()
    @Inject(RECONNECT_TOKEN_FACTORY)
    createReconnectToken?: ReconnectTokenFactory,
  ) {
    this.createReconnectToken =
      createReconnectToken ??
      (() => reconnectToken(randomBytes(32).toString('base64url')));
  }

  async authenticateSocket(
    socketId: string,
    token: AccessToken,
  ): Promise<AuthPrincipal | null> {
    const principal = await this.authProvider.authenticate(token);
    if (principal) {
      this.principalsBySocket.set(socketId, principal);
    } else {
      this.principalsBySocket.delete(socketId);
    }
    return principal;
  }

  authenticateGuestSocket(socketId: string, guestId: string): AuthPrincipal {
    const principal: AuthPrincipal = {
      accountId: accountId(`guest:${guestId}`),
      sessionId: sessionId(`guest:${guestId}`),
    };
    this.principalsBySocket.set(socketId, principal);
    return principal;
  }

  getPrincipal(socketId: string): AuthPrincipal | undefined {
    return this.principalsBySocket.get(socketId);
  }

  disconnectSocket(socketId: string): void {
    this.principalsBySocket.delete(socketId);
    this.activeSeatsBySocket.delete(socketId);
  }

  getBoundPlayerRef(
    socketId: string,
    roomCode: string,
  ): PublicPlayerRef | undefined {
    if (!this.principalsBySocket.has(socketId)) return undefined;
    const seat = this.activeSeatsBySocket.get(socketId);
    return seat?.roomCode === roomCode ? seat.playerRef : undefined;
  }

  bindSeat(
    socketId: string,
    roomCode: string,
    playerRef: PublicPlayerRef,
  ): CredentialResult {
    const principal = this.principalsBySocket.get(socketId);
    if (!principal) {
      return { success: false, error: 'Socket is not authenticated' };
    }

    const key = seatKey(roomCode, playerRef);
    if (this.seats.has(key)) {
      return { success: false, error: 'Seat is already bound' };
    }

    const token = this.createReconnectToken();
    this.seats.set(key, {
      accountId: principal.accountId,
      reconnectToken: token,
    });
    this.activeSeatsBySocket.set(socketId, { roomCode, playerRef });
    return { success: true, reconnectToken: token };
  }

  authorizeSeat(
    socketId: string,
    roomCode: string,
    playerRef: PublicPlayerRef,
    presentedToken: ReconnectToken,
  ): { success: true } | { success: false; error: string } {
    const principal = this.principalsBySocket.get(socketId);
    const binding = this.seats.get(seatKey(roomCode, playerRef));
    if (
      !principal ||
      !binding ||
      principal.accountId !== binding.accountId ||
      !binding.reconnectToken ||
      !credentialsMatch(presentedToken, binding.reconnectToken)
    ) {
      return { success: false, error: 'Reconnect credential rejected' };
    }

    return { success: true };
  }

  rotateSeat(
    socketId: string,
    roomCode: string,
    playerRef: PublicPlayerRef,
  ): CredentialResult {
    const principal = this.principalsBySocket.get(socketId);
    const binding = this.seats.get(seatKey(roomCode, playerRef));
    if (!principal || !binding || principal.accountId !== binding.accountId) {
      return { success: false, error: 'Reconnect credential rejected' };
    }

    const replacement = this.createReconnectToken();
    binding.reconnectToken = replacement;
    this.activeSeatsBySocket.set(socketId, { roomCode, playerRef });
    return { success: true, reconnectToken: replacement };
  }

  revokeSeat(roomCode: string, playerRef: PublicPlayerRef): void {
    const binding = this.seats.get(seatKey(roomCode, playerRef));
    if (binding) {
      binding.reconnectToken = null;
    }
  }
}

function seatKey(roomCode: string, playerRef: PublicPlayerRef): string {
  return `${roomCode}:${playerRef}`;
}

function credentialsMatch(
  left: ReconnectToken,
  right: ReconnectToken,
): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}
