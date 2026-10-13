# Variant Chess — Phase 01A foundation

A clean TypeScript monorepo. Gameplay is intentionally deferred to Phase 01B.

Use Node 24.14+ within major 24 and npm 11.9+ within major 11. Versions are pinned in the root lockfile. Install from this directory with `npm ci` (or `npm install` when intentionally updating dependencies).

## Workspaces

| Package                        | Foundation scope                                                          |
| ------------------------------ | ------------------------------------------------------------------------- |
| `@variant-chess/shared-types`  | JSON primitives, draft versioned envelopes and result/rejection contracts |
| `@variant-chess/game-core`     | Public version and plugin identity interface; no gameplay                 |
| `@variant-chess/game-variants` | Core plugin contract boundary; no concrete variant                        |
| `@variant-chess/game-testkit`  | Development-only transport fixtures and deep-clone utility                |
| `@variant-chess/backend`       | Nest application and `GET /health`                                        |
| `@variant-chess/frontend`      | New Next/Tailwind starter; R3F/Three/Drei dependencies, no scene          |

Pure packages expose ESM and CJS builds through their root exports. Nest uses CJS and Next uses ESM/bundler resolution. Cross-workspace source/internal imports are rejected by the architecture checker and exports map.

## Commands

- `npm run lint`: ESLint, enforced workspace boundaries and formatting.
- `npm run typecheck`: prepare package declarations, check tooling and every workspace.
- `npm test`: prepare public package builds, then run Vitest foundation and architecture tests.
- `npm run build`: build packages in dependency order, then backend and frontend.
- `npm run smoke:exports`: resolve all pure packages with both import and require.
- `npm run smoke:runtime`: after a full build, start temporary local production servers, request backend health and frontend starter, then stop them.
- `npm run check:hygiene`: check new workspace/tooling secret patterns, one root lockfile, and tracked artifacts when Git is available.
- `npm run format`: format new code/config; legacy reference and existing docs are excluded.

For development, run `npm run dev:frontend` and `npm run dev:backend` in separate terminals. The backend command starts the compiled app with Node watch; run `npm run dev:compile -w @variant-chess/backend` in another terminal to compile TS edits. No extra watcher framework is needed.

Backend defaults to `http://127.0.0.1:3001/health`; frontend defaults to `http://127.0.0.1:3000`. Backend accepts `PORT` (deployment convention), `BACKEND_PORT`, and `HOST`. Node loads an optional `apps/backend/.env`; Next loads its app-local environment. Root `.env.example` documents configuration only and contains no credentials. The frontend does not connect to backend gameplay yet.

See [Phase 01A report](docs/rebuild/PHASE_01A_REPORT.md), [architecture](docs/rebuild/ENGINE_ARCHITECTURE.md) and [phase decisions](docs/rebuild/OPEN_DECISIONS.md). CI runs locked installation, lint/typecheck/test/build, exports/runtime smoke, hygiene and advisory checks on Linux and Windows. GitHub CI execution is separate from local validation.
