# Phase 02A-1 — Effect Data Foundation

2026-10-14; xác minh lại 2026-10-15 (Asia/Saigon). **PASS trong scope 02A-1.** Chủ dự án duyệt riêng nền tảng dữ liệu; chưa duyệt Effect Runtime hoặc concrete definitions.

## Files changed

- `packages/shared-types/src/index.ts`: strict schemas/types cho definition metadata, target, lifetime, removal reasons, instances và versioned record payload.
- `packages/game-core/src/effects.ts`: pure registry, payload/instance/set validation, immutable JSON types và state record adapters.
- `packages/game-core/src/index.ts`: public exports.
- `packages/game-core/src/transaction.ts`: chỉ thêm optional `RulesetBundle.effectRegistry` type; resolver behavior giữ nguyên.
- `packages/game-core/src/snapshot.ts`: optional registry validation cho encode/decode/clone/hash.
- `packages/game-core/tests/effects.test.ts`: focused public API tests.
- `docs/rebuild/OPEN_DECISIONS.md`: ghi phê duyệt scope hiện tại; báo cáo này là tài liệu mới duy nhất.

## Public contracts và validation

`EffectDefinition<T>` chứa stable type ID, exact schema version, pure `PayloadSchema<T>`, typed source/ownership/King eligibility, lifetime, stacking/refresh/removal/relocation/visibility/capability/trigger descriptors. Mọi descriptor bắt buộc khai báo; không universal stacking policy hay whitelist effect names. Definition-owned `EffectRepetitionProjector` là contract ngoài state, nhận normalized target/group/relative lifetime context; chưa tự thực thi projection.

`EffectInstance<T>` chứa ID, definition/version, discriminated target, source player/variant/skill/piece refs, applied sequence, source timing anchor, lifetime/deadline, JSON payload và nullable group reference. IDs dùng allocator/counter `operation` hiện có: `matchId:operation:N`; group refs dùng namespace `matchId:sourcePlayer:groupKey`. Adapter không cấp ID hoặc ghi counters.

`createEffectRegistry` nhận explicit definitions, reject duplicate IDs/metadata, invalid descriptors, thiếu payload schema/projector; clone/freeze metadata, capture schema parser, canonical sort type IDs và expose lookup fail-closed. Mỗi bundle tự giữ registry, không singleton hoặc midmatch registration API. Một version/type mỗi bundle; mismatch reject, không migration/coercion ngầm.

`validateEffectPayload` clone/freeze input trước pure parser, reject non-JSON hoặc schema rewrite/coercion/drop fields, clone/freeze output. `validateEffectInstance(s)` kiểm exact version/schema, allocated match ID, uniqueness trong set, source refs bắt buộc, target category/live piece/King denial, source anchor, lifetime/deadline và group namespace. Source piece có thể đã chết; không bắt buộc còn trên board. Per-definition declared policies chỉ là metadata, chưa được thực thi hoặc coi là approval.

## Compatibility với Phase 01B

`encodeEffectRecords`/`decodeEffectRecords` giữ nguyên opaque GameState envelope và state schema version; nested payload có marker `effect-instance-v1` cùng typed instance. Kiểm outer ID/definition/source/deadline khớp inner metadata. Snapshot có marker mới phải cung cấp registry; unknown definition/version hoặc tampering fail closed. Snapshot opaque cũ vẫn round-trip khi không opt-in registry; bundle có registry không chấp nhận opaque effects thiếu typed envelope.

`encodeSnapshot(state, registry?)`, `fullStateHash(state, registry?)`, `decodeSnapshot(encoded, bundle)`, `cloneSnapshot(state, bundle)` dùng registry ở codec boundary. Không thay transaction pipeline/RNG allocation/repetition behavior. `resolveCommand` vẫn reject nonempty effects/delayed actions bằng `UNSUPPORTED_RUNTIME`, kể cả data đã validated. Các API không attach/apply effects vào state.

## Tests và kết quả thực tế

- TDD qua public seams được yêu cầu: ghi nhận failing focused runs trước implementation registry, instance validation, identity/lifetime và codec integration; sửa đến green.
- Focused suite: **21 tests PASS**, gồm 15 tests nền tảng và 6 tests regression hardening cho malformed/duplicate IDs, source/group namespaces, lifetime/deadline contracts hiện tại, snapshot tampering/exact versions, immutable payload isolation và registry isolation. Không phát hiện defect cần sửa production code.
- `npm run lint`: PASS (ESLint, boundary checks cho 6 workspaces, root Prettier).
- `npm run typecheck`: PASS (package builds, tooling và toàn bộ workspaces).
- `npm run test`: **19 files / 219 tests PASS**, gồm toàn bộ 198 tests Phase 01B và 21 tests effects.
- `npm run build`: PASS (packages/backend và frontend scaffold hiện có; không viết frontend mới).
- `npm run smoke:exports`: PASS, ESM/CJS và private-subpath boundaries.
- `npm run check:hygiene`, `git diff --check`: PASS. Không dependency/lockfile changes, không generated output được stage/commit.
- Một targeted self-review của thay đổi trong scope; không audit legacy hoặc 27 Variants.

Ngày 2026-10-15 chạy focused tests trước, sau đó một vòng root lint/typecheck/tests/build và exports/hygiene đều PASS; boundary checks nằm trong root lint. Implementation 02A-1 đã có sẵn, phiên xác minh này chỉ cập nhật báo cáo, giữ regression tests hiện có và không sửa production code.

## Giới hạn và handoff cho 02A-2

Chưa concrete effects, apply/refresh/stack/remove runtime, scheduler/delayed actions, trigger dispatch, relocation/swap, group cleanup, semantic graph normalization hoặc role-safe projection. Các callback/schema là trusted pure bundle code, không sandbox hoặc chứng minh purity của closures. Reference IDs/policies cần manifest/approval và eligibility queries ở runtime; data validation không chứng minh gameplay outcome, policy implementation hoặc ruleset hash authenticity.

02A-2 cần yêu cầu bắt đầu riêng. Dùng public schemas/registry/adapters làm seam; đóng D-04/05/06/08 cho definitions được enable, bổ sung runtime/mirror/rollback/replay/leak fixtures và definition-owned normalized repetition adapter trước bỏ guard. Dừng tại 02A-1; không commit/push hoặc nâng dependencies.
