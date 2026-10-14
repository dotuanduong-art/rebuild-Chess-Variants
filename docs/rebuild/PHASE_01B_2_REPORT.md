# Phase 01B-2 — AP, Turn & Terminal

Ngày: 2026-10-14 (Asia/Saigon). Hoàn tất duy nhất 01B-2, baseline `d387cc6` của 01B-1. Không bắt đầu 01B-3.

## Nguồn luật và clarification

Đã đọc [01B-1 report](PHASE_01B_1_REPORT.md), [GAMEPLAY_SPEC](GAMEPLAY_SPEC.md) §§4–7, [ENGINE_ARCHITECTURE](ENGINE_ARCHITECTURE.md) state/operation boundaries, [OPEN_DECISIONS](OPEN_DECISIONS.md) P00/B1/B2, [TEST_STRATEGY](TEST_STRATEGY.md) core matrix, [roadmap](IMPLEMENTATION_ROADMAP.md) Phase 01, [AGENTS](../../AGENTS.md) và [CONTEXT](../../CONTEXT.md). Không audit lại các hệ thống đã hoàn thành.

**B2-01 là clarification của P00-06, không phải thay đổi luật gameplay.** Piece Loss AP Reward/Loss AP Gain là khoản cộng cho owner: Pawn +1, Knight/Bishop +2, Rook +3, Queen +4, King +0. Capture reward thuộc controller của attacker; promotion +3 thuộc controller. King capture không thưởng AP. Chỉ committed capture/destruction được accounting; candidate/canceled không reward. Despawn/exile/transformation không tự là death; các nguyên nhân chưa duyệt giữ pending. Đã ghi registry và spec trước implementation/expected liên quan.

## Files changed

| File | Thay đổi |
| --- | --- |
| `AGENTS.md` | Gate chỉ cho phép 01B-2, dừng trước 01B-3 |
| `docs/rebuild/OPEN_DECISIONS.md` | B2-01 clarification và approval scope |
| `docs/rebuild/GAMEPLAY_SPEC.md` | Rõ Piece Loss AP Reward là khoản cộng, committed-only và phase gate hiện tại |
| `packages/game-core/src/ap.ts` | AP table, accounting và safe arithmetic |
| `packages/game-core/src/base-game.ts` | Pure base snapshot/turn/move/destruction/skill-usage operations |
| `packages/game-core/src/index.ts` | Public exports mới, giữ nguyên APIs 01B-1 |
| `packages/game-core/tests/ap.test.ts` | AP values, spending/no-debt, numeric guards |
| `packages/game-core/tests/death-ap.test.ts` | Committed accounting, owner/controller, candidate/cancel, unapproved reasons |
| `packages/game-core/tests/base-game.test.ts` | Turn, capture, promotion, terminal và snapshot regressions |
| `docs/rebuild/PHASE_01B_2_REPORT.md` | Báo cáo này |

Không đổi Board/Piece/Movement contracts, shared-types, B1-01 hoặc Q-17. Không thêm dependencies; apps/manifests/lockfile/reference/legacy giữ nguyên.

## Public contracts và quyết định kỹ thuật

### AP

- `APState`, `createAPState`, `APResult`, `APRejection`.
- `getPieceAPValue`: frozen `captureReward`/`pieceLossReward` theo đúng bảng P00-06/12. Không có bảng AP khác.
- `debitAP`: nhận trusted `actualCost`, không tự quote skill, không clamp hoặc overdraft.
- `awardPromotionAP`: +3 cho controller.
- `DeathOutcome`, `settleDeathAP`: trusted accounting seam. Chỉ `status: committed` với reason `capture` hoặc `destruction` mới nhận reward; candidate/canceled giữ AP. Committed capture thêm `capturingController`; victim lưu owner tại thời điểm death.

`settleDeathAP` không nhận `MovementCandidate` làm committed death. Nó cũng không tự xác minh lịch sử hay deduplicate death facts: caller core/reducer phải xác nhận commit và gọi đúng một lần. Đây là contract cho 01B-3, không phải idempotency/transaction framework tạm thời. Base operations tự revalidate input, tạo board mới rồi settle reward trong cùng local operation; chỉ success snapshot mới được trả ra. Duplicate move hoặc destruction quân đã mất bị từ chối, không reward lần hai.

AP khởi đầu 0, không gameplay cap/decay. Baseline chưa có nguyên nhân AP âm được duyệt; negative balance/cost, fractional/non-finite/unsafe values bị từ chối, thiếu AP không đốt slot. Pirate debt vẫn LEGACY/pending. JavaScript safe-integer guard trả `NUMBER_RANGE` thay vì làm tròn/clamp; đây là giới hạn biểu diễn kỹ thuật, không luật AP cap mới.

### Base operations và turn

- `BasePosition`: immutable snapshot tối thiểu `{ board, ap, turn, terminal }`; không thay thế full GameState/reducer dự kiến.
- `createBasePosition(board, ap?)`: clone/validate board và AP, White trước; `plyIndex = 0`, `roundIndex = 1`.
- `applyBaseMainMove(position, actor, pieceId, to)`: kiểm terminal/turn/slot/controller rồi query movement trên snapshot hiện tại; không nhận client candidate làm authority. Valid capture thay victim bằng attacker, giữ ID và đồng bộ cells/position.
- `commitNormalSkillUsage(position, actor, actualCost)`: chỉ record cost/slot của synthetic hoặc already-validated normal skill; không chọn skill, thực thi Variant hoặc effects. Cost/slot errors không thay input. Khi tích hợp effects, 01B-3 phải prevalidate cost/slots và giữ candidate atomic qua toàn resolution.
- `endBaseTurn(position, actor)`: cần main move đã dùng hoặc core tự xác nhận không có base legal main move. Không có client `noMove` flag; query lại board mỗi lần End. Skill có thể dùng trước forced skip, không auto-skip khi vừa hết move.
- `applyBaseDestruction(position, pieceId)`: trusted core operation cho destruction đã được authorize; từ chối King/missing piece/terminal, chỉ owner nhận loss reward. Không dùng main/skill slot và không thưởng capture AP cho caster. Không expose thành network command.

Normal turn có đúng một main move và tối đa một skill. Skill→Move/Move→Skill auto-end sau cả hai; Move đơn giữ cửa sổ skill/End cả khi AP=0. Không main move thứ hai, không skill thứ hai. Không suy luật stalemate/checkmate. `roundIndex = floor(plyIndex / 2) + 1`, round đổi sau Black; AP giữ qua boundaries.

`TurnState`, `TurnBoundary`, `TurnPolicy`, `NORMAL_TURN_POLICY` là public seams. Policy functions nằm ngoài serializable snapshot; chỉ normal policy được enable. Exceptions/multiple skills chưa được bật. Success trả ordered logical boundary records `turnEnd(old)` rồi `turnStart(new)` khi thực sự advance; không đọc wall-clock, không chạy effect/cleanup/delayed hooks. 01B-3 phải xử lý những boundary stages trước nhận input turn mới; records hiện tại chưa là versioned event stream.

### Terminal và promotion

`BaseTerminal` ở milestone này chỉ gồm ongoing hoặc win `king_captured`. Winner là controller thực hiện capture. Capture King bỏ mọi AP, promotion continuation và auto-end; Move/Skill/End/destruction sau terminal đều reject. Không có check/checkmate hoặc destruction King victory. Các terminal reasons khác (clock/repetition/disconnect…) chưa triển khai tại milestone này.

Controlled Pawn dùng controller cho hướng, double-step và promotion rank; capture allegiance so sánh hai controllers theo B1-01. Non-terminal Pawn đến back rank tự đổi `currentType` thành Queen, +3 controller; giữ PieceId, originalSide, owner, controller, baseType và các fields khác của contract hiện tại. Không underpromotion, không thêm hasMoved hoặc special promotion. Capture non-King rồi promotion cộng đủ capture/loss/promotion rewards; King terminal ưu tiên dừng resolution theo P00-08/12.

Chưa triển khai interception handlers hoặc Phoenix. 01B-3/later effects phải resolve approved cancel/redirect và revalidate trước gọi committed operations/accounting; không được áp snapshot thành công rồi mới hủy death mà giữ AP. Priority matrix per-effect vẫn pending D-04/D-22.

## Tests và kết quả thực tế

Đã dùng `mattpocock-skills:implement` và `mattpocock-skills:tdd`. Tracer tests được chạy red trước implementation cho forced skip/initial turn, quiet move + slot, synthetic skill order/auto-end, King terminal, promotion + AP, AP spending, committed accounting và destruction. Không mock nội bộ; expected AP/layout/turn outcomes dùng literal cases từ spec và clarification. Đây không phải copy legacy tests.

**44 tests mới:** 8 AP, 16 death accounting, 20 base operations. Giữ nguyên 112 tests 01B-1/foundation. Regression bao gồm controlled Pawn White/Black, reward controller/owner riêng, cả hai reward về cùng bên, committed-only, unapproved removals, King AP=0, +3 promotion/stable ID, slot order/End/forced skip, không second move, no-decay boundaries, terminal guards, input immutability/serialization/cells-position consistency, invalid action và numeric failure không partial state.

| Lệnh / kiểm tra đã chạy | Kết quả thực tế |
| --- | --- |
| Focused Vitest qua `npm.cmd exec -- vitest run ...` và `node ./node_modules/vitest/vitest.mjs run ...` | Red/green đúng tracer như trên; focused suites pass |
| `npm.cmd run typecheck --workspace @variant-chess/game-core` | PASS trong các implementation checkpoints |
| `npm.cmd run format` | PASS |
| `npm.cmd run lint` | PASS: ESLint zero warnings, 6-workspace boundaries, Prettier |
| `npm.cmd run typecheck` | PASS: packages, tooling, cả sáu workspaces |
| `npm.cmd test` | PASS: **12 files, 156 tests**; toàn suite chạy sau implementation cuối |
| `$env:NEXT_TELEMETRY_DISABLED='1'; npm.cmd run build` | PASS: bốn packages ESM/CJS, NestJS, Next.js production build |
| `npm.cmd run smoke:exports` | PASS: bốn packages ESM/CJS resolve; internal subpaths bị chặn |
| `npm.cmd run check:hygiene` | PASS: tracked artifacts/env, secret patterns và single root lockfile |
| `git diff --check` | PASS, chỉ LF→CRLF warnings của môi trường |
| `git diff --exit-code d387cc6 --` trên reference/legacy/apps/shared-types/manifests/lock và board/coordinates/movement 01B-1 | PASS exit 0: không đổi |

Hai lượt review độc lập standards/spec của working diff và files mới: **0 actionable findings mỗi axis**. Reviewers chỉ đọc, không thay verification thực tế bên trên.

## Warnings, limits và handoff

- Production build chạy ngoài sandbox với approval tự động vì giới hạn Next.js/Windows canonicalization đã xác định ở milestones trước. Build thực sự exit 0. Không chạy app HTTP runtime vì không có app gameplay change trong scope.
- Có một lượt npm focused test khởi chạy chậm; lượt direct Vitest và các verification cuối hoàn tất. Red failures trong TDD là expected, không để lại tests fail.
- Không final reducer, root transaction, queue, hooks, RNG/history/replay/threefold, effects, concrete Variant, clocks, network, storage hoặc UI. Không dùng tên BasePosition để cam kết full engine state đã hoàn chỉnh.
- Numeric guards có thể reject operation; tất cả intermediate snapshots bị bỏ khi reject, không publish partial Board/AP/Turn. Reducer/persistence atomicity và dedup toàn stream chưa được kiểm chứng ở đây.
- 01B-3 cần tích hợp domain operations vào authoritative reducer, pre-death interception/committed facts ordering đúng approved rules, dedup/death identity, boundary resolution và whole-root rollback. Concrete defenses/Phoenix, special death/removal causes và negative AP exceptions vẫn cần approval tương ứng.
- Giữ Board/Piece/Movement API, B1-01/Q-17 và stable PieceId. Dùng controller cho action/capture/promotion và owner cho Piece Loss AP Reward. Handoff không cấp quyền bắt đầu milestone tiếp theo.

**Đã dừng tại 01B-2.**
