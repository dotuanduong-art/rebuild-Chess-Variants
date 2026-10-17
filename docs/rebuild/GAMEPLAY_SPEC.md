# GAMEPLAY_SPEC — Phase 00

## Current C1 authorization — Turtle Transference-only (2026-10-17)

Owner approves C1-01…10 as recorded in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-c1--turtle-transference-owner-approvals-2026-10-17). Exactly one current-controller allied and one enemy live non-King target, distinct, unlimited range/LOS; known valid ordinary/summoned/special categories permitted subject to complete final effect eligibility. One empty set allowed, both empty reject; generic complete set swap preserves every effect's original identity/source/sequence/payload/clock/references and validates all final constraints. Fixed4 AP, one normal skill slot, mandatory main unchanged. Exact skill source turtle/turtle.transference/null/null never replaces attachment sources. No passive/Aegis/Great Sanctuary/full or mixed factory.

Implementation authorized only for separate selected Transference-only profile, strict two-piece-target-v1 and retained immutable AP V3. Existing V1/V2/factories/archives remain exact. C1 acceptance PASS / READY / ENABLED only in the separate selected factory:1026 tests/50 files and all required verification plus independent Standards/Spec reviews PASS. See [C1 acceptance report](PHASE_02B_C1_TRANSFERENCE_REPORT.md). Explicit engine0.8/state1.1 and AP V3; old0.6/0.7 factories remain pinned. Preserve B1/B2/B3 history and the pre-existing untracked Coverage Audit byte-for-byte. No staging/commit/push, other batch or Phase03.

## Current B3 authorization — Guardian Sanctuary-only (2026-10-17)

The owner explicitly approves B3-01…12 in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b3--guardian-sanctuary-owner-approvals-2026-10-17): public clipped3x3 fixed cell region/AP5/one per source/recastN3, ordinary committed-capture TriggerA generates independent source-end StunN1 on eligible living ordinary non-King attacker. Original victim controller and capture destination decide eligibility; King terminal and Shield cancellation suppress reactions; Bomb destruction never qualifies. Exact guardian/guardian.sanctuary/null/null source. Separate Sanctuary-only factory; no Holy Aura/Divine Shield/full or mixed Guardian.

Implementation PASS / READY / ENABLED only for selected players in the separate pinned Sanctuary-only factory. All960 tests/46 files, required lint/typecheck/build/export/runtime/boundary/hygiene/diff checks and independent Standards/Spec reviews PASS. Evidence: [B3 acceptance report](PHASE_02B_B3_SANCTUARY_REPORT.md). Sanctuary pins engine0.7.0/state1.1.0; historical factories/archives keep engine0.6.0 and opaque namespace semantics. Preserve accepted B2 files/evidence and historical cost artifact; version and compatibility decisions are reviewed in the B3 registry entry/report. No stage/commit/push or B2-only checkpoint. Stop after B3 report; combined B2+B3 checkpoint awaits separate instruction.

## Current B2 authorization — Shockwave and fixed AP configuration (2026-10-17)

Eight scoped owner approvals and the central AP requirement are recorded in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b2--shockwave-approvals-and-cost-consolidation-2026-10-17). Shockwave-only dragon_sentinel profile, allied ordinary non-King center, adjacent enemy ordinary non-King radial pushes one cell; blocked bearers stay, independent movers succeed, simultaneous snapshot. No caster, King displacement, capture/death/promotion/AP reward, entry consumer or sibling. Pin dragon_sentinel.shockwave / dragon-sentinel.shockwave-only.experimental v1.0.0; separate opt-in factory only. Existing effects and source/deadline/identity are preserved. Costs4/3/5/6/4 become one immutable versioned approved configuration without changing the four accepted producer rulesets.

Geometry proves destination2d (Chebyshev norm2) cannot occupy a mover's initial adjacent cell d (norm1); distinct directions have distinct destinations. No chain-push/general occupied-vacated policy is approved. Owner reply now APPROVES zero-displacement rejection with no AP/skill-slot debit (D-22.B2.ZERO_DISPLACEMENT). The gameplay gate is resolved; real Shockwave is PASS / READY / ENABLED only for selected players in its separate pinned factory after B2 acceptance:852 tests/41 files, all required checks and independent Standards/Spec reviews PASS. Evidence: [B2 acceptance report](PHASE_02B_B2_SHOCKWAVE_REPORT.md). Historical B1/planning evidence below stays intact; this authorization does not start B3/Phase03. No stage/commit/push.


Ngày spec gốc: 2026-10-13 (Asia/Saigon). Phase 00 đã được review; chủ dự án đã cho phép hoàn thành 01B-3/4/5 sau 01A/01B-1/2. Không tự bắt đầu Phase 02. Kết quả implementation và giới hạn tại [Phase 01B report](PHASE_01B_REPORT.md). Phần đề xuất kỹ thuật không tự trở thành luật gameplay.

## 1. Cách đọc và thẩm quyền

| Nhãn | Ý nghĩa trong bộ tài liệu này |
|---|---|
| CONFIRMED | Chủ dự án xác nhận trong yêu cầu Phase 00, nhật ký quyết định, hoặc trả lời grill trong phiên này |
| LEGACY | Hành vi được mô tả/đọc từ hệ thống cũ; không phải phê duyệt luật mới |
| CONFLICTING | Hai nguồn khác nhau; ghi nguồn thắng nếu đã có quyết định |
| UNKNOWN | Chưa đủ bằng chứng hoặc thiếu quyết định thiết kế |
| DEPRECATED | Đã bị thay thế hoặc hoãn ngoài scope hiện tại |

Một claim có thể là LEGACY đồng thời CONFLICTING với luật đích. “CONFIRMED” trong rebuild audit cũ nghĩa là đã kiểm tra code; khi dẫn sang đây phải đổi thành LEGACY nếu chưa được chủ dự án duyệt.

Thứ tự cho clean rebuild: yêu cầu và câu trả lời hiện tại → quyết định Q/O còn hiệu lực trong [06-decisions](../audit/06-decisions.md) → các luật ứng viên từ tài liệu còn lại. [P00-01](OPEN_DECISIONS.md#quyết-định-đã-chốt-trong-phiên-phase-00) xác nhận không nâng GDD/catalog chưa duyệt thành luật; duyệt từng nhóm Variant. Thứ tự catalog trước GDD trong `06 §1` là hồ sơ lịch sử, không trao quyền tự phê duyệt toàn catalog mới.

Từ vựng: [CONTEXT](../../CONTEXT.md). Phân biệt owner, controller, effect source; capture, destruction, sacrifice và exile; gameplay rewind, transaction rollback và replay restore.

## 2. Audit nguồn và giới hạn chứng minh

| Nguồn đọc | Vai trò và kết luận |
|---|---|
| [06-decisions](../audit/06-decisions.md) | Nguồn luật Q-01…Q-35, O-1…O-9/O-6b. `§6` thay các câu hỏi mở cũ; cần đọc cả phần cuối |
| [07-roadmap-final](../audit/07-roadmap-final.md) | Roadmap sửa hệ thống cũ, mapping Q/finding, oracle cần đổi. Task “HOÀN THÀNH” không có nghĩa đã làm trong restart |
| [GDD](../GDD.md) | Baseline ứng viên; sai hướng bàn, King destruction, repetition board-only, duration turn. Không sửa file |
| [Effect](../Effect.md) | Mô tả ngắn, chưa đủ stacking/expiry/ownership; global King immunity đã bị thay thế |
| [Variants](../Variants.md) | Catalog legacy ngày 2026-10-13, 29 tên gồm hai deferred; không phải target ruleset |
| [02 manifest](../rebuild-audit/02_REBUILD_FILE_MANIFEST.md) | Phân loại lịch sử KEEP/REVIEW/REFERENCE. Yêu cầu hiện tại cấm tái dùng frontend và copy source trực tiếp |
| [03 inventory](../rebuild-audit/03_GAMEPLAY_SYSTEM_INVENTORY.md) | Call chain và các hành vi legacy; không sử dụng “verified code” như xác nhận product |
| [04 risks](../rebuild-audit/04_REBUILD_RISKS.md) | Queue/snapshot/mirror/clock/King/trap/metadata là rủi ro cần tránh bằng thiết kế mới |
| [05 handoff](../rebuild-audit/05_REBUILD_HANDOFF.md) | Clean rebuild; ưu tiên contracts và bằng chứng; source chỉ tham khảo |
| [06 variant audit](../rebuild-audit/06_VARIANT_AUDIT.md) | 27 registered, 27 passive, 82 legacy active entries; consumer gap Thunder Dragon được probe; smoke không phải acceptance gameplay |
| [08 diff](../audit/08-variant-diff.md) | Bằng chứng gián tiếp catalog frontend và restriction riêng; phần kết xác nhận O-7/8/9 đã giải quyết |
| [09 implementation log](../audit/09-implementation-log.md) | Lịch sử sửa source cũ; không kế thừa trạng thái hoàn thành vào restart |
| [01 project inventory](../rebuild-audit/01_PROJECT_INVENTORY.md), [snapshot thiết kế](../rebuild-audit/Variants.original.md) | Ngữ cảnh và bảo toàn ý tưởng cũ; không đóng băng toàn bộ oracle legacy |

Reference hiện tại gồm backend/core; `apps/frontend/src/lib/variantsData.ts` không có trong bản reference. Các path `../packages/...` trong catalog cũ là path repository cũ và không resolve trong restart. Tài liệu mới dùng đường dẫn thật dưới `../../reference/old-project/`. Không có `.git` ở workspace root khi audit: không thể xác minh lịch sử Git hoặc tạo nhận định “clean git status”.

Audit cũ báo 681 unit test pass, e2e bị giới hạn loopback; đây là kết quả lịch sử, không chạy lại ở Phase 00 và không chứng minh luật rebuild. Không đọc secret/build output làm nguồn luật.

Validation Phase 00: 11 tài liệu mới (9 spec +AGENTS +CONTEXT); 181 liên kết nội bộ resolve; UTF-8 và cặp code fences không có lỗi. SHA-256 của 205 file docs/reference có mặt trước phiên không đổi. Không tạo gameplay/frontend source, assets, dependencies hoặc database; không chạy gameplay tests/build. Rà soát chéo đã đối chiếu P00-01…12 và source paths, loại các trạng thái pending cũ đã được trả lời. Tài liệu kiến trúc và các nhóm Variant còn cần phê duyệt theo gate.

## 3. Bàn cờ và quân

CONFIRMED: board 15×15, cột A–O, rank 1–15; White ở rank 1/2, Black 15/14 (yêu cầu hiện tại + Q-06). Sáu quân cơ bản: Pawn, Knight, Bishop, Rook, Queen, King. King là quân thường về threat; không dùng check/checkmate legality (Q-32).

CONFIRMED B-01/P00-06 (D-01 resolved): back rank hai bên `R N B R N B Q K Q B N R B N R`; King H1/H15; Pawn phủ rank 2/14; mỗi bên 15 Pawn, 4 Knight, 4 Bishop, 4 Rook, 2 Queen, 1 King = 30, tổng 60. GDD STEP 2/4 và [initialLayout](../../reference/old-project/packages/game-core/src/pieces/initialLayout.ts), `BACK_RANK_ORDER/createInitialBoard` là bằng chứng được chủ dự án duyệt trong phiên này. GDD ghi phe ngược đã bị Q-06 thay thế.

Kiến trúc đề xuất: tọa độ `file/rankIndex` 0…14; algebraic là DTO/UI chuyển đổi riêng. White hướng +rank, Black −rank. Board bounds áp dụng mọi target/path/region. Rank 8 là trung tuyến; định nghĩa “nửa sân” 1–7/9–15 là LEGACY, cần duyệt khi xét skill.

## 4. Movement, capture và promotion

Các hàng dưới là CONFIRMED baseline B-02/P00-06 (D-01 resolved), sau đối chiếu GDD STEP 2 và source movement:

| Type | Hình học và điều kiện |
|---|---|
| Pawn | Tiến 1 ô trống; tiến 2 từ rank 2 White/14 Black nếu cả hai ô trống; bắt chéo trước 1; không en passant |
| Knight | Tám đích L 2+1; nhảy qua quân; đích phải hợp lệ |
| Bishop | Trượt chéo; thêm ngang trái/phải đúng 1 ô theo file tuyệt đối; không thêm bước dọc |
| Rook | Trượt hàng/cột tới trước vật cản; bắt enemy đầu tiên hợp lệ |
| Queen | Trượt tám hướng |
| King | Một ô tám hướng; không castling, không lọc ô bị attack |

Không tự loại Bishop lateral, Ghost second-obstacle hoặc Devil sacrifice bằng luật chess chuẩn. Capture cơ bản thay vị trí nạn nhân bằng attacker; Marksman/Thunder Fang/Zombie có semantics riêng. Shield capture-only, Aegis chặn debuff, Bind cửa sổ 5×5 là ứng viên cần D-06/D-14, không exemption King toàn cục.

CONFIRMED P00-06: Pawn tới back rank đối diện thành Queen tự động, +3 AP; không underpromotion. Q-17 + P00-05: controlled Pawn dùng hướng/back rank của controller; promotion AP cho controller. Không kế thừa cấm Puppet promotion. Kiến trúc hỗ trợ identity/currentType/movementProfile độc lập; D-14 quyết Magician thay trường nào và cách tương tác promotion/value.

Authoritative queries phân biệt base destinations, attack/threat squares, legal main actions và skill targets. Full internal legal query và validation dùng cùng rule pipeline; không dựng board từ DTO đã redact để tính full luật. Client preview qua policy projection D-25, chưa được phép gửi hints làm lộ hidden state. Phạm vi threat dưới Ghost/Bind/Stun/Sailing cần D-08. Prediction phía client không được biết trap/stealth/seed ẩn.

CONFIRMED B1-01 (2026-10-14): trong base movement occupancy, friendly/enemy được xác định theo controller của cả attacker và target. Owner/originalSide không đổi do control và không quyết hướng Pawn. Capture candidates chưa đồng nghĩa action legal hoặc threat query.

Nguồn: [movement directory](../../reference/old-project/packages/game-core/src/movement), [MoveGenerator](../../reference/old-project/packages/game-core/src/movement/MoveGenerator.ts), [attack detection](../../reference/old-project/packages/game-core/src/combat/AttackDetection.ts).

## 5. Kết thúc trận

CONFIRMED O-6b: destruction, AoE, beam không phá King; chỉ capture King tạo `king_captured`. King vẫn nhận effect thường (Q-18); restriction non-King riêng giữ theo O-6, Raigeki chỉ gỡ Stun khỏi King. Luật “hai King bị destroy cùng lúc, active player thắng” của GDD/source là DEPRECATED.

Terminal reasons CONFIRMED `06 §4.4`: `king_captured`, `clock_timeout`, `turn_timeout`, `surrender`, `forfeit_disconnect`, `threefold_repetition`, `abandoned`. Ba trạng thái kết quả khác nhau: win/loss, draw, abandoned không có thắng hoặc hòa. Một terminal transition idempotent; commands sau terminal không đổi state. P00-08 xác nhận capture King kết thúc sau các interception hợp lệ, bỏ remaining cascade; Phoenix Rebirth và priority matrix riêng còn D-04/D-22. P00-12 xác nhận capture King không thưởng AP; King capture/loss AP=0.

Threefold CONFIRMED Q-07/P00-10: tự hòa ở occurrence thứ ba, không cần liên tiếp. Đếm tại turnStart sau hooks/effects/delayed resolution, khi bên mới chuẩn bị nhận input; gồm initial position, không đếm từng skill/derived operation. Semantic position gồm board/type/owner/controller, bên đi, effect cả ẩn + remaining logical duration, AP hai bên và variant state có ý nghĩa luật, bao gồm relative delayed deadlines. Loại clock/history/turnNumber, timestamp, ID nhiễu và RNG cursor. Normalize absolute source ordinals/deadlines thành thời gian logic còn lại; giữ quan hệ linked effects/portals bằng nhãn cấu trúc ổn định. Hash đầy đủ phục vụ replay khác repetition key. D-09 đã resolved.

## 6. AP

CONFIRMED B-03/P00-06/P00-12: bắt đầu 0; không cap/decay; AP riêng từng bên; King reward0. Quiet move cơ bản không tốn AP; cost modifier như Devil Toll là ngoại lệ.

| Quân | Capture AP Reward | Piece Loss AP Reward (cộng cho owner) |
|---|---:|---:|
| Pawn | 2 | 1 |
| Knight | 3 | 2 |
| Bishop | 3 | 2 |
| Rook | 4 | 3 |
| Queen | 5 | 4 |
| King | 0 | 0 |

Nguồn [GDD STEP 2](../GDD.md), [ActionPipeline](../../reference/old-project/packages/game-core/src/action/ActionPipeline.ts), `CAPTURE_AP/LOSS_AP/PROMOTION_AP`.

CONFIRMED Q-14/P00-05: destruction trả loss AP cho owner hiện tại; bên gây destroy không nhận capture AP. Capture/promotion AP thuộc controller thực hiện; loss AP thuộc owner. Control không đổi owner; conversion đổi owner rõ ràng. Passive được thưởng thêm chỉ khi spec riêng được duyệt; không ngầm kế thừa ngoại lệ Shelter trả capture AP khi destroy.

CONFIRMED B2-01: Piece Loss AP Reward/Loss AP Gain luôn **cộng**, không trừ AP. Đây là clarification P00-06, không đổi luật gameplay. Chỉ reward sau death/destruction được commit hợp lệ theo P00-08; candidate/canceled capture không reward. Capture King không thưởng AP. Despawn, exile và transformation không tự là death; nguyên nhân chưa được duyệt giữ pending. Pirate negative AP/debt chưa được bật trong baseline.

CONFIRMED Q-15: Devil sacrifice có thể lặp đến đủ AP rồi vẫn main move; [roadmap G2.6a](../audit/07-roadmap-final.md) áp Toll cho quiet move/capture/bite. Bảng phí và sacrifice reward cụ thể vẫn ứng viên theo catalog. Pirate nợ đến −10, dynamic cost Phoenix/Puppet/Wizard/Earth là LEGACY chờ duyệt. Mọi skill quote một `actualCost` gồm base + surcharge − discount; validate AP trước; debit một lần trong transaction; không clamp âm để che thiếu AP; invalid action không tốn AP/RNG/slot.

## 7. Turn, round, skill order và timing

CONFIRMED B-04/P00-07: White trước, luân phiên; mỗi turn có đúng một main move và tối đa một skill tùy chọn; Skill→Move, Move→Skill, Move→End/skip skill. Skill resolves xong mới nhận action tiếp theo. Move xong giữ cửa sổ skill/End dù không còn skill khả dụng; auto-end khi đã đủ move+skill. P00-09 cho End forced skip nếu server xác nhận không có main move hợp lệ; player vẫn có thể dùng skill mở đường trước. Không End trước main move khi còn legal main move. D-01/02/03 đã resolved; multi-cast Cherubim/repeatable/clock override là exception cần nhóm riêng.

Phases đề xuất: turnStart → actionReady → root resolution (mỗi action) → turnEnd → cleanup → switch. Forced actions thuộc resolution không tự dùng main slot; chỉ rule riêng được duyệt có thể ghi turn consumption. Cửa sổ skill/End theo P00-07, không tự đoán từ UI availability. Cooldown/usage exceptions của từng skill là dữ liệu approved plugin, không dùng cooldown chung chưa được duyệt.

CONFIRMED Q-03/P00-02: duration N là N round; anchor tại cùng start/end boundary của lượt effect source sau N round, không tick boundary cast. Ví dụ White cast trong action: effect `end` 1 round hết cuối lượt White kế tiếp, effect `start` hết đầu lượt White kế tiếp; cả hai cho Black đủ lượt. Clock anchor giữ source, không chuyển sang target/owner/controller. Swap Water Turtle giữ nguồn và hạn hết. `remainingRounds` là UI dẫn xuất, deadline/anchor mới là dữ liệu canonical. Instant/window hiệu lực “lượt này” dùng kind riêng, không suy từ duration 0. Countdown/progress/channel riêng phải duyệt, không nhân mọi legacy D lên 2.

CONFIRMED: chess clock 15 phút/bên chạy từ match start; hard timeout 15 giây/ply, chỉ first White turn miễn hard timeout và có cờ rõ; hết hard timeout thua. Skills không reset hard timer. Disconnect freeze mọi gameplay clock/counter/effect/delayed; [network](NETWORK_ARCHITECTURE.md) quy định grace/budget/restart. Low-clock +5 giây và Terrain 3 giây auto skip là LEGACY, D-07 chưa duyệt.

## 8. Variant, effect, summon và rule modifier

CONFIRMED: mirror match; plugin không sửa state; generic/data-driven effect engine; Time hai mode ultimate; Turtle swap toàn bộ effect set giữa hai quân, giữ nguồn và expiry, reject atomic nếu không hợp lệ (P00-03). Chi tiết [effect spec](EFFECT_SYSTEM_SPEC.md), [plugin spec](VARIANT_PLUGIN_SPEC.md).

Rule modifiers đề xuất theo stage: choose movement profile → geometry/path → ownership/capture relation → hard board/effect constraints → action replacements/cost → final legality. Hard blockers vẫn áp dụng sau plugin adds destinations. Mọi push/teleport/swap/forced move có movement cause và policy triggers tường minh; không bypass bounds/occupancy/King protection.

Summoning/revive/exile là typed operations; ô đã có quân không bao giờ overwrite ngầm. New spawn có ID deterministic mới; revival liên kết death record và incarnation theo D-17. Thời hạn summon là lifecycle riêng, không bị cleanse buff vô tình xóa despawn deadline. Capture/destroy/sacrifice/exile/de-spawn có reason tường minh, reward và graveyard theo luật duyệt D-06/D-17/D-22.

## 9. Resolution, RNG và ba loại khôi phục

CONFIRMED Q-33/Q-35: cùng initial state + version + seed + ordered inputs cho cùng state/events. Server timers sinh ordered system input có deadline identity, không để reducer tự đọc wall-clock. ID/counter và RNG state thuộc transaction. P00-08 chốt FIFO cascade, stable handler ordering và rewards sau committed death; ma trận priority của từng effect còn D-04. Chi tiết [engine](ENGINE_ARCHITECTURE.md).

CONFIRMED P00-04: Time gameplay rewind chỉ khôi phục vị trí quân còn sống có trong snapshot; giữ AP/effects/type/controller/RNG hiện tại; không revive, không xóa summon; collision với quân không được rewind làm reject toàn action. Tính map vị trí kết quả toàn bộ trước mutation để cho phép hai quân rewind đổi chỗ hợp lệ. Distance/lack-of-history, trigger side effects và portal collision cần D-11.

Transaction rollback là khôi phục toàn candidate state/AP/effects/queue/IDs/RNG/events khi lỗi; không phải skill. Replay restore đọc snapshot toàn state rồi re-execute inputs theo version, không tái submit animation. Replay không tự chạy luật mới. Nguồn: [Time](../../reference/old-project/packages/game-core/src/variant/variants/TimeVariant.ts), [Snapshot](../../reference/old-project/packages/game-core/src/state/Snapshot.ts), [risks](../rebuild-audit/04_REBUILD_RISKS.md).

## 10. Ma trận mâu thuẫn và oracle cần thay

| Điểm | Nguồn khác nhau | Kết luận |
|---|---|---|
| Orientation | GDD ngược initialLayout | CONFIRMED Q-06: White 1/2, Black 15/14 |
| King | Effect/GDD global immunity/destruction terminal vs Q-18/O-6b | Effect thường có thể tác động; destruction không phá King |
| Repetition | GDD board-only vs Q-07 | AP/effects/semantic variant state có trong key |
| Duration | GDD turn, generic tick màu gốc, custom ply counters | Q-03 + P00-02 thay bằng source boundary N round |
| Time | Hai legacy commands, UI một tên | O-7 `time_collapse` + mode; clean rebuild không migrate old code/log mặc định |
| Time rewind | position write overwrite summons | P00-04 reject atomic collision |
| Turtle | allowlist năm effect, one-way transfer/re-source | P00-03 generic whole-set swap, giữ source/expiry |
| Zombie | free ba lần | Q-13 miễn phí round 1–3 |
| Pawn control | original color direction/Puppet no promotion | Q-17 + P00-05 controller direction/promotion/AP |
| Thunder Fang | rays và missing consumer | Q-11 normal moveset/stand-still/trap; consumer chung độc lập |
| Guardian/Nephalem | Sanctuary4/Stun2; Chains2 | O-8 Sanctuary3/Stun1; O-9 Chains3 |
| Predator | mọi ally attack range | Q-12 chỉ ally Pawn |
| Space/Verdant/Puppet | mô tả gốc cũ | Q-08 buff10 không remove ally; Q-09 ±2/Stun/no King lock; Q-10 control7=2+5 |
| AP destroy | không loss hoặc Shelter thưởng capture | Q-14 loss owner; không capture reward caster |
| Mirror | flat state/shared handlers/cross-player link clear | Phải namespace/instance isolation, không suy smoke là đã đúng |
| Clock | Terrain dừng debit, +5 giây low-time | UNKNOWN D-07, không tự nhập vào dual-clock rules |
| Reuse | Manifest cho reuse UI | DEPRECATED bởi yêu cầu clean frontend; chỉ đọc reference |

Mọi điểm chưa duyệt có câu hỏi/options/tác động tại [OPEN_DECISIONS](OPEN_DECISIONS.md); không freeze `ruleset-v1` từ catalog legacy. Phase 01 chỉ bắt đầu sau phê duyệt rõ của chủ dự án và các gate trong [roadmap](IMPLEMENTATION_ROADMAP.md).
