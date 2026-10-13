# Phase 01B-1 — Board, Pieces & Movement

Ngày hoàn tất: 2026-10-14 (Asia/Saigon). Phạm vi duy nhất: milestone 01B-1. Baseline review: commit `22fe00f` của Phase 01A.

## Nguồn và quyết định

- [AGENTS.md](../../AGENTS.md), [CONTEXT.md](../../CONTEXT.md): clean rebuild, owner/controller và phase gate.
- [GAMEPLAY_SPEC](GAMEPLAY_SPEC.md), §§3–4: board, layout, movement, ownership; P00-06 và Q-17 là nguồn luật đã duyệt.
- [OPEN_DECISIONS](OPEN_DECISIONS.md), B1-01: chủ dự án xác nhận friendly/enemy bằng cách so sánh **controller của attacker và target**. Đã ghi quyết định vào registry và spec trước khi dùng làm expected outcome.
- [ENGINE_ARCHITECTURE](ENGINE_ARCHITECTURE.md), §2 và contracts: core thuần, public package boundary, identity và ownership tách biệt.
- [TEST_STRATEGY](TEST_STRATEGY.md), Board/Movement: behavioral tests, independent oracle, no mutation.

Không audit lại Phase 00; không dùng source legacy làm implementation.

## Files changed

| File | Nội dung |
| --- | --- |
| `AGENTS.md` | Gate cho duy nhất 01B-1, dừng trước 01B-2 |
| `docs/rebuild/GAMEPLAY_SPEC.md` | Bổ sung B1-01 đã xác nhận |
| `docs/rebuild/OPEN_DECISIONS.md` | Ghi approval B1-01 |
| `packages/shared-types/src/index.ts` | Board constants, coordinate/piece schemas và types |
| `packages/shared-types/tests/pieces.test.ts` | Contract validation, serialization, ownership/type separation |
| `packages/game-core/src/index.ts` | Public exports của milestone |
| `packages/game-core/src/coordinates.ts` | Bounds và coordinate conversion |
| `packages/game-core/src/board.ts` | Immutable board, identity lookup, initial layout |
| `packages/game-core/src/movement.ts` | Geometry, occupancy candidates, modifier interface |
| `packages/game-core/tests/fixtures.ts` | Fixture helper dùng public API, không mocks |
| `packages/game-core/tests/coordinates.test.ts` | Conversion/bounds tests |
| `packages/game-core/tests/board.test.ts` | Board/layout/identity/isolation tests |
| `packages/game-core/tests/movement.test.ts` | Patterns, blocking, capture/controller và scope regressions |
| `docs/rebuild/PHASE_01B_1_REPORT.md` | Báo cáo này |

Không thêm dependencies; không thay manifests, lockfile, tooling, backend/frontend hoặc các package còn lại. Build artifacts vẫn được ignore.

## Public APIs

### `@variant-chess/shared-types`

- `BOARD_SIZE = 15`, `BOARD_CELL_COUNT = 225`.
- `CoordinateSchema`, `Coordinate`: `{ file, rankIndex }`, cả hai integer trong `[0, 14]`.
- `PieceIdSchema`, branded `PieceId`; `PieceTypeSchema`, `PieceType` cho sáu loại quân.
- `PieceSchema`, `Piece`, `PieceInput`: stable `id`, `originalSide`, `owner`, `controller`, `baseType`, `currentType`, `position`.
- Schemas strict, JSON-serializable; parsed piece và coordinate readonly/frozen. Chưa có effect, AP hoặc turn fields.

### `@variant-chess/game-core`

- `isInBounds`, `coordinateToIndex`, `coordinateFromIndex`, `coordinateFromAlgebraic`, `coordinateToAlgebraic`.
- `Board`, `createBoard`, `createInitialBoard`, `getPiece`, `getPieceAt`.
- `MovementPattern`, `MovementCandidate`, `generateMovementGeometry`, `generateBaseMoves`.
- `MovementModifier`: chỉ interface cho pure transformation của candidates; chưa có registry, invocation, priority hoặc effect handler.

API đi qua root exports hiện có; không mở internal subpaths. ESM/CJS được build và kiểm tra resolve.

## Implemented rules

Board có 225 cells theo index `rankIndex * 15 + file`, A1 = 0, H8 = 112, O15 = 224. Algebraic input dùng dạng canonical uppercase A–O, rank 1–15. Invalid conversion ném `RangeError`; `isInBounds` trả boolean.

Initial board có 30 quân mỗi bên, tổng 60 ID duy nhất: White back rank 1/pawns rank 2; Black back rank 15/pawns rank 14. Back rank A–O là `R N B R N B Q K Q B N R B N R`. ID deterministic như `white-A1`, `black-H15`, không đổi theo position/current type. Namespace identity thuộc từng board/match; không cam kết unique giữa hai trận riêng biệt.

`createBoard` xác thực contracts, từ chối duplicate ID hoặc occupancy collision, clone input rồi freeze board/cells/pieces. Board là snapshot của quân đang có trên bàn; chưa mô hình graveyard. Lookup kiểm tra own property để không nhầm inherited dictionary keys với quân.

Geometry dùng `currentType`, tách khỏi occupancy. Rook đi thẳng; Queen thẳng/chéo; Bishop chéo và ngang đúng một ô; Knight nhảy L; King một ô theo tám hướng. Sliding candidates dừng tại occupant đầu tiên, có thể bắt occupant enemy và không đi xuyên. Knight không bị chặn bởi ô trung gian.

Pawn dùng controller cho hướng (White tăng rank, Black giảm rank) và start rank (2/14). Di chuyển một ô hoặc hai ô từ start rank khi toàn bộ đường trống; diagonal chỉ tạo capture khi có enemy. Không thêm `hasMoved`/history restriction chưa được duyệt. Friendly/enemy dùng controller của cả hai quân theo B1-01; owner và originalSide không bị sửa bởi queries.

Candidate chứa `pieceId`, `from`, `to`, `path` và `kind`; capture thêm `targetId`. Path loại origin, bao gồm destination; jump chỉ chứa landing cell. Thứ tự output ổn định, output frozen và không alias mutable input. Missing piece ID bị từ chối.

Candidates chỉ biểu diễn geometry + occupancy, chưa là kết quả action legality hoặc threat query. Không self-check filtering, check/checkmate, castling hay en passant. Capturing King mới là candidate; chưa áp dụng terminal outcome. Pawn đến final rank vẫn là candidate; chưa áp dụng promotion.

## Tests và verification thực tế

Đã dùng workflows `mattpocock-skills:implement` và `mattpocock-skills:tdd` (counterparts có sẵn của implement-spec/test-driven-development). Các tracer coordinates, initial board, geometry và occupancy được chạy red vì API chưa tồn tại, rồi green sau implementation. Expected destinations/layout dùng danh sách literal độc lập theo spec; coordinate tests có index tính tay, không chỉ roundtrip. Không mock core internals.

Tests bao phủ 60 unique identities/vị trí mỗi bên, tất cả patterns, biên/góc bàn, friendly occupancy/enemy capture, Bishop lateral, Pawn double/capture theo cả controller, sliding blocking, Knight jump, base/current type, stable identity, owner/controller tách biệt, pinned pieces/King vào ô bị tấn công vẫn có candidate, không mutate/alias input, contract validation và JSON roundtrip.

| Lệnh / kiểm tra | Kết quả thực tế |
| --- | --- |
| Focused Vitest tracer runs | Red rồi green như mô tả trên |
| `npm.cmd exec -- vitest run packages/game-core/tests packages/shared-types/tests` | PASS: 6 files, 94 tests |
| `npm.cmd run typecheck --workspace @variant-chess/game-core` | PASS |
| `npm.cmd run format` | PASS; chỉ formatting files trong cấu hình cho phép |
| `npm.cmd run build:packages` | PASS: bốn pure packages, ESM/CJS |
| `npm.cmd run typecheck` | PASS: packages, tooling và toàn bộ sáu workspaces |
| `npm.cmd run lint` | PASS: ESLint zero warnings, AST workspace boundaries và Prettier |
| `npm.cmd test` | PASS: 9 files, 112 tests toàn repository mới |
| `$env:NEXT_TELEMETRY_DISABLED='1'; npm.cmd run build` | PASS: bốn packages, NestJS và Next.js production build |
| `npm.cmd run smoke:exports` | PASS: ESM/CJS resolve cho bốn packages, internal paths bị chặn |
| `npm.cmd run check:hygiene` | PASS: tracked artifacts/env, secret-pattern và một root lockfile |
| Hash comparison với 277 files trước implementation | Chỉ năm pre-existing files trong bảng changed bị sửa; reference/legacy, manifests/lock và apps giữ nguyên |

Hai lượt review standards/spec trên diff và files mới không phát hiện actionable findings. Review đọc source/tests/spec, không thay thế các lệnh verification bên trên.

### Warnings / limitations

- Root build chạy ngoài sandbox sau approval tự động: hạn chế Windows canonicalization của Next.js trong sandbox đã được xác định ở Phase 01A. Build lần này thực sự hoàn tất exit 0; không tuyên bố đã chạy frontend/backend HTTP runtime trong milestone này.
- Git có warning LF → CRLF theo cấu hình môi trường. Không thay Git configuration.
- Hygiene là kiểm tra patterns và tracked artifacts, không cam kết audit bảo mật toàn repository.
- Board readers/movement queries yêu cầu snapshot hợp lệ từ constructor hoặc caller duy trì invariants tương đương; không tạo toàn bộ GameState validation framework trong milestone này.

## Những điểm còn thiếu và handoff sang 01B-2

01B-1 đã hoàn tất trong phạm vi được duyệt. Chưa có action application, capture removal, promotion, King terminal outcome, AP, turn slots, effect lifecycle, threat query, transaction/rollback hoặc Variant implementation.

Milestone tiếp theo cần phê duyệt riêng. Các contracts cần giữ khi tích hợp:

1. Action validation phải gọi base candidates rồi áp dụng legality/turn/modifier rules đúng phase; không coi geometry hoặc candidates là threat map.
2. Khi move/transformation/control/conversion được triển khai, giữ ID và đồng bộ cells/piece position; owner/controller/base/current type có semantics riêng. Snapshot mới không mutate snapshot cũ.
3. B1-01 và Q-17 áp dụng cho controlled pieces; không suy diễn owner thành controller, Pawn direction hoặc capture allegiance.
4. Tách capture candidate khỏi committed capture, AP/loss và terminal resolution; promotion được xử lý bởi action layer được duyệt sau.
5. Modifier interface là seam tối thiểu, chưa chốt thứ tự registry hoặc effect pipeline bằng implementation trong milestone này.
6. Summon identity allocator, graveyard và root GameState phải được bổ sung theo phase phù hợp; không dùng lại initial position làm ID mới sau mỗi move.

Không bắt đầu 01B-2.
