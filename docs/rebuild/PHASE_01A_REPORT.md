# PHASE_01A_REPORT — Monorepo Foundation

Ngày: 2026-10-13, Asia/Saigon. **Phase 01A implementation và local acceptance đã hoàn tất. Phase 01B chưa được bắt đầu.**

## 1. Phạm vi và approval

Chủ dự án review Phase 00 và cho phép Phase 01A trong prompt hiện tại. Đã đọc AGENTS, CONTEXT, engine architecture, roadmap, gameplay spec, test strategy và open decisions. Các quyết định Q/O/P00 không đổi; không giải các luật Variant còn mở bằng code.

Đã tạo sáu npm workspaces, strict TypeScript, lint/format/test/build/typecheck, boundaries được kiểm bằng AST +manifest và tests, minimal transport contracts, Nest health và Next starter mới. Không movement/AP/turn/effect handlers, concrete Variant, board/scene/animation, WebSocket gameplay, auth provider hoặc database.

## 2. File inventory

**61 file mới**, gồm source/config/tests/lockfile/README và báo cáo này. Generated node_modules/dist/.next/next-env/tsbuildinfo không nằm trong inventory; chúng được ignore.

```text
.editorconfig
.env.example
.github/workflows/ci.yml
.gitignore
.npmrc
.nvmrc
.prettierignore
.prettierrc.json
README.md
apps/backend/package.json
apps/backend/src/app.module.ts
apps/backend/src/health.controller.ts
apps/backend/src/main.ts
apps/backend/tsconfig.build.json
apps/backend/tsconfig.json
apps/frontend/next.config.ts
apps/frontend/package.json
apps/frontend/postcss.config.mjs
apps/frontend/src/app/globals.css
apps/frontend/src/app/layout.tsx
apps/frontend/src/app/page.tsx
apps/frontend/tsconfig.json
docs/rebuild/PHASE_01A_REPORT.md
eslint.config.mjs
package-lock.json
package.json
packages/game-core/package.json
packages/game-core/src/index.ts
packages/game-core/tests/public-api.test.ts
packages/game-core/tsconfig.build.json
packages/game-core/tsconfig.cjs.json
packages/game-core/tsconfig.json
packages/game-testkit/package.json
packages/game-testkit/src/index.ts
packages/game-testkit/tests/fixtures.test.ts
packages/game-testkit/tsconfig.build.json
packages/game-testkit/tsconfig.cjs.json
packages/game-testkit/tsconfig.json
packages/game-variants/package.json
packages/game-variants/src/index.ts
packages/game-variants/tests/public-api.test.ts
packages/game-variants/tsconfig.build.json
packages/game-variants/tsconfig.cjs.json
packages/game-variants/tsconfig.json
packages/shared-types/package.json
packages/shared-types/src/index.ts
packages/shared-types/tests/contracts.test.ts
packages/shared-types/tsconfig.build.json
packages/shared-types/tsconfig.cjs.json
packages/shared-types/tsconfig.json
scripts/check-boundaries.mjs
scripts/check-hygiene.mjs
scripts/smoke-exports.mjs
scripts/smoke-runtime.mjs
scripts/workspace-boundaries.mjs
scripts/write-cjs-package.mjs
tests/workspace-boundaries.test.ts
tsconfig.base.json
tsconfig.package.json
tsconfig.tooling.json
vitest.config.ts
```

Năm file hiện có được cập nhật để phản ánh approval Phase 01A: root AGENTS và docs/rebuild/ENGINE_ARCHITECTURE, IMPLEMENTATION_ROADMAP, GAMEPLAY_SPEC, OPEN_DECISIONS. Các thay đổi chỉ cập nhật status/gate, không thay luật. CONTEXT và các tài liệu khác giữ nguyên.

SHA-256 đối chiếu 216 file có trước phiên: 211 không đổi; 5 thay đổi là những tài liệu nêu trên. **205 file legacy docs/reference không đổi**. Không import reference làm dependency và không sửa GDD/Effect/Variants hoặc audit legacy.

## 3. Dependency versions thực tế

Tất cả direct dependencies pin exact; root package-lock.json là lockfile duy nhất. Workspace references dùng version 0.0.0 khớp local packages và npm symlinks, không dùng file/link sang reference.

| Thành phần | Version |
|---|---|
| Host Node / npm | 24.14.0 /11.9.0; engines major 24/11, .nvmrc 24.14.0 |
| TypeScript | 5.9.3 |
| ESLint /@eslint/js /typescript-eslint | 10.12.0 /10.0.1 /8.71.2 |
| React Hooks lint /globals /Prettier | 7.1.1 /17.13.0 /3.9.10 |
| Vitest /Vite | 5.0.4 /8.3.4 |
| Next.js | 16.4.0 |
| React /React DOM | 19.3.0 /19.3.0 |
| R3F /Drei /Three.js | 9.8.1 /10.7.9 /0.186.1 |
| Tailwind /PostCSS plugin /PostCSS | 4.3.3 /4.3.3 /8.5.30 |
| Nest common/core/platform-express | 12.1.3 |
| reflect-metadata /RxJS | 0.2.2 /7.8.2 |
| Zod | 4.6.7 |
| Types Node /React /React DOM /Three | 24.19.2 /19.3.0 /19.3.0 /0.186.0 |

Versions/engine/peer metadata được đọc từ npm registry, không suy từ source cũ. React 19.3 đáp ứng Fiber peer >=19,<19.4 và Drei^19/Fiber^9. Node 24 đáp ứng Next/Nest/Vitest/Vite/ESLint. TypeScript 5.9 trong range của typescript-eslint; không thêm major TS mới để setup foundation.

Nguồn chính thức đối chiếu: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Nest first steps](https://docs.nestjs.com/first-steps), [Vitest](https://vitest.dev/guide/), [R3F compatibility](https://r3f.docs.pmnd.rs/getting-started/installation), [Tailwind Next](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [ESLint support](https://eslint.org/version-support/).

## 4. Package boundaries và module strategy

| Workspace | Allowed local runtime dependencies | Giới hạn |
|---|---|---|
| shared-types | Không có; external chỉ Zod | Không apps/core/framework/Node infrastructure |
| game-core | shared-types | Không Nest/React/Three/database/Node infrastructure; public API chỉ version +plugin identity |
| game-variants | core/shared-types | Dùng interface Core qua root export; không app hoặc concrete Variant |
| game-testkit | core/variants/shared-types | Development/testing utility; không dependency runtime của backend/frontend |
| backend | core/variants/shared-types | Future composition root; testkit chỉ devDependency và test imports |
| frontend | shared-types | Không core/internal state/variants/testkit runtime; no scene |

Pure packages có type=module và conditional exports riêng cho import/require cùng declarations. TSC build ESM theo NodeNext và CJS theo CommonJS/Node10, CJS output có package.json type=commonjs. Nest application dùng CommonJS/NodeNext, legacy decorators+metadata; Next dùng ESNext/Bundler. Không aliases trỏ trực tiếp source package khác, không bundler/framework trong Core.

Strict flags gồm strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, noFallthroughCasesInSwitch, noUnusedLocals/Parameters và consistent casing. Pure core/shared/variants build không có ambient Node/DOM types; testkit riêng có Node types cho structuredClone. Third-party declarations dùng skipLibCheck, không tắt strict của source.

Enforcement:

- Root lint chạy ESLint +AST import checker +Prettier.
- Checker kiểm import/export/type imports, require và dynamic import; reject non-literal module loads.
- Chặn reference, cross-workspace relative imports, package internal subpaths, resolved TS aliases sang workspace khác, undeclared runtime dependencies và forbidden pure-package framework deps.
- Kiểm manifest graph, đúng sáu workspaces, testkit dev-only và file/link dependency vào reference.
- Negative tests gồm spoofed manifest vẫn không cho Core import React.
- Conditional exports thật được smoke-test bằng ESM/CJS; deep imports bị ERR_PACKAGE_PATH_NOT_EXPORTED.

## 5. Contracts đã có

[shared-types source](../../packages/shared-types/src/index.ts) có JSON/IDs/player-side/revision/version primitives, strict command/event envelopes, typed Result/Rejection và result-schema factory. Protocol/schema 0.1.0 là **draft foundation**, không freeze public ruleset.

Envelope chỉ xác minh transport structure và JSON payload; chưa typed gameplay payload, authz/visibility projection hoặc skill/move legality. Backend health đọc protocol version từ public shared export. Core/variants chỉ có public boundary/descriptor; không stub engine trả gameplay giả.

[Testkit](../../packages/game-testkit/src/index.ts) tạo schema-valid fixture.noop và cloneSerializable; không định nghĩa move/skill behavior. Frontend chỉ starter HTML/Tailwind +draft protocol label; dependencies 3D đã resolve nhưng chưa Canvas/model/animation.

## 6. Các lệnh và kết quả thực tế

| Lệnh/check | Kết quả cuối |
|---|---|
| node --version /npm --version | PASS: 24.14.0 /11.9.0 |
| npm view versions/engines/peers | Trong sandbox ENOTFOUND; đọc registry ngoài sandbox thành công |
| npm install | PASS ngoài sandbox:357 packages added,364 audited,0 vulnerabilities sau sửa tooling |
| npm ci --fetch-retries=0 --fetch-timeout=30000 | PASS ngoài sandbox:357 packages added,364 audited,0 vulnerabilities; lock reproducible |
| npm run format | PASS; legacy/docs/AGENTS/CONTEXT excluded bằng .prettierignore |
| npm run lint | PASS: ESLint zero warnings, boundaries6 workspaces, formatting pass |
| npm run typecheck | PASS: tooling +4 pure packages +Nest +Next route typegen/TS |
| npm test | PASS cuối:5 test files,**34 tests**; không gameplay tests |
| npm run build:packages | PASS ESM/CJS cho cả4 packages |
| npm run build | PASS ngoài sandbox:packages+Nest+Next; Next route / và /_not-found prerendered |
| npm run smoke:exports | PASS: 4 packages import/require; private subpaths blocked |
| npm ls --workspaces --depth=0 | Exit 0;6 local workspaces resolve, không required dependency missing/invalid |
| npm run smoke:runtime | Sandbox chưa xác minh HTTP; ngoài sandbox PASS **GET /health 200 expected JSON và frontend / 200 expected HTML**; temporary servers stopped |
| npm run check:boundaries | PASS manifest/source policy |
| npm run check:hygiene | PASS new workspace/tooling secret patterns và single lockfile; Git tracked check NOT AVAILABLE(no .git) |
| npm audit --audit-level=high | PASS: **0 vulnerabilities** |
| CI YAML | Prettier YAML parser accepted; manually checked jobs/steps/scripts và SHA chính thức; GitHub execution NOT RUN |

GitHub Actions uses checkout/setup-node v6 pinned SHA đọc bằng git ls-remote. [Workflow](../../.github/workflows/ci.yml) có Linux/Windows matrix, Node từ .nvmrc, npmci, lint/typecheck/test/build, exports/runtime smoke, hygiene, audit và gitdiff. Chưa có Git repository/remote trong workspace nên không thể chạy hosted CI hoặc xác nhận tracked-files ở máy này; không tạo Git metadata hoặc commit. Không gọi hosted CI là pass.

Không chạy audit fix --force/legacy-peer-deps. Npm commands dùng npm.cmd trên Windows để tránh PowerShell shim policy. Backend dùng app-local optional.env, PORT/BACKEND_PORT/HOST; frontend dùng Next app-localenv. [.env.example](../../.env.example) chỉ config công khai, không credentials.

## 7. Warnings/failures và cách xử lý

1. Npm registry DNS bị sandbox chặn (ENOTFOUND): chỉ read/install/audit network cần chạy ngoài sandbox; source không thay để né.
2. Install ban đầu dùng ESLint 9.39.5: deprecated/EOL, Next lint preset có5 High qua braces. [Advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) chưa có patched version khi kiểm. Đã bỏ preset kéo vulnerable subtree, dùng ESLint 10 +TS/React Hooks rules; audit cuối 0.
3. Hai lần update tree cũ gặp ERESOLVE. Đã xóa **chỉ root node_modules và lockfile mới tạo trong phiên** sau verify absolute targets D:/restart; unlinked workspace junctions trước. Fresh npm install thành công không force/ignore peer dependencies.
4. Build testkit ban đầu thiếu structuredClone type: Node types chỉ thêm testkit build; core/shared không thêm ambient infrastructure.
5. Vitest ban đầu cảnh báo sourcemap source paths: thêm inlineSources trong pure package maps; run cuối không còn cảnh báo.
6. Next Turbopack sandbox build bị canonicalize D:/restart Access denied. Cùng source/config build ngoài sandbox thành công; không đổi sang bundler khác hoặc monkey-patch filesystem.
7. Sandbox runtime probe timeout dù Nest khởi động. Ngoài sandbox HTTP assertions cả backend/frontend pass. Không coi log “started” là proof endpoint HTTP.
8. npm ls còn báo @img/sharp-wasm32@0.35.5 và @emnapi/runtime@1.11.3 extraneous trong optional installation tree. Cả hai có version/integrity và optional=true trong root lockfile; required workspace/peer dependencies hợp lệ, exit0. Ghi nhận warning, không thêm direct dependency hoặc giấu nó bằng omit flags.
9. Secret-pattern scan không là chứng minh tuyệt đối absence mọi secret. Chỉ scan new workspace/tooling và không tạo credentials; legacy không sửa. Git tracked-artifact check chờ môi trường có.git.

Generated artifacts hiện có do acceptance builds/install; ignore rules bao phủ node_modules/dist/.next/coverage/tsbuildinfo/next-env/env files. Không commit gì trong phiên này.

## 8. Technical decisions mới và Phase 01B entry

- P01A-T01: npm workspaces ordered topology +one root lockfile; version 0.0.0 local links.
- P01A-T02: TSC dual ESM/CJS exports cho pure packages, Nest CJS, Next bundler resolution.
- P01A-T03: Zod schema cho minimal transport validation; draft0.1.0 chưa gameplay/public ruleset.
- P01A-T04: ESLint 10 +TS/ReactHooks rules, Prettier, Vitest 5; không Nx/Turbo/ORM/DI in Core.
- P01A-T05: TypeScript AST checker +manifest policy +negative tests và real exports smoke; không chỉ documentation convention.
- P01A-T06: Plain tsc watch +Node watch backend; Next scripts frontend; shared package builds chuẩn bị declarations trước typecheck/test/apps.

Các lựa chọn này nằm trong architecture đã được cho phép, không đổi gameplay decisions. Không cấu hình auth/provider/database hoặc actual match composition.

Trước Phase 01B: chủ dự án review foundation/report và cho phép bắt đầu riêng; xác nhận scope base deterministic core/fixtures. Contracts board/piece/action/RNG/snapshot/terminal/repetition và approved oracle P00/Q/O sẽ được thiết kế/implement ở 01B, không coi draft envelope là hoàn thiện network gameplay. Các effect/Variant policies D-04/05/06/08 và group-specific decisions vẫn giữ gates Phase 02+; không cần giải toàn 27 trước base Core. Public ruleset/version freeze, infrastructure/provider/session và production CI verification còn ở phase tương ứng.

Hướng dẫn chạy và scripts ở [README](../../README.md); approved rules nguồn tại [GAMEPLAY_SPEC](GAMEPLAY_SPEC.md), [OPEN_DECISIONS](OPEN_DECISIONS.md), [TEST_STRATEGY](TEST_STRATEGY.md). **Không bắt đầu Phase 01B trong phiên này.**
