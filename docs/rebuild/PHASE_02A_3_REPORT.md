# Phase 02A-3 — Generic Effect Relocation & Whole-Set Swap

2026-10-15 (Asia/Saigon). **PASS trong scope 02A-3.** Generic contracts và synthetic policies; không Water Turtle skill hoặc concrete effects/Variants.

## Files changed trong 02A-3

- `packages/shared-types/src/index.ts`: trusted relocation/swap schemas, typed effect/piece/group references, optional definition `links` IDs và normalization output schema; internal facts.
- `packages/game-core/src/effect-relocation.ts`: complete-assignment relocation/swap preflight và immutable plans.
- `packages/game-core/src/effect-links.ts`: reference integrity, frozen link contexts, declared validation/normalization và semantic labels.
- `packages/game-core/src/effect-runtime.ts`: frozen named relocation/link bindings, staged graph validation, normalized linked repetition và mixed-graph guards.
- `packages/game-core/src/transaction.ts`: trusted FIFO operations, final plan commit và typed fact emission; không public root effect commands.
- `packages/game-core/src/index.ts`: context/output type exports; mutation planners giữ private package paths.
- `packages/game-core/tests/effect-relocation.test.ts`: synthetic relocation, graph, atomicity/replay fixtures.
- `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md`: authorization và technical contracts; báo cáo này.

Work 02A-1/02A-2 đã có trước phiên được giữ nguyên; không dependencies/toolchain/backend/frontend changes.

## Operations và preservation

`DerivedOperation` thêm `effect_relocate {instanceId,target}` và `effect_sets_swap {pieceA,pieceB}`. Single relocation dùng destination category được definition cho phép; swap chỉ hai distinct live pieces, hỗ trợ unequal/one-empty/both-empty sets. RootCommand không nhận trực tiếp các operations này. Không export helper ghi full GameState.

Plan snapshot attachments, xây **toàn assignment cuối**, encode/validate toàn bộ rồi kiểm runtime caps/matching, eligibility/King/controller constraints và graph policies. Không sequential remove/apply; stacked payloads không merge khi swap. Retargetable phải có mọi constraint binding; group-aware phải có declared graph contract và relocation validator; prohibited/unknown policy hoặc missing handler reject atomic.

Chỉ `target` đổi. Identity, definition/version, source refs, applied sequence, payload/stack data, extension/anchor/deadline và group/references giữ nguyên. Board owner/controller không đổi. Không apply/refresh/expire/cleanse/death hoặc AP reward từ relocation. Logical expiry sau swap vẫn dùng source/deadline cũ và đọc target mới.

## Linked contracts và normalization

Optional `references` có declared role và effect-instance, piece live/historical, hoặc group+owner identity. Core kiểm presence của required live references, group owner namespace và duplicate references; không tìm partner theo type. Definition `links {validationId,normalizationId}` trỏ tới pure frozen bindings. Role/topology/member eligibility thuộc declared validator; relocation callback nhận before/after/moves đầy đủ.

Forward references được phép trong candidate để tạo group atomically; final root state và relocation preflight phải có integrity hoàn chỉnh. Unknown/missing bindings fail closed. Matching tags 02A-2 vẫn tương thích nhưng không mặc định transferable; mixed opaque/declared graphs bị reject trước commit. Removal/expiry/death khiến required link còn lại bị gãy sẽ reject root; chưa tự unlink/cascade/restore theo concrete gameplay.

Normalizer trả `group` và một semantic value cho từng reference. Core giữ role/kind/owner/presence, kiểm cardinality/non-null required labels, sort reference labels và luôn đưa graph data vào repetition ngoài definition projector; custom effects projection không thể bỏ linked data. Domain-specific canonical equivalence thuộc reviewed binding, không claim universal graph labeling hoặc chứng minh callback đúng cho mọi graph. Synthetic pair binding yêu cầu homogeneous definitions và unique target labels theo source/definition; ambiguous node graphs bị reject, cần binding khác được duyệt.

## Events, transaction, snapshot/replay

`effect_relocated` có identity/version/source/visibility và from/to; `effect_sets_swapped` có hai pieces và stable changed IDs, kể cả empty swap. Mọi facts **internal**, không full payload hoặc live network projector. Emit sau toàn preflight; không runtime subscriptions giữ mutable targets.

Root candidate/FIFO/budget/ID allocation giữ ownership. Failures sau swap, graph rejection hoặc observer queue overflow trả events=[] và giữ input Board/effects/AP/slots/RNG/counters/history/repetition. Không cấp effect ID mới khi relocation; root operation/event IDs vẫn được allocate bình thường và rollback khi lỗi.

Optional references/links là additive; state/replay/record versions giữ nguyên và old regression fixtures vẫn pass. Codec/hash/replay dùng registry đã pin từ 02A-2. Synthetic pair graphs với renamed allocation/group IDs có cùng semantic key; pairing khác có key khác. Mirror groups giữ source namespace, partner resolve bằng exact identity.

## Evidence

- TDD red→green tại public root/codec/history seams; **28 relocation tests PASS**.
- Focused data/runtime/repetition/replay suites PASS; core workspace typecheck và changed-source ESLint PASS.
- Regressions khóa normalizer bỏ reference semantics, live/historical key collision và incomplete mixed-graph state trước commit; destination controller eligibility được revalidate trên assignment cuối.
- `npm run lint`: PASS, gồm ESLint/root formatting và boundaries cho 6 workspaces.
- `npm run typecheck`: PASS, tooling và toàn bộ workspaces.
- `npm run test`: **21 files / 277 tests PASS**, giữ toàn bộ 249 baseline tests và thêm 28 relocation tests.
- `npm run build`: PASS, packages/backend và frontend scaffold hiện có; không đổi app source.
- `npm run smoke:exports`: PASS, ESM/CJS/private paths. `npm run check:hygiene`, `git diff --check`: PASS.
- Full tests/build chạy một vòng sau focused regressions; lint/typecheck chạy lại sau final normalization fixes. Một targeted self-review trong scope được khóa bằng behavioral tests; không repository/Variant audit, không stage/commit/push.

## Limits và 02A-4 handoff

D-10/Turtle restrictions/costs và concrete linked-group semantics chưa duyệt. Chưa trigger execution, delayed actions, group reaction/removal cascades, control arbitration, networking/projection, animations hoặc persistence. Historical piece presence không chứng minh graveyard identity; cần declared validator/normalizer thích hợp. Callback code vẫn trusted/pure/pinned, không sandbox hoặc proof của semantic completeness.

02A-4 cần authorization và scope riêng; dùng operations/contexts/reference contracts này, thêm approved group lifecycle/normalization fixtures trước enable concrete capability. Unsupported runtime guards còn nguyên cho các capabilities chưa kiểm thử. Không commit/push hoặc tự bắt đầu 02A-4/02B.
