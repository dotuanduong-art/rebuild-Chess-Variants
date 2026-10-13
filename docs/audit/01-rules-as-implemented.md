# 01 — Luật được code thực sự triển khai

Tài liệu này ưu tiên executable behavior trong `packages/game-core/src`; mô tả UI/GDD chỉ dùng để đối chiếu. “Legal move” trong tên hàm của dự án thực chất là pseudo-legal theo biến thể này vì thiết kế không có luật check/checkmate.

## Luật nền

### Bàn cờ và setup

- **[CONFIRMED]** Bàn 15×15, cột `A..O`, hàng nội bộ `0..14`; `Board` dùng `grid[row][col]` (`Board.ts:5-19,25-37`; `Position.ts:5-20,38-40`).
- **[CONFIRMED]** White nằm ở rank 1/2 (row 0/1), Black ở rank 15/14 (row 14/13). Mỗi bên có 30 quân: back rank `R N B R N B Q K Q B N R B N R` và 15 Pawn (`initialLayout.ts:8-56`).
- **[CONFIRMED]** White đi trước; `turnNumber` tăng khi chuyển trở lại White, nên đây là số round, không phải số ply (`ActionPipeline.ts:386-433,888-894`).

### Di chuyển và bắt quân

- **[CONFIRMED]** Pawn White đi theo `+row`, Black theo `-row`; đi 1, được đi 2 từ row 1/13 nếu trống, bắt chéo 1. Không en passant (`pawnMoves.ts:9-51`).
- **[CONFIRMED]** Pawn tới row 14 (White) hoặc row 0 (Black) tự động thành Queen và nhận +3 AP; không có lựa chọn underpromotion (`ActionPipeline.ts:1484-1541`).
- **[CONFIRMED]** Rook, Knight, Queen và King đi như cờ vua thường; không castling. Bishop đi chéo và thêm đúng 1 ô ngang trái/phải (`movement/rookMoves.ts`, `knightMoves.ts`, `queenMoves.ts`, `kingMoves.ts`; `bishopMoves.ts:getBishopMoves`).
- **[CONFIRMED]** Không có self-check filter, pin, discovered-check legality, checkmate hoặc stalemate. King có thể đi vào ô bị tấn công; game kết thúc khi King bị capture/destroy. `AttackDetection` chỉ phát event cho effect, và tự ghi rõ dùng vanilla movement/ignore effects (`AttackDetection.ts:5-12,205-242`; `MoveValidator.ts:62-72`; `ActionPipeline.ts:331-367`). Đây phù hợp chủ đích tại `docs/GDD.md:193-200`.
- **[CONFIRMED]** Ghost cho sliding piece đi xuyên tối đa obstacle đầu tiên và dừng ở obstacle thứ hai; có thể chọn capture obstacle thứ nhất hoặc thứ hai. Ghost Pawn được nhảy qua một blocker tới ô cách 2 ở bất kỳ row nào, không chỉ starting row (`MoveGenerator.ts:33-110`).

### AP, lượt và kết thúc game

- **[CONFIRMED]** Capture trả AP cho cả hai bên: attacker `Pawn 2 / Knight 3 / Bishop 3 / Rook 4 / Queen 5`; bên mất quân `1/2/2/3/4`; King 0. Promotion +3 (`ActionPipeline.ts:14-32,675-716`).
- **[CONFIRMED]** Mỗi lượt bắt buộc một move; skill có thể trước hoặc sau move. Mặc định tối đa một skill; Cherubim tối đa hai skill khác nhau. Turn auto-end sau move khi skill đã dùng/pass/không còn skill khả dụng (`ActionPipeline.ts:156-213,1471-1477,1601-1695`; `CherubimVariant.ts:101-106`).
- **[CONFIRMED]** Win khi một hoặc hai King bị capture/destroy; nếu hai King chết trong cùng reaction chain thì active player thắng. Phoenix có một lần rebirth can thiệp trước Game Over (`ActionPipeline.ts:331-369,847-855,1323-1422`).
- **[CONFIRMED]** Không có draw implementation: không threefold repetition, 50-move counter, insufficient material hay agreement. `GameState.status` chỉ có `waiting|playing|finished`, winner chỉ là color/null (`Match.ts:49-63`; không có code “repetition” trong source).
- **[CONFIRMED]** Clock nền lưu 15 phút mỗi bên; `Match.getTurnTimeoutMs()` trả 15 giây cho gateway callback nhưng gateway dùng remaining clock khi không có override. Increment +5 giây chỉ khi clock xuống dưới 1 phút (`GameState.ts:100-103`; `Match.ts:118-125,154-204`; `game.gateway.ts:53-93`).

### Effect và state

- **[CONFIRMED]** Effect có thể gắn lên piece/cell/player, có `duration`, `tickTiming`, stacking rule và metadata. Piece effect tick ở cuối lượt theo `piece.color`, player effect theo target color, cell effect theo source color (`ActionPipeline.ts:901-1057`).
- **[CONFIRMED]** Move đi qua `MoveModifierChain`; Stun/Bind/terrain/control có thể thêm hoặc lọc pseudo-legal moves. Attack detection không chạy cùng chain nên “attacked/check” có thể khác move thực tế (`MoveModifierChain.ts:computeLegalMoves`; `AttackDetection.ts:84-167,205-270`).
- **[CONFIRMED]** State có PRNG seed/counter, nhưng ID/timestamp và một số lựa chọn effect vẫn dùng `Date.now()`/`Math.random()` (`GameState.ts:82-107`; `DeterministicRng.ts`; ví dụ `LightningVariant.ts:37`, `ThunderDragonVariant.ts:420`).

## 27 variant đang được đăng ký

Danh sách authoritative nằm tại `allVariants.ts:1-57`; AP nền tại `apCostConfig.ts:1-153`. Bảng dưới mô tả behavior code, không sửa câu chữ để khớp tài liệu.

| Variant | Luật được triển khai |
|---|---|
| Lightning | **[CONFIRMED]** `Thunder Trap` 3 AP đặt trap ẩn; `Electric Terrain` 8 AP đặt timeout 3 giây, skip + stun ngẫu nhiên và khóa skill; `Raigeki` 12 AP destroy quân địch đang Stun, King chỉ mất Stun (`LightningVariant.ts:69-299`). |
| Zombie | **[CONFIRMED]** Zombie bite không di chuyển attacker, biến nạn nhân thành Walker; tối đa 5 Zombie. `Infection` miễn phí **3 lần dùng đầu**, sau đó 5 AP; `Mutation` 4 AP đổi Walker thành Zombie điều khiển; `Outbreak` 8 AP hồi sinh tối đa 2 ally thành Walker (`ZombieVariant.ts:22-244`; `ActionPipeline.ts:1420-1465`). |
| Dynamite | **[CONFIRMED]** `Live Charge` 3 AP gắn Bomb; `Landmine` 3 AP đặt trap ẩn chuyển Bomb; `Detonation` 9 AP kích nổ toàn bộ Bomb và chain reaction (`DynamiteVariant.ts:9-190`; `BombHandler.ts:handle`; `LandmineHandler.ts:handle`). |
| Magician | **[CONFIRMED]** 4 AP swap hai ally rồi hoàn nguyên sau 3 round; 7 AP swap moveset hai enemy trong 3 round; 12 AP gắn Fool lên đúng 5 quân bất kỳ trừ King trong 5 round. Không có giới hạn vùng 5×5 trong validator (`MagicianVariant.ts:10-289`). |
| Guardian | **[CONFIRMED]** Shield một ally; tạo Sanctuary 3×3 làm stun attacker khi capture trong vùng; ultimate shield toàn bộ ally. AP 4 (có discount động xuống 2), 5, 8 (`GuardianVariant.ts:10-169`; `SanctuaryHandler.ts:handle`). |
| Requiem | **[CONFIRMED]** Capture cho bonus AP; Skill 1 gắn Berserk không duration cố định; Skill 2 nối Fate ally-enemy 3 round; ultimate nối hai enemy 5 round. Một mắt xích chết thì mắt xích kia bị destroy (`RequiemVariant.ts:9-249`; `FateHandler.ts:handle`). |
| Ruler | **[CONFIRMED]** Vùng trung tâm 9×9 có Law 1 cùng loại, Law 2 rank cao ăn thấp, Law 3 thấp ăn cao; hai skill đổi law 3 round; ultimate khóa biên vùng 5 round và có early end theo snapshot quân trong vùng (`RulerVariant.ts:65-323`). |
| Kazehime | **[CONFIRMED]** Có 6 `windSigils`; đặt Repel hình chữ thập (2 AP), Soulless hình X (3 AP), sigil hồi khi trap kết thúc; ultimate 12 AP thu hồi trap và tạo storm 7→5→3→1, destroy enemy lưu lại quá lâu (`KazehimeVariant.ts:31-315`; `RepelHandler.ts`; `SoullessCellHandler.ts`). |
| Nephalem | **[CONFIRMED]** Mỗi 3 Pawn ally mất nhận +3 AP; stun enemy 2 round (5 AP), Berserk (4 AP), Silence opponent 3 round (8 AP) (`NephalemVariant.ts:9-150`). |
| Angel | **[CONFIRMED]** Ally bị destroy cho +2 AP; stun non-King 3 round (6 AP), Blessing cleanse hoặc Shield (4 AP), Judgment window 5 round đánh dấu enemy capturer rồi hành quyết (14 AP) (`AngelVariant.ts:9-203`; `BlessingHandler.ts`; `JudgmentHandler.ts`). |
| Wizard | **[CONFIRMED]** Skill 1/2 tăng cost mỗi hai lần dùng; attack events tích Death Counter và capture mục tiêu trả AP theo counter. Swap hai enemy rồi hoàn nguyên, Bind 5×5, ultimate destroy toàn bộ enemy đạt counter 6 với cost động (`WizardVariant.ts:39-260`; `DeathCounterHandler.ts`, `EnemySwapHandler.ts`, `BindHandler.ts`). |
| Devil | **[CONFIRMED]** Mỗi turn owner nhận +1 AP; Devil Eye stun attacker, Berserk curse; Hellish Toll 6 round thu AP khi `MOVE_PIECE` theo type và cho sacrifice nếu thiếu (`DevilVariant.ts:10-170`; `DevilEyeHandler.ts`; `DevilTollHandler.ts`; `ActionPipeline.ts:478-492,1174-1230`). |
| Cherubim | **[CONFIRMED]** Được dùng 2 skill khác nhau/turn; Ascend Pawn chờ 5 round; Totem special piece cleanse vùng 3×3; ultimate evolve các Pawn sẵn sàng hoặc spawn Pawn ở nửa sân mình (`CherubimVariant.ts:101-490`). |
| Thunder Dragon | **[CONFIRMED]** Passive tích AP khi Stun được áp dụng; Electric phản stun attacker; Thunder Fang cho ranged capture không di chuyển và tạo trap Stun; ultimate vùng 3×10 theo hướng King: destroy target đã Stun, Stun target còn lại (`ThunderDragonVariant.ts:141-435`; `ElectricHandler.ts`; `ThunderFangHandler.ts`). |
| Earth | **[CONFIRMED]** Mountain special piece chặn đường 5 round; Shifting Peaks di chuyển mountain theo Queen path và push; ultimate exile non-King trong số round bằng số mountain rồi trả về/destroy occupier (`EarthVariant.ts:156-600`). |
| Cannibal | **[CONFIRMED]** King được capture ally và đổi moveset theo quân đã ăn; skill shield King, skill copy moveset ally + Stun ally; ultimate 10 round cho Queen+Knight movement và cứ hai capture nhận Shield (`CannibalVariant.ts:10-335`). |
| Phantom | **[CONFIRMED]** Ghost xuyên tối đa một quân; Ghost chết truyền cho ally gần nhất; Haunt gắn Ghost, Possession làm Ghost capturer biến thành type bị ăn, Spirit Walk reset Ghost 5 round + stealth và 3 Haunt miễn phí (`PhantomVariant.ts:10-225`; `MoveGenerator.ts:33-110`). |
| Time | **[CONFIRMED]** Rewind phục hồi **vị trí** từ một round trước; Prediction Stun nếu piece đi đúng ô; có hai ultimate cùng tier: Grand Rewind 5 round và Time Freeze 6 round, cost tăng theo số lần dùng chung (`TimeVariant.ts:1-240`). |
| Predator | **[CONFIRMED]** Capture cho +1 AP; Evolution Pawn biến theo tuổi khi capture và chặn promotion; Soulless được đặt ở ô bị **bất kỳ ally** tấn công; ultimate ẩn toàn bộ non-King ally 5 round cho tới adjacency/capture (`PredatorVariant.ts:28-355`). |
| Verdant Dragon | **[CONFIRMED]** Mọi AP gain cộng Dragon Counter và enemy skill cho +1 AP; Shelter giảm một nửa capture reward; Gaze thực tế thưởng/phạt **2 AP**; Emerald Domain Stun 3 enemy + tăng skill cost, còn 100 Counter mở Wrath miễn AP (`VerdantDragonVariant.ts:9-310`; `DragonGazeHandler.ts`). |
| Lord | **[CONFIRMED]** Mỗi 5 round nhận AP theo chênh quân; Vanguard destroy quân đầu trong 3 ô trước mặt; Reinforcements spawn tối đa 2 Pawn không promotion với lifetime động; Iron Authority silence skill 1/2 opponent (`LordVariant.ts:63-365`). |
| Dragon Sentinel | **[CONFIRMED]** Mỗi 2 round shield ally gần King; Subterranean Escape cứu quân bị capture rồi trả lại; Shockwave push 3×3; Dragon's Roar channel 5 round, sacrifice giảm channel, sau đó beam 15×1 tồn tại 5 round (`DragonSentinelVariant.ts:107-535`). |
| Turtle | **[CONFIRMED]** Capture Aegis target khiến attacker bị Bind; Transference chuyển một effect cơ bản; Aegis một ally non-King; ultimate Aegis toàn bộ ally trừ Pawn **và King** (`TurtleVariant.ts:11-290`; `AegisHandler.ts`). |
| Phoenix | **[CONFIRMED]** King chết lần đầu xóa quân mình, dựng đội `K/R/B/B/N`, đưa enemy về setup và khóa skill Phoenix; revive quân graveyard với cost theo type/lifetime 4; Solar Flare cần hai Bishop attack; Supernova 7×7 nổ sau 3 round, chừa King (`PhoenixVariant.ts:19-410`; `ActionPipeline.ts:1323-1422`). |
| Space | **[CONFIRMED]** Dimension odd/even teleport khi đường move cắt portal; Spatial Shift đổi cặp portal và destroy occupant; Cosmic Void trong code **không chọn/ẩn hai ally**, chỉ bật 10-round buff để capture tạo Outworld block (`SpaceVariant.ts:99-510`). |
| Puppet | **[CONFIRMED]** Soul Binding redirect capture Main sang Voodoo; Puppet Strings trap Stun rồi cấm capture một move; Puppet Master kiểm soát non-King enemy, code mô tả 7 round và tính cost theo type (`PuppetVariant.ts:25-490`; các `Puppet*Handler.ts`). |
| Pirate | **[CONFIRMED]** Cho nợ AP tới -10 nhưng phải trả hết mới dùng tiếp; Bet 4 AP dự đoán opponent dùng skill trong 2 round để nhận +8; Sailing 7 AP khóa quân 2 round rồi đi tới target; Broadside 12 AP cho Rook bắn target đầu theo cột, nổ 3×3 enemy (`PirateVariant.ts:11-270`). |

## Sai lệch giữa tài liệu và implementation

| ID | Label | Tài liệu | Implementation |
|---|---|---|---|
| R-DOC-01 | **[CONFIRMED]** | GDD đặt Black ở row 1/2 và White ở row 15/14 (`docs/GDD.md:165-177`). | Code đặt White row 1/2, Black row 15/14 và hướng Pawn tương ứng (`initialLayout.ts:30-56`; `pawnMoves.ts:18-24`). |
| R-DOC-02 | **[CONFIRMED]** | GDD tuyên bố threefold repetition tự động (`docs/GDD.md:230-240`). | Không có position hash/repetition counter/draw status trong engine (`GameState.ts:45-86`; `Match.ts:49-63`). |
| R-DOC-03 | **[CONFIRMED]** | Zombie miễn phí “3 vòng đấu đầu trận” (`docs/Variants.md:37-40`). | Code miễn phí ba **lần sử dụng đầu**, shared counter `freeInfectionRemaining` (`ZombieVariant.ts:31-43,70-75`). |
| R-DOC-04 | **[CONFIRMED]** | Magician passive giới hạn tác dụng vùng 5×5 (`docs/Variants.md:49-53`). | Cả hai swap validator cho chọn target bất kỳ trên board, không kiểm tra khoảng cách/vùng (`MagicianVariant.ts:34-64,133-155`). |
| R-DOC-05 | **[CONFIRMED]** | Predator Shadow Prowl yêu cầu ô trong tầm Pawn ally (`docs/Variants.md:105-110`). | Code dùng `isSquareAttackedBy(..., player)` của bất kỳ ally (`PredatorVariant.ts:269-301`). |
| R-DOC-06 | **[CONFIRMED]** | Verdant Gaze ghi +1/-1 AP; Emerald Domain ghi Root và khóa King chủ skill (`docs/Variants.md:146-152`). | Code/handler dùng +2/-2; ultimate dùng `stun`, không tạo lockdown cho King chủ (`VerdantDragonVariant.ts:132-173,269-307`; `DragonGazeHandler.ts:handle`). |
| R-DOC-07 | **[CONFIRMED]** | Space ultimate chọn 2 ally biến mất 10 round (`docs/Variants.md:218-229`). | Code ultimate không target, không remove ally; chỉ gắn player effect `cosmic_void` (`SpaceVariant.ts:369-406`). |
| R-DOC-08 | **[CONFIRMED]** | Puppet Master ghi tổng 5 round (2 pre-control + 3 control) và bảng cost khác (`docs/Variants.md:241-248`). | Code description/effect triển khai 7 round và AP config base/table khác (`PuppetVariant.ts:407-490`; `apCostConfig.ts:131-141`). |
| R-DOC-09 | **[CONFIRMED]** | Turtle ultimate nói tất cả ally trừ Pawn (`docs/Variants.md:168-169`). | Code loại cả Pawn và King (`TurtleVariant.ts:249-279`). |
| R-DOC-10 | **[CONFIRMED]** | Thunder Dragon gọi Skill 2 là Marksman; ultimate mô tả vùng 3×8 (`docs/Variants.md:154-157`). | Code dùng `thunder_fang`, ranged capture theo ray và ultimate tính vùng 3×10 (`ThunderDragonVariant.ts:263-332`). |
| R-DOC-11 | **[CONFIRMED]** | `Effect.md` nói effect không thể dùng lên King (`docs/Effect.md:2-5`). | Nhiều effect chủ động loại King, nhưng engine `APPLY_EFFECT` không có luật chung; Raigeki/Time/Phoenix và effect khác vẫn có thể tồn tại trên King (`ActionPipeline.ts:901-957`; `LightningVariant.ts:176-224`). |
| R-DOC-12 | **[CONFIRMED]** | Tài liệu có Joker và Colossus đầy đủ (`docs/Variants.md:266-321`). | Không có source/registration cho hai variant (`allVariants.ts:1-57`); chỉ còn Colossus artifacts trong tracked `dist` và image assets. |
| R-DOC-13 | **[CONFIRMED]** | Bản rules tracked trước commit cuối không có Pirate; working copy mới thêm (`docs/Variants.md:338-341`, hiện modified). | Pirate đã được đăng ký và có source/test (`allVariants.ts:27,56`; `PirateVariant.ts`; `game-core-pirate.spec.ts`). |
| R-DOC-14 | **[CONFIRMED]** | GDD nói player không thể act ngoài turn và invalid action không tốn AP (`docs/GDD.md:278-295`). | `USE_SKILL`/`PASS_SKILL` không so `action.player` với `currentTurn`; runtime audit tái hiện Black dùng skill trong turn White (`ActionPipeline.ts:1633-1661`; `game.service.ts:252-285`). |
| R-DOC-15 | **[CONFIRMED]** | GDD/tài liệu dùng “turn”, “round”, “lượt”, “vòng đấu” không nhất quán; working copy đang thay hàng loạt từ “lượt” thành “vòng đấu”. | Engine dùng `turnNumber` như round, effect duration thường tick theo lượt của target/source. Một số comment lại quy đổi `1 round = 2 turns` trong khi counter chỉ giảm một lần/round (`ActionPipeline.ts:1016-1057`; `ThunderDragonVariant.ts:247-250`). |
| R-DOC-16 | **[CONFIRMED]** | `AUDIT.md:27-45` gọi nhiều phần “đã xong”, stealth filtering hoàn chỉnh và completion 95%. | Runtime chứng minh hidden trap lộ qua `actionHistory`, e2e không chạy và authoritative action có thể bị mạo danh; xem findings H-01, H-02, G-02. |
| R-DOC-17 | **[CONFIRMED]** | Nephalem nhận +3 AP mỗi khi mất 3 Pawn (`docs/Variants.md:55-59`). | Hook đếm **mọi ally death** trong graveyard và trả +4 AP mỗi lần thứ ba (`NephalemVariant.ts:14-28`). |
| R-DOC-18 | **[CONFIRMED]** | Angel không được Stun liên tiếp cùng target trong 3 round (`docs/Variants.md:171-175`). | `canActivate` không lưu/check target cooldown; Stun dùng `stackingRule:'refresh'` nên có thể refresh cùng target (`AngelVariant.ts:85-130`). |
| R-DOC-19 | **[CONFIRMED]** | Requiem Skill 1 nói Berserk tồn tại 3 round (`docs/Variants.md:68-72`). | Effect có duration `null`; handler remove khi target capture hoặc khi countdown gây Stun, không tự hết ở round 3 (`RequiemVariant.ts:65-81`; `BerserkHandler.ts:17-103`). |
| R-DOC-20 | **[CONFIRMED]** | Turtle Transference liệt kê cả Silence trong effect cơ bản (`docs/Variants.md:161-164`). | `TRANSFERABLE_EFFECTS` chỉ gồm `stun`, `shield`, `blessing`, `electron`, `ghost`, không có `silence` (`TurtleVariant.ts:9,121,165`). |
| R-DOC-21 | **[CONFIRMED]** | Time enhanced Skill 2 mô tả “đóng băng hình ảnh”, quân vẫn di chuyển nhưng animation chậm (`docs/Variants.md:214-216`). | Code `Time Freeze` lắng `OnMove/OnCapture` và gắn Stun thực lên non-King mover trong 6 round (`TimeVariant.ts:199-234`; `TimeFreezeHandler.ts:8-75`). |

## Ambiguity/edge case chưa được định nghĩa rõ

- **[UNKNOWN]** “Round” nên là một ply hay đủ hai lượt? Code duration hoạt động khác nhau theo target/source, còn tài liệu đang được sửa thuật ngữ nhưng chưa có glossary authoritative (`docs/GDD.md:31-33`; `ActionPipeline.ts:1016-1057`).
- **[UNKNOWN]** Mirror match có được hỗ trợ chính thức không? Audit cũ nói có (`AUDIT.md:8-12`) nhưng state per-variant không namespaced (`VariantRegistry.ts:105-110`).
- **[UNKNOWN]** Skill destroy có phải trả loss AP như capture không? `DESTROY_PIECE` thông thường không trả loss AP, trừ Shelter branch (`ActionPipeline.ts:1081-1169`), trong khi GDD chỉ định bảng loss quanh capture (`docs/GDD.md:201-227`).
- **[UNKNOWN]** Devil sacrifice là action thay move hay action chuẩn bị rồi vẫn phải move? Code không set `hasMoved`, nên có thể sacrifice nhiều quân trước move (`ActionPipeline.ts:1174-1230`).
- **[UNKNOWN]** Ghost capture obstacle thứ hai có chủ ý bỏ qua và để nguyên obstacle thứ nhất không? Generator cho phép, `Board.movePiece` chỉ remove destination (`MoveGenerator.ts:45-67`; `Board.ts:54-61`).
- **[UNKNOWN]** Có cho cùng một người điều khiển Pawn đi theo màu gốc sau Puppet/Walker không? Movement/promotion dùng `piece.color`, ownership dùng `getPieceOwner` (`pawnMoves.ts:20-24`; `MoveGenerator.ts:123-157`; `ActionPipeline.ts:1498-1503`).
- **[UNKNOWN]** `Sailing` đến ô có ally thì đứng yên; nếu đường/đích đổi trạng thái trong hai round, thứ tự ưu tiên với trap/portal/terrain chưa được spec hóa (`PirateVariant.ts:74-160`; `SailingHandler.ts:handle`).
- **[UNKNOWN]** Khi action chain vượt 500 action, kết quả mong muốn là rollback hay draw/error? Hiện engine giữ state một phần và trả success (`ActionPipeline.ts:280-289,322-379`).
