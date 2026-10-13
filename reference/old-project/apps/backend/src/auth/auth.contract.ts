type OpaqueString<Name extends string> = string & {
  readonly __opaque: Name;
};

export type AccessToken = OpaqueString<'AccessToken'>;
export type AccountId = OpaqueString<'AccountId'>;
export type SessionId = OpaqueString<'SessionId'>;
export type ReconnectToken = OpaqueString<'ReconnectToken'>;
export type PublicPlayerRef = OpaqueString<'PublicPlayerRef'>;

export interface AuthPrincipal {
  accountId: AccountId;
  sessionId: SessionId;
}

export interface AuthProvider {
  authenticate(accessToken: AccessToken): Promise<AuthPrincipal | null>;
}

export interface AccountSession {
  principal: AuthPrincipal;
  reconnectToken: ReconnectToken;
}

export interface PlayerIdentity {
  publicPlayerRef: PublicPlayerRef;
  session: AccountSession;
}

export interface PublicPlayerDto {
  publicPlayerRef: PublicPlayerRef;
}

export interface PublicRoomDto {
  players: PublicPlayerDto[];
}

export interface PublicSpectatorDto {
  players: PublicPlayerDto[];
}

export function toPublicPlayerDto(identity: PlayerIdentity): PublicPlayerDto {
  return { publicPlayerRef: identity.publicPlayerRef };
}

export function toPublicRoomDto(
  identities: readonly PlayerIdentity[],
): PublicRoomDto {
  return { players: identities.map(toPublicPlayerDto) };
}

export function toPublicSpectatorDto(
  identities: readonly PlayerIdentity[],
): PublicSpectatorDto {
  return { players: identities.map(toPublicPlayerDto) };
}

export function accessToken(value: string): AccessToken {
  return value as AccessToken;
}

export function accountId(value: string): AccountId {
  return value as AccountId;
}

export function sessionId(value: string): SessionId {
  return value as SessionId;
}

export function reconnectToken(value: string): ReconnectToken {
  return value as ReconnectToken;
}

export function publicPlayerRef(value: string): PublicPlayerRef {
  return value as PublicPlayerRef;
}
