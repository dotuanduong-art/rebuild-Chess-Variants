# EFFECT_SYSTEM_SPEC — generic effect engine

## Current implementation authorization — 02B-5C

Owner authorizes only experimental Guardian Holy Shield under the six signed rules below. Real root execution must validate actor/profile and versioned one-piece intent, controlled ordinary-original target (King allowed), then debit fixed4 and one skill slot once, applying trusted N2/null-source Shield. Cast allegiance is not continuing eligibility; eligible ordinary-original either-controller relocation is supported. Natural expiry/bearer death/terminal cleanup only; explicit removal must fail closed. Existing consumer/source/refresh/projector/defense paths are reused. No other Guardian ability or producer is enabled by this authorization. Implementation/versions/verification and actual enablement are recorded at acceptance in PHASE_02B_5C_REPORT.

**5C implementation contracts:** engine0.6.0/state1.1.0 require immutable `playerProfiles` captured from trusted ruleset selection and checked at root/restore. Optional piece `origin` has no inferred default; the ordinary-original tag is authoritative setup data. Skill intent `{kind:'piece-target-v1',pieceId}` admits no source/cost/N or executable operations. A profile-authorized pure planner returns `SkillPlan`; root alone debits/consumes/enqueues. Definition opt-ins `eligibility.pieceOrigin` validate imported/relocated bearers and `removalPermissions` limit explicit removal independently of cleanup consequences. Older synthetic definitions without these fields retain prior behavior under the new engine pin. Repetition preserves profile/provenance distinctions; effect record/replay envelope v1 stay pinned to engine/state versions. No old-archive migration. Complete implementation/evidence: [5C report](PHASE_02B_5C_REPORT.md).

## Approved profile — 02B-5B Holy Shield null-caster profile

Owner approved the limited experimental Holy Shield-only Guardian profile: exact one controlled ordinary target, King eligible; no special/summoned units. Eligible generic relocation may transfer to ordinary pieces of either controller including King, preserving source/ID/payload/deadline; control changes do not invalidate cast allegiance. N2/source-end/no cast tick, stable same-source refresh/reset2, independent cross-source Shields. Fixed4 AP; no Holy Aura/graveyard/alternate cost. Required original sourcePlayer, `sourceVariant=guardian`, `sourceSkill=guardian.holy_shield`, `sourcePiece=null`, `sourceIncarnation=null`; no caster/liveness/lineage. Only due expiry, bearer-death and terminal cleanup enabled; no cleanse/dispel/source-invalidated/custom removal path. Decisions recorded in OPEN_DECISIONS 5B table.

**5B implementation authority is narrower than gameplay approval:** only definition-owned, versioned null-source validation and semantic repetition proof at existing registry/root/codec/replay seams. Existing null-ref projection can be retained if proven; exact matching/attribution/clock remain unchanged. Unsupported live/dead/incarnation/linked source graphs cannot use this declaration. No Holy Shield planner/registration/AP debit/enablement or 5C; producer status remains NOT_READY/ENABLED=false. Historical generic Shield/other producer UNKNOWN fields below do not override these six Holy Shield-only approvals.

Ngày 2026-10-13. Confirmed gameplay được chỉ rõ; các seams dưới đây là thiết kế ĐỀ XUẤT. Nguồn [Effect legacy](../Effect.md), [catalog](../Variants.md), [inventory](../rebuild-audit/03_GAMEPLAY_SYSTEM_INVENTORY.md), [risks](../rebuild-audit/04_REBUILD_RISKS.md), [06 decisions](../audit/06-decisions.md).

## 1. Definition và instance

EffectDefinition mô tả typeId/version, payload schema, allowed target kinds, eligibility, category buff/debuff/neutral, visibility policy, duration/clock, stacking key/mode, rule modifiers, triggers, removal policy và relocation policy. Definitions có declarative data cho giá trị/targets/timing và pure handlers khi cần toán hình học hoặc quan hệ phức tạp; không viết một DSL tùy ý hay eval. “Data-driven” không có nghĩa không có code handler.

EffectInstance giữ instanceId, definitionVersion, targetRef, sourcePlayer, sourceVariant/skill/piece refs, appliedSequence, source timing anchor, expiresAt hoặc permanent, typed payload, group/link IDs. `sourcePlayer` là nguồn tạo, không phải controller của quân đang mang. Piece/cell/player target là discriminated union. Quân chết thì remove attachments có reason target_destroyed; cell/player effects không tự xóa nếu caster chết trừ spec riêng.

CONFIRMED Q-18/O-6: không global King effect immunity. Mọi definition/skill phải ghi eligibility của King rõ; restriction skill riêng không đồng nghĩa global rule. O-6b cấm destruction King tại reducer cuối, kể cả handler hoặc plugin yêu cầu.

## 2. Lifecycle và thời gian

Trình tự đề xuất apply → active → due boundary/trigger → remove → cleanup. Apply không luôn phát event nếu bị ignore/rejected; fact phải đúng outcome. `EffectApplied`, `EffectRefreshed`, `EffectStacked`, `EffectRejected`, `EffectRemoved` tách riêng. Removal fact luôn có reason; “expired” chỉ hết tự nhiên, không bao gồm cleanse/replacement/transfer/death.

CONFIRMED P00-02: duration N round anchor theo lượt source ở start/end đã khai báo; không tick lúc cast. Target/controller đổi không chuyển anchor. Clock game freeze dừng tiến logical boundaries. Swapping giữ nguồn và expiry theo P00-03. Ví dụ White áp end-1 trong ply White: bỏ end cast, hết end White kế; Black áp start-2: hết start Black sau hai lần quay lại. Reconnect không giảm duration theo số giây offline.

| Lifetime kind đề xuất | Ý nghĩa |
|---|---|
| rounds | expiresAt logical `{sourceSide, sourceTurnOrdinal, start/end}` và N |
| current-turn-window | Kết thúc boundary turn hiện tại đã khai báo; không dùng duration0 |
| permanent | Tồn tại tới explicit removal |
| event-count / progress | Đếm event/boundary cụ thể; không biến legacy counter thành round khi chưa duyệt |
| delayed-action | Hẹn operation logic riêng, không giả làm removable buff timer |

Expiry boundary tạo due list ổn định trước processing; thay đổi effect trong handler không khiến loop tick cùng instance lần hai. Final due/cleanup ordering với turn hooks là D-04/D-06. UI remaining không là input luật.

## 3. Stacking, refresh và removal

Definition phải ghi stacking key: type+target, type+source+target hoặc explicit group; không lấy “same type” làm mặc định cho mọi effect. Mode refresh/stack/ignore phải nói metadata merge/replace, source attribution và deadline. Stack cần số lượng/intensity cap nếu có. D-05/D-06 chưa duyệt các outcome per-effect, nhưng engine có contract đầy đủ ngay từ đầu.

| Outcome đề xuất | Hành vi |
|---|---|
| apply | Tạo instance hợp lệ mới, attach, emit Applied |
| refresh | Update theo policy rõ, emit Refreshed; không giữ metadata cũ do thiếu merge rule |
| stack | Update intensity/instances theo schema, emit Stacked |
| ignore | Không đổi state; không chạy OnApply như thể apply thành công |
| blocked | Aegis/eligibility ngăn; structured outcome; skill có cost/consumption hay reject tùy spec |

Removal reasons: expired, cleansed, dispelled, consumed, replaced, target_destroyed, source_invalidated, link_broken, match_terminal. CONFIRMED P00-11: cleanse/dispel chỉ cleanup mặc định; chỉ exception riêng đã duyệt mới chạy hậu quả gameplay. Swap là relocation, không OnExpire/OnApply/reward. Timer/sailing/channel/swap return/Bind-after-control phải ghi trigger reasons riêng; D-06 còn các ngoại lệ per-effect.

Linked effects có groupId/source namespace và typed references. Khi một thành viên chết/cleanse/transforms, group policy quyết unlink/restore/cascade; không tìm partner bằng “effect đầu tiên cùng type trên toàn board”. Group cleanup idempotent; giữ payload ban đầu nếu cần undo profile; không clone shallow rồi cùng chia metadata.

## 4. Water Turtle — hoán đổi generic đã xác nhận

Technical slice 02A-3 được chủ dự án cho phép ngày 2026-10-15: trusted single relocation có typed destination; whole-set swap chỉ hai distinct live piece targets, hỗ trợ unequal/empty sets. Preflight toàn assignment cuối trước facts/commit; không merge/refresh theo stacking khi chuyển. Payload và tất cả metadata khác giữ nguyên. `prohibited-with-reason` reject, constraints/group-aware policy phải có pure binding ngoài state và nhận toàn final assignment.

Optional typed `references` phân biệt effect instance, live/historical piece và group+owner qua declared roles; không suy partner từ type. Definition có `links` validation/normalization IDs khi mang references hoặc muốn group-aware relocation. Linked integrity/normalization dùng explicit frozen bundle bindings; chưa có binding thì không execute. Group matching tags 02A-2 vẫn tương thích, nhưng không tự được phép relocation nếu chưa khai báo group contract. Normalizer cung cấp semantic graph data cho definition projector; graph data luôn có trong repetition, không bị custom projection bỏ qua. Không claim universal graph canonicalization hoặc concrete group reactions.

CONFIRMED P00-03: skill hoán đổi toàn bộ effect sets giữa hai quân. Giữ source ownership, instance identity và hạn hết hiện tại. Invalid một phần → reject toàn thao tác, không trừ AP/skill slot/ID/RNG. Không hardcode stun/shield/blessing/electron/ghost; mọi current/future definition phải khai báo relocation policy. Scope đã chốt là hai piece targets, không tự mở rộng player/cell swapping.

Atomic algorithm contract đề xuất:

1. Kiểm tra skill target restrictions/AP, hai piece khác nhau đang sống, snapshot cả hai bộ attachment.
2. Tính final assignment hoàn chỉnh; mỗi effect nhận target mới, nguồn/deadline giữ. Validate eligibility/Aegis và các rule/group dependencies theo approved policy.
3. Linked effect/control/timer chưa có relocation policy hợp lệ làm reject cả skill; không bỏ riêng effect khó để skill “thành công”.
4. Group-aware relocation plan cập nhật references/indexes đồng thời; không mutate payload tùy tiện, không chạy expiry/passive reward.
5. Swap replacement sets đồng thời, không sequential remove-apply theo stacking làm mất effect. Derived indexes như control/moveset cập nhật bởi reducer từ attachments cuối.
6. Emit EffectsSwapped với source/target IDs và changed instance IDs; role projection chỉ lộ attachment được quyền xem. Animation lấy projected diff.

`relocationPolicy`: retargetable, group-aware hoặc prohibited-with-reason. Definition mới thiếu policy không được enable production ruleset. Generic support nghĩa engine hỗ trợ contract và báo lỗi rõ; không cam kết mọi effect phải chuyển được qua target bị cấm. D-10 còn King eligibility/ally-enemy target phạm vi, empty-set có cost, Aegis khi effect cũ được đổi target; P00-03 không tự xác nhận các target restrictions legacy.

Nguồn đối lập: [TurtleVariant](../../reference/old-project/packages/game-core/src/variant/variants/TurtleVariant.ts), `TRANSFERABLE_EFFECTS`/Transference legacy one-way và re-source đã DEPRECATED.

## 5. Consumer và rule modifiers

Consumer là definition chung theo type, producer là skill/Variant tạo instance. Thunder Trap consumer tồn tại trong shared effect bundle khi một skill dùng trap; không phụ thuộc đối thủ chọn Lightning. Metadata chỉ rõ trap producer, payload Stun và AP reward; không ngầm thưởng Lightning passive cho Thunder Dragon. Trigger entry move/capture/push/teleport/rewind cần D-12.

Movement modifiers là pure queries theo instance: override profile, add destinations, filter path, restrict capture, replace action. Final hard constraints được áp sau add; effect không tái thêm move ngoài board hoặc xuyên Flame chỉ vì priority muộn. Ghost không đồng nghĩa bỏ mọi blocker; Q-16 giữ obstacle đầu và bắt obstacle thứ hai, các terrain/Bishop interactions D-08/D-15.

Control là derived controller từ approved arbitration; owner đổi chỉ bởi conversion operation. Pawn hướng/promote dựa controller (Q-17); loss AP owner, action AP controller (P00-05). D-13/D-16 chốt multiple-control priority, cleanse hậu control và linked Main/Voodoo.

## 6. Inventory và mức xác nhận

| Family/effect | Bằng chứng legacy / luật đích | Chưa duyệt |
|---|---|---|
| Stun/Silence | [Effect](../Effect.md), [handlers](../../reference/old-project/packages/game-core/src/effect/handlers); King không miễn nhiễm chung | Restrict main/forced moves; Silence tiers/stack merge, D-06 |
| Shield/Aegis/Blessing | Shield capture-only/Blessing cleanse-or-Shield legacy. Aegis CONFLICTING: Effect.md chỉ debuff, pipeline blocks opposing effects và enemy skill targets rộng hơn | Shield vs redirect/Fate, approved Aegis scope, cleanse/removal, D-04/D-06 |
| Bomb/Landmine | Bomb death 3×3 chain, Landmine chuyển Bomb | Atomic FIFO death được P00-08 duyệt; radius/reward/trap King policy cần D-12/D-22 |
| Fate / position/moveset swaps | Linked pairs và partner death cleanup | P00-08 chỉ reaction committed death; death reasons, restore/cleanse, owner/group D-04/D-14/D-22 |
| Zombie/Walker/Puppet | Control/conversion, root bite đứng yên | Control stacking/King bite/revive consumption D-13/D-16/D-17 |
| Ghost/stealth/Possession | Q-16 second obstacle confirmed; metadata stealth/expiry legacy | Profile/terrain, capture type/window/free Haunt D-15 |
| Berserk/Death Counter/Planted/Ascend | Progress/capture countdown, transformation | Counting threat, identity value, ready vs automatic transform D-08/D-14/D-18/D-22 |
| Bind/Soulless/Repel | Legacy moving window/root-return/traps | Scope/check forced moves/return collision D-06/D-12 |
| Electron vs electric/Fang/Trap | Hai type legacy không được tự coi cùng nghĩa | Stun duration/trigger/reward, D-12 |
| Flame/Outworld/Dimension | Cell blocker/ownership/portal links | Path interception, jump, exit collision, expiry sharing D-08/D-19 |
| Mountain/Totem/reservation | Special units legacy, không chỉ cell buff | Unit identity/graveyard/expiry/cleanse D-17/D-18/D-22 |
| Player/counter/timers khác | Terrain, Judgment, Toll, camouflage, Time Freeze, Sailing, Roar | Khai báo per-source windows và removal riêng; xem plugin decision coverage |

Full runtime effect registry là evidence tại [EffectRegistry](../../reference/old-project/packages/game-core/src/effect/EffectRegistry.ts), [Effect](../../reference/old-project/packages/game-core/src/effect/Effect.ts); không copy schema `metadata:any`. Aegis scope khác description được xác minh trong [ActionPipeline](../../reference/old-project/packages/game-core/src/action/ActionPipeline.ts), APPLY_EFFECT (khoảng dòng991) và SkillValidator (khoảng1902). Mỗi enabled definition phải có typed payload, lifecycle, visibility, stacking, relocation, interaction fixtures; type chỉ legacy không enable trước group approval.

## 7. Delayed actions, summon lifecycle và trigger queue

### Generic integration slice 02A-4

Synthetic opt-in observers dùng declaration event/stage/handlerId trong definition và frozen bundle bindings có stable order; mỗi event-instance-declaration dispatch tối đa một lần. Chỉ committed facts, source boundary và removal facts được observe; proposed/pre-death effect hooks vẫn unsupported. Removal reason phân biệt natural expiry với cleanup; synthetic observer không phê duyệt concrete removal rewards. Listener snapshot lấy tại fact, retired instance chỉ tham gia own removal fact, context giữ source và target owner/controller. Plans vào root FIFO; terminal không dispatch reactions.

Delayed records dùng explicit `delayed-action-v1` envelope bên trong opaque state slot hiện hữu, exact definition version, scheduled-only persisted status, snapshot source/controller và cause/transaction IDs. Trusted schedule chỉ nhận future source boundary; cancel reasons và missing-target cancel/reject là explicit per-definition policies. Synthetic executor trả plans qua root FIFO; consume trước dispatch, không wall clock. Boundary snapshot xếp effect expiry trước delayed firing trước derived boundary observers trong synthetic slice; concrete ordering vẫn pending D-04/D-06. Unknown bindings/versions/policies reject. Repetition giữ normalized target/source/payload, relative deadline và policy identity, bỏ allocation/cause IDs. Existing state format không đổi; old opaque delayed records vẫn codec-only và unsupported trong runtime.

Repetition phải giữ relative listener/stack matching order và relative firing order trong cùng due boundary; không sort các operations có outcome phụ thuộc thứ tự thành multiset. Engine version tăng `0.1.0` → `0.2.0` để pin thay đổi execution/semantic keys; state schema `1.0.0` và replay envelope v1 giữ nguyên. Codec/replay reject old engine, không migrate history/archives ngầm; cần runtime cũ khi đọc archives cũ. Terminal đóng băng pending delayed records và ngừng execution, không tự suy cancellation reward/policy.

Delayed action record có dueBoundary, source/controller snapshot hoặc query-at-fire policy, target refs, causeId, missing-target policy và cancellationReasons. Firing qua cùng reducer/transaction, không setTimeout từ plugin. Source death, target death, cleanse, rewind, server restart không tự suy hủy/trigger; spec của skill quyết. Deadline hạ tầng/clock nằm backend, logical delayed gameplay nằm core.

Summon lifespan không phải cleanseable effect theo mặc định đề xuất; effect buff bị hoán đổi không làm tuổi thọ unit chuyển sang quân khác. Nếu một definition timer thực sự transferable phải có group-aware contract và được duyệt. Revival/exile dùng unit lifecycle record riêng. Khi event đồng thời due, process ổn định, consume record đúng một lần, rollback giữ record nếu root fail.

## 8. Acceptance

### Generic runtime slice 02A-2

Scope đã được chủ dự án cho phép ngày 2026-10-15: neutral synthetic policies, không concrete gameplay defaults. Contracts bổ sung independent/replace và refresh deadline reset/extend; payload merge chỉ qua pure named binding. Extend rounds lưu `extensionRounds` riêng, giữ cast anchor; reset lấy anchor hiện tại của source được policy chọn. Source replacement không ngầm giữ deadline của source cũ; preserve deadline khác source bị reject nếu không thể giữ invariant. Source preservation khi refresh không đồng nghĩa cấm explicit source replacement; relocation vẫn giữ nguồn theo P00-03.

Supported slice: permanent/rounds/current-turn-window end, cleanup-only reasons, stack instances có cap rõ hoặc explicit unbounded. Event-count/progress, start-window, intensity, declared source/deadline policies, removal reactions, triggers và unknown capabilities chưa được execute. Due list snapshot ổn định tại boundary, expiry intents đứng trước intents sinh từ boundary observers; concrete interaction ordering vẫn cần D-04/D-06. Cleanup sau death giữ snapshot attachment hợp lệ trước death, không đòi target sống. Generic repetition chỉ normalize unlinked targets/relative deadlines; group semantics cần explicit bundle projection, không coi đây là full graph support. Events chỉ internal; live role projection ở phase sau.

Kiểm tra apply/refresh/stack/ignore đúng event và attribution; `N=1/2/3`, cast từ hai phe, source start/end, swap/control không đổi deadline; tất cả removal reasons; Aegis/Shield/King eligibility; swap whole set transactional và definition mới không sửa core; group links mirror không lẫn; consumer độc lập; delayed firing exactly-once sau snapshot restore; hidden effects không leak qua logs/views/events. Xem [test strategy](TEST_STRATEGY.md), [open decisions](OPEN_DECISIONS.md).

## 8. Concrete Effect Batch A — Approved Rules

**Current overlay 02B-1:** source identity và Stun/Shield categories đã được supplementary approval; xem §9. Những remaining-unknown bullets tương ứng trong snapshot rules-freeze §8 không còn current blockers. Generic executable contracts chỉ đổi trong bounded implementation 02B-1, không Shield/Bomb adapter.

2026-10-15, owner **APPROVED BATCH A RULES FREEZE**. Authority: prompt mới → prior CONFIRMED → approved rebuild specs → legacy evidence. Đây là approved gameplay subset/documentation milestone, **không đổi generic architecture/runtime contracts đang hoạt động**, không enable definitions hoặc authorize 02B-1. [Approved manifest](PHASE_02B_BATCH_A_APPROVED_MANIFEST.md) ghi field status; [decision registry](OPEN_DECISIONS.md) ghi 10 named subsets +6 metadata groups. Các UNKNOWN trong inventory/proposals 02B-0 được thay thế **chỉ** khi section này duyệt field đó.

### Confirmed gameplay semantics — phạm vi Batch A

- **Stun — D-05.BATCH-A.STUN/D-06.STUN/D-08.STUN:** same family/type +same source identity +same target refresh existing, reset new approved N/new anchor, giữ stable instance ID/source. Cross-source instances độc lập; ≥1 active valid instance thì Stun; một instance/matching key, không overwrite source khác. Cấm player main Move/Capture bằng bearer; không tự cấm forced displacement/teleport/reposition hợp lệ, skill targeting hoặc mọi acting-piece skill; không đổi owner/controller/AP. Bearer không góp capture threat; authoritative queries/consumers phải nhất quán, không suy rộng Ghost/Bind/terrain.
- **Shield — D-05.BATCH-A.SHIELD/D-06.SHIELD/D-04.SHIELD:** same-source/same-target refresh/reset new approved N, giữ ID; different-source instances độc lập, không merge clocks. Boolean time-based capture protection, không charges hoặc block-attempt lifetime debit; không chặn destruction/AoE/sacrifice do Shield. Blocked capture reject atomic: giữ main slot/AP/RNG/Shield lifetime, no committed capture/death/loss/capture reward/Bomb reaction/King terminal. **Không accepted blocked-capture mutation outcome**; full defense priority vẫn chưa approved.
- **Bomb — D-12.BOMB/D-05.BATCH-A.BOMB/D-12.BOMB.ATTRIBUTION/D-06.BOMB.CATEGORY:** `effect.bomb.charge` BUFF và `effect.bomb.mine` DEBUFF, family `bomb`, shared pure blast consumer, independent versioned schemas. Tối đa một active Bomb family/target qua hai definitions và mọi sources; duplicate ignore, không refresh/replace, preserve original source/payload/lifetime, không thêm explosion instances.
- Bomb trigger **chỉ bearer committed capture/destruction death**; không candidate/canceled death hoặc cleanse/dispel/replace/expiry; không tự thêm sacrifice/despawn/exile. Blast center vị trí thật tại committed death; 3×3 clipped board, mọi non-King hai phe, gồm capturer nếu ở vùng lúc blast resolution. Original Bomb source nhận blast attribution, không root actor/capturer; swap/relocate không đổi nguồn. FIFO/death dedup/King terminal stop theo P00-08; Bomb destruction không capture AP, loss AP owner theo P00-05, không producer reward mới tự suy.
- **Batch metadata:** source-player ownership/attribution; Stun/Shield source-end theo approved producer N, không tick boundary cast; Bomb permanent. Cả bốn **piece attachments public**, kể cả mine sau attach, và **unlinked**. Không suy hidden cell Landmine đã reveal.
- **Relocation:** Batch A piece-attached effects cho generic relocation/whole-set piece swap giữa eligible targets; giữ source/ID/payload/deadline, no onApply/onExpire; concrete destination revalidated, invalid → whole swap reject. Không approve Turtle skill targets/cost/empty-set gameplay.
- **Eligibility/removal boundaries:** không global King immunity; attachment/producer King restrictions phải được approved subset trước enable. Bomb destruction không phá King. P00-11 cleanse/dispel cleanup-only giữ nguyên; removal permissions/exceptions còn UNKNOWN, không đổi cleanup thành reward.

### Historical Batch A adapter requirements — current Stun status ở §9

1. E-ACTION: Stun-aware legal main-action query, submit validation, forced End/skip và capture-threat consumers dùng cùng approved rules; không deadlock vì base generator vẫn thấy nước đi Stun.
2. E-DURATION/E-SOURCE: validate approved producer N/source-end reset, stable refresh ID và exact matching source identity. Current fixed definition lifetime/player-only matching không tự đủ; không giấu N trong payload rồi coi scheduler đã đọc.
3. E-DEFENSE: bind isolated Shield vào effect-aware capture cancellation; existing atomic reject reusable, không mở consuming-outcome engine cho Batch A. Không lén enable redirect/Fate priorities.
4. E-FAMILY: Bomb uniqueness cross-definition/cross-source trả approved **ignore**, không exception/eligibility rejection hoặc independent leaf stacking làm biến outcome.
5. E-DEATH/E-TRIGGER/E-ATTRIBUTION: frozen committed death position +retired attachment/source/cause/reason data, bounded concrete supported consumer, source-bearing derived plans trong root FIFO. Không lấy application position hoặc root actor để thay death center/original source; không mạo danh synthetic-v1 handler để bypass guard.
6. Validate payload/schema, source/target/King/relocation, semantic repetition/time/meaningful order, version pin/replay, mirror/dedup/fault rollback trước enable. Đây là technical work cần implementation authorization riêng; milestone này không thay versions/code/tests.

### Remaining unknowns — không tự điền

- Resolved bởi 02B-1 supplement §9: exact structured source identity cho Stun/Shield; không còn UNKNOWN/player-only alternative.
- Resolved bởi 02B-1 supplement §9: Stun DEBUFF/Shield BUFF, không thay categories effect khác.
- Producer-specific N/targets/King/acting-piece restrictions, required source refs, special-unit eligibility. Prior O-8 Sanctuary Stun1/O-9 Chains3 không approve full producers; Shield legacy2/5 chưa approved. Exact payload/schema pin là technical task; gameplay-bearing non-lifetime refresh payload policy chưa được chọn.
- Concrete removal permissions/exceptions/source invalidation; không áp cleanup-only thành blanket permission mọi reason.

### Future interaction gates — deferred, parents vẫn OPEN

Shield×redirect/Fate/Phoenix/Aegis/full D-04; Silence/other D-05; Aegis/Blessing/producer removal chains D-06; Ghost/Bind/terrain/other D-08; Turtle D-10; Landmine entry/consume/reveal/Thunder D-12/D-25; full Guardian/Dynamite costs/passives/setup D-22. Không yêu cầu đóng all27 Variants trước xây reusable Batch A foundation; approval subset không tự authorize implementation hoặc live enablement. Xem [implementation plan](PHASE_02B_IMPLEMENTATION_PLAN.md).

## 9. Phase 02B-1 — approved Stun Foundation

Owner authorizes implementation riêng Stun Foundation. Source matching mới là **explicit opt-in**, không đổi legacy synthetic type+sourcePlayer+target. Approved source tuple: player/variant/skill/caster piece/optional supported caster incarnation, canonical missing refs, frozen tại creation; không target owner/controller/position/live caster lookup. No fake incarnation. `effect.stun` DEBUFF, `effect.shield` BUFF; Shield implementation vẫn ngoài scope.

Stun consumer piece/public/unlinked/source-player, source-end N được trusted producer contract validate positive safe integer theo constraints; same-source same-target refresh stable ID/new approved N/new anchor, cross-source independent. No cast-boundary tick. Producer-N schema version/constraints và source refs được validate cả apply/snapshot/replay, không arbitrary RootCommand N hoặc per-duration definition bypass. O-8 N1/O-9 N3 chỉ numeric contract evidence; không approve skill targets/cost/King.

Main legal-action query, root submit và forced End dùng cùng effect-aware restrictions trên base geometry/occupancy/controller. Active Stun cấm player main action, không tự cấm forced reposition/skill targeting; capture-threat query loại bearer Stun, distinct với main turn/AP/slot legality, no check/checkmate hay future Ghost/terrain semantics. Read-only declared policies/frozen context, core root duy nhất ghi state. Tests tại public query/root/registry/codec/replay seams như yêu cầu owner.

Concrete Stun contract/schema có thể dùng empty immutable payload; required unknown producer eligibility/King/removal vẫn giữ disabled/NOT_READY. Không phát minh profile hoặc enable Sanctuary/Chains/Variants. Generic adapters có thể tiến hành độc lập; unsupported forced root operations chỉ test tại available contract boundary hoặc báo limitation. Source, duration, legality semantics thay executable meaning phải pin compatibility rõ, không silent migrate archives. Không 02B-2, Shield/Bomb adapters hoặc app changes.

Implementation status: source/duration và shared query/root/End/threat foundation đã implement trong engine `0.3.0`; disabled Stun consumer/schema có sẵn, không complete registered producer definition. State schema `1.0.0`/existing envelopes giữ nguyên; old-engine snapshots/replays bị reject, không silent migration. Producer-specific semantic source-reference projection và full approved profile vẫn là enablement gates. Actual checks/limitations ở [02B-1 report](PHASE_02B_1_REPORT.md).

## 10. Phase 02B-2 — authorized Shield Foundation

Owner explicitly authorizes bounded Shield Foundation: BUFF/piece/public/unlinked/source-player, source-end approved producer N, structured captured source tuple and stable-ID refresh as §9. Active Shields from distinct sources coexist; any remaining active instance protects. Blocked capture is an atomic root rejection, with no slot/AP/RNG/ID/board/lifetime/history/repetition/events/death reward mutation; no charges or blocked-attempt duration debit. Shield does not block destruction/AoE/sacrifice. King attachment eligibility remains producer-specific UNKNOWN; no global immunity.

Technical slice: named pure `atomic-reject` capture-defense declaration/binding, frozen context at existing root pre-death seam and authoritative legal-main query. Base geometry and capture-threat geometry remain separate: Shield does not acquire a threat modifier in this milestone. Final redirected destinations cannot bypass defense. Shield paired with existing arbitrary capture interceptors is explicitly unsupported until pair semantics are approved; no registration-order inference or new concrete redirect/Fate/Phoenix behavior. Generic interception without active defense keeps its current semantics.

Empty immutable Shield payload/disabled consumer descriptor is permitted; no complete producer registration or live enablement without approved N/required refs/target/King/removal profile and fixtures. Synthetic N/eligibility/permissions are technical fixtures only. No Guardian/Bomb/Variant implementation, dependencies/apps/turn redesign or Phase 02B-3. Test seams: public root/query/registry/snapshot/replay, independent expected outcomes; focused tests before full verification. Implementation status/results recorded in Phase 02B-2 report at completion.

Implementation status: Shield Foundation PASS in engine `0.4.0`; 373 tests / 25 files and requested root verification PASS. Source/duration/state schema remain unchanged from 02B-1; old engine archives reject without migration. Concrete Shield/Stun producers remain disabled; unknown interceptor pairs unsupported. Details: [Phase 02B-2 report](PHASE_02B_2_REPORT.md).

## 11. Phase 02B-3 — authorized Bomb consumer foundation

Authorized bounded consumer slice, not producer enablement. `effect.bomb.charge` BUFF and `effect.bomb.mine` DEBUFF share family `bomb`, permanent/public/unlinked/source-player piece attachment and pure blast consumer. Explicit opt-in unique-target-ignore family policy validates both application and all decoded/final relocation assignments. Duplicate keeps original ID/category/source/payload/deadline, emits no Applied fact, and creates no new effect instance. Root attempted-operation IDs remain causal operation IDs, not additional effect allocations.

Only committed capture/destruction can carry immutable death context: victim/owner/controller/actual death coordinate/reason/attacker/root cause/retired attachments and their captured sources. Build from pre-operation attachment snapshot after successful death commit/accounting; keep retired payloads inside the root, not event views. Reviewed concrete reaction mode is explicit and distinct from synthetic-v1; missing/unknown binding/capability/mode rejects. Reaction queued after committed death; FIFO resolves targets using current occupancy, 3×3 clipped board, both sides/non-King, including capturer. Derived destruction carries the original triggering Bomb source; each chain Bomb supplies its own source. No capture AP; normal owner loss AP once. King capture terminal suppresses remaining cascade.

Canceled/candidate death, cleanup/replace/expiry, relocation/swap and unsupported exile/despawn/sacrifice are not eligible death causes. Unknown concrete interaction modes remain fail closed; no full D-04 matrix approval. Tests use public root/registry/planner/codec/replay seams and explicit test-only producer eligibility/permissions. No actual producers, Dynamite/Live Charge/Landmine or hidden cell behavior; no dependencies/apps/turn economy changes. Required producer fields and complete source-reference repetition projectors remain enablement gates. Completion results go in PHASE_02B_3_REPORT; stop before 02B-4/03.

Implementation status: consumer foundation PASS in engine `0.5.0`, **415 tests / 26 files** and all requested root verification PASS. State schema `1.0.0` and effect/replay v1 envelopes unchanged; incompatible engines reject without migration. Concrete producers remain disabled. Repetition retains family/category/source semantics, omits allocation and irrelevant cross-target Bomb application order, and preserves existing meaningful synthetic ordering. Actual results/conditions: [Phase 02B-3 report](PHASE_02B_3_REPORT.md).
