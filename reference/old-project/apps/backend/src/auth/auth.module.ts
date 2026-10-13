import { Module } from '@nestjs/common';
import { AuthSessionRegistry } from './auth-session.registry.js';
import { AUTH_PROVIDER } from './auth.tokens.js';
import { SupabaseAuthProvider } from './supabase-auth.provider.js';

@Module({
  providers: [
    {
      provide: AUTH_PROVIDER,
      useFactory: () =>
        new SupabaseAuthProvider({
          url: process.env.SUPABASE_URL ?? '',
          anonKey:
            process.env.SUPABASE_PUBLISHABLE_KEY ??
            process.env.SUPABASE_ANON_KEY ??
            '',
        }),
    },
    AuthSessionRegistry,
  ],
  exports: [AuthSessionRegistry],
})
export class AuthModule {}
