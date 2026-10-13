# VARIANT_PLUGIN_SPEC — clean plugin contracts

Ngày 2026-10-13. Kiến trúc đề xuất; catalog legacy là ứng viên luật cho từng nhóm, không được enable chỉ vì có source. [P00-01](OPEN_DECISIONS.md#quyết-định-đã-chốt-trong-phiên-phase-00) yêu cầu chủ dự án duyệt nhóm trước implementation.

## 1. Contract một plugin

Definition có variantId/version, display metadata, approved skill definitions, setup schema, typed state schema/initial state, passive subscriptions, effect/special-unit dependencies và optional rule modifier providers. Mỗi skill có canonical skillId/tier, mode discriminator nếu có, target schema/cardinality/order, eligibility King, quote actual cost, usage policy, pure canActivate/plan, emitted operations và visibility.

Planners chỉ đọc immutable state/query API, trả typed intents: move/capture/destroy, apply/remove/relocate effect, swap positions/profiles, spawn/revive/exile/return, adjust AP, schedule/cancel logical action, update state riêng. Reducer core kiểm mọi intent; không direct GameState writes, không runtime socket/DB/timer/random/Date. State patches chỉ vùng player+variant được cấp, vẫn validate schema. A plan không phải success cho tới transaction durable commit.

ActualCost quote có base, surcharge, discount, final total và revision. Target preview/client catalog không có authority; server tính lại với full state tại submit. Spend một lần; passive OnSkillCommitted nhận actualCost đầy đủ, mode và source actor, không nhận legacy “base rồi extra” sai số. Slots/one-time/repeatable/multicast là declarative usage policy, không hardcode Cherubim vào Match.

Setup không được nhận client-supplied arbitrary effects/state. Server kiểm variant ID enabled, target selections/legal board, simultaneous private choices và deterministic setup order. Reveal variants tại initialization là GDD ứng viên D-23; setup order cho hidden bomb choices phải duyệt nhóm Dynamite.

## 2. Isolation và registration

Registry definitions immutable theo RulesetBundle. Runtime state nằm `byPlayer[White|Black][variantId]`; effect instance/group/delayed IDs có owner scope; callbacks không giữ mutable state giữa matches. Hai player cùng plugin không dùng singleton counter, lastTarget hoặc link pair. Consumer effect chung được register một lần theo type/version; dispatcher evaluate từng instance đúng một lần, không de-dup mọi instances cùng type.

Passive subscription luôn explicit owner/cause filter. Dynamite refund không thưởng cả hai mirror, Cherubim cleanse chỉ chạy đúng Totem source, Space/Puppet không xóa link của bên kia, Time counters tách player. Cleanup match không tăng handler count qua 100 lần create/dispose. Shared definition không có nghĩa shared state.

## 3. Coverage catalog — tất cả 27 active và hai deferred

Nguồn từng row là file thật phía dưới và section tương ứng [Variants legacy](../Variants.md). Giá và skill mô tả tại bảng là **LEGACY ứng viên**, trừ override CONFIRMED được ghi ở cột cuối. Không coi “source tồn tại” hay 27 start smoke là gameplay complete. [06 variant audit](../rebuild-audit/06_VARIANT_AUDIT.md) ghi 27 passive +82 active entries (Time có4). O-7 gom Time thành một ultimate có hai mode, surface đề xuất 81 skill IDs/27×3, không loại mode nào.

| ID / nguồn definition | Passive legacy | Skill1 / Skill2 / Ultimate (AP legacy) | Luật đích đã chốt / decision gate còn lại |
|---|---|---|---|
| [lightning](../../reference/old-project/packages/game-core/src/variant/variants/LightningVariant.ts) | Lightning Speed | Thunder Trap3 / Electric Terrain8 / Raigeki12 | Raigeki King chỉ gỡ Stun O-6; D-07, D-12, D-22 |
| [dynamite](../../reference/old-project/packages/game-core/src/variant/variants/DynamiteVariant.ts) | Explosives | Live Charge3 / Landmine3 / Detonation9 | King destroy forbidden; FIFO P00-08; D-12, D-22 |
| [zombie](../../reference/old-project/packages/game-core/src/variant/variants/ZombieVariant.ts) | Zombie Infection | Infection free3 uses rồi5 / Mutation4 / Outbreak8 | Q-13 free round 1–3; Q-17/P00-05 control; D-13, D-17 |
| [magician](../../reference/old-project/packages/game-core/src/variant/variants/MagicianVariant.ts) | Grand Illusions | Now You See Me4 / Misdirection7 / Carnival of Fools12 | Restriction non-King O-6; D-14 |
| [nephalem](../../reference/old-project/packages/game-core/src/variant/variants/NephalemVariant.ts) | Fallen Grace | Judgment Chains5 / Berserk Curse4 / Divine Silence8 | O-9 Chains3 round; D-06, D-22 |
| [guardian](../../reference/old-project/packages/game-core/src/variant/variants/GuardianVariant.ts) | Holy Aura | Holy Shield4/2 / Sanctuary5 / Divine Shield8 | O-8 Sanctuary3/Stun1; D-04, D-22 |
| [requiem](../../reference/old-project/packages/game-core/src/variant/variants/RequiemVariant.ts) | Soul Harvest | Soul Break4 / Thread of Fate6 / Reaper's Decree10 | P00-08 death committed; D-04, D-06, D-22 |
| [ruler](../../reference/old-project/packages/game-core/src/variant/variants/RulerVariant.ts) | Royal Decree | Order of Hierarchy4 / Decree of Weak4 / Absolute Domain10 | D-08, D-22 capture laws/domain |
| [kaze](../../reference/old-project/packages/game-core/src/variant/variants/KazehimeVariant.ts) | Blessing of Wind God | Wind Reversal2 / Illusory Wind3 / Eye of Divine Storm12 | O-6 non-King Storm; D-12, D-22 |
| [predator](../../reference/old-project/packages/game-core/src/variant/variants/PredatorVariant.ts) | Hunter's Instinct | Evolution Spore3 / Shadow Prowl4 / Apex Camouflage9 | Q-12 Pawn-only range; D-08, D-22 |
| [phoenix](../../reference/old-project/packages/game-core/src/variant/variants/PhoenixVariant.ts) | Rebirth | Ashes of Reanimation3/5/7/10 / Solar Flare5 / Supernova11 | O-6 restrictions; Rebirth chưa approved exception; D-17, D-22 |
| [verdant_dragon](../../reference/old-project/packages/game-core/src/variant/variants/VerdantDragonVariant.ts) | Dragon Counter | Verdant Shelter3 / Dragon's Gaze4 / Emerald Domain9 hoặc Wrath0 | Q-09 Gaze±2/Stun/no King lock; Q-14 phủ destroy reward; D-22 |
| [thunder_dragon](../../reference/old-project/packages/game-core/src/variant/variants/ThunderDragonVariant.ts) | Static Charge | Dragon's Scale3 / Thunder Fang6 / Dragon's Wrath12 | Q-11 normal moveset đứng yên/trap/3×10; D-12 |
| [turtle](../../reference/old-project/packages/game-core/src/variant/variants/TurtleVariant.ts) | Turtle's Retaliation | Transference4 / Aegis Blessing4 / Great Sanctuary10 | P00-03 generic whole-set swap; D-10 |
| [angel](../../reference/old-project/packages/game-core/src/variant/variants/AngelVariant.ts) | Heavenly Grace | Holy Seal6 / Blessing4 / Divine Judgment14 | O-6 target restrictions; P00-08 committed deaths; D-06, D-22 |
| [devil](../../reference/old-project/packages/game-core/src/variant/variants/DevilVariant.ts) | Infernal Pact | Devil's Eye5 / Wrath Curse4 / Hellish Toll14 | Q-15 repeat sacrifice, Toll mọi main move theo roadmap; D-08, D-22 |
| [phantom](../../reference/old-project/packages/game-core/src/variant/variants/PhantomVariant.ts) | Ghost Inheritance | Haunt3/free / Possession4 / Spirit Walk7 | Q-16 second obstacle; O-6 Haunt restriction; D-15 |
| [cannibal](../../reference/old-project/packages/game-core/src/variant/variants/CannibalVariant.ts) | Cannibal King | Royal Guard3 / Devour5 / Apex Predator8 | King profile không đổi royal identity; D-14, D-22 |
| [wizard](../../reference/old-project/packages/game-core/src/variant/variants/WizardVariant.ts) | Arcane Mastery | Arcane Swap5+escalation / Arcane Bind4+escalation / Annihilation14/12/10/8 | King destroy forbidden; D-04, D-08, D-22 |
| [earth](../../reference/old-project/packages/game-core/src/variant/variants/EarthVariant.ts) | Ground Dominion | Raise Mountain3 / Shifting Peaks3–6 / Earth-Burst10 | O-6 ultimate non-King; D-17, D-22 |
| [time](../../reference/old-project/packages/game-core/src/variant/variants/TimeVariant.ts) | Temporal Burden | Rewind4 / Future Prediction5 / Grand Rewind hoặc Time Freeze6→9→15 | O-7 canonical mode; P00-04 position only/collision atomic; D-11 |
| [space](../../reference/old-project/packages/game-core/src/variant/variants/SpaceVariant.ts) | Spatial Outworld | Dimension Link3 / Spatial Shift4 / Cosmic Void9 | Q-08 buff10/capture Outworld/no ally remove; D-19 |
| [puppet](../../reference/old-project/packages/game-core/src/variant/variants/PuppetVariant.ts) | Puppet Strings | Soul Binding4 / Puppet Strings3 / Puppet Master2/5/8/11 | Q-10 7round=2 move-only+5 free; Q-17 Pawn; D-16 |
| [cherubim](../../reference/old-project/packages/game-core/src/variant/variants/CherubimVariant.ts) | Dual Casting | Ascend2 / Fountain Youth5 / Divine Ascension12 | D-18, D-17 multi-cast/Totem/transform |
| [dragon_sentinel](../../reference/old-project/packages/game-core/src/variant/variants/DragonSentinelVariant.ts) | Dragon Guard | Subterranean Escape4 / Shockwave3 / Dragon's Roar10 | No King destruction; D-17, D-22 |
| [lord](../../reference/old-project/packages/game-core/src/variant/variants/LordVariant.ts) | Overwhelm | Vanguard Command4 / Reinforcements4 / Iron Authority9 | O-6 Vanguard restriction; D-17, D-22 |
| [pirate](../../reference/old-project/packages/game-core/src/variant/variants/PirateVariant.ts) | Debt of Seas | Bet4 / Sailing7 / Broadside12 | D-06, D-17, D-22 debt/delayed capture |
| Joker / [original design](../rebuild-audit/Variants.original.md) | Counterplay draft | Draft skill numbers không normative | DEPRECATED/deferred Q-20; không runtime plugin |
| Colossus / [original design](../rebuild-audit/Variants.original.md) | Titan draft | Draft skill numbers không normative | DEPRECATED/deferred Q-20; không assets/stale dist revival |

Alias display: Kaze=Kazehime, Water Turtle=Turtle, Fire Phoenix=Phoenix, Dragon Sentinal typo=Dragon Sentinel. Canonical runtime IDs lấy [allVariants](../../reference/old-project/packages/game-core/src/variant/allVariants.ts) làm evidence; tên skill UI có thể đổi sau product review, gameplay identifier/version không đổi ngầm. AI cũng deferred theo [roadmap](../audit/07-roadmap-final.md).

## 4. Time — hai lựa chọn ultimate

CONFIRMED: `time_collapse` với `mode: grand_rewind | time_freeze`; unknown mode reject. Match event log luôn ghi mode. Không có hai slot ultimate và không dùng tên UI làm skill identity. Cost counter đề xuất dùng chung giữa hai mode trong một player namespace; con số6/9/15 và progression D-11 cần group approval.

Rewind theo P00-04, atomic map positions; giữ effect AP/type/controller/RNG/counter hiện tại. Historical2/10 ply và fallback earliest chỉ legacy. Snapshot lookback/quá ít lịch sử, trigger policy, Future Prediction đứng-yên capture, Freeze eligibility/cost/expiry là D-11. Freeze trên King không bị exemption code-only; mirror resolve theo source instances/actor, không ưu tiên White như handler cũ.

Replay của action Time là action mới tiến revision; animation có thể đảo trajectory nhưng không giảm network sequence hoặc hủy input đã committed. Full transaction rollback không phát skill event.

## 5. Turtle — tương lai không cần sửa core

Whole-set swap P00-03 theo [effect spec](EFFECT_SYSTEM_SPEC.md). UI chọn hai quân, không chọn effect đầu theo allowlist. Pure quote kiểm mọi relocation policy ở revision hiện tại. Group/control/timer future effect phải khai policy; default missing/prohibited là reject whole skill, không silently bỏ attachment. Skill2/ultimate/passive và target restrictions còn D-10; hỗ trợ engine generic không đồng nghĩa tự duyệt target King bị skill-specific cấm.

## 6. Dynamite và Thunder Dragon

Dynamite dùng committed death events → Bomb reaction → FIFO queued explosion operations; mỗi bomb/death trigger một lần. Dedup overlapping victims, protected King skips destruction, loss AP owner đúng một lần. Death bị Shield/interception hủy không trigger Bomb. Capture King terminal bỏ remaining explosion theo P00-08. Detonation refund source actor-specific, không mirror refund đôi. Radius3×3/bomb selection/King attachment/reward actual values D-12/D-22.

Thunder Fang normal moveset capture đứng yên và tạo Stun trap theo Q-11; target ngoài normal moveset không hợp lệ. Base attack ID source rõ, không truy attacker ở `to`. Shared TrapDefinition/consumer không do Lightning register; Thunder-vs-anything test bắt buộc. Payload producer xác định AP reward/Stun timing riêng; Lightning +2 không tự áp Fang trap. Wrath 3×10 cắt board, destruction skip King; Stun King theo eligible policy, không global immunity.

## 7. Zombie và Puppet — control/owner

Control updates controller, giữ owner; conversion explicit đổi owner. Pawn direction/promotion/controller AP theo Q-17/P00-05. Zombie Infection free ở round1/2/3, cost round4+ theo approved quote; không count free uses. Root bite đứng yên, tiêu main slot/no capture AP là legacy ứng viên D-13; King bite, Walker movement/capture, Mutation scope và revive records phải duyệt.

Puppet control 7 round với2 round move-only +5 free theo source anchor P00-02, không2 round cấm move. Cost dynamic theo Q-10 và config evidence [apCostConfig](../../reference/old-project/packages/game-core/src/variant/apCostConfig.ts). Main/Voodoo phải có pairId/source và namespace; không clear hai player khi một player recast. Control arbitration/cleansing +Bind/no-capture triggers D-16.

## 8. Magician và Phantom

Kiến trúc Magician hỗ trợ currentType và movementProfile độc lập, cùng immutable original identity; behavior chỉ đổi profile hay transformation thật vẫn chờ D-14. Không lấy mutation piece.type legacy làm lựa chọn gameplay mặc định. Swap pair restore phải atomic (bao gồm promotion/death/cleanse), không chạy before-death reward sớm; D-14 khóa profile/type/AP/promotion/Fool/forced entry.

Phantom Ghost giữ first obstacle khi bắt second (Q-16); không tự biến Ghost thành unlimited phasing. Geometry cả Bishop lateral và terrain blockers cần D-15/D-08. Possession current-turn window không encode duration0, transformation dựa victim reference trong capture fact. Spirit Walk freebies3 uses hay rounds, Ghost mới3/cũ5 và stealth reveal là catalog legacy chưa duyệt; projection không leak hidden pieces qua IDs/target lists/events.

## 9. Space — portals

Portal pair data entry/exit/source/visibility/lifetime/occupant wait state; link keyed instance, không global array dùng chung. Path traversal vs landing vs jump là explicit movement query. Planned teleport validate final occupancy trước execution; no overwrite, no destroy King, capture/destroy reasons khác nhau. Exit occupied King cần D-19 policy; không tự đổi destroy thành capture để “vẫn thắng”.

Cosmic Void10 round không remove hai ally (Q-08). Capture-generated Outworld từng ô theo cùng-buff expiry hay independent duration D-19; source anchor đã chốt làm đồng expiry có thể biểu diễn rõ. Spatial Shift đổi column giữ rank là LEGACY candidate, không infer từ animation.

## 10. Group approval và acceptance

Một nhóm trước enable cần signed decision record cho passive +3 skill/modes: cost/formula, targets/King, timing, slots, effect removal/stack/relocation, ownership/control, death/AP, movement causes, hidden projection, replay/counter và interactions. Không copy implementation hoặc UI legacy. Unapproved fields có question IDs trong [OPEN_DECISIONS](OPEN_DECISIONS.md), không default từ source.

First slice đề xuất Guardian +Dynamite (buff/defense/chain/hidden trap); effect architecture tests thêm Turtle, nhưng chỉ playable sau D-10 approval. Sau đó Thunder Dragon/Turtle/Time/Puppet/Space đại diện các seams khó. Mỗi nhóm có normal/mirror/cross-variant/serialization/replay tests; registry smoke chỉ gate đầu. [Roadmap](IMPLEMENTATION_ROADMAP.md) và [tests](TEST_STRATEGY.md) quyết coverage.
