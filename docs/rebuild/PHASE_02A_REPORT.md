# Phase 02A — nghiệm thu generic effect infrastructure

2026-10-15 (Asia/Saigon). **READY_WITH_CONDITIONS** cho generic infrastructure đã triển khai và kiểm thử. **310 tests / 23 files PASS**; chưa hoàn thành playable concrete Effect System. Chi tiết integration/checks/files tại [02A-4 report](PHASE_02A_4_REPORT.md), các slice trước tại [02A-1](PHASE_02A_1_REPORT.md), [02A-2](PHASE_02A_2_REPORT.md), [02A-3](PHASE_02A_3_REPORT.md).

## Capabilities đã nghiệm thu

| Area / public seam | Implemented evidence |
|---|---|
| Definition/Registry — `createEffectRegistry` | Explicit immutable ruleset registry, sorted iteration, duplicate/unknown/version/payload rejection; không effect-name whitelist |
| Instances/codec — `validateEffectInstance`, `encodeEffectRecords`, `decodeEffectRecords` | Deterministic identity, source/target/group/timing metadata, JSON payload và deep immutable isolation |
| Lifecycle — `createEffectRuntime`, `resolveCommand` | Explicit independent/ignore/replace/refresh/stack-instances policies, cleanup-only removal, source start/end rounds expiry; synthetic eligibility/merge bindings |
| Relocation/whole-set swap | Complete assignment preflight, source/identity/payload/deadline preservation, atomic reject; no remove+apply/reward |
| Linked groups | Typed effect/piece/group references, required-presence/namespace checks, declared frozen validators/normalizers; broken final graph rejects |
| Triggers — `EffectTriggerHandler`/context | Synthetic opt-in declaration/capability filtering, stable ordering, once per event-instance-declaration, frozen source/owner/controller context, root FIFO plans |
| Delays — `createDelayedActionRegistry`/records | Versioned scheduled-only records, future source boundaries, explicit cancellation/missing-target policy, deterministic consume-once firing through root |
| Transaction | One root candidate/FIFO/budget/RNG/IDs/AP/turn/history; callback/fault/overflow rejection rolls back all state and emits no committed facts; King terminal stops cascade |
| Snapshot/repetition/replay | Pinned definitions/engine, canonical hash, relative deadlines, declared graph semantics, normalized relative execution order; restored runs reproduce exact state/events |
| Mirror isolation | Match/player source namespaces, distinct group ownership and exact references, registry instances và source clocks không lẫn nhau |

Source additions chính: `effects.ts`, `effect-runtime.ts`, `effect-links.ts`, `effect-relocation.ts`, `effect-triggers.ts`, `delayed-actions.ts`; integration tại shared-types, transaction, codec/replay và package exports. Không dependency/lockfile/backend/frontend/legacy source changes trong Phase 02A infrastructure.

## Final review và verification

Standards review: 2 findings resolved — order-sensitive repetition collision và inherited source lookup. Spec review: 1 finding resolved — cùng semantic-order omission. TDD integration còn sửa causal attribution của scheduled plans và chặn root-only commands từ derived callbacks. Các fixes có behavioral regression tests; không còn finding được báo chưa xử lý.

Root lint, typecheck, **310 tests**, build, exports smoke, boundaries, hygiene và diff whitespace checks đều PASS. Giữ toàn bộ 277-test baseline trước 02A-4, thêm 33 tests; focused integration 136 tests PASS. Không mock bỏ validation hoặc skipped acceptance tests. Build dùng scaffolds sẵn có, không tạo frontend gameplay.

Engine version **0.2.0**; state schema **1.0.0**. Effect record v1/replay envelope v1 giữ nguyên; delayed slot có tagged `delayed-action-v1`. Codec/replay reject engine 0.1.0 thay vì silently chạy archive/history cũ dưới semantics mới. Cần pinned old runtime cho archives cũ; không migration trong scope. Base Game Core 01B behavioral tests vẫn pass.

## Conditions trước enable concrete gameplay / Phase 02B

- D-04: proposed/pre-death interception priority, effect interactions và concrete post-death reactions cần approval; hiện chỉ generic 01B interceptors và synthetic committed observers.
- D-05: stacking/refresh choices là explicit per-definition contracts, chưa có universal approved concrete policy.
- D-06: cleanup-only common lifecycle đã có; concrete rewards, unlink/restore/control/passive/group cascades chưa có. Required links bị gãy làm reject toàn transaction.
- D-08: threat/movement interaction và modifiers chưa execute; không suy Ghost/Stun/terrain semantics từ generic capability.
- Cần approved definitions/subset cùng source/owner/controller, King eligibility, lifetime, stacking, removal reasons, relocation, group, visibility và fixtures độc lập. Không concrete effects/27 Variants hoặc Turtle skill được enable bởi các synthetic tests.
- Event-count/progress/intensity/custom policies, concrete delayed executors và query-at-fire source modes vẫn unsupported. Terminal ngừng pending delayed execution; không suy cancellation rewards.
- Internal events/full snapshots có full gameplay authority; không live-client API/projector. Role-safe hidden projection thuộc Phase 03. Reviewed binding/semantic projector chịu trách nhiệm domain-specific completeness; chưa universal graph canonicalization hoặc sandbox untrusted plugin code.

Các unsupported guards còn giữ nguyên ngoài capability đã qua tests. Không tự duyệt UNKNOWN gameplay. **Dừng sau Phase 02A-4; không bắt đầu 02B, không commit/push.**
