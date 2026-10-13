# 08 — Diff 27 variant: engine ↔ `variantsData.ts`

## Phạm vi và cách đọc

- **[CONFIRMED]** Registry hiện đăng ký đúng 27 variant tại `packages/game-core/src/variant/allVariants.ts:29-57`; catalog frontend cũng có 27 entry tại `apps/frontend/src/lib/variantsData.ts:29-1122`.
- Thứ tự phân xử dùng đúng `docs/audit/06-decisions.md:12-21`: `06-decisions.md` > `variantsData.ts` > `docs/Variants.md` > `docs/GDD.md` > test > code.
- “Duration N” trong kết luận này luôn có nghĩa **N round**, một round đủ White + Black; một lượt của một bên gọi là **ply**. Chuỗi UI như `4 turns` được coi là metadata drift, dù giá trị số hiện có thể tình cờ tương đương.
- Bảng chỉ ghi sai lệch có ý nghĩa về rule/contract. Khác biệt ngôn ngữ Anh–Việt hoặc mô tả code ngắn hơn nhưng không đổi hành vi không được tính là rule drift.
- Quy ước citation để bảng không quá rộng: `XVariant.ts` = `packages/game-core/src/variant/variants/XVariant.ts`; tên handler = `packages/game-core/src/effect/handlers/<tên>`; `variantsData.ts` = `apps/frontend/src/lib/variantsData.ts`; tên spec = `apps/backend/src/<tên>`. Mọi citation vẫn kèm line range.

## Bảng sai lệch

| Variant | Hạng mục | Code | `variantsData` | Quyết định 06 | Kết luận | Bằng chứng |
|---|---|---|---|---|---|---|
| Zombie | Điều kiện/AP `Infection` | **[CONFIRMED]** Miễn phí ba **lần dùng**, lưu `freeInfectionRemaining`; sau đó 5 AP. | Chỉ hiện cost cấu hình 5 AP, không nói thời gian miễn phí. | Q-13: miễn phí trong 3 round đầu, bỏ counter. | **SỬA CODE + SỬA variantsData** theo Q-13. | `packages/game-core/src/variant/variants/ZombieVariant.ts:31-43,70-75`; `apps/frontend/src/lib/variantsData.ts:78-92`; `docs/audit/06-decisions.md:44` |
| Zombie | `Outbreak` | **[CONFIRMED]** Hồi sinh tối đa hai ally gần nhất tại đúng ô chết còn trống và gắn `walker`. | Nói hồi sinh hai ally gần nhất về vị trí chết, nhưng không nói biến thành Walker/điều kiện ô trống. | Không có quyết định riêng. | **SỬA variantsData** để nêu Walker và “tối đa hai, chỉ ô chết còn trống”. | `ZombieVariant.ts:175-243`; `variantsData.ts:102-108` |
| Dynamite | King và `Live Charge`/Landmine/Bomb | **[CONFIRMED]** Skill 1, Landmine handler và Bomb handler loại King; explosion test khóa King sống. | Không nêu ngoại lệ King cho Live Charge, Landmine hay explosion. | Q-18: không có miễn nhiễm King toàn cục; chỉ giữ restriction riêng được metadata nêu. | **SỬA CODE** để bỏ các exemption không có trong metadata; giữ riêng Raigeki. | `DynamiteVariant.ts:22-47`; `effect/handlers/LandmineHandler.ts:24-46`; `effect/handlers/BombHandler.ts:31-51`; `variantsData.ts:127-149`; `game-core-dynamite.spec.ts:325-420,559-599`; `06-decisions.md:47,94` |
| Magician | Vùng 5×5 (R-DOC-04) | **[CONFIRMED]** Ba skill không có constraint 5×5; target trên toàn board. | Cũng không nêu 5×5. | R-DOC-04 phải phân xử theo `variantsData`. | **SỬA docs/Variants.md**; code và metadata giữ nguyên. | `MagicianVariant.ts:25-64,124-155,224-258`; `variantsData.ts:160-190`; `docs/audit/06-decisions.md:21,174` |
| Guardian | `Sanctuary` duration | **[CONFIRMED]** Zone tồn tại `duration:4`; handler Stun kẻ ăn quân `duration:2`. | Zone 3 round; Stun 1 round. | Q-03 chuẩn hóa duration theo round; không chốt con số Guardian. | **SỬA CODE** theo nguồn ưu tiên `variantsData`: 3 round/1 round, trong cùng PR Q-03. | `GuardianVariant.ts:77-123`; `effect/handlers/SanctuaryHandler.ts:21-45`; `variantsData.ts:217-224` |
| Guardian | Mô tả duration trong code | **[CONFIRMED]** Description gọi Shield “2 turns (4 turns duration)” và ultimate “5 turns (10 turns duration)” dù counter lần lượt 2 và 5. | Gọi đúng 2 round và 5 round. | Q-03. | **SỬA CODE** (description/test terminology), không đổi metadata. | `GuardianVariant.ts:24-27,60-64,128-156`; `variantsData.ts:209-231` |
| Nephalem | Passive (R-DOC-17) | **[CONFIRMED]** Mỗi ally death thứ ba cho +4 AP. | Khớp: 3 ally bị tiêu diệt → +4 AP. | R-DOC-17 dùng `variantsData` phân xử. | **SỬA docs/Variants.md**; code giữ. Audit cũ “+3 AP/Pawn” đã lỗi thời so với nguồn ưu tiên. | `NephalemVariant.ts:14-28`; `variantsData.ts:364-370`; `docs/audit/01-rules-as-implemented.md:49,89` |
| Nephalem | `Judgment Chains` duration | **[CONFIRMED]** Stun 2 round. | Stun 3 round. | Không có quyết định riêng; `variantsData` thắng code. | **SỬA CODE** thành 3 round và đổi baseline test. | `NephalemVariant.ts:32-75`; `variantsData.ts:372-378`; `game-core-nephalem.spec.ts:322-342` |
| Angel | Cooldown cùng target (R-DOC-18) | **[CONFIRMED]** Không có state/cooldown per target; `stackingRule:'refresh'`. | Không nêu cooldown cấm Stun lại cùng target. | R-DOC-18 dùng `variantsData` phân xử. | **SỬA docs/Variants.md**; giữ code/metadata và thêm test khóa refresh. | `AngelVariant.ts:87-130`; `variantsData.ts:413-419`; `06-decisions.md:21,174` |
| Requiem | `Soul Break` duration (R-DOC-19) | **[CONFIRMED]** Berserk có duration `null`, tự kết thúc theo capture/countdown handler. | Ghi `Permanent`, mô tả kết thúc theo điều kiện. | R-DOC-19 dùng `variantsData` phân xử. | **SỬA docs/Variants.md**; code/metadata giữ. | `RequiemVariant.ts:35-81`; `effect/handlers/BerserkHandler.ts:17-103`; `variantsData.ts:249-255` |
| Cherubim | `Fountain of Youth` duration | **[CONFIRMED]** Totem timer 3 round. | 3 round. Không lệch rule; code description chỉ thiếu con số. | Q-03 áp dụng terminology. | **SỬA CODE description** để tránh catalog và engine docs lệch; behavior giữ. | `CherubimVariant.ts:278-329`; `variantsData.ts:542-548` |
| Thunder Dragon | Skill 2 targeting/capture | **[CONFIRMED]** Code hiện cho ranged capture không di chuyển thông qua Thunder Fang. | Cũng mô tả ranged capture không di chuyển. | Q-11 thay cả hai: chỉ capture ô trong moveset thường, quân đứng yên, vẫn tạo Stun trap. | **SỬA CODE + SỬA variantsData** theo Q-11; tuyệt đối không triển khai ray capture. | `ThunderDragonVariant.ts:264-319`; `effect/handlers/ThunderFangHandler.ts:20-106`; `variantsData.ts:583-590`; `06-decisions.md:43,85-87` |
| Thunder Dragon | Skill 1 duration | **[CONFIRMED]** Comment quy `1 round = 2 turns` rồi đặt Electric counter `2`; pipeline lại chỉ tick effect của player tương ứng. | Electric 1 round; attacker Stun 2 round. | Q-03: counter phải biểu diễn round, không nhân đôi theo ply. | **SỬA CODE + TEST**: Electric counter 1; Stun 2. | `ThunderDragonVariant.ts:204-255`; `ActionPipeline.ts:1016-1057`; `variantsData.ts:575-581` |
| Thunder Dragon | Ultimate | **[CONFIRMED]** Vùng 3×10. | Vùng 3×10. | Q-11 chốt code hiện tại đúng. | **GIỮ**, chỉ test khóa 3×10. | `ThunderDragonVariant.ts:325-435`; `variantsData.ts:591-597`; `06-decisions.md:43` |
| Earth | AP `Shifting Peaks` | **[CONFIRMED]** Runtime cost lấy `skill2CostThisTurn`, fallback config. | Hiện range min–base, không thể hiện current cost cụ thể. | Q-34 client được predict, server vẫn authoritative. | **SỬA variantsData/DTO trình bày** về sau: metadata giữ range, server DTO trả current cost. | `EarthVariant.ts:324-333`; `variantsData.ts:623-629`; `06-decisions.md:79` |
| Phantom | AP `Haunt` | **[CONFIRMED]** Ba lần miễn phí sau ultimate được tính runtime. | Hiện base AP; mô tả ultimate có ba lần miễn phí. | Q-34. | **SỬA DTO theo role/current state**, không hard-code cost động vào metadata. | `PhantomVariant.ts:83-94,174-216`; `variantsData.ts:696-718` |
| Time | Ultimate ID/card contract | **[CONFIRMED]** Engine đăng ký **hai** active skill: `time_grand_rewind` và `time_time_freeze`, cùng tier/cost progression. | Một card `time_time_freeze`, tên `Time Collapse`, target `Choice`, mô tả hai nhánh. | R-DOC-21 chỉ được yêu cầu phân xử code↔metadata; chưa có Q riêng cho shape API. | **CẦN CHỦ DỰ ÁN QUYẾT**: một command có discriminator hay hai skill ID. Mặc định đề xuất một ultimate command + `mode`. | `TimeVariant.ts:164-235`; `variantsData.ts:729-759`; `06-decisions.md:21,174` |
| Time | King trong `Time Freeze` (R-DOC-21/Q-18) | **[CONFIRMED]** Handler bỏ qua King khi move/capture. | Không nêu ngoại lệ King. | Q-18 bỏ miễn nhiễm chung; restriction riêng chỉ giữ nếu metadata nói. | **SỬA CODE + TEST**: King bị Stun như quân thường; bỏ test T17 hiện tại. | `effect/handlers/TimeFreezeHandler.ts:31-70`; `TimeVariant.ts:198-234`; `variantsData.ts:753-759`; `time.spec.ts:480-504`; `06-decisions.md:47,94` |
| Predator | `Shadow Prowl` condition | **[CONFIRMED]** `isSquareAttackedBy` chấp nhận bất kỳ ally. | Mô tả bất kỳ ally. | Q-12 thay cả hai: chỉ attack range của ally Pawn. | **SỬA CODE + SỬA variantsData** theo Q-12. | `PredatorVariant.ts:270-320`; `Match.ts:592-600`; `variantsData.ts:785-791`; `06-decisions.md:44` |
| Predator | Passive reward | **[CONFIRMED]** Code hiện +2 AP khi ally capture enemy Pawn. | +2 AP. | Không cần hành động. | **GIỮ**. Audit 01 ghi `+1` là stale. | `PredatorVariant.ts:41-61`; `variantsData.ts:769-775`; `docs/audit/01-rules-as-implemented.md:59` |
| Verdant Dragon | Passive reward | **[CONFIRMED]** Enemy dùng skill cho Verdant +3 AP; Dragon Counter cộng theo AP gain. | +3 AP. | Q-09 không đổi passive. | **GIỮ**. Audit 01 ghi `+1` là stale. | `VerdantDragonVariant.ts:19-79`; `variantsData.ts:810-816`; `docs/audit/01-rules-as-implemented.md:60` |
| Verdant Dragon | Gaze/ultimate | **[CONFIRMED]** Gaze +2/-2; Emerald Domain Stun, không khóa King của caster. | Khớp +2/-2 và Stun. | Q-09 chốt code đúng. | **GIỮ CODE**; sửa tài liệu cũ, test khóa. | `VerdantDragonVariant.ts:133-173,178-307`; `variantsData.ts:826-840`; `06-decisions.md:41` |
| Verdant Dragon | AP ultimate biến thể | **[CONFIRMED]** Runtime AP phụ thuộc `dragonCounter`, có nhánh Wrath. | Chỉ hiện base ultimate cost. | Q-34 server authoritative. | **SỬA DTO/current-cost display**, metadata tĩnh chỉ mô tả base. | `VerdantDragonVariant.ts:178-190`; `variantsData.ts:834-840` |
| Turtle | Transference (R-DOC-20) | **[CONFIRMED]** Chỉ Stun/Shield/Blessing/Electron/Ghost, không Silence. | Khớp đúng năm effect. | R-DOC-20 dùng `variantsData` phân xử. | **SỬA docs/Variants.md**; code/metadata giữ. | `TurtleVariant.ts:9,64-188`; `variantsData.ts:938-944` |
| Turtle | Ultimate loại King (R-DOC-09) | **[CONFIRMED]** Loại Pawn và King. | Cũng loại Pawn và King. | O-6 đã chốt giữ restriction riêng được metadata nêu. | **GIỮ CODE + metadata**; thêm regression test khi triển khai G4.3a. | `TurtleVariant.ts:248-285`; `variantsData.ts:954-960`; `06-decisions.md §3.2, §6` |
| Space | Ultimate | **[CONFIRMED]** Buff 10 round; capture tạo Outworld, không ẩn/gỡ hai ally. | Khớp code. | Q-08 mới chốt code hiện tại. | **GIỮ CODE + variantsData**; sửa docs cũ. | `SpaceVariant.ts:370-406,477-509`; `variantsData.ts:1034-1040`; `06-decisions.md:40,83-84` |
| Puppet | `Puppet Master` phase wording | **[CONFIRMED]** Effect 7 round; handler chặn capture khi remaining 7/6, mở ở 5. | Duration field 7 round nhưng description gọi “2 lượt đầu” + “5 lượt sau”. | Q-10: 2 **round** pre-control + 5 **round** full-control. | **SỬA variantsData** từ “lượt” thành “round”; **GIỮ behavior**, thêm test đủ 7 round. | `PuppetVariant.ts:408-490`; `effect/handlers/PuppetControlHandler.ts:28-61`; `variantsData.ts:1074-1080`; `06-decisions.md:42` |
| Puppet | AP ultimate | **[CONFIRMED]** Core charge base, execute charge phần thêm theo type. | Hiện range base–Queen và bảng trong description. | Q-10 chốt bảng động ở `apCostConfig.ts`. | **GIỮ**, nhưng DTO phải trả current target-dependent cost trước confirm. | `PuppetVariant.ts:408-472`; `variant/apCostConfig.ts:131-141`; `variantsData.ts:1074-1080` |
| Puppet/Zombie | Controlled Pawn direction/promotion | **[CONFIRMED]** Pawn direction/promotion dùng `piece.color`; promotion bị chặn hoàn toàn khi có `puppet_control`. | Puppet Master nói Pawn không được promotion; Zombie không mô tả hướng/promotion của Walker. | Q-17 cao hơn metadata: Pawn bị điều khiển đi và promote theo controller. | **SỬA CODE + SỬA variantsData**: dùng controller cho hướng/rank/AP promotion; bỏ câu cấm promotion của Puppet. | `movement/MoveGenerator.ts:123-157`; `movement/pawnMoves.ts:20-46`; `ActionPipeline.ts:1484-1539`; `variantsData.ts:1074-1080`; `06-decisions.md:49` |
| Pirate | Duration public | **[CONFIRMED]** `Bet` và `Sailing` dùng counter 2 round. | Duration field ghi `4 turns`, description vừa “2 vòng” vừa “4 lượt”. | Q-03 + thuật ngữ bắt buộc. | **SỬA variantsData** thành `2 rounds`; giữ behavior nếu test round mới xác nhận. | `PirateVariant.ts:28-58,73-145`; `variantsData.ts:1098-1112` |

## Coverage đủ 27 variant

| Variant | Kết quả đối chiếu name/AP/duration/description/condition |
|---|---|
| Lightning | **[CONFIRMED]** Không thấy drift quyết định; Raigeki giữ ngoại lệ King đúng Q-18 (`LightningVariant.ts:69-224`; `variantsData.ts:29-68`; `06-decisions.md:94`). |
| Zombie | **[CONFIRMED]** Có drift Q-13 và thiếu điều kiện Outbreak; xem bảng trên. |
| Dynamite | **[CONFIRMED]** Có King exemption trái metadata/Q-18; xem bảng trên. |
| Magician | **[CONFIRMED]** Code khớp metadata; docs 5×5 là nguồn thấp hơn. |
| Guardian | **[CONFIRMED]** Có drift Sanctuary và terminology duration. |
| Requiem | **[CONFIRMED]** Code khớp metadata; docs duration 3 round sai. |
| Ruler | **[CONFIRMED]** Không thấy drift có ý nghĩa (`RulerVariant.ts:134-309`; `variantsData.ts:274-313`). |
| Kazehime | **[CONFIRMED]** Không thấy drift; ngoại lệ King của Storm được metadata nêu nên là restriction riêng (`KazehimeVariant.ts:250-314`; `variantsData.ts:348-354`). |
| Nephalem | **[CONFIRMED]** Passive khớp; Skill 1 lệch 2↔3 round. |
| Angel | **[CONFIRMED]** Code khớp metadata; cooldown trong docs không authoritative. |
| Wizard | **[CONFIRMED]** Rule khớp; AP skill 1/2/ultimate là động trong code nhưng metadata mô tả escalation (`WizardVariant.ts:39-247`; `variantsData.ts:438-475`). Current cost phải đi qua DTO. |
| Devil | **[CONFIRMED]** Code/metadata khớp về skill/AP/condition; hành vi sacrifice lặp là chủ đích Q-15 (`DevilVariant.ts:45-189`; `variantsData.ts:478-515`; `06-decisions.md:47`). |
| Cherubim | **[CONFIRMED]** Behavior khớp; code description Skill 2 thiếu duration. |
| Thunder Dragon | **[CONFIRMED]** Skill 2 phải đổi theo Q-11; Skill 1 có counter nhân đôi sai Q-03; ultimate đúng. |
| Earth | **[CONFIRMED]** Rule khớp; AP Skill 2 cần current-cost DTO. Restriction King của ultimate có trong metadata (`EarthVariant.ts:482-581`; `variantsData.ts:631-638`). |
| Cannibal | **[CONFIRMED]** Không thấy drift (`CannibalVariant.ts:10-236`; `variantsData.ts:641-679`). |
| Phantom | **[CONFIRMED]** Rule khớp; AP Haunt có free-use runtime cần DTO (`PhantomVariant.ts:83-216`; `variantsData.ts:696-718`). |
| Time | **[CONFIRMED]** Còn contract một-vs-hai ultimate và King exemption cần xử lý. |
| Predator | **[CONFIRMED]** Shadow Prowl phải đổi theo Q-12; passive +2 đã khớp. |
| Verdant Dragon | **[CONFIRMED]** Rule Q-09 khớp; cost ultimate động cần DTO. |
| Lord | **[CONFIRMED]** Không thấy drift; King restriction của Vanguard được metadata nêu (`LordVariant.ts:97-365`; `variantsData.ts:858-880`). |
| Dragon Sentinel | **[CONFIRMED]** Không thấy drift rule/AP/duration (`DragonSentinelVariant.ts:107-528`; `variantsData.ts:883-920`). |
| Turtle | **[CONFIRMED]** Code khớp metadata; docs cũ sai hai mục. |
| Phoenix | **[CONFIRMED]** Rule khớp; AP revive động được description nêu nhưng cost field chỉ base (`PhoenixVariant.ts:90-238`; `variantsData.ts:978-984`). Current cost cần DTO. |
| Space | **[CONFIRMED]** Khớp Q-08. |
| Puppet | **[CONFIRMED]** Behavior khớp Q-10; metadata dùng sai đơn vị “lượt”. |
| Pirate | **[CONFIRMED]** Behavior khớp; duration field dùng đơn vị cấm. |

## Joker và Colossus — hoãn

- **[CONFIRMED] HOÃN (Q-20).** Không variant nào được đăng ký trong `ALL_VARIANTS` (`allVariants.ts:29-57`) và không có entry frontend (`variantsData.ts:29-1122`).
- **[CONFIRMED] Joker** còn rules đầy đủ trong `docs/Variants.md:266-305`, bản duplicate untracked `Variants.md:272-311`, và ghi chú “tạm hoãn” trong `AUDIT.md:32,47`; không tìm thấy source/asset/dist mang tên Joker.
- **[CONFIRMED] Colossus** còn rules trong `docs/Variants.md:307-336`, duplicate `Variants.md:313-342`, stale build artifacts `packages/game-core/dist/variant/variants/ColossusVariant.{js,d.ts,map}`, và asset `apps/frontend/public/assets/pieces/Colossus/{white_titan.png,black_titan.png}`. Các dấu vết này phải được gắn nhãn “hoãn/non-runtime”; không dùng `dist` làm nguồn rule.

## Các sai lệch từng cần chủ dự án quyết định — đã chốt

1. **[CHỐT] O-7 — Time ultimate contract:** dùng một command canonical `time_collapse` với `mode: grand_rewind|time_freeze`; event log ghi mode cụ thể và alias cũ migrate theo ruleset version (`TimeVariant.ts:164-235`; `variantsData.ts:753-759`).
2. **[CHỐT] O-6 — phạm vi restriction riêng với King:** giữ mọi restriction được `variantsData` nêu (Angel, Magician, Turtle, Phoenix, Kazehime, Lord, v.v.), đồng thời bỏ exemption chỉ tồn tại trong code (Dynamite, Time Freeze). Raigeki giữ ngoại lệ (`06-decisions.md §3.2, §6`).
3. **[CHỐT] O-8 — Guardian Sanctuary:** sửa code theo catalog thành tồn tại 3 round, Stun 1 round và thêm regression test (`GuardianVariant.ts:77-123`; `variantsData.ts:217-224`).
4. **[CHỐT] O-9 — Nephalem Judgment Chains:** sửa code thành 3 round theo `variantsData` và thêm test (`NephalemVariant.ts:32-75`; `variantsData.ts:372-378`).
5. **[CHỐT] O-6b — King destruction:** direct destroy, Dynamite, Landmine-triggered Bomb và Dragon Sentinel Shockwave/beam không được phá King; chỉ capture King tạo terminal `king_captured`.
