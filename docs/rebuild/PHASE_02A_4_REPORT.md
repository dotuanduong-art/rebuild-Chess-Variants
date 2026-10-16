# Phase 02A-4 — Generic Runtime Integration & Final Verification

2026-10-15 (Asia/Saigon). **READY_WITH_CONDITIONS** trong generic infrastructure đã kiểm thử. Baseline 277 → **310 tests / 23 files PASS**. Không concrete effects/Variants hoặc Phase 02B; không commit/push.

## Files changed trong 02A-4

- `packages/shared-types/src/index.ts`: delayed metadata/record/schedule/cancel schemas, internal facts, engine version.
- `packages/game-core/src/effect-triggers.ts` (mới): validated declarations, deterministic observer dispatch và frozen contexts.
- `packages/game-core/src/delayed-actions.ts` (mới): immutable registry, record validation, plans, due collection và semantic projection.
- `packages/game-core/src/effect-runtime.ts`: opt-in trigger bindings, supported-capability validation, relative listener/stack matching order trong repetition.
- `packages/game-core/src/transaction.ts`: trigger/delayed integration vào root FIFO, private firing intents, root-only command guard.
- `packages/game-core/src/effects.ts`: payload validator nhận phần schema contract tối thiểu để dùng chung với delayed definitions.
- `packages/game-core/src/snapshot.ts`, `replay.ts`, `index.ts`: pinned delayed registry, codec/hash/replay integration và public exports.
- `packages/game-core/tests/effect-dispatch.test.ts` (mới, 12 tests), `delayed-actions.test.ts` (mới, 19 tests), `effect-relocation.test.ts` (+2 lifecycle regressions).
- `docs/rebuild/EFFECT_SYSTEM_SPEC.md`, `OPEN_DECISIONS.md`: scope authorization/technical contracts; báo cáo này và `PHASE_02A_REPORT.md`.

Các thay đổi 02A-1/2/3 đã có trong working tree được giữ nguyên. Không dependency, lockfile, app source hoặc legacy changes.

## Public contracts và behavior đã chạy

`EffectTriggerHandler`/`EffectTriggerContext`, `EffectRuntimeBindings.triggers`: named bindings có explicit `synthetic-v1` mode và safe integer order. Definition khai báo event/stage/handlerId cùng capability `observe:<event>`. Unsupported/proposed stages không execute; invalid stage/event/capability reject. Ordering: handler order → handler ID → application sequence/instance ID → declaration ID. Mỗi event-instance-declaration chỉ dispatch một lần trong root.

Context có frozen state/instance/event, transaction/cause qua event, source refs và target owner/controller hiện tại. Boundary observers chỉ nhận boundary của source. Lifecycle phân biệt committed death, application, source-boundary, natural expiry, cleanup và relocation. Retired instance chỉ observe own removal; target-death removal lấy target metadata từ pre-death snapshot. King terminal không dispatch reactions. Callback chỉ trả typed `DerivedOperation[]`; không mutable subscription/target cache.

`DelayedActionDefinition`/`DelayedActionRegistry`/`createDelayedActionRegistry`, `DelayedAction`/contexts, `decodeDelayedActions`, `collectDueDelayedActions`, `delayedRepetitionProjection`; shared schemas cho trusted `delayed_schedule`/`delayed_cancel`. Definition phải có pure payload schema, exact version, synthetic executor, semantic projector, snapshot source policy và explicit missing-target/cancellation policies. Registry frozen, duplicate/unknown definitions reject, iteration sorted.

`delayed-action-v1` records giữ deterministic operation ID, parent cause ID, creation transaction/sequence, source/controller snapshot, typed target, scheduled-at/due logical boundaries, payload và policies. Persisted status chỉ `scheduled`; firing/cancellation consume record. Schedule chỉ future boundary của source, không wall clock hoặc reschedule tự động. Due snapshot sort ordinal → sequence → binary ID, recheck trước firing; missing target cancel/reject theo declaration. Caster chết không tự cancel. Terminal giữ pending records nhưng đóng toàn execution.

Tại synthetic boundary: enqueue expiry intents, delayed firing intents, rồi derived boundary-observer plans. Facts/observers vẫn theo FIFO đã có; đây không phải approved concrete priority matrix. Mọi apply/refresh/stack/remove/expire/relocate/swap/trigger/delay dùng một candidate, RNG/ID stream và operation budget của `resolveCommand`; không resolver thứ hai.

## Validation, graph và persistence evidence

- Invalid payload/schema/version, absent source/target, mismatched source clock, forged fire/root command, duplicate/cross-effect identity, outer/inner record mismatch, unsupported policy và overdue runtime state reject.
- Caller payload/decoded state/executor contexts không alias; mutation attempt hoặc lỗi callback rollback toàn AP/turn/effects/delays/RNG/counters/history/repetition và events=[] cùng input state nguyên vẹn.
- Linked single removal/death hoặc natural expiry làm gãy required reference reject toàn root; complete removal hợp lệ. Không tự unlink/restore/cascade partner. Existing apply/refresh/stack/replace/relocation/group regressions vẫn pass.
- Swap dùng assignment mới khi resolve observer target/owner/controller; nguồn/deadline không đổi. Mirror source clocks, match IDs và registries độc lập.
- Snapshot/hash/replay nhận delayed registry đã pin; restore rồi firing exactly once, exact ordered events/state. Facts chỉ internal và không chứa opaque payload; chưa có live-client projection.
- Repetition giữ relative deadlines, normalized target/source và semantic payload theo declared projector; giữ relative firing/listener/matching ranks để không gộp hai execution orders khác outcome. Consistent allocation-ID renaming vẫn cùng key. Custom projections/bindings là reviewed trusted contracts, không proof universal graph/payload equivalence.

## Review findings và fixes

Review toàn Phase 02A working tree so với HEAD `a1d654c71cbb34d6178a58ad6557bef973d33dfb`, gồm file mới chưa track; hai axes độc lập theo skill `code-review`, không audit legacy/repository rộng.

### Standards

Hai findings, đã sửa: (1) semantic repetition mất thứ tự execution có ý nghĩa; (2) source piece lookup nhận inherited property như `constructor`. Regression tests trước fix đều RED, sau fix GREEN. Không thêm style refactor/abstraction recommendation.

### Spec

Một finding, đã sửa: delayed/listener repetition sorting thành multiset làm hai trạng thái khác future outcome cùng key. Không scope creep hoặc concrete semantics được tự phê duyệt.

Trong TDD integration còn khóa hai defects: delayed cause phải giữ parent event/operation thay vì self ID; derived callbacks không được chèn root-only `move`/`skill`/`end`. Tổng review: Standards 2 resolved, Spec 1 resolved; không còn finding đã báo chưa xử lý.

## Verification thực tế

| Check | Kết quả |
|---|---|
| Focused effects/dispatch/delays/links/repetition/snapshot/replay | 8 files / 136 tests PASS |
| Core workspace typecheck, changed-source ESLint | PASS |
| `npm run lint` | PASS, root ESLint/format/boundaries |
| `npm run typecheck` | PASS, tooling và 6 workspaces |
| `npm run test` | **310 tests / 23 files PASS**, giữ 277 baseline +33 tests |
| `npm run build` | PASS, packages và existing backend/frontend scaffolds |
| `npm run smoke:exports` | PASS, ESM/CJS và private paths |
| `npm run check:boundaries` | PASS, dependency boundaries 6 workspaces, không legacy import |
| `npm run check:hygiene`, `git diff --check` | PASS |

Full verification chạy sau focused fixes; không nâng dependencies, không build UI mới hoặc chạy lại audit cũ.

## Compatibility và remaining gates

Engine **0.1.0 → 0.2.0** pin executable trigger/delayed semantics và order-sensitive repetition fix. State schema `1.0.0`, opaque slots, effect-instance-v1 và replay envelope v1 không đổi. Old-engine snapshots/replays bị reject có test; muốn đọc archive cũ phải dùng pinned old engine, không migrate history ngầm. Phase 01B behavioral regressions vẫn pass trên engine mới.

Vẫn unsupported: effect pre-death/proposed handlers/priorities; event-count/progress/start-window, intensity và undeclared source/deadline/ownership/visibility policies; concrete removal reactions/rewards; group unlink/restore/partner destruction/control arbitration; query-at-fire source policies, unknown delayed executors, concrete delayed effects; movement/threat modifiers và role-safe hidden projection. Legacy opaque delayed records chỉ codec-only khi không cung cấp registry, không được execute.

Phase 02B cần phê duyệt definitions/subset và D-04/05/06/08 liên quan, eligibility/stacking/removal/relocation/group/visibility cùng independent fixtures. Full graph canon, hidden projection và playable concrete Effect System chưa được tuyên bố hoàn thành. Dừng tại 02A-4.
