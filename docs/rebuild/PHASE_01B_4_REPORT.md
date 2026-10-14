# 01B-4 — Snapshots, Repetition & Replay

2026-10-14. Gate **PASS** trước 01B-5. [01B-3 report](PHASE_01B_3_REPORT.md) đã được ghi trước implementation milestone này. Nguồn: [engine](ENGINE_ARCHITECTURE.md) §§6–7, [gameplay](GAMEPLAY_SPEC.md) §5/P00-10, [tests](TEST_STRATEGY.md) §§4/7.

## State format và fingerprints

- `GameStateSchema`, `RootCommandSchema`, `TrustedInputSchema`, `DomainEventSchema`, `ReplaySchema` strict từ shared-types. Schema `1.0.0`, engine `0.1.0`, baseline ruleset `1.0.0/base-01b-v1`, RNG `xorshift32-v1`.
- `encodeSnapshot` validate schema/invariants + strict JSON-only values rồi canonical object-key order; effect/delayed collections sorted theo id, ordered arrays khác giữ order. `decodeSnapshot` reject extra fields/unknown engine/schema/RNG và mismatched ruleset version/hash; `cloneSnapshot` roundtrip deep clone và recursive runtime freeze.
- Full gameplay fingerprint `fullStateHash`: tagged `full-gameplay`, FNV-1a 64-bit trên UTF-8 canonical snapshot, có RNG/cursor/counters/history/hidden state. Là diagnostic checksum, **không cryptographic authentication**; không gửi live clients.
- `repetitionKey` là canonical semantic string, không dùng hash ngắn làm equality nên không false-draw do collision. Gồm position/base/current type/originalSide/owner/controller, sideToAct, AP và declared effects/delayed/variant semantics. Loại noisy piece IDs, RNG, wall-clock, absolute turn/history/counters.
- `RoleSafeViewHash` chỉ contract `kind=role-view`, projection version/revision/digest. Chưa có projector hoặc endpoint; frontend không nhận full fingerprint/seed.

## Repetition và history

- `createGame` đếm initial actionReady sau baseline setup (không có enabled effect/setup hooks), lưu initial position snapshot. Root chỉ count sau turnStart và **toàn queue start reactions đã drain**; skill/move/intermediate operations không tự count. Third occurrence auto draw `threefold_repetition`, terminal event rồi chặn actions tiếp theo.
- Opaque nonempty effect/delayed/variant data cần `RulesetBundle.repetition` definition-owned semantic projection, thiếu thì fail closed `REPETITION_SEMANTICS_REQUIRED`. Không đoán effect semantics. `relativeDeadline` chuyển source ordinal thành remaining source-turn count, giữ side/start/end. Synthetic fixtures kiểm numeric payload + deadline; linked graph canonicalization của concrete definitions vẫn gate Phase 02 và từng nhóm.
- Resolver chưa thực thi opaque effects/delayed state: vẫn `UNSUPPORTED_RUNTIME` khi không rỗng. Snapshot/repetition fixtures không phải effect implementations.
- Mỗi accepted root thêm immutable position entry: snapshot ID theo match/counter, transaction sequence, ply/side, PieceId→position và canonical board reference. Initial có sequence0. Default retention128 (technical config, max4096), không quyết lookback Time. Bounded entries không xóa repetition counts của trận. Failure không thêm history hoặc tiêu snapshot counter.
- Gameplay history, transaction rollback, full replay snapshots và position-only Time snapshots tách biệt. Không thực thi Time skill hoặc approve D-11.

## Replay foundation

`recordReplay(initial, inputs, ruleset)` chỉ record accepted ordered trusted inputs cùng expected state fingerprint và exact events. Archive chứa initial full configuration snapshot (board/layout/AP/turn/history), explicit seed, engine/schema/ruleset/hash/RNG versions. Rejected input không có success archive.

`executeReplay` strict validate archive/header, decode compatible pinned initial snapshot, re-execute cùng supplied ruleset, kiểm fingerprint và canonical events mỗi step; optional readonly validator. Unknown/mismatched versions hoặc divergence trả failure, không partial committed output. Snapshot checkpoint continuation được so với uninterrupted execution.

Runtime bundle là trusted reviewed code, phải được lưu immutable theo version/hash bên ngoài core; core kiểm identity match, không chứng minh nội dung callback từ string hash. Không fallback latest, không legacy replay, không playback UI, không persistence.

## Gate evidence

| Command | Actual result |
| --- | --- |
| Core suite `node node_modules/vitest/vitest.mjs run packages/game-core/tests` | **12 files /141 tests PASS** |
| Snapshot/repetition/replay focused suites sau lint fix | **3 files /18 tests PASS** |
| Core typecheck | PASS |
| shared-types dual build | PASS |
| root lint/boundaries/format | PASS sau sửa unused semantic ID binding |

Tests: deep roundtrip/no aliases cho board/pieces/effects/delayed/variant/history/RNG/counters; frozen mutation probes; canonical reproducibility; non-JSON/extra-field/version/board-corruption rejection; noisy IDs; RNG same repetition/different full hash; initial/third/boundary exactness; synthetic relative deadlines; declared semantics required; bounded committed history; mirror serialization; replay seed/header/hash mismatch và checkpoint continuation.

Limits chuyển 01B-5: cần full integration review, independent perft, seeded invariant/fuzz/fault tests và toàn monorepo verification. Chưa Phase 02; không commit/push.

Final integration 01B-5 đã sửa initial repetition để dùng cùng projector của ruleset, tăng history ID/counter invariants và strict canonical array validation. Xem [01B-5 report](PHASE_01B_5_REPORT.md); các kết quả gate ở trên được giữ như lịch sử verification milestone này.
