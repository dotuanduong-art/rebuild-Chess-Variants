import {
  accountId,
  sessionId,
  type AccessToken,
  type AuthPrincipal,
  type AuthProvider,
} from './auth.contract.js';

export interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface SupabaseUserResponse {
  id?: unknown;
}

interface AccessTokenClaims {
  session_id?: unknown;
}

export class SupabaseAuthProvider implements AuthProvider {
  private readonly userEndpoint: string;

  constructor(
    private readonly config: SupabaseAuthConfig,
    private readonly fetcher: Fetcher = globalThis.fetch,
  ) {
    this.userEndpoint = `${config.url.replace(/\/$/, '')}/auth/v1/user`;
  }

  async authenticate(token: AccessToken): Promise<AuthPrincipal | null> {
    const verifiedSessionId = readSessionId(token);
    if (!verifiedSessionId) {
      return null;
    }

    const response = await this.fetcher(this.userEndpoint, {
      headers: {
        apikey: this.config.anonKey,
        authorization: `Bearer ${token}`,
      },
      method: 'GET',
    });
    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as SupabaseUserResponse;
    if (typeof user.id !== 'string' || user.id.length === 0) {
      return null;
    }

    return {
      accountId: accountId(user.id),
      sessionId: sessionId(verifiedSessionId),
    };
  }
}

function readSessionId(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as AccessTokenClaims;
    return typeof claims.session_id === 'string' && claims.session_id.length > 0
      ? claims.session_id
      : null;
  } catch {
    return null;
  }
}
