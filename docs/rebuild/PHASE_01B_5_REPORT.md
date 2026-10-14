# 01B-5 — Final Integration & Verification

2026-10-14 (Asia/Saigon). Baseline `7c06af7`; implementation giữ trong working tree, **không commit/push**. Kết luận Phase 01B: **READY_WITH_CONDITIONS** cho Phase 02, không còn failing tests hoặc actionable review findings.

## Gate và integration

01B-3 core acceptance pass và [report](PHASE_01B_3_REPORT.md) được tạo trước 01B-4. 01B-4 core/codec/repetition/replay acceptance pass và [report](PHASE_01B_4_REPORT.md) được tạo trước 01B-5. Lỗi phát hiện ở final review được sửa và thêm regressions; không bỏ qua checks để tiếp tục.

Review toàn Phase 01B: board/pieces/movement, AP/turn/terminal/promotion, full state/transaction/RNG/IDs/events, strict serialization/snapshots, repetition/history/replay và mirror isolation. Đối chiếu [gameplay](GAMEPLAY_SPEC.md), [engine](ENGINE_ARCHITECTURE.md), [test strategy](TEST_STRATEGY.md), P00/B1/B2 trong [registry](OPEN_DECISIONS.md). Không audit hoặc copy legacy implementation.

Root `resolveCommand` là đường authoritative cho GameState. BasePosition primitives 01B-2 được resolver gọi bằng snapshot tối thiểu; public APIs vẫn dùng được cho fixtures/pure domain operations. Nếu truyền full GameState vào bốn BasePosition mutation helpers, nhận `USE_ROOT_TRANSACTION`. Đây là rejection bổ sung cho misuse, không đổi valid 01B-1/2 contracts; không có đường commit full state cạnh tranh.

## Advanced test evidence

- Perft độc lập depth1–3 trên hai King xa nhau ở A1/O15: **3,9,54**. Oracle tính tay: first White3, Black3, second White từ A2/B1/B2 có5/5/8 nên depth3=(5+5+8)×3. Không dùng counts chess8×8.
- Seeded action streams seeds1/7/199, tối đa30 accepted roots/stream, xen invalid attempts. Kiểm inverse occupancy/unique IDs/AP không âm/bounded history, clone fingerprint và re-execution replay equality sau mỗi stream. Fixtures không chứng minh full Variant/effect behavior.
- Fault injection: derived failure sau random/destruction, queue budget, additional invariant validator, malformed board/history state. Reject không state/events/AP/slot/RNG/ID/history partial output.
- Snapshot probes: nested payloads/namespaces/history/counters/RNG và pieces không alias; mutation trên restored snapshot bị runtime freeze chặn; original fixture mutable không sửa restored copy.
- Synthetic death cancel/redirect, revalidation, duplicate death once, controlled AP attribution, King event priority, FIFO stable handler ties và mirror namespace isolation.
- Replay/header/hash tamper, pinned version rejection, checkpoint continuation, UTF-8 fingerprint byte oracle; strict invalid-input fuzz và canonical non-JSON cases.

## Review findings và fixes

| Finding | Fix / regression |
| --- | --- |
| Event kind + arbitrary JSON không đủ typed event contract | Strict discriminated schemas từng kind; generic emit kiểm payload; capture attackerId, skill actualCost, system destruction actor nullable; forged fact bị reject |
| History cho phép stale/foreign/duplicate IDs hoặc counter đi lùi | Match-scoped snapshot namespace, monotonic IDs/sequences/plies, counter/latest entry và lastCountedPly guards; corrupt snapshots bị reject |
| Initial repetition bỏ ruleset projection | createGame nhận cùng projection như turnStart; synthetic constant-projection fixture vẫn draw đúng occurrence3 |
| Canonical arrays có thể giấu symbol hoặc sparse entries | Symbol reject uniform; array keys phải đúng contiguous indices; regression symbol/function và sparse+extra key |
| Core production ES2022 build thiếu structuredClone/TextEncoder globals | Strict JSON cloning và portable UTF-8 encoder; không đổi tsconfig/dependencies; Buffer-based multibyte oracle trong tests |
| Clone validation có thể throw ngoài root guard | Guard candidate clone, structured INVARIANT/events=[]; regression được thấy red rồi green |
| Repetition projector nhận mutable candidate | Definition callback nhận deep-frozen isolated JSON clone; attempted mutation làm root reject atomic, regression red→green |
| Legacy BasePosition helper có thể nhận full state và bỏ metadata | Explicit USE_ROOT_TRANSACTION guard, giữ APIs valid cũ và migration path rõ |

### Standards

Reviewer độc lập ban đầu phát hiện typed-event contract thiếu. Re-review xác nhận strict payloads/generic emit/capture identity đã sửa; **0 unresolved hard violations, 0 actionable smell findings**. Không refactor thẩm mỹ.

### Spec

Reviewer độc lập phát hiện typed events, history integrity, initial repetition, canonical arrays và final clone rejection path. Tất cả đã sửa, thêm targeted regressions và re-review clearance: **0 remaining actionable correctness findings**. Reviewers chỉ đọc, không thay thế executed verification.

## Full verification sau fix cuối

| Command | Actual result |
| --- | --- |
| `npm.cmd run lint` | PASS, zero warnings + boundaries + format |
| `npm.cmd run typecheck` | PASS, pure builds/tooling và cả6 workspaces |
| `npm.cmd test` | **18 files /198 tests PASS** |
| `$env:NEXT_TELEMETRY_DISABLED='1'; npm.cmd run build` | PASS, bốn packages dual ESM/CJS, Nest và Next production build |
| `npm.cmd run smoke:exports` | PASS, bốn public package roots resolve ESM/CJS, internals blocked |
| `npm.cmd run check:boundaries` | PASS,6 workspaces |
| `npm.cmd run check:hygiene` | PASS, tracked-artifact/env, secret patterns, single root lockfile |
| `git diff --check` | PASS, chỉ LF→CRLF warnings |
| Protected-file diff vs7c06af7 | PASS exit0: reference/legacy/apps/dependencies/lock/tooling/CI và board/movement source01B-1 không đổi |

Build dùng approval tự động ngoài sandbox do Next.js Windows canonicalization limitation đã xác định trước; exit0 thực tế. Không chạy HTTP/browser/socket runtime trong milestone pure core này. Lượt build đầu phát hiện missing globals và một lint unused binding; cả hai đã sửa rồi chạy lại đầy đủ. Expected red TDD failures không còn trong final suite.

## Readiness

Phase 01B acceptance đạt. Conditions trước Phase02: người dùng cho phép bắt đầu; chốt D-04/05/06/08 cho definitions được enable, khai báo repetition/relocation/King/removal/source policies của chúng; mở rộng opaque schema/runtime theo version, pin immutable bundles. Không cần phê duyệt toàn27 Variant để bắt đầu generic infrastructure. Không bật chưa-approved effects/Variants hoặc suy diễn Pirate debt/Time lookback/removal causes.

Không public internet release claim, không full Effect Engine/network/storage/UI, không Phase02. [Báo cáo tổng kết](PHASE_01B_REPORT.md) là handoff tiếp theo.
