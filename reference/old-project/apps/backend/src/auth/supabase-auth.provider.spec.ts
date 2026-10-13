import { SupabaseAuthProvider } from './supabase-auth.provider.js';
import { accessToken } from './auth.contract.js';

describe('SupabaseAuthProvider', () => {
  const token = accessToken(createJwt({ session_id: 'session_123' }));

  it('verifies the access token with Supabase Auth and returns a provider-neutral principal', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'account_123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const provider = new SupabaseAuthProvider(
      {
        url: 'https://project.supabase.co',
        anonKey: 'public_anon_key',
      },
      fetcher,
    );

    await expect(provider.authenticate(token)).resolves.toEqual({
      accountId: 'account_123',
      sessionId: 'session_123',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      {
        headers: {
          apikey: 'public_anon_key',
          authorization: `Bearer ${token}`,
        },
        method: 'GET',
      },
    );
  });

  it.each([
    ['a rejected access token', new Response(null, { status: 401 })],
    [
      'a response without an account id',
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ],
  ])('rejects %s', async (_case, response) => {
    const provider = new SupabaseAuthProvider(
      { url: 'https://project.supabase.co/', anonKey: 'public_anon_key' },
      jest.fn().mockResolvedValue(response),
    );

    await expect(provider.authenticate(token)).resolves.toBeNull();
  });

  it('rejects a verified token without a session id', async () => {
    const provider = new SupabaseAuthProvider(
      { url: 'https://project.supabase.co', anonKey: 'public_anon_key' },
      jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'account_123' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(provider.authenticate(accessToken(createJwt({})))).resolves.toBeNull();
  });
});

function createJwt(payload: Record<string, unknown>): string {
  return [
    encodeBase64Url({ alg: 'HS256', typ: 'JWT' }),
    encodeBase64Url(payload),
    'signature',
  ].join('.');
}

function encodeBase64Url(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
