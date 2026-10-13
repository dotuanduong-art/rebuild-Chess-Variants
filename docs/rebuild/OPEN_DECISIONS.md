# OPEN_DECISIONS — decision tree và sổ phê duyệt

Ngày 2026-10-13. Chủ dự án quyết gameplay; architect tìm bằng chứng và đưa phương án. Recommendation chưa được trả lời **không phải** luật. Spec/architecture viết xong không tự duyệt Phase 01. Các decision IDs stable để fixtures/PR tương lai truy vết.

## Quyết định đã chốt trong phiên Phase 00

Các câu trả lời trực tiếp ngày2026-10-13 là nguồn xác nhận mới; chỉ cập nhật tài liệu rebuild, giữ nguyên nhật ký legacy.

| ID | Câu hỏi / quyết định CONFIRMED | Phạm vi |
|---|---|---|
| P00-01 | Nguồn luật: GDD/catalog chưa duyệt giữ là ứng viên, duyệt theo nhóm Variant; không lấy source legacy làm luật mặc định | Toàn bộ spec; Q/O đã chốt tiếp tục có hiệu lực |
| P00-02 | Duration N round hết cùng start/end boundary của lượt source sau N round; không tick lúc cast | Effect clock generic; custom progress/counters cần declared policy riêng |
| P00-03 | Turtle swap toàn bộ effect sets giữa hai quân, giữ source/expiry; reject toàn thao tác nếu bất kỳ effect/link/target chưa hợp lệ | Generic whole-set relocation; scope hai pieces, không tự mở rộng cells/players |
| P00-04 | Time rewind chỉ vị trí quân sống trong snapshot; giữ AP/effect/type/controller/RNG; không revive/xóa summon; collision reject atomic | Rewind/Grand Rewind; lookback/window/triggers còn D-11 |
| P00-05 | Loss AP owner hiện tại; capture/promotion AP controller thực hiện; control không đổi owner, conversion explicit đổi owner | Game identity và economy; không tái hỏi Q-17 |
| P00-06 | Duyệt back rank R N B R N B Q K Q B N R B N R,30/bên; Pawn 1/2/bắt chéo, Bishop chéo+ngang1, quân khác GDD, không castling/en passant; Queen promotion +3; capture AP 2/3/3/4/5,loss AP 1/2/2/3/4; AP 0/no cap | Baseline B-01/02/03 và D-01 đã resolved; orientation Q-06 |
| P00-07 | Duyệt đúng 1 main move/tối đa 1 skill; skill trước/sau; Move xong giữ cửa sổ skill/End; auto-end khi đã đủ move+skill, không vì thiếu skill khả dụng | Baseline B-04/D-02 resolved; Cherubim/repeatable còn group gate |
| P00-08 | FIFO cascade, handler stable order; pre-death chỉ cancel/redirect; AP/death passive sau death committed; capture King terminal sau interception hợp lệ và bỏ remaining cascade | D-04 partial resolved; priorities per-effect và Phoenix chưa duyệt |
| P00-09 | Server xác nhận không có main move hợp lệ thì cho End forced skip; vẫn có thể skill mở đường trước | D-03 resolved; không thêm stalemate/checkmate |
| P00-10 | Threefold count tại turnStart sau hooks/effects/delayed resolution, gồm initial position; không thêm RNG cursor vào key; relative delayed deadlines trong semantic variant state | D-09 resolved; canonical IDs/graph labeling là technical design |
| P00-11 | Cleanse/dispel cleanup mặc định; chỉ hậu quả riêng được approved mới chạy. Swap relocation không expire/on-apply/reward | D-06 phần common lifecycle resolved; per-effect exceptions chờ nhóm |
| P00-12 | AP không decay theo lượt/round; King có capture/loss AP=0, capture King không thưởng AP | D-29 resolved; bổ sung baseline economy/terminal |

Luật Q/O đã resolved trong [06 decisions](../audit/06-decisions.md) không mở lại: mirror; orientation; AP destroy; Time modes; King normal effects/restrictions và non-capture protection; Guardian3/1; Nephalem3; Zombie free3 round; Predator Pawn range; Puppet7=2+5; Ghost second obstacle; Devil repeated sacrifice; Space/Verdant; auth/clocks/disconnect/retention/version. [08 diff](../audit/08-variant-diff.md) có wording mở cũ nhưng phần cuối đã chốt O-7/8/9.

## Decision tree và frontier

Ngày 2026-10-13, chủ dự án đã review Phase 00 và cho phép Phase 01A: monorepo foundation theo prompt hiện tại. Chưa duyệt Phase 01B hoặc gameplay implementation. Các quyết định gameplay P00/Q/O không thay đổi; việc còn mở ở nhóm Variant vẫn giữ gate riêng.

```mermaid
flowchart TD
 S[Nguồn authority P00-01] --> B[Core baseline P00-06 and 07]
 B --> C[Core edge policies P00-08 to 11]
 C --> A[Phase 00 architecture approval]
 A --> P1[Phase 01 contracts and base core]
 S --> G[Variant group approval]
 T[Nguồn timing P00-02] --> E[Effect definitions and lifecycle]
 W[Whole-set swap P00-03] --> E
 O[Ownership P00-05] --> G
 R[Position rewind P00-04] --> TM[Time details D-11]
 E --> V[Slice rules Guardian and Dynamite]
 G --> V
 V --> SL[Multiplayer 3D vertical slice]
 A --> N[Network and persistence provider choices]
 N --> SL
```

Frontier hiện tại: hoàn thành và review Phase 01A; Phase 01B cần phê duyệt riêng. Câu hỏi nhóm effect/slice chốt trước Phase 02/04; nhóm Variant sau mở khi vào phase tương ứng. Mỗi nhánh đã có câu hỏi/alternatives/impact dưới đây; Phase 01A không tự phê duyệt luật Variant còn mở.

## Câu hỏi đã resolved ở core

| ID | Kết quả | Nguồn và case |
|---|---|---|
| D-01 | RESOLVED P00-06 | [GDD STEP2/4](../GDD.md), [initialLayout](../../reference/old-project/packages/game-core/src/pieces/initialLayout.ts); exact60pieces/layout/AP |
| D-02 | RESOLVED P00-07 | [GDD turn](../GDD.md) vs legacy auto-end; Move có AP0 vẫn được End chủ động |
| D-03 | RESOLVED P00-09 | Không có legal main move → player skill trước hoặc End forced skip server-verified |
| D-09 | RESOLVED P00-10 | Q-07 key unchanged; chỉ occurrence khi actionReady của new turn, không đếm mỗi queue operation |

## Frontier effect và resolution — cần trước nhóm sử dụng

### D-29 — AP decay và King reward

❓ Q12: Giữ AP không tự decay và King AP=0, capture King không thưởng AP như GDD không?

A: giữ cả hai; B: no-decay nhưng King có reward riêng; C: chưa duyệt. **RESOLVED P00-12:** chủ dự án chọn A ngày 2026-10-13. AP không tự giảm, King reward0 và capture King không thưởng AP. Impact: resource boundary updates/terminal reward ordering; Phase 01 economy đã đủ quyết định baseline. Nguồn [GDD STEP 2](../GDD.md), [ActionPipeline](../../reference/old-project/packages/game-core/src/action/ActionPipeline.ts), CAPTURE_AP/LOSS_AP.

### D-04 — Priority matrix và capture interception

❓ Q: Nếu Shield, Puppet redirect, Fate và Bomb cùng liên quan capture, effect nào thấy proposed capture và effect nào thấy committed death? King capture bị Phoenix Rebirth chặn có được phép không?

Phương án A: Shield eligibility trước redirect, revalidate redirected capture, death committed mới Fate/Bomb/AP; Phoenix riêng chờ D-22. B: redirect trước Shield. C: lấy thứ tự legacy. ➡️ Khuyến nghị A làm ứng viên priority matrix; FIFO/committed-death/immediate King terminal đã CONFIRMED P00-08, không hỏi lại.

Impact: pre-capture stage, cancellation scope, redirected target defense và queue fixtures. Gate: Phase 02 priority contract; từng pair approval trước enable. Nguồn [ResolutionOrder](../../reference/old-project/packages/game-core/src/event/ResolutionOrder.ts), [pipeline](../../reference/old-project/packages/game-core/src/action/ActionPipeline.ts), [risks](../rebuild-audit/04_REBUILD_RISKS.md). Legacy portal interception không đi hoàn toàn qua event priority nên không đủ để chọn C.

### D-05 — Stacking/refresh/source attribution

❓ Q: Black đặt Stun lên quân đã Stun từ White: refresh giữ nguồn White, thay nguồn Black hay có hai instances? Silence cũ blockUltimate=true được Lord refresh blockUltimate=false thì sao?

A: type+source+target độc lập, chỉ merge cùng source theo policy. B: type+target, refresh thay source/payload. C: type+target giữ source/payload cũ. ➡️ Khuyến nghị A cho source-dependent effects, B cho mutually exclusive status khi có explicit arbitration; duyệt per-definition, không universal default.

Impact: stacking key, passive attribution, timer anchor và Turtle swap eligibility; gate: Phase 02 definitions. Nguồn [EffectRegistry](../../reference/old-project/packages/game-core/src/effect/EffectRegistry.ts), catalog Lord/Puppet/Phantom. Nói “refresh” chưa đủ để enable effect.

### D-06 — Per-effect removal và hard constraints

Common policy đã CONFIRMED P00-11. ❓ Q: Sailing/Totem/control/channel/linked swap khi cleanse có fired action, Bind hậu control, return partner hoặc despawn không? Stun có cấm forced movement; Shield chỉ capture, Aegis chỉ debuff hay chặn swap relocation?

A: cleanup-only default, mỗi reason/outcome riêng theo effect; unit lifetime riêng không cleanseable. B: cleanse như natural expiry cho các effect legacy. ➡️ Khuyến nghị A. Target destruction chỉ cleanup nhóm trừ declared death reaction; không thưởng trước committed death.

Impact: removalReason matrix, forced action validator, lifecycle record tách timer buff; gate: Phase 02 và nhóm có exceptions. Nguồn [handlers](../../reference/old-project/packages/game-core/src/effect/handlers), [Effect](../Effect.md), [catalog](../Variants.md).

### D-07 — Terrain và clock increment

❓ Q: Giữ Terrain3giây auto-skip/disable skills thế nào với chess15phút+hard15giây đã chốt? Giữ +5giây khi clock<60giây không?

A: Terrain deadline3giây là exception skip được duyệt, chess clock luôn debit; hard15giây vẫn bound; không +5 increment. B: không Terrain override, chỉ effect/skill disable. C: giữ cả increment và Terrain special clock. ➡️ Khuyến nghị A nếu duyệt Lightning, bỏ low-time increment chưa có product rationale. Không kế thừa pause chess clock legacy.

Impact: deadline arbitration, timeout input kind, first White exemption vs Terrain, force-skip slot; gate: Phase 03 generic timers không phụ thuộc Terrain, Phase 05 Lightning phải chốt. Nguồn [TurnClock](../../reference/old-project/packages/game-core/src/match/TurnClock.ts), [Match](../../reference/old-project/packages/game-core/src/match/Match.ts), catalog Lightning.

### D-08 — Threat query, hard blockers và path

❓ Q: Devil Eye/Wizard/Phoenix/Predator dùng hình học attack hay action legality gồm Stun/Bind/Ghost/profile? Knight jump “đi qua portal” không? Ghost có xuyên Flame/Outworld/Mountain và còn Bishop ngang1 không?

A: threat là capture geometry+movement/profile/path restrictions, không turn/AP/slot; Stun cấm attack theo definition, Ghost không xuyên terrain hard blockers, giữ Bishop ngang1. B: base geometry only như nhiều legacy queries. C: full root action legality. ➡️ Khuyến nghị A; jump chỉ có landing trừ path policy riêng Space D-19.

Impact: query context/stages, target consistency, threat passives/perft fixtures; gate: Phase 02 query seam, nhóm target-based trước enable. Nguồn [AttackDetection](../../reference/old-project/packages/game-core/src/combat/AttackDetection.ts), [MoveGenerator](../../reference/old-project/packages/game-core/src/movement/MoveGenerator.ts), [risks](../rebuild-audit/04_REBUILD_RISKS.md).

## Câu hỏi của chín Variant đặc biệt

### D-10 — Turtle target restrictions và relocation exceptions

Whole-set swap/source/expiry/atomic đã CONFIRMED P00-03. ❓ Q: Hai target có thể bất kỳ phe/King, empty sets có hợp lệ, Aegis chặn effect debuff swap vào không? Linked/control/timer effect group nào được retarget?

A: hai non-King bất kỳ phe; không cả hai empty; kiểm eligibility/Aegis trên assignment cuối; linked/control cần handler đã approved, thiếu thì reject. B: giữ ally→enemy/enemy→ally theo buff/debuff nhưng swap toàn bộ. C: any piece kể cả King nếu tất cả effects eligible. ➡️ Khuyến nghị A như ứng viên restrictions, O-6 riêng catalog non-King phải giữ cho skill vốn có restriction; cần xác định restriction swap mới rõ trước enable.

Impact: target schema, group-aware relocation, UI selection. Gate: Phase 05 Turtle (effect API Phase 02 vẫn được thiết kế theo P00-03). Nguồn [Turtle](../../reference/old-project/packages/game-core/src/variant/variants/TurtleVariant.ts), [06 decisions O-6](../audit/06-decisions.md).

### D-11 — Time lookback, missing history, triggers và Freeze

Scope position-only/collision đã CONFIRMED P00-04; modes O-7. ❓ Q: Rewind2ply/Grand10ply hay2/10 round? Thiếu lịch sử reject hay earliest? Rewind có trigger trap/prediction/portal? Giữ Future Prediction5 AP/Stun 4 round, Freeze6 round và shared ultimate cost6/9/15 không?

A: 2/10ply snapshots, reject nếu không đủ; rewind là relocation không Move/trap; giữ legacy numeric skills làm ứng viên có source-clock đã chốt; shared counter mỗi player. B: 2/10 round; fallback earliest. C: 2/10ply +earliest fallback và trigger như moves. ➡️ Khuyến nghị A, nhưng numeric/window/mode targeting phải được duyệt từng field; cast không useful không tự đốt AP.

Impact: snapshot retention/boundary, relocation causes, prediction matches actor ID kể cả stand-still capture, mirror Freeze instances. Gate: Phase 05 Time. Nguồn [Time](../../reference/old-project/packages/game-core/src/variant/variants/TimeVariant.ts), [TimeFreeze](../../reference/old-project/packages/game-core/src/effect/handlers/TimeFreezeHandler.ts).

### D-12 — Trap entry, Dynamite chain và Thunder payload

❓ Q: Move/capture/push/teleport/forced move/rewind loại nào kích bẫy? Lightning trap thưởng2AP nhưng Fang trap cũng thưởng không? Scale electric1 hay2 round? Bomb trên King hợp lệ không và có kích nổ khi capture King?

A: mọi committed entry trừ rewind/swap; capture đứng yên không entry attacker; trap payload thưởng riêng producer, Fang không +2; Scale1round theo catalog description; Bomb King theo O-6 eligibility, terminal King bỏ chain theo P00-08. B: chỉ Move/Capture như phần legacy; electric2 round; chung reward. ➡️ Khuyến nghị A; không hỏi lại normal-moveset Fang/3×10/King protection đã chốt.

Impact: MovementCause taxonomy, independent shared consumer, trap consume dù Aegis/King immune? cần định từng producer; death dedup. Gate: Phase 04 Dynamite trap; Phase 05 Thunder/Lightning. Nguồn [Dynamite](../../reference/old-project/packages/game-core/src/variant/variants/DynamiteVariant.ts), [ThunderDragon](../../reference/old-project/packages/game-core/src/variant/variants/ThunderDragonVariant.ts), [consumer probe](../rebuild-audit/06_VARIANT_AUDIT.md).

### D-13 — Zombie infection/control

❓ Q: Bite King có hợp lệ? Walker chỉ move ô trống hay random/capture cả hai phe như Effect.md? Mutation lấy mọi Walker hay chỉ controller mình? Cap5Zombie đếm owner hay controller?

A: bite non-King, đứng-yên/không death/AP, tiêu main move; Walker player-controlled empty-only; Mutation chỉ Walker controller mình, conversion đổi owner; cap theo owned Zombies. B: bite King như effect thường, Mutation mọi Walker, còn lại A. C: Walker random theo Effect.md. ➡️ Khuyến nghị A vì không để control King thay capture victory; đây là quyết định mới cần duyệt, không suy restriction code-only thành confirmed.

Impact: control arbitration/action replacement/target set/RNG; gate: Phase 05 Zombie. Infection free rounds 1–3 và Pawn controller đã chốt. Nguồn [Zombie](../../reference/old-project/packages/game-core/src/variant/variants/ZombieVariant.ts), [Effect](../Effect.md), [Piece owner](../../reference/old-project/packages/game-core/src/pieces/Piece.ts).

### D-14 — Magician profiles và transformation/value

❓ Q: Misdirection đổi moveset hay đổi identity/type/capture AP ? Nếu original Pawn mang Rook profile tới back rank hoặc transform thật trong swap, restore profile thế nào? Partner death/cleanse trả profile và Shield/Stun ngay không? Fool1–5 hay đúng5 targets?

A: chỉ profile, value/promotion theo current real type; real transform hủy/cleanup incompatible swap; partner committed death cleanup+declared bonus; Fool1–5. B: đổi currentType nhưng value originalType; giữ legacy restore. C: swap cả type/value/promotability. ➡️ Khuyến nghị A, cần numeric duration/cost/range riêng từ row catalog được duyệt.

Impact: piece type vs movementProfile vs AP value, group restore, forced movement; gate: Phase 05 Magician/Cannibal. Nguồn [Magician](../../reference/old-project/packages/game-core/src/variant/variants/MagicianVariant.ts), [MovesetSwap](../../reference/old-project/packages/game-core/src/effect/handlers/MovesetSwapHandler.ts).

### D-15 — Phantom Ghost/Possession/stealth

❓ Q: Possession chỉ trong turn cast hay tới turn kế? Spirit Walk3 free uses hay3 round free Haunt? Ghost mới duration3 hay5? Stealth lộ khi adjacent/capture hay cả skill?

A: Possession current-turn window;3 free uses; Ghost mới3/cũ5; lộ adjacent/capture theo actor references, không dùng destination lookup. B: free3 round/Ghost all5. C: legacy D0 kéo sang turn kế. ➡️ Khuyến nghị A làm ứng viên ý đồ; Q-16 second-obstacle và skill non-King/Knight không mở lại, terrain/Bishop D-08.

Impact: window lifetime, canonical free counters, hidden projector và transformation type; gate: Phase 05 Phantom. Nguồn [Phantom](../../reference/old-project/packages/game-core/src/variant/variants/PhantomVariant.ts), [Possession](../../reference/old-project/packages/game-core/src/effect/handlers/PossessionHandler.ts).

### D-16 — Puppet pair/control removal

❓ Q: Main/Voodoo có target King theo restriction hiện hành không? Recast thay pair của mình hay tất cả? Capture redirected vào Voodoo phải qua defense/portal/trap? Hai chuỗi removal cần chốt riêng: Strings Stun → Bind2 +no-capture đến move đầu; Master control → Bind2 (legacy không thêm no-capture). Cleanse chạy hậu quả nào, competing controls ưu tiên sao?

A: pair owner-scoped, recast chỉ pair mình; redirect revalidate defense/occupancy; control instance exclusive, conflicting control reject; cleanup trả controller và hậu Bind chỉ reason approved. B: latest control wins; giữ mọi expiry hậu Bind như legacy. ➡️ Khuyến nghị A; Main King eligibility đối chiếu O-6 qua evidence catalog gián tiếp trước group approval.

Impact: group IDs, rejection atomic, effective owner/control schema, redirection stages; gate: Phase 05 Puppet. Control 7=2+5/cost dynamic/Pawn không cấm promote đã chốt. Nguồn [Puppet](../../reference/old-project/packages/game-core/src/variant/variants/PuppetVariant.ts), [pipeline](../../reference/old-project/packages/game-core/src/action/ActionPipeline.ts).

### D-19 — Space path và exit occupancy

❓ Q: Portal cắt path trước capture hay sau? Knight chỉ landing hay traversed path? Exit có King/ally thì reject, giữ tại entry hay trả origin? Pair single-use xóa ngay hay turn sau? Outworld capture ô mới hết cùng ultimate hay riêng10 round?

A: replace root movement trước capture, validate final path; jump chỉ landing; occupied protected King/ally làm reject/không teleport theo root/delayed missing-target policy; single-use consume ngay; Outworld cùng source ultimate deadline. B: entry succeeds rồi exit blocked giữ entry; pair xóa round sau. C: exit enemy non-King destroy như legacy, King block redirect. ➡️ Khuyến nghị A về safety; destruction vs capture ở exit non-King cần approval rõ, không hợp thức hóa destroy King.

Impact: path segments/hidden validation/atomic replacement/paired lifetime/delayed occupant state. Gate: Phase 05 Space. Q-08 buff10/no ally removal giữ nguyên. Nguồn [Space](../../reference/old-project/packages/game-core/src/variant/variants/SpaceVariant.ts), [catalog](../Variants.md).

## Summon và các nhóm còn lại

### D-17 — Graveyard, revive, exile và lifespan

❓ Q: Outbreak consume death records hay revive cùng quân lặp? New summon và revival có ID/incarnation mới? Summon expire có death/loss AP/passive không? Exile return ô có quân phải làm gì?

A: revive consume record, new incarnation giữ lineage; temporary expiry là explicit despawn không death reward mặc định; exile return occupied→chờ có hạn/reject theo skill riêng, không overwrite; no King destroy. B: revive reusable, expiry destroy có rewards, exit destroy non-King. ➡️ Khuyến nghị A làm baseline unit lifecycle, nhưng lifespan death reward là gameplay chưa duyệt.

Impact: death records/counters/discount/AP abuse, id/stale animation, delayed retry. Gate: Phase 05 Zombie/Phoenix/Earth/DragonSentinel/Lord/Cherubim. Nguồn [catalog](../Variants.md), [SummonDurationHandler](../../reference/old-project/packages/game-core/src/effect/handlers/SummonDurationHandler.ts), [risks](../rebuild-audit/04_REBUILD_RISKS.md).

### D-18 — Cherubim dual-cast và Totem

❓ Q: Cho 2 skill khác ID trước/sau Move bất kỳ hay chỉ trước Move mới dùng đủ 2? Ascend ready sau 5 round cần Ultimate hay tự transform? Totem cleanse 3×3 có gỡ own lifespan/ally buff/enemy Ascend? Ascension có promotion AP không?

A: 2 distinct slots, chỉ End/pass mới đóng slot chưa dùng; ready không auto-transform, ordinary promotion allowed; Totem lifetime không cleanseable, cleanse theo target categories; true promotion được +3 mỗi Pawn. B: giữ auto-end sau first skill+move và legacy cleanse/không AP. ➡️ Khuyến nghị A, numeric costs/timers phải approve cùng nhóm.

Impact: TurnPolicy thay scalar hasUsedSkill, partial slot End, unit timer/control fixtures. Gate: Phase 06 Cherubim. Nguồn [Cherubim](../../reference/old-project/packages/game-core/src/variant/variants/CherubimVariant.ts).

### D-22 — Duyệt numeric/passive và ngoại lệ của mọi nhóm còn lại

Mỗi row sau là câu hỏi chưa trả lời, không một blanket “giữ legacy”. A=phương án khuyến nghị, B=alternatives trong row; price/targets/duration của cả 3 skill tại [plugin coverage](VARIANT_PLUGIN_SPEC.md) vẫn cần approve. Gate: trước phase nhóm tương ứng; runtime/spec version chỉ freeze khi row đóng.

| Nhóm | ❓ Câu hỏi cụ thể / options và khuyến nghị | Tác động kiến trúc |
|---|---|---|
| Guardian | Holy Aura discount khi ≥8 death records có vĩnh viễn? Sanctuary apply enemy attacker bằng actor ID, Shield capture-only? A: đếm graveyard hiện tại sau consume, actor-ref Stun 1, D-04 defense; B: permanent unlock. Sanctuary 3/Stun 1 đã chốt | Graveyard query/cost quote/stand-still capture |
| Dynamite | Refund Detonation+2 chỉ caster khi command committed, no-target Bomb skill có hợp lệ, setup có bomb quân ban đầu không? A: chỉ caster, reject nếu không Bomb hữu ích, setup explicit approved; B: cho no-op cast/passive reward | Idempotent passive/resource abuse/setup |
| Nephalem | Mỗi 3 ally deaths +4 có tính summoned/sacrifice/King không? Berserk countdown 4 và Silence 3 block all giữ không? A: committed mortal unit deaths, no despawn, approve counters riêng; B: count graveyard như legacy | Death sequence vs graveyard enqueue, slot blocking |
| Requiem | Fate kích trên sacrifice/destruction hay capture-only? Berserk 2 và Fate 3/5 giữ? A: committed death mọi approved reason, Shield canceled không chain; B: before death như legacy | Death reaction graph/dedup/removal |
| Ruler | Law D4–L12, Bishop>Knight, root/derived capture/bite áp thế nào? Domain snapshot groups hay live summoned population, empty group lúc cast có kết thúc? A: full capture semantics có cùng rule, snapshot group explicit+reject empty; B: legacy root only | Modifier validation/region/group counters |
| Kaze | Sigil hoàn khi cleanse không; Repel return occupied xử lý sao, Storm gồm cast tick không? A: source group cleanup hoàn đúng 1, no overwrite/collision explicit, boundary source tương lai đầu tiên; B: legacy trigger-only refund/cast tick | Group relocation/budget/return collision |
| Predator | Capture Pawn passive +2, Evolution 2/3/4/5 và recast reset không, camo reveal mỗi lần cast? A: currentType Pawn, recast resets progress, camo source window/ref reset; B: originalType và giữ old progress | Transformation/counters/hidden view |
| Phoenix | Cho once Rebirth thay capture King terminal không? Return enemy initial units/remove summons silently? A: approve exception riêng nếu muốn, explicit reset/rebuild state không silent overwrite, skills disabled afterward; B: no Rebirth interception. Solar Flare ≥2 Bishop/Stun 2/Flame 4, Supernova3 round và revive costs phải duyệt | Terminal interceptor/full reset/IDs/graveyard/replay |
| Verdant | Shelter destroy chỉ loss AP theo Q-14; Gaze cleanse trừ 2 chưa move không? Counter 100/Wrath 0/skill tax +1/transfer ceil(actualCost/2) giữ? A: no cleanse penalty mặc định, total actualCost, counter source-stable; B: legacy penalty/partial costs | Economy/cost passives/metadata |
| Angel | Ally death +2 tính sacrifice/summon expiry? Judgment window5 round hay legacy 10 ply, mark enemy capture including stand-still? A: committed approved deaths, source 5 round/actor ID, King never destroy; B: 10 round/window khác | Reward reasons/custom windows |
| Devil | Eye range threat D-08; Toll 6 round hay 12 round, fee Pawn/King 0, N/B 2, R 3, Q 4 giữ? Berserk 4 giữ? A: source 6 round (legacy 12 ply candidate), quote surcharge all main types; B: 12 round | Cost before capture/bite/sacrifice loop |
| Cannibal | Ally captures cho dual AP? Profile stolen survives ultimate expiry hay restore snapshot? A: explicit ally-capture reward approved, profile ledger/current layer restore không mất committed captures; B: legacy snapshot restore | Profile/value/ownership/death |
| Wizard | Death Counter +1 mỗi threatened turn hay +attacker count, reset 6 round; escalation +2 mỗi 2 casts; annihilation tiers giữ? A: one increment per source boundary, committed death reward only; B: per attacker as Effect.md | Threat query/progress/AP/cancel |
| Earth | Mountain 5 round, skill 2 cost chốt đầu turn hay live quote; núi nguồn spawn ngay hay end; exile N mountains return collision? A: live quote/same-transaction spawn explicit, exile no death/no rewards, D-17 return; B: legacy frozen cost/immediate | Special units/plan geometry/occupancy |
| Dragon Sentinel | Shield every 2 round nearest Manhattan ties row/col; Escape capture có death AP rồi revive hay cancel; Roar any ally death giảm charge hay sacrifice only? A: exact stable nearest, Escape explicit death+return D-17, sacrifice-only acceleration; B: legacy any death | Death/revive records/channel cancellation |
| Lord | Overwhelm abs(count diff) mỗi 5 round kể cả ít quân? Vanguard enemy-only hay first ally bị destroy, reinforce 0 targets được không, Silence only tier1/2? A: reward only advantage, Vanguard enemy-only, reject 0, tier policy explicit; B: legacy abs/allyhit/no-op | Count special units/targets/no-op AP |
| Pirate | Debt−10/no casting khi âm; Bet +8; Sailing cleanse không fire theo P00-11; Broadside blast nếu capture bị Shield cancel? A: totalCost debt check, no blast khi canceled, delayed cause no main slot; B: legacy base clamp/simulated blast | AP floor/cost modifiers/commit-dependent AoE |
| Lightning | Trap reward 2/consume với Aegis/King; Terrain/Raigeki tiers/cost eligibility? A: trap consume on entry, reward per producer independent Stun blocked; B: consume only debuff applied | Shared consumer/producer payload/D-07 |

Nguồn mỗi row:definition thật trong [plugin coverage](VARIANT_PLUGIN_SPEC.md), [Variants](../Variants.md), [Effect](../Effect.md), [06 audit](../rebuild-audit/06_VARIANT_AUDIT.md). Mọi field catalog không được nêu là đã chốt vẫn cần group checklist phê duyệt; không tuyên bố các recommendations trên là ý đồ lịch sử.

## Product, network và frontend choices

### D-20 — Vertical slice và completeness target

❓ Q: Slice đầu Guardian+Dynamite hay Guardian+ThunderDragon/Turtle? Public release cần all 27 approved hay subset enabled?

A: Guardian+Dynamite trước, high-risk Turtle/Time/Space/Puppet tiếp; release theo enabled-approved manifest với 27 là mục tiêu hoàn thiện. B: Turtle/Time ngay slice đầu. C: all 27 trước mọi multiplayer 3D demo. ➡️ Khuyến nghị A để kiểm buff/death chain/hidden trap và architecture trước mở rộng. Impact: group gates/feature flags/test matrix; gate: Phase 04/07. Không giảm mục tiêu chỉ vì thiếu approval, unapproved variant giữ disabled.

### D-21 — Datastore/topology/budgets

❓ Q: Managed Postgres (có thể Supabase DB) hay provider relational khác? Chốt một backend authority trước hay HA multi-instance từ release đầu? Backup/restore RPO/RTO và cost budget?

A: managed relational DB +single process, atomic CAS/log/snapshot; validate restart/backup trước release; scale khi có nhu cầu. B: HA active/passive multi-instance+fencing từ đầu. ➡️ Khuyến nghị A, provider/cost/RPO/RTO cần user lựa chọn trước cấu hình. Impact: persistence adapter/lease/ops; gate: Phase 03 persist real datastore. Auth provider đã chốt không hỏi lại; phase này không tạo DB.

### D-23 — Matchmaking/setup/reveal

❓ Q: Room-code trước hay random matchmaking ngay slice? Private variants lock trước matchmaking, reveal lúc initialization như GDD? Setup timer và setup choices bị opponent nhìn không?

A: room-code first, private locked choice/reveal at initialization; setup riêng có clock/timeout contract trước start clocks. B: public draft hoặc random matchmaking bắt buộc. ➡️ Khuyến nghị A. Impact: lobby state machine/private DTO/setup events, gate: Phase 03/04. Nguồn [GDD match flow](../GDD.md), Q-01 giữ room-code.

### D-24 — Session, deadline races và pending commands

❓ Q: Hai tabs cùng account/seat ai được quyền gửi? Command tới đúng clock deadline, resume budget0 debounce, duplicate receipts giữ bao lâu?

A: một active seat connection, explicit takeover, deadline equality timeout wins theo server receive time; debounce khoảng 250 ms kỹ thuật được duyệt, receipts trong cả active +resume window; pending command query receipt trước resend. B: multi-tab read/write, server queue-order only. ➡️ Khuyến nghị A nhưng timing/debounce cần chốt vì ảnh hưởng outcome. Impact: session/command arbiter/idempotency/persistence; gate: Phase 03.

### D-25 — Legal hints và hidden oracle

❓ Q: Nếu hidden effect làm move thực sự không hợp lệ, server có highlight loại ô đó (lộ hint) hay highlight public preview rồi submit resolve/reveal?

A: public-knowledge preview, full authoritative validation với coarse rejection/reveal theo effect spec. B: precise full legality chấp nhận inference leakage. ➡️ Khuyến nghị A để phù hợp Q-02, cần gameplay policy reveal và invalid-attempt cost/time rõ. Impact: query contexts/projection/input UX; gate: Phase 04 hidden-trap slice. Thời gian lượt vẫn chạy cho rejected command; AP không mất.

### D-26 — Resume abandoned

❓ Q: Q-25 cho `abandoned` không win/draw và Q-22 cho resume 24h: reopen cùng match terminal result hay tạo continuation match? Cả hai phải đồng ý không?

A: match suspension record phân biệt finalized abandonment, cùng match tạo explicit ResumeAbandoned input khi hai bên đồng ý trong 24h, archive outcome cũ; B: continuation match mới liên kết lineage. ➡️ Khuyến nghị B nếu giữ terminal immutable invariant; user chọn để hòa giải retention/resume với terminal idempotence. Impact: aggregate lifecycle/identity/replay/privacy; gate: Phase 03/07 abandoned recovery. Không tự đổi Q-25 thành draw.

### D-27 — Artwork/model rights và style

❓ Q: Artwork có quyền dùng public release không; giữ Dark Arcana Nouveau cho board/material/UI, models commissioning hay procedural stylized tự tạo sau?

A: prototype procedural geometry; final assets có provenance/license manifest, commissioning/quyền rõ; B: existing assets sau kiểm quyền. ➡️ Khuyến nghị A cho slice; artwork quyền vẫn UNKNOWN, không tự dùng thiếu license. Impact: asset pipeline/download budgets/release; gate: Phase 04 prototype/Phase 07 final. Không tạo3D assets ởPhase 00.

### D-28 — Performance target devices

❓ Q: Laptop 1366×768/WebGL2,60 fps active và low preset 30 fps có đủ slice, hay mobile 60 fps là gate ngay? GPU/browser/device chuẩn đo là gì?

A: desktop/laptop first, evergreen, choose reference integrated GPU rồi benchmark; mobile tier sau. B: mobile touch/60 fps ngay. ➡️ Khuyến nghị A cho 225 ô. Impact: camera/UI/VFX/LOD/DPR/model budgets; gate: Phase 04 benchmark/Phase 07 release. [Frontend spec](FRONTEND_3D_ARCHITECTURE.md) có số mục tiêu proposed, chưa benchmark.

## Cổng phê duyệt và cập nhật

Phase 01: chủ dự án duyệt architecture/roadmap và ra lệnh bắt đầu; core baseline/timing/ownership/turn/threefold/common lifecycle/AP decay/King reward đã chốt P00-01…12. Phase 02: đóng D-04/05/06/08 cho effect definitions được enable, không cần duyệt all 27. Phase 03: đóng network/provider/session/resume choices liên quan. Phase 04 trở đi: approved group checklist +slice/product/device decisions. Mọi answer mới phải cập nhật registry này trước sửa expected/code; unknown dependent decisions giữ pending, không dùng thời gian chờ như sự đồng ý.

Không cần ADR riêng khi chỉ có proposed alternatives chưa chốt. Khi chọn trade-off khó đảo và khó hiểu thiếu context, viết ADR ngắn được liên kết từ spec; glossary [CONTEXT](../../CONTEXT.md) chỉ giữ domain terms, không thành scratch pad kỹ thuật.
