# 09 — Implementation log

## G0.2 — E2E module resolution

- `npm run test:e2e -w apps/backend -- --runInBand` now discovers and runs `test/app.e2e-spec.ts` after resolving NodeNext-style relative `.js` imports to TypeScript source.
- Out-of-scope failure found: `GET /` returns HTTP 404 while the existing e2e test expects HTTP 200 and `Hello World!` (`1 test discovered, 1 failed`). Per G0.2 scope, application/game behavior was not changed.

## G0.2b — Real application/Socket.IO smoke test

- Replaced the invalid `GET /` scaffold expectation with a smoke test that starts the real Nest application on an ephemeral loopback port and connects a Socket.IO client over WebSocket.
- No HTTP route or game behavior was added or changed.
- `npm run test:e2e -w apps/backend -- --runInBand`: 1 suite passed, 1 test passed, exit 0.
- `npm -w apps/backend test -- --runInBand`: 42 suites passed, 549 tests passed, unchanged from the lot baseline.

## G0.7 — CI baseline

- CI provider assumption: GitHub Actions. The workflow uses Node 24 and `npm ci`, then builds/typechecks core before the backend/frontend production typechecks, runs roadmap lint, backend unit and e2e suites, non-blocking lint reports, the production build, and a clean-tree assertion. Building core first is required in a clean checkout because both consumer workspaces resolve its ignored `dist` exports.
- Lint baseline, collected without `--fix`: backend 2,894 errors and 39 warnings across 45 files; frontend 86 errors and 39 warnings across 12 files. Both CI lint steps are explicitly non-blocking.
- Additional existing debt: `tsc --noEmit` against the backend's broad default config includes characterization specs and reports 42 errors. G0.7 does not change those tests; the CI production typecheck uses Nest's existing `tsconfig.build.json`, which excludes `*.spec.ts` and exits 0.

## G0.5 — Security dependency updates

### Cluster 1 — Next

- Updated `next` and `eslint-config-next` from 16.2.7 to 16.3.8; the major version remains 16.
- Production audit changed from 14 vulnerabilities (1 low, 2 moderate, 10 high, 1 critical) to 10 (1 low, 2 moderate, 7 high, 0 critical). The `next`, `postcss`, and `sharp` entries were removed.
- Core/backend/frontend production typechecks, 549 unit tests, 1 e2e smoke test, and the production build all passed.

### Cluster 2 — Socket.IO

- Updated direct `socket.io` and `socket.io-client` dependencies from 4.8.3 to 4.8.4; the major version remains 4. Targeted lockfile updates moved `engine.io` to 6.6.11, `engine.io-client` to 6.6.7, `socket.io-adapter` to 2.5.8, `socket.io-parser` to 4.2.7, and `ws` to 8.21.3.
- Production audit changed from 10 vulnerabilities (1 low, 2 moderate, 7 high) to 5 (1 low, 2 moderate, 2 high). The `engine.io`, `engine.io-client`, `socket.io-adapter`, `socket.io-parser`, and `ws` entries were removed.
- Core/backend/frontend production typechecks, 549 unit tests, 1 e2e smoke test, and the production build all passed.

### Cluster 3 — Nest

- Updated Nest runtime and testing packages to 11.2.7, `@nestjs/cli` to 11.0.24, and `@nestjs/schematics` to 11.1.0; every Nest package remains on major 11.
- After the direct Nest update, targeted compatible lockfile updates moved `body-parser` to 2.3.0 and `qs` to 6.16.0. The last shared Next/browserslist transitive, `baseline-browser-mapping`, moved to 2.11.27 in the same final lockfile cleanup; no direct dependency or major version changed.
- Production audit changed from 5 vulnerabilities (1 low, 2 moderate, 2 high) to 0 and exited 0. No remaining production advisory requires a major upgrade.
- Core/backend/frontend production typechecks, 549 unit tests, 1 e2e smoke test, and the production build all passed.

## R — Roadmap decision closure

- Ngày 2026-10-10, chủ dự án xác nhận toàn bộ phương án O-1…O-9 sau phiên grill roadmap.
- `06-decisions.md`, `07-roadmap-final.md` và `08-variant-diff.md` đã được đồng bộ: Supabase Auth, hard-timeout loss, reconnect policy, King restrictions/destruction, Time ultimate contract và hai duration drift đều đã chốt.
- Các task từng `CHỜ O-*`/`TẠM THỜI` được chuyển sang `SẴN SÀNG`; trạng thái G0.1–G0.5, G0.7 và G0.8 được đồng bộ với commit/implementation evidence.
- `node docs/audit/check-roadmap.mjs docs/audit/07-roadmap-final.md`: 73 task, 146 cạnh phụ thuộc, 35 quyết định, 44 finding; DAG hợp lệ.

## G1.1 — Provider-neutral auth contract

- Added minimal `AuthPrincipal`, `AuthProvider`, `AccountSession` and `PlayerIdentity` contracts with opaque types separating access/reconnect credentials and public/private identifiers.
- Added a production `SupabaseAuthProvider` that verifies bearer tokens through Supabase Auth's `/auth/v1/user` endpoint and maps verified account/session claims into the provider-neutral principal without adding an SDK dependency.
- Added explicit public player, room and spectator DTO projections that expose only `publicPlayerRef`; contract tests serialize each real projection and assert account/session/reconnect/access credentials are absent.
- Socket handshake verification and socket/seat binding remain in G1.2.
- `npm test -w apps/backend -- auth.contract.spec.ts supabase-auth.provider.spec.ts --runInBand`: 2 suites, 6 tests passed.
- `npm run build -w apps/backend`: passed.

## G1.2 — Authenticated socket/seat binding

- Added a socket session registry behind the provider-neutral `AuthProvider`; socket handshakes now require a Supabase-verified access token before room creation, joining or reconnect.
- Bound each room seat to the authenticated account and a cryptographically random reconnect credential. Reconnect authorization is non-consuming; the token rotates only after the game service accepts the room/player reconnect, so an ordinary lookup failure cannot lock out a valid player. Explicit revocation and cross-principal takeover rejection are covered by registry tests.
- Split secret `playerId` from `publicPlayerRef`; owner-only payloads carry both where needed, while room/draft/action/disconnect broadcasts use only the public reference.
- `room-created`, `room-joined` and `reconnected` return the current reconnect credential only to that socket. The frontend stores it per browser session, sends it on reconnect and replaces it after rotation.
- Added a Supabase browser auth gate using Google OAuth and email magic-link flows. A verified/auto-refreshed session supplies the access token to the Socket.IO handshake; session loss disconnects the authenticated socket.
- Handshake integration tests exercise `SupabaseAuthProvider`; the Socket.IO e2e smoke overrides the provider with a deterministic verified principal and waits for the server's `authenticated` event.
- `npm test -w apps/backend -- --runInBand`: 46 suites, 562 tests passed.
- `npm run test:e2e -w apps/backend -- --runInBand`: 1 suite, 1 test passed.
- `npm run build -w apps/backend`: passed.
- `npm run build -w apps/frontend`: passed.
- `npm audit --omit=dev`: 0 vulnerabilities after compatible transitive fixes for the lockfile changes introduced by the Supabase client.

## G1.3a — Core root-action authority

- Added a first-in-pipeline authority validator for every player root action: move, capture, zombie bite, skill, pass, end turn, sacrifice and surrender. It requires an independent requester, resolves controlled pieces through `getPieceOwner`, and enforces requester = effective owner = current turn before AP, clocks, board or history can mutate.
- `Match.makeMove` now preflights the same validator chain before clock/timestamp processing. The general `submitAction` API no longer infers identity from `action.player` or a source piece; every existing player-root caller and test fixture now supplies requester explicitly.
- Added a 20-case authority suite covering wrong requester and wrong turn for all eight root action families, missing-requester/H-01 impersonation, controlled-piece effective ownership and full state hashes including board, AP, clocks, RNG, action history and move history. A-01 and A-02 characterization cases are now ordinary green regressions.
- Surrender is authority-validated but deliberately does not create an ad-hoc terminal result; the canonical terminal transition remains scoped to G1.4/G1.5a.
- `npm test -w apps/backend -- --runInBand`: 47 suites, 582 tests passed.
- `npm run test:e2e -w apps/backend -- --runInBand`: 1 suite, 1 test passed.
- `npm run build`: core, backend and frontend production builds passed.

## Architecture review — 2026-10-11

- Full-codebase review found most organization risks already owned by the roadmap: `ActionPipeline`/store god files (G2.6/G2.8), attack-query drift (G2.6c), registry lifecycle (G2.3), DTO separation (G1.7/G3.1), determinism (G2.5), import cycles (G2.9), and metadata drift (G4.10a).
- Added **G1.3d** for an authenticated `CommandContext` and a single room/match application seam; gateway must stop mutating domain room state and only broadcast committed results.
- Added **G2.6e** for separate `RootCommand`, `DerivedAction`, and `DomainEvent` contracts so derived effect chains cannot bypass requester/transaction rules.
- Added **G2.6d** for typed `EffectDefinition`/`EffectInstance` and a uniform effect lifecycle; this closes the previously unowned `metadata: Record<string, any>`/scattered effect semantics problem.
- No new task was added for attack resolution, frontend store splitting, snapshot/serialization, clocks/RNG, or documentation drift because those are already explicitly covered by existing roadmap tasks.

## G1.3b–G1.3d–G1.3c — Authenticated command authority

- `AuthSessionRegistry` now tracks the active room seat for each authenticated socket and drops that active lookup on disconnect; reconnect activates the seat only after credential authorization and rotation succeed.
- Gateway commands resolve a server-owned `CommandContext` from socket → authenticated seat → room player. Client `playerId` remains compatibility input but cannot select the authoritative player/color; move impersonation is rejected without a committed broadcast.
- Lobby/match mutations, sacrifices, surrender resolution, draft/reveal/loading phase changes and timeout checks now cross `GameService`; the gateway no longer writes room phase/timer fields or submits core actions directly.
- Zombie Bite is derived server-side from the moving piece and target. Client `moveType` was removed from the emitted command, and bite now shares the normal main-action phase/`hasMoved` gate.
- Follow-up review closed the remaining G1.3d boundary gaps: `GameService` now rehydrates every command context against the live room seat, preserves the opaque `PublicPlayerRef`, creates per-recipient committed deliveries, and owns turn/disconnect timeout policy. Gateway no longer derives move/skill metadata from request DTOs or navigates room storage to construct command broadcasts.
- Zombie Bite eligibility now has one shared domain classifier used by move annotation, root-command derivation and validation. The regression suite proves one valid bite records one main action and advances exactly one turn; a second command from the former actor is rejected.
- Verification after review closure: 47 backend suites / 586 tests passed; backend build passed. Full e2e/build and roadmap lint were rerun before the milestone commit.
- Targeted authority/auth/zombie suite: 5 suites, 56 tests passed. Full backend: 47 suites, 585 tests passed. Socket e2e: 1 suite, 1 test passed. Backend/frontend production builds passed.
