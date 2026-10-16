# Phase 02A-2 — Generic Effect Runtime & Lifecycle

2026-10-15 (Asia/Saigon). **PASS trong scope 02A-2.** Scope được chủ dự án duyệt riêng; không concrete effects/Variants, không đóng các gameplay decisions còn pending.

## Files changed trong 02A-2

- `packages/shared-types/src/index.ts`: application/removal contracts, lifecycle facts, independent/replace modes, reset/extend descriptors, optional eligibility và instance extension metadata.
- `packages/game-core/src/effect-runtime.ts`: immutable runtime bindings, pure lifecycle plans, source-boundary due query, executable-state invariants và unlinked repetition adapter.
- `packages/game-core/src/effects.ts`: compatible extension validation; giữ branded primitives trong immutable types.
- `packages/game-core/src/transaction.ts`: effect plans/expiry/cleanup qua candidate của root; guarded opt-in runtime.
- `packages/game-core/src/replay.ts`: chuyển registry vào snapshot/hash để active effects replay được.
- `packages/game-core/src/index.ts`: runtime exports.
- `packages/game-core/tests/effect-runtime.test.ts`: synthetic behavioral/regression fixtures.
- `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md`: scope authorization và mô tả technical slice; báo cáo này.

Các thay đổi 02A-1 report và six regression tests trong `effects.test.ts` đã có trước phiên 02A-2, được giữ nguyên.

## Public APIs và policies

`createEffectRuntime(registry, bindings)` tạo frozen named eligibility/payload-merge bindings ngoài GameState. Bundle phải chứa cùng `effectRegistry` và opt-in `effectRuntime`. `collectDueEffects(instances, boundary)` là pure query, trả stable IDs, không tick state. Trusted `DerivedOperation` thêm `effect_apply`/`effect_remove`; public RootCommand không nhận direct effect commands. Chỉ `resolveCommand` ghi full state; internal plans không được export qua package public API.

Explicit matching keys: type+target, type+sourcePlayer+target, hoặc type+group+target. Independent luôn tạo instance; ignore giữ existing và không emit Applied; replace remove matched sets với reason `replaced`, rồi apply. Refresh giữ ID/application sequence, chọn source refs/payload theo descriptor; reset (`replace` alias tương thích) lấy anchor hiện tại của source đã chọn. Extend rounds cộng N vào deadline cũ, giữ anchor và lưu `extensionRounds` riêng. Giữ timed deadline trong khi đổi source khác bị reject, không chuyển clock ngầm; permanent/null deadline có thể đổi source rõ ràng.

Stack-instances có explicit cap hoặc nullable unbounded cap, named merge binding, deterministic IDs và Stacked fact. Overflow reject root atomic. Merge output được validate schema/JSON và eligibility lại; callbacks nhận frozen inputs. Không universal stacking/refresh default, không hardcoded effect names.

## Lifetime, cleanup và transaction

Permanent/rounds/current-turn-window end được execute. Source ordinal lấy logical ply/side, không wall-clock hoặc số operations. N rounds bỏ boundary cast; expire ở N next eligible source start/end boundaries. Due list snapshot theo application sequence/ID; expiry intents queued trước intents của boundary observers, recheck due lúc xử lý và remove một lần. End-window cast sau closed boundary bị reject. Custom progress/count không tick như round.

Cleanup-only reasons không phát natural-expiry hậu quả hoặc AP/death reward. Repeated removal là no-op. Target death cleanup dùng validated pre-death attachments, nên target đã biến mất không làm validation thất bại. Cell/player attachments không tự mất vì source piece chết. Terminal cleanup tối thiểu không dispatch hậu terminal reactions; không linked cascades.

Root sở hữu IDs, FIFO/budget, AP/slots/RNG/history/events. Scheduler expiry intent là private queue operation, planner giả mạo bị reject. Failed apply/merge/derived operation/expiry/budget bỏ toàn candidate và trả events=[]; không helper public bypass root. Executable-state validation reject stale deadlines, future anchors, duplicate/matching/cap violations và unsupported definitions. Legacy opaque records không được runtime coi là executable effects.

## Events, codec và repetition

Typed `effect_applied`, `effect_refreshed`, `effect_stacked`, `effect_removed` có effect/definition/version, target/source refs, visibility classification và removal reason/count tương ứng. Event IDs/transaction/cause/sequence dùng root envelope hiện có; mọi fact có visibility **internal**, không payload gameplay được broadcast trực tiếp cho live clients. Root rejection không tạo committed rejection fact.

State/replay versions và `effect-instance-v1` envelope giữ nguyên; schema extensions additive/optional, old instance fixtures vẫn pass. Registry/version compatibility tiếp tục strict. Active snapshot/replay đi qua pinned registry. Unlinked repetition sử dụng definition-owned projector với normalized target và relative deadline, sort semantic records; allocation noise bị loại theo synthetic fixtures. Opaque variant state vẫn cần explicit semantic projection. Group refs cần explicit bundle projection; không tuyên bố full graph normalization.

## Evidence và checks

- TDD red→green qua public root/query seams cho behavior mới; **30 runtime tests PASS**, core workspace typecheck và changed-source ESLint PASS.
- Focused suites gồm runtime/data/transaction/replay/repetition đã pass trong quá trình làm.
- Regression tìm và sửa: merged eligibility chưa revalidate; forged expiry planner intent; imported cap overflow; opaque variant semantics bị mặc định; future/stale runtime timing. Snapshot/replay registry forwarding và branded primitive type compatibility được kiểm tra.
- `npm run lint`: PASS, gồm ESLint/root formatting và boundary checks cho 6 workspaces.
- `npm run typecheck`: PASS, tooling và toàn bộ workspaces.
- `npm run test`: **20 files / 249 tests PASS**, giữ toàn bộ 219 baseline/regression tests và thêm 30 runtime tests.
- `npm run build`: PASS, packages/backend và frontend scaffold hiện có; không thay frontend/backend source.
- `npm run smoke:exports`: PASS, ESM/CJS/private paths. `npm run check:hygiene`, `git diff --check`: PASS.
- Full verification một vòng sau focused tests; không dependency/lockfile/toolchain changes, không stage/commit/push. Một targeted self-review trong scope được khóa bằng behavioral regressions, không repository/Variant audit.

## Giới hạn, decisions và handoff

Unsupported: delayed actions, event-count/progress execution, start-window, intensity stacks, declared source/deadline handlers, declared ownership/visibility, removal reactions, effect triggers/unknown capabilities. Swap/relocation và linked-group operations không có executor. Callback code là trusted pure pinned code, không sandbox hoặc chứng minh purity/hash authenticity. Live role projection chưa implement.

D-04/05/06/08 và concrete group gates giữ pending; synthetic policies không phê duyệt Stun/Shield/Aegis/Bomb semantics. 02A-3 cần authorization riêng và scope rõ cho modifiers/interactions/graph hoặc các remaining policies; giữ guards cho mọi capability chưa qua acceptance. Không commit/push, không bắt đầu 02A-3/02B.
