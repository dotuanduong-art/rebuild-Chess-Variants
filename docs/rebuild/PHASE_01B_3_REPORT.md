# 01B-3 — Transaction, RNG, IDs & Events

2026-10-14, baseline `7c06af7`. Gate **PASS** trước khi bắt đầu 01B-4. Không commit/push theo brief hiện tại.

Nguồn: [GAMEPLAY_SPEC](GAMEPLAY_SPEC.md) §§4–9, [ENGINE_ARCHITECTURE](ENGINE_ARCHITECTURE.md) §§2–6, [TEST_STRATEGY](TEST_STRATEGY.md) §§3–4, [01B-2 handoff](PHASE_01B_2_REPORT.md). Giữ P00-05/06/07/08/09/12, Q-17 và B1-01/B2-01.

- Public seam: `createGame`, `assertGameState`, `resolveCommand`, `allocateGameId`, `createRng`/`nextRandom`/`chooseCanonical`; schemas/types qua shared-types, runtime ruleset qua `RulesetBundle`.
- GameState strict/serializable: match + engine/schema/ruleset identity; board/AP/turn/terminal; RNG seed/value/cursor/version; per-kind counters; White/Black variant namespaces; opaque effect/delayed payload contracts; bounded-history/repetition metadata foundation. Runtime functions chỉ ở bundle/options, không trong state.
- Resolver validate schema/authority/state/ruleset trước mutation; candidate deep clone, FIFO typed queue, local IDs/events/RNG; final invariant + optional trusted validator; failure trả rejection và **events=[]**, không trả partial state. Durable commit thuộc Phase 03.
- Client move/skill/End không được tự cung cấp candidate, cost hoặc rewards. Destruction chỉ system input hoặc trusted derived operation. Synthetic skill cost/operations từ trusted bundle, không concrete Variant.
- Base operations 01B-2 là primitives; root resolver là authoritative full-state API. Turn progression tạm giữ tại old side trong cascade, drain turn-end reactions rồi switch/start và drain start reactions. Không nhận input giữa các bước.
- Event schemas: deterministic id/transactionId/causeId/sequence, `visibility=internal`; kinds move/capture/destroy/promotion/AP/skill/turn/terminal/random/variant/marker. Candidate facts chỉ trở thành committed output nếu toàn root pass. Handler priority explicit `(order,id)`, không subscription order. Đây là synthetic ordering seam, không priority matrix của concrete effects.
- Pre-death synthetic cancel reject atomic, redirect revalidate target geometry/controller/path. Death ID dedup local root; repeated death operations không reward lại. King capture stop remaining cascade; không AP/promotion/turn advance. Không Shield/Fate/Phoenix.
- RNG `xorshift32-v1`: nonzero uint32 seed/value, shifts 13/17/5, unsigned result; cursor tăng từng draw. Golden seed1: 270369, 67634689, 2647435461, 307599695, 2398689233. Canonical code-unit sort và rejection sampling trên miền 1…2^32−1; không modulo bias. Không Math.random/Date.now.
- IDs `${matchId}:${kind}:${counter}`, counters transaction/event/operation/snapshot/piece. Root failure không tiêu ID/RNG. Initial PieceIds 01B-1 giữ nguyên; future allocated piece IDs không lấy position làm identity.
- Technical operation budget mặc định 512, configurable per resolve; không phải gameplay law. Budget vượt, derived error, schema/invariant hoặc validator failure rollback toàn root. Unknown missing destruction reject; duplicate death đã commit trong cùng root là no-op.

## Acceptance evidence tại gate

Đã chạy red→green public seam tests cho RNG, root move, failed derived rollback, cancel/redirect, IDs và actor-scoped namespaces. Expected golden/combined AP/event order literal theo specification hoặc phép tính độc lập.

| Check | Actual result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run packages/game-core/tests` | 9 files / **123 tests PASS** |
| `npm.cmd run typecheck --workspace @variant-chess/game-core` | PASS |
| `npm.cmd run build --workspace @variant-chess/shared-types` | PASS, contracts resolve |
| `npm.cmd run format` và `npm.cmd run lint` | PASS, boundaries và Prettier |

Covered: same seed/input = same state/events, wrong authority/client destroy, failed derived + budgets, RNG/ID/AP/board/turn no mutation, no failed committed events, stable FIFO handler order, death once, King priority, cancel/invalid+valid redirect, mirror namespace isolation, controlled AP, corrupt board/additional invariant rejection.

## Limits / 01B-4 handoff

Final integration 01B-5 đã bổ sung strict discriminated event payloads (capture có attackerId, skill có actualCost), strict history identity guards và portable ES2022 JSON cloning/UTF-8 fingerprinting. Xem [01B-5 report](PHASE_01B_5_REPORT.md) cho findings/fixes và verification cuối; các con số gate bên trên là thời điểm 01B-3.

Effect/delayed contracts là opaque data; resolver **reject UNSUPPORTED_RUNTIME** khi chúng không rỗng. Không giả vờ đã có effect scheduler. Synthetic callbacks là trusted reviewed runtime, không sandbox người chơi. Runtime bundles phải pure và được pin version/hash; core không thể chứng minh callback không giữ closure state.

History schema/counters là foundation ở gate này; 01B-4 bổ sung committed snapshots, canonical refs, initial/actionReady repetition và codec/replay. GameState hỗ trợ draw contract cho integration kế tiếp nhưng chưa kích hoạt threefold ở 01B-3. Chưa Time rewind, full effect semantics, auth/timers/network/database/3D UI.
