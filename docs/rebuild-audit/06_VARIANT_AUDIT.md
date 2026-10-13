# 06 — Audit toàn bộ Variant

## Phạm vi, format và bằng chứng

Ngày 2026-10-13; working tree hiện tại, HEAD cf85a31, có nhiều source/docs chưa commit sẵn. Không dùng dist làm nguồn luật. Nguồn đối chiếu: ALL_VARIANTS→27 source definition→docs/Variants.md trước sửa→frontend VARIANTS_LIST, sau đó Match/validators/AP queue/events/handler/tick/cleanup. Các nguồn thực thi được ghi trong từng mục Variants.md và bảng source phía cuối báo cáo.

Đã đọc toàn bộ tài liệu gốc (341 LF,32793 byte), UTF-8 không BOM, không CRLF. Snapshot Variants.original.md được tạo chỉ khi chưa tồn tại, nguyên byte; SHA-256: 62db48912d8ee548a87d1e4a7156205d7182480cd91f5258da4ffdb59d36d854. Format gốc:29 heading cấp1 kiểu “# -Variant”, thông tin plain text và gạch đầu dòng, không bảng khả năng/heading con; Passive và Skill dùng tên/đánh số không nhất quán. Bản mới giữ29 heading nguyên văn/thứ tự, bố cục plain label +bullets, tiếng Việt, Ultimate làm slot Skill3. Chuẩn hóa các label thiếu tên/AP từ code, thêm Passive thiếu và ghi chú chung tối thiểu, không đổi toàn bộ thành format bảng. Joker/Colossus giữ slot thiết kế với nhãn không-runtime và link snapshot bảo toàn toàn bộ nguyên văn thiết kế.

## Số lượng và ý nghĩa trạng thái

- [CONFIRMED]29 variant tên duy nhất phát hiện từ tài liệu/source/catalog:27 active definitions +Joker/Colossus chỉ tài liệu, không active source. Kaze/Kazehime, Fire Phoenix/Phoenix, Water Turtle/Turtle, Dragon Sentinal/Sentinel là aliases, không cộng thêm variant.
- [CONFIRMED]27 registered và27 chọn/nạp/start được trong Match. Backend setVariants/start sử dụng cùng registry, catalog frontend27 ID tương ứng.
- [CONFIRMED]26 definition có đúng3 active entries (skill1/skill2/ultimate); Time có4 entries với2 Ultimate. Cả27 có cơ chế passive thực trong code, có thể nằm ở apCost/execute/pipeline/handler thay vì passiveHooks.27 cơ chế passive và82 active entries đã truy vết static, không có active entry bị bỏ.
- [CONFIRMED]1 variant có chuỗi triển khai thiếu consumer được probe trực tiếp: Thunder Dragon/thunder_trap khi không nạp Lightning. Không phải stub cả variant. Các variant khác chưa được chứng minh đầy đủ mọi tổ hợp nên không tính26 “hoàn chỉnh gameplay”.
- [CONFIRMED]2 variant chỉ tài liệu;0 exported partial/stub variant ngoài registry trong source hiện hành. StubVariants.ts chỉ helper không export variant. Colossus stale build/asset là dấu vết, không implementation source đủ điều kiện tái sử dụng.
- Cả27 section active được bổ sung chi tiết trước đây thiếu; bảng sau phân biệt những sai lệch cụ thể, không đếm mọi bổ sung là một bug.3 section có vấn đề số lượng/source: Time dư entry, Joker và Colossus không source. Không khẳng định27 passive/82 skill đều đạt acceptance runtime.

Ký hiệu: P/S=đã truy vết source; start=Match smoke đăng ký/nạp/start pass; partial=chuỗi consumer thiếu được probe. E2E networking chưa pass do giới hạn loopback mô tả phía dưới.

| Variant | Passive | Skill 1 | Skill 2 | Skill 3 | Runtime Status | Documentation Status |
|---|---|---|---|---|---|---|
| Lightning | Lightning Speed — P | Thunder Trap — S | Electric Terrain — S | Raigeki — S | start; handler có | Thêm passive, trap chỉ OnMove, Raigeki enemy, override clock |
| Dynamite | Explosives — P | Live Charge — S | Landmine — S | Detonation — S | start | Tên Live Charge, King restrictions, Bomb chain/sacrifice |
| Zombie | Zombie Infection — P | Infection — S | Mutation — S | Outbreak — S | start | 3 lần miễn phí, bite không capture,<=2 revive/không consume graveyard |
| Magician | Grand Illusions — P | Now You See Me — S | Misdirection — S | Carnival of Fools — S | start | Bỏ5×5 không-source, thêm death cleanup/AP/Fool |
| Nephalem | Fallen Grace — P | Judgment Chains — S | Berserk Curse — S | Divine Silence — S | start | Mọi ally death +4 mỗi count3, ChainsD2, Berserk countdown4 |
| Guardian | Holy Aura — P | Holy Shield — S | Sanctuary — S | Divine Shield — S | start | Discount không cờ vĩnh viễn, SanctuaryD4/Stun2, AP5/8 |
| Requiem | Soul Harvest — P | Soul Break — S | Thread of Fate — S | Reaper's Decree — S | start | Berserk null/countdown2 thay duration3, Fate before-death/cleanse |
| Ruler | Royal Decree — P | Order of Hierarchy — S | Decree of the Weak — S | Absolute Domain — S | start | Bishop>Knight, tick lượt cast, initial group semantics |
| Kaze/Kazehime | Blessing of the Wind God — P | Wind Reversal — S | Illusory Wind — S | Eye of the Divine Storm — S | start | AP2/3/12, sigil chỉ Skill1/2, không chuyển Repel, clear traps không piece effects |
| Predator | Hunter's Instinct — P | Evolution Spore — S | Shadow Prowl — S | Apex Camouflage — S | start | +2 khi capture Pawn, mọi ally range, evolution/lộ theo hook |
| Fire Phoenix/Phoenix | Rebirth — P | Ashes of Reanimation — S | Solar Flare — S | Supernova — S | start | Silent removal, noninitial enemy mất, death/reviveAP,6-ply deadline |
| Verdant Dragon | Dragon Counter — P | Verdant Shelter — S | Dragon's Gaze — S | Emerald Domain/Wrath — S | start | +3 passive, Gaze±2, Stun không Root/không King lock, Wrath rank7–10/D4 |
| Thunder Dragon | Static Charge — P | Dragon's Scale — S | Thunder Fang — S | Dragon's Wrath — S | start; partial trap consumer | ElectricD2, ray capture,3×10, King destroy legacy, missing handler |
| Water Turtle/Turtle | Turtle's Retaliation — P | Transference — S | Aegis Blessing — S | Great Sanctuary — S | start | Bind5×5 moving window, allowlist không Silence/electric, exclude King ulti |
| Angel | Heavenly Grace — P | Holy Seal — S | Blessing — S | Divine Judgment — S | start | Không target cooldown3, immediate Blessing, counter10 và King legacy |
| Devil | Infernal Pact — P | Devil's Eye — S | Wrath Curse — S | Hellish Toll — S | start | Tick đầu lượt/12 cuối lượt, chỉ MOVE toll, Stun không Silence |
| Phantom | Ghost Inheritance — P | Haunt — S | Possession — S | Spirit Walk — S | start | Loại King/Knight,3 free uses, Ghost mớiD3, PossessionD0 skip |
| Cannibal | Cannibal King — P | Royal Guard — S | Devour — S | Apex Predator — S | start | Thêm tên/AP/restore/recast/controller/effect interactions |
| Wizard | Arcane Mastery — P | Arcane Swap — S | Arcane Bind — S | Arcane Annihilation — S | start | Cost formulas/count6/5×5 moving Bind, before-deathAP/King legacy |
| Earth | Ground Dominion — P | Raise the Mountain — S | Shifting Peaks — S | Earth-Burst Heavenly Star — S | start | Mountain special, push tối đa3, núi nguồn spawn ngay, exile silent |
| Time | Temporal Burden — P | Rewind — S | Future Prediction — S | Grand Rewind +Time Freeze — S | start;4 entries | Hai Ultimate thay UI Time Collapse; không AP reward/chậm ảnh, King miễn Freeze |
| Space | Spatial Outworld — P | Dimension Link — S | Spatial Shift — S | Cosmic Void — S | start | Hai target portals, đổi cột giữ row, không remove2 ally, expiry không sweep |
| Puppet | Puppet Strings — P | Soul Binding — S | Puppet Strings — S | Puppet Master — S | start | Cost2/5/8/11, controlD7, pre-control vẫn move, Bind/King/source coupling |
| Cherubim | Dual Casting — P | Ascend — S | Fountain of Youth — S | Divine Ascension — S | start | Auto-end giới hạn dual cast sau move, totem enemy cleanse, ready không auto promote |
| Dragon Sentinal/Sentinel | Dragon Guard — P | Subterranean Escape — S | Shockwave — S | Dragon's Roar — S | start | Thêm passive, capture vẫn chết/AP, mọi death giảm charge, beam không King |
| Lord | Overwhelm — P | Vanguard Command — S | Reinforcements — S | Iron Authority — S | start | Thêm passive, cần enemy nhưng có thể giết ally đầu,<=2 Pawn/no-promotion |
| Pirate | Debt of the Seas — P | Bet — S | Sailing — S | Broadside — S | start | Expiry mọi reason/King đích đứng, enemy-only blast, mô phỏng chưa Shield |
| Joker | CHƯA XÁC ĐỊNH TỪ CODE | CHƯA XÁC ĐỊNH TỪ CODE | CHƯA XÁC ĐỊNH TỪ CODE | CHƯA XÁC ĐỊNH TỪ CODE | Không registry/source; hoãn | Giữ4 slot thiết kế, không coi AP/duration thiết kế là code |
| Colossus | CHƯA XÁC ĐỊNH TỪ CODE | CHƯA XÁC ĐỊNH TỪ CODE | CHƯA XÁC ĐỊNH TỪ CODE | CHƯA XÁC ĐỊNH TỪ CODE | Không active source; asset/stale dist | Giữ4 slot thiết kế, không phục hồi Titan từ build |

## Những vấn đề cần xác nhận/giải quyết trước rebuild

1. Q/O đã chốt là luật đích, không cần hỏi lại về Zombie/Pawn/King/duration. Chưa được dùng code legacy trái quyết định để khóa expected mới.
2. Contract scheduler phải nói chính xác effect target màu/controller và skip apply/cleanup order. Generic counter không cùng counter riêng, không quy mọi D thành2N.
3. Cần matrix interaction Shield/Fate/Bomb/Aegis/Sailing/control/portal/chain, static traversal chưa thay exhaustive runtime verification.
4. Mirror state namespace và hooks-once không được chứng minh bởi smoke start; ví dụ Dynamite hook không kiểm actor, Dragon Sentinel dùng counter flat, Cherubim scan mọi Totem.
5. Đích alias Time phải migrate event/API theo O-7 có version, không đổi public contract trong audit này.
6. Licensing artwork và nguồn asset còn [UNKNOWN]; font có OFL.txt. Joker/Colossus/AI chỉ mở lại khi chủ dự án đổi scope.

## Runtime verification đã thực hiện

- 27/27 definition nạp/start với một bên, và27/27 self-match nạp/start: pass. Đây chỉ registration/setup smoke, không cast mọi skill.
- Unit suite:55/55 suite pass,681/681 test pass,1 snapshot pass. Jest moduleNameMapper trong process map game-core tới packages/game-core/src/index.ts; cache=false, không build core/dist, không sửa config. Dùng fs.realpathSync JS thay native realpath trong process để tránh EPERM sandbox; không sửa node_modules.
- E2E: discover2 suite/23 test;1 pass,22 fail, cả2 suite fail với websocket error. Probe HTTP server127.0.0.1 riêng listen được nhưng client request EACCES: [CONFIRMED] loopback bị sandbox chặn. Không tuyên bố E2E/protocol production đã pass. Không sửa source để né lỗi.
- Thunder Dragon riêng: effectRegistry.getHandler('thunder_trap') không có; đặt trap fixture enemy và thực hiện normal move hợp lệ vào ô: success=true, stunned=false, trapRemains=true. Kết quả xác nhận consumer gap, không chỉ suy từ registrations.
- Typecheck dùng TypeScript compiler API noEmit, không program.emit/build info để tuân thủ chỉ ghi docs; core config composite giữ nguyên, backend/frontend incremental=false: cả3 package0 diagnostics. Lần gọi API đầu backend/frontend gặp TS5074 do incremental thiếu configFilePath, đã chạy lại với incremental=false đúng hướng dẫn, không sửa config.

## Bằng chứng source quan trọng

- packages/game-core/src/action/ActionPipeline.ts:297 drainQueue;405 safetyLimit;840 USE_SKILL;949 END_TURN;1038 REMOVE_EFFECT;1094 TICK_EFFECTS;1159 DESTROY_PIECE — line mở lại bằng rg trong audit này.
- packages/game-core/src/board/Board.ts:97 clone; state/GameState.ts:201 fromSerializable — shallow metadata/flat restore.
- variant/variants/ZombieVariant.ts:32 freeInfectionRemaining; GuardianVariant.ts:110 duration4; NephalemVariant.ts:65 duration2; PredatorVariant.ts:298 isSquareAttackedBy; ThunderDragonVariant.ts:248 electric duration2/:420 random ID/:422 stun4.
- Symbol cụ thể khác: VariantRegistry.loadForPlayer, Match.setVariants/useSkill/getLegalMovesAt, GameService.startMatch/useSkill/armTurnDeadline/getLegalMoves, MatchView.projectBoard/projectVariantState, TurnClock.nextDeadline/endPly.
- Tất cả đường dẫn variant/effect rút gọn trong bảng resolve từ packages/game-core/src; appendix dưới ghi file/definition/skill IDs và line có thể kiểm lại, tránh tin line range từ audit cũ.


### Appendix — Source definition,82 skill ID và handler wiring

Kiểm tra cuối:8/8 deliverable có mặt;29 heading giữ nguyên nội dung/thứ tự sau chuẩn hóa khoảng trắng cuối dòng;29 section×4 slot khả năng;27 registry definition/82 skill references đều có line>0 và source thật. Tất cả Markdown local links của8 tài liệu tồn tại, không lỗi UTF-8 replacement character. Snapshot giữ đúng SHA-256 gốc. So sánh hash298 file tracked/untracked không-ignored baseline: ngoài docs/Variants.md không file cũ nào đổi, không file mới ngoài docs/rebuild-audit. Temporary draft/Jest cache mới tạo trong audit đã được dọn; không xóa file cũ, không source copy/ZIP/repo mới. Những ignored secrets/build/cache sẵn có không nằm trong hash baseline; quá trình không ghi vào chúng.

- lightning: packages/game-core/src/variant/variants/LightningVariant.ts:69 — LightningVariant.
  - Thunder Trap: packages/game-core/src/variant/variants/LightningVariant.ts:77 — lightning_thunder_trap (canActivate/execute trong object tương ứng).
  - Electric Terrain: packages/game-core/src/variant/variants/LightningVariant.ts:133 — lightning_electric_terrain (canActivate/execute trong object tương ứng).
  - Raigeki: packages/game-core/src/variant/variants/LightningVariant.ts:176 — lightning_raigeki (canActivate/execute trong object tương ứng).
  - effectHandlers: ThunderTrapHandler.
- zombie: packages/game-core/src/variant/variants/ZombieVariant.ts:22 — ZombieVariant.
  - Infection: packages/game-core/src/variant/variants/ZombieVariant.ts:37 — zombie_infection (canActivate/execute trong object tương ứng).
  - Mutation: packages/game-core/src/variant/variants/ZombieVariant.ts:96 — zombie_mutation (canActivate/execute trong object tương ứng).
  - Outbreak: packages/game-core/src/variant/variants/ZombieVariant.ts:176 — zombie_outbreak (canActivate/execute trong object tương ứng).
  - effectHandlers: ZombieHandler, WalkerHandler.
- dynamite: packages/game-core/src/variant/variants/DynamiteVariant.ts:8 — DynamiteVariant.
  - Live Charge: packages/game-core/src/variant/variants/DynamiteVariant.ts:23 — dynamite_live_charge (canActivate/execute trong object tương ứng).
  - Landmine: packages/game-core/src/variant/variants/DynamiteVariant.ts:80 — dynamite_landmine (canActivate/execute trong object tương ứng).
  - Detonation: packages/game-core/src/variant/variants/DynamiteVariant.ts:134 — dynamite_detonation (canActivate/execute trong object tương ứng).
  - effectHandlers: BombHandler, LandmineHandler.
- magician: packages/game-core/src/variant/variants/MagicianVariant.ts:10 — MagicianVariant.
  - Now You See Me: packages/game-core/src/variant/variants/MagicianVariant.ts:26 — magician_swap_allies (canActivate/execute trong object tương ứng).
  - Misdirection: packages/game-core/src/variant/variants/MagicianVariant.ts:125 — magician_swap_movements (canActivate/execute trong object tương ứng).
  - Carnival of Fools: packages/game-core/src/variant/variants/MagicianVariant.ts:225 — magician_fool (canActivate/execute trong object tương ứng).
  - effectHandlers: PositionSwapHandler, MovesetSwapHandler, FoolHandler.
- guardian: packages/game-core/src/variant/variants/GuardianVariant.ts:10 — GuardianVariant.
  - Holy Shield: packages/game-core/src/variant/variants/GuardianVariant.ts:25 — guardian_shield (canActivate/execute trong object tương ứng).
  - Sanctuary: packages/game-core/src/variant/variants/GuardianVariant.ts:79 — guardian_sanctuary (canActivate/execute trong object tương ứng).
  - Divine Shield: packages/game-core/src/variant/variants/GuardianVariant.ts:129 — guardian_ultimate (canActivate/execute trong object tương ứng).
  - effectHandlers: ShieldHandler, SanctuaryHandler.
- requiem: packages/game-core/src/variant/variants/RequiemVariant.ts:8 — RequiemVariant.
  - Soul Break: packages/game-core/src/variant/variants/RequiemVariant.ts:36 — requiem_soul_break (canActivate/execute trong object tương ứng).
  - Thread of Fate: packages/game-core/src/variant/variants/RequiemVariant.ts:88 — requiem_thread_of_fate (canActivate/execute trong object tương ứng).
  - Reaper's Decree: packages/game-core/src/variant/variants/RequiemVariant.ts:174 — requiem_reapers_decree (canActivate/execute trong object tương ứng).
  - effectHandlers: FateHandler, BerserkHandler.
- ruler: packages/game-core/src/variant/variants/RulerVariant.ts:134 — RulerVariant.
  - Order of Hierarchy: packages/game-core/src/variant/variants/RulerVariant.ts:238 — ruler_law2 (canActivate/execute trong object tương ứng).
  - Decree of the Weak: packages/game-core/src/variant/variants/RulerVariant.ts:261 — ruler_law3 (canActivate/execute trong object tương ứng).
  - Absolute Domain: packages/game-core/src/variant/variants/RulerVariant.ts:284 — ruler_close_field (canActivate/execute trong object tương ứng).
  - effectHandlers: không handler riêng; core/hook/execute xử lý.
- kaze: packages/game-core/src/variant/variants/KazehimeVariant.ts:31 — KazehimeVariant.
  - Wind Reversal: packages/game-core/src/variant/variants/KazehimeVariant.ts:101 — kaze_repel (canActivate/execute trong object tương ứng).
  - Illusory Wind: packages/game-core/src/variant/variants/KazehimeVariant.ts:176 — kaze_soulless (canActivate/execute trong object tương ứng).
  - Eye of the Divine Storm: packages/game-core/src/variant/variants/KazehimeVariant.ts:251 — kaze_storm (canActivate/execute trong object tương ứng).
  - effectHandlers: RepelHandler, SoullessCellHandler, SoullessHandler.
- nephalem: packages/game-core/src/variant/variants/NephalemVariant.ts:8 — NephalemVariant.
  - Judgment Chains: packages/game-core/src/variant/variants/NephalemVariant.ts:33 — nephalem_judgment_chains (canActivate/execute trong object tương ứng).
  - Berserk Curse: packages/game-core/src/variant/variants/NephalemVariant.ts:79 — nephalem_berserk_curse (canActivate/execute trong object tương ứng).
  - Divine Silence: packages/game-core/src/variant/variants/NephalemVariant.ts:121 — nephalem_divine_silence (canActivate/execute trong object tương ứng).
  - effectHandlers: BerserkHandler, SilenceHandler.
- angel: packages/game-core/src/variant/variants/AngelVariant.ts:9 — AngelVariant.
  - Holy Seal: packages/game-core/src/variant/variants/AngelVariant.ts:88 — angel_holy_seal (canActivate/execute trong object tương ứng).
  - Blessing: packages/game-core/src/variant/variants/AngelVariant.ts:136 — angel_blessing (canActivate/execute trong object tương ứng).
  - Divine Judgment: packages/game-core/src/variant/variants/AngelVariant.ts:180 — angel_divine_judgment (canActivate/execute trong object tương ứng).
  - effectHandlers: BlessingHandler, JudgmentHandler, ShieldHandler.
- wizard: packages/game-core/src/variant/variants/WizardVariant.ts:38 — WizardVariant.
  - Arcane Swap: packages/game-core/src/variant/variants/WizardVariant.ts:73 — wizard_arcane_swap (canActivate/execute trong object tương ứng).
  - Arcane Bind: packages/game-core/src/variant/variants/WizardVariant.ts:169 — wizard_arcane_bind (canActivate/execute trong object tương ứng).
  - Arcane Annihilation: packages/game-core/src/variant/variants/WizardVariant.ts:223 — wizard_arcane_annihilation (canActivate/execute trong object tương ứng).
  - effectHandlers: DeathCounterHandler, EnemySwapHandler, BindHandler.
- devil: packages/game-core/src/variant/variants/DevilVariant.ts:9 — DevilVariant.
  - Devil's Eye: packages/game-core/src/variant/variants/DevilVariant.ts:46 — devil_eye_skill (canActivate/execute trong object tương ứng).
  - Wrath Curse: packages/game-core/src/variant/variants/DevilVariant.ts:103 — wrath_curse_skill (canActivate/execute trong object tương ứng).
  - Hellish Toll: packages/game-core/src/variant/variants/DevilVariant.ts:149 — hellish_toll_skill (canActivate/execute trong object tương ứng).
  - effectHandlers: DevilEyeHandler, DevilTollHandler, BerserkHandler.
- cherubim: packages/game-core/src/variant/variants/CherubimVariant.ts:101 — CherubimVariant.
  - Ascend: packages/game-core/src/variant/variants/CherubimVariant.ts:225 — cherubim_ascend (canActivate/execute trong object tương ứng).
  - Fountain of Youth: packages/game-core/src/variant/variants/CherubimVariant.ts:279 — cherubim_fountain_of_youth (canActivate/execute trong object tương ứng).
  - Divine Ascension: packages/game-core/src/variant/variants/CherubimVariant.ts:345 — cherubim_divine_ascension (canActivate/execute trong object tương ứng).
  - effectHandlers: không handler riêng; core/hook/execute xử lý.
- thunder_dragon: packages/game-core/src/variant/variants/ThunderDragonVariant.ts:140 — ThunderDragonVariant.
  - Dragon's Scale: packages/game-core/src/variant/variants/ThunderDragonVariant.ts:205 — thunder_dragon_dragons_scale (canActivate/execute trong object tương ứng).
  - Thunder Fang: packages/game-core/src/variant/variants/ThunderDragonVariant.ts:265 — thunder_dragon_thunder_fang (canActivate/execute trong object tương ứng).
  - Dragon's Wrath: packages/game-core/src/variant/variants/ThunderDragonVariant.ts:326 — thunder_dragon_dragons_wrath (canActivate/execute trong object tương ứng).
  - effectHandlers: ElectricHandler, ThunderFangHandler.
- earth: packages/game-core/src/variant/variants/EarthVariant.ts:155 — EarthVariant.
  - Raise the Mountain: packages/game-core/src/variant/variants/EarthVariant.ts:259 — earth_raise_mountain (canActivate/execute trong object tương ứng).
  - Shifting Peaks: packages/game-core/src/variant/variants/EarthVariant.ts:325 — earth_shifting_peaks (canActivate/execute trong object tương ứng).
  - Earth-Burst Heavenly Star: packages/game-core/src/variant/variants/EarthVariant.ts:483 — earth_earth_burst (canActivate/execute trong object tương ứng).
  - effectHandlers: không handler riêng; core/hook/execute xử lý.
- cannibal: packages/game-core/src/variant/variants/CannibalVariant.ts:10 — CannibalVariant.
  - Royal Guard: packages/game-core/src/variant/variants/CannibalVariant.ts:30 — cannibal_royal_guard (canActivate/execute trong object tương ứng).
  - Devour: packages/game-core/src/variant/variants/CannibalVariant.ts:79 — cannibal_devour (canActivate/execute trong object tương ứng).
  - Apex Predator: packages/game-core/src/variant/variants/CannibalVariant.ts:173 — cannibal_apex_predator (canActivate/execute trong object tương ứng).
  - effectHandlers: ShieldHandler.
- phantom: packages/game-core/src/variant/variants/PhantomVariant.ts:10 — PhantomVariant.
  - Haunt: packages/game-core/src/variant/variants/PhantomVariant.ts:84 — phantom_haunt_skill (canActivate/execute trong object tương ứng).
  - Possession: packages/game-core/src/variant/variants/PhantomVariant.ts:144 — phantom_possession_skill (canActivate/execute trong object tương ứng).
  - Spirit Walk: packages/game-core/src/variant/variants/PhantomVariant.ts:175 — phantom_spirit_walk_skill (canActivate/execute trong object tương ứng).
  - effectHandlers: GhostHandler, PossessionHandler, StealthMaintenanceHandler.
- time: packages/game-core/src/variant/variants/TimeVariant.ts:48 — TimeVariant.
  - Rewind: packages/game-core/src/variant/variants/TimeVariant.ts:64 — time_rewind (canActivate/execute trong object tương ứng).
  - Future Prediction: packages/game-core/src/variant/variants/TimeVariant.ts:94 — time_prediction (canActivate/execute trong object tương ứng).
  - Grand Rewind: packages/game-core/src/variant/variants/TimeVariant.ts:165 — time_grand_rewind (canActivate/execute trong object tương ứng).
  - Time Freeze: packages/game-core/src/variant/variants/TimeVariant.ts:199 — time_time_freeze (canActivate/execute trong object tương ứng).
  - effectHandlers: PredictionHandler, TimeFreezeHandler.
- predator: packages/game-core/src/variant/variants/PredatorVariant.ts:27 — PredatorVariant.
  - Evolution Spore: packages/game-core/src/variant/variants/PredatorVariant.ts:224 — predator_evolution_spore (canActivate/execute trong object tương ứng).
  - Shadow Prowl: packages/game-core/src/variant/variants/PredatorVariant.ts:271 — predator_shadow_prowl (canActivate/execute trong object tương ứng).
  - Apex Camouflage: packages/game-core/src/variant/variants/PredatorVariant.ts:328 — predator_apex_camouflage (canActivate/execute trong object tương ứng).
  - effectHandlers: SoullessCellHandler, SoullessHandler.
- verdant_dragon: packages/game-core/src/variant/variants/VerdantDragonVariant.ts:9 — VerdantDragonVariant.
  - Verdant Shelter: packages/game-core/src/variant/variants/VerdantDragonVariant.ts:89 — verdant_dragon_verdant_shelter (canActivate/execute trong object tương ứng).
  - Dragon's Gaze: packages/game-core/src/variant/variants/VerdantDragonVariant.ts:134 — verdant_dragon_dragons_gaze (canActivate/execute trong object tương ứng).
  - Emerald Domain: packages/game-core/src/variant/variants/VerdantDragonVariant.ts:179 — verdant_dragon_ultimate (canActivate/execute trong object tương ứng).
  - effectHandlers: DragonGazeHandler.
- lord: packages/game-core/src/variant/variants/LordVariant.ts:63 — LordVariant.
  - Vanguard Command: packages/game-core/src/variant/variants/LordVariant.ts:98 — lord_vanguard_command (canActivate/execute trong object tương ứng).
  - Reinforcements: packages/game-core/src/variant/variants/LordVariant.ts:144 — lord_reinforcements (canActivate/execute trong object tương ứng).
  - Iron Authority: packages/game-core/src/variant/variants/LordVariant.ts:318 — lord_iron_authority (canActivate/execute trong object tương ứng).
  - effectHandlers: không handler riêng; core/hook/execute xử lý.
- dragon_sentinel: packages/game-core/src/variant/variants/DragonSentinelVariant.ts:107 — DragonSentinelVariant.
  - Subterranean Escape: packages/game-core/src/variant/variants/DragonSentinelVariant.ts:308 — dragon_sentinel_subterranean_escape (canActivate/execute trong object tương ứng).
  - Shockwave: packages/game-core/src/variant/variants/DragonSentinelVariant.ts:371 — dragon_sentinel_shockwave (canActivate/execute trong object tương ứng).
  - Dragon's Roar: packages/game-core/src/variant/variants/DragonSentinelVariant.ts:465 — dragon_sentinel_dragons_roar (canActivate/execute trong object tương ứng).
  - effectHandlers: SubterraneanEscapeHandler, DragonsRoarBeamHandler, ShieldHandler.
- turtle: packages/game-core/src/variant/variants/TurtleVariant.ts:11 — TurtleVariant.
  - Transference: packages/game-core/src/variant/variants/TurtleVariant.ts:65 — turtle_transference (canActivate/execute trong object tương ứng).
  - Aegis Blessing: packages/game-core/src/variant/variants/TurtleVariant.ts:197 — turtle_aegis_blessing (canActivate/execute trong object tương ứng).
  - Great Sanctuary: packages/game-core/src/variant/variants/TurtleVariant.ts:249 — turtle_great_sanctuary (canActivate/execute trong object tương ứng).
  - effectHandlers: AegisHandler, BindHandler.
- phoenix: packages/game-core/src/variant/variants/PhoenixVariant.ts:19 — PhoenixVariant.
  - Ashes of Reanimation: packages/game-core/src/variant/variants/PhoenixVariant.ts:91 — phoenix_ashes (canActivate/execute trong object tương ứng).
  - Solar Flare: packages/game-core/src/variant/variants/PhoenixVariant.ts:241 — phoenix_solar_flare (canActivate/execute trong object tương ứng).
  - Supernova: packages/game-core/src/variant/variants/PhoenixVariant.ts:340 — phoenix_supernova (canActivate/execute trong object tương ứng).
  - effectHandlers: không handler riêng; core/hook/execute xử lý.
- space: packages/game-core/src/variant/variants/SpaceVariant.ts:99 — SpaceVariant.
  - Dimension Link: packages/game-core/src/variant/variants/SpaceVariant.ts:113 — space_dimension_link (canActivate/execute trong object tương ứng).
  - Spatial Shift: packages/game-core/src/variant/variants/SpaceVariant.ts:250 — space_spatial_shift (canActivate/execute trong object tương ứng).
  - Cosmic Void: packages/game-core/src/variant/variants/SpaceVariant.ts:371 — space_cosmic_void (canActivate/execute trong object tương ứng).
  - effectHandlers: không handler riêng; core/hook/execute xử lý.
- puppet: packages/game-core/src/variant/variants/PuppetVariant.ts:24 — PuppetVariant.
  - Soul Binding: packages/game-core/src/variant/variants/PuppetVariant.ts:231 — puppet_soul_binding (canActivate/execute trong object tương ứng).
  - Puppet Strings: packages/game-core/src/variant/variants/PuppetVariant.ts:350 — puppet_strings (canActivate/execute trong object tương ứng).
  - Puppet Master: packages/game-core/src/variant/variants/PuppetVariant.ts:409 — puppet_master (canActivate/execute trong object tương ứng).
  - effectHandlers: PuppetNoCaptureHandler, PuppetControlHandler, PuppetTrapHandler, StunHandler, BindHandler.
- pirate: packages/game-core/src/variant/variants/PirateVariant.ts:11 — PirateVariant.
  - Bet: packages/game-core/src/variant/variants/PirateVariant.ts:29 — pirate_bet (canActivate/execute trong object tương ứng).
  - Sailing: packages/game-core/src/variant/variants/PirateVariant.ts:74 — pirate_sailing (canActivate/execute trong object tương ứng).
  - Broadside: packages/game-core/src/variant/variants/PirateVariant.ts:165 — pirate_broadside (canActivate/execute trong object tương ứng).
  - effectHandlers: SailingHandler, PirateBetHandler.

