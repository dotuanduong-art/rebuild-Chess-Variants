# EFFECT_SYSTEM_SPEC — generic effect engine

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

Delayed action record có dueBoundary, source/controller snapshot hoặc query-at-fire policy, target refs, causeId, missing-target policy và cancellationReasons. Firing qua cùng reducer/transaction, không setTimeout từ plugin. Source death, target death, cleanse, rewind, server restart không tự suy hủy/trigger; spec của skill quyết. Deadline hạ tầng/clock nằm backend, logical delayed gameplay nằm core.

Summon lifespan không phải cleanseable effect theo mặc định đề xuất; effect buff bị hoán đổi không làm tuổi thọ unit chuyển sang quân khác. Nếu một definition timer thực sự transferable phải có group-aware contract và được duyệt. Revival/exile dùng unit lifecycle record riêng. Khi event đồng thời due, process ổn định, consume record đúng một lần, rollback giữ record nếu root fail.

## 8. Acceptance

Kiểm tra apply/refresh/stack/ignore đúng event và attribution; `N=1/2/3`, cast từ hai phe, source start/end, swap/control không đổi deadline; tất cả removal reasons; Aegis/Shield/King eligibility; swap whole set transactional và definition mới không sửa core; group links mirror không lẫn; consumer độc lập; delayed firing exactly-once sau snapshot restore; hidden effects không leak qua logs/views/events. Xem [test strategy](TEST_STRATEGY.md), [open decisions](OPEN_DECISIONS.md).
