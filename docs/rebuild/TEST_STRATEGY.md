# TEST_STRATEGY — kiểm chứng ruleset rebuild

Ngày 2026-10-13. Đây là yêu cầu kiểm thử tương lai, không phải tests đã chạy. Phase 00 chỉ kiểm tra tài liệu, liên kết, coverage và tính nguyên vẹn nguồn. [06 decisions](../audit/06-decisions.md), [roadmap cũ §5](../audit/07-roadmap-final.md), [06 variant audit](../rebuild-audit/06_VARIANT_AUDIT.md) phục vụ đối chiếu oracle, không phải toàn bộ baseline đích.

## 1. Oracle và fixture provenance

Mỗi fixture ghi requirement ID (Q/O/P00 hoặc group approval), ruleset version, seed, config, inputs và expected outcome. Legacy tests chỉ cung cấp ý tưởng sau review oracle; không copy source tests hoặc cập nhật snapshot chỉ để làm xanh. Expected trái Q-03/Q-17/Q-18/O-6b/Time modes phải đổi có lý do.

Testkit gồm scenario builders, fake clock/persistence/network, deterministic runner và fault injection nhỏ. Kiểm tra White/Black, đổi phe và mirror. Golden cần phép kiểm độc lập hoặc outcome được review, không lấy output implementation làm expected duy nhất.

## 2. Các lớp test

| Lớp | Phạm vi | Gate |
|---|---|---|
| Domain unit/table | Coordinates, movement, AP, turn, eligibility, cost, lifecycle, terminal | Mỗi rule approved |
| Core integration | Root → queue → effect/variant → cleanup, dùng reducer thật | Phase 01/02 và các nhóm |
| Property/invariants | Chuỗi valid/invalid actions có seed; board, ownership, rollback, order | Phase 01+ |
| Replay/snapshot | Deep round-trip, pinned-version re-execution, RNG/ID golden vectors | Trước persistence |
| Backend integration | Auth/seat, sequencing, CAS, idempotency, timers, projector | Phase 03 |
| Real socket E2E | Hai clients + attacker/spectator trên Nest thật; cross-process restart | Phase 03/04/07 |
| Frontend presentation | DTO store, picking, animation cancellation, visual smoke | Phase 04+ |
| Performance/load | Core/query/codec, network commit/restore, GPU frame/memory | Slice và release |
| Release/security | Authz, hidden leakage, abuse, advisories, fonts, runbooks | Phase 07 |

Chọn runner phù hợp TypeScript lúc setup; không bắt buộc Jest legacy và không cài dependencies Phase 00. Tests kiểm behavior/invariants, tránh phản chiếu từng dòng implementation.

## 3. Core matrix đã xác nhận

| Requirement | Cases tối thiểu và oracle |
|---|---|
| Board/Q-06/P00-06 | 225 cells, 60 pieces, exact counts/back rank/H King; White 1/2, Black 15/14; algebraic A1/O15 round-trip |
| Movement/P00-06 | Pawn 1/2 bước và intermediate blocker, diagonal capture; Knight edge jumps; Bishop lateral/diagonal; sliders dừng tại vật cản; King vào attacked square được; không castling/en passant |
| AP/P00-05/06/12/Q-14 | Capture/loss theo bảng, King0/no reward; no decay; promotion +3 controller; destroy chỉ loss AP owner, caster 0; invalid target/AP không đổi state |
| Turn/P00-07 | Skill→Move, Move→Skill, Move→End; AP=0 vẫn giữ cửa sổ End; duplicate move/skill reject; không End trước main move trừ forced skip |
| No move/P00-09 | Server legal main set rỗng cho End forced skip; skill mở move thì không được skip; không tin client khai no-move |
| King/Q-18/O-6/O-6b | Effect thường vs restriction riêng; Raigeki gỡ Stun; destroy/AoE/beam không phá King; capture terminal sau approved interception |
| Death/P00-08 | Cancel trước death không AP/graveyard/Bomb/Fate; death committed thưởng đúng một lần; capture King bỏ cascade còn lại; redirect revalidate |
| Repetition/Q-07/P00-10 | Ba occurrences không liên tiếp ở actionReady, initial đếm một; AP/effect/owner/profile/semantic state đổi key; clock/history/noisy IDs không đổi; delayed relative state có trong key, RNG cursor không có |
| Clock/Q-23/24 | Chess 15 phút + hard 15 giây; chess chạy từ start; chỉ first White turn miễn hard timer; skill không reset; callback deadline cũ bị bỏ |

Repetition codec: hai board/effect graphs tương đương với IDs khác phải cùng key; partner/link structure khác phải khác key. Không xóa IDs theo cách làm hai Fate pairings khác nhau trùng key. Full deterministic hash phục vụ replay là phép kiểm riêng.

## 4. Transaction, determinism và snapshot

Hai independent runs cùng config/version/seed/ordered inputs phải có canonical state và ordered events giống byte sau từng commit. Restore giữa stream rồi tiếp tục phải bằng uninterrupted run. RNG vector có expected độc lập; candidate pools sort ổn định. Rejected action không tiến RNG/ID.

Fault injection tại validate, debit, derived operation thứ N, effect handler, queue budget, invariant check, DB trước commit và sau commit trước ACK. Trước durable commit: state/AP/slots/history/RNG/metadata không đổi, không emit outbound commit. Sau commit nhưng ACK mất: duplicate trả receipt cũ, không nhân event. Commit outcome chưa rõ phải kiểm receipt/CAS trước retry.

Snapshot kiểm alias hai chiều của nested effect payload, group links, variant state, Time history và graveyard. White/Black cùng round vẫn có snapshot identity riêng. Wrong version/schema/checksum reject; snapshot không chứa callbacks, sockets hoặc PII. Plugin planner lỗi cũng không được sửa immutable input.

## 5. Effect lifecycle và Water Turtle

Timing source start/end cho White/Black, N=1/2/3, bỏ boundary cast; control/conversion/swap giữ anchor; disconnect/restart không tiêu round. Instant window dùng lifetime riêng. Due list ổn định khi handler tạo/gỡ effect khác.

Apply/refresh/stack/ignore/blocked có expected events, source/payload/deadline rõ. Test mọi removal reason và linked cleanup đúng một lần. P00-11: cleanse/dispel không chạy hậu quả natural expiry trừ exception đã approved; swap không OnApply/Expire/reward.

Turtle P00-03: whole-set swap giữ source, expiry và instance ID; invalid một effect rollback toàn skill/AP. Approved group relocation cập nhật references/indexes. Thêm synthetic future effect có relocation policy mà không sửa Turtle/core: swap phải chạy; thiếu policy hoặc prohibited thì reject rõ. Không mất effect vì sequential remove/apply gặp stacking ignore.

## 6. Variant acceptance matrix

| Nhóm | Mandatory cases |
|---|---|
| Time | Hai modes; counters mỗi player; alive-only rewind giữ AP/effects/type/controller/RNG; simultaneous final mapping; collision reject; lookback theo D-11; Freeze mirror; prediction nhận đúng actor dù đứng yên |
| Dynamite | FIFO multi-Bomb, overlapping victim một lần, protected King, canceled death không chain, refund chỉ caster, terminal ngừng chain |
| Thunder | Fang normal moveset từng piece; ray ngoài moveset reject; stand-still capture/trap; consumer chạy khi không có Lightning; Wrath 3×10 cắt biên |
| Zombie | Infection miễn mọi cast hợp lệ round 1–3, round 4 trả cost; bite consumption theo approval; controller Pawn; Mutation owner; revive record/incarnation |
| Magician | Profile khác identity/value; Pawn promotion và transformation trong swap; partner committed death/cleanse/revert collision; Fool cardinality và forced entry |
| Phantom | Giữ obstacle đầu/bắt obstacle hai; Bishop/terrain; inheritance tie; Possession window; stealth reveal/redaction/free counters |
| Space | Entry/path/jump, exit King/ally, delayed wait, pair lifetime và mirror; column shift; Outworld expiry |
| Puppet | 7 round = 2 move-only +5 tự do; Pawn controller; dynamic quotes; pair isolation/recast; redirect/Shield/trap; control removal |
| Turtle | Whole sets, future effects, eligibility/Aegis/group relocation; passive actor reference; no metadata alias |
| Mọi nhóm khác | Passive +3 skills, targets/cost/timing/King/removal/ownership/AP/visibility; approved D-22 checklist; normal/mirror/replay |

Mọi enabled variant kiểm normal, self-match, cross-variant và snapshot/replay. 100 create/dispose không leak subscriptions. Pairwise bắt buộc: Shield+Bomb/Fate; Aegis+traps/swap; Ghost+Bind/terrain; control+AP/promotion; Space+traps/King; Time+summon/delayed/control; Magician+transform; Sailing+Shield/portal. Registry smoke không thay acceptance.

## 7. Perft và property checks

Perft theo pseudo-legal rules Q-32; không dùng counts chess chuẩn 8×8. Tách base movement tree khỏi full turn tree có skills/AP. Depth 1–3 cho initial 15×15 và small reviewed positions có edge/Bishop/King/Ghost/control. Golden từ slow independent enumerator hoặc manual cases; không dùng cùng MoveGenerator làm cả oracle và implementation.

Invariants: một occupant/cell, position inverse nhất quán, IDs duy nhất, owner/controller hợp lệ, effect refs tồn tại, group không orphan ngoài policy, AP floor đúng, terminal immutable, slots trong giới hạn, committed RNG/ID monotonic, queue bounded, replay hash bằng nhau. Lưu minimized failure với seed/input prefix/ruleset.

## 8. Backend, security và persistence

Adversarial: forged principal/seat, guest command, wrong turn, stale epoch/revision, unknown mode, invalid coordinates, oversized inputs, expired/revoked session. Recursive leak tests cho DTO/events/errors/hints/history/variant state/snapshots; không full seed/credential/internal state hash. Query oracle D-25 và rate limits phải test.

Cross-process restore kiểm CAS/log contiguous, deep snapshots, crash trước/sau commit, idempotent retry, unavailable old bundle, retention 24h/30d/90d, backup restore. Disconnect grace 60s/budget 180s, independent deadlines, simultaneous abandoned, infrastructure không tiêu budget hoặc gây forfeit. Policy resume D-26 cần fixtures riêng.

Hai real socket clients create/join/setup/play/End/timeout/capture King, third spectator, reconnect/restart, authorized postgame replay final hash. Nếu môi trường chặn loopback/network ghi NOT RUN hoặc environment-blocked; không gọi pass và không sửa code để né. Kết quả legacy E2E không là kết quả rebuild.

## 9. Frontend 3D và budgets

DTO reducer: r13 trước r12 bỏ stale, duplicate dedup, gap full sync, epoch replace. Animation: r12 move/r13 capture/reconnect/seek/context loss; completion callback không ghi lại logical board. Picking cả 225 cells, hai camera phe, instance IDs, drag threshold. 60 models/6 types, control badges, revision-bound highlights, keyboard/focus/reduced motion.

Mock event coverage gồm move/capture/destruction/skill/status/summon/transform/rewind; hidden event không tạo secret VFX. GPU frame/heap/listeners/resources đo trên hardware D-28 khi camera/move/chain/seek; 100 reconnect/remount không tăng leaks. Budgets trong [frontend](FRONTEND_3D_ARCHITECTURE.md) là mục tiêu, chưa đo.

Core đề xuất p95 typical resolve/query ≤20ms, worst approved cascade ≤100ms trên reference backend; DB commit latency đo riêng. Ghi p50/p95 codec/restore và memory/match, load throughput/timer drift/backpressure/outage. Chỉnh targets bằng evidence trước release, không tuyên bố performance trước có code.

## 10. CI và DoD

Future CI: locked install → typecheck/import boundaries → unit/core integration → determinism/rollback/replay/perft → socket/browser E2E → build/lint → advisory/secret/font/artifact checks. Full enabled matrix là gate release; subset nhanh cho PR và toàn matrix cho merge gate theo chi phí thực tế.

Rule DoD: approved source ID, spec/catalog/contracts cập nhật, meaningful regression pass, affected deterministic/serialization/mirror/leak cases pass. Release DoD thêm traces/restore/retention/security/runbooks/authz/E2E có ngày. Phase 00 DoD chỉ docs completeness/link/conflict/question/hash checks; không build/install hoặc gọi gameplay đã tested.
