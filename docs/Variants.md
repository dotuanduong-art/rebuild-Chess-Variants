> Hiện trạng legacy tại working tree ngày 2026-10-13, ưu tiên source đang có. Đây không phải ruleset đích: quyết định trong docs/audit/06-decisions.md vẫn cần áp dụng khi rebuild. Snapshot nguyên bản: [Variants.original.md](rebuild-audit/Variants.original.md). Bằng chứng và giới hạn kiểm chứng: [06_VARIANT_AUDIT.md](rebuild-audit/06_VARIANT_AUDIT.md).

> Quy ước chung cho tất cả khả năng:
> - Ply là lượt một bên; turnNumber là vòng đấu, tăng khi chuyển về White. Không có check/checkmate bắt buộc.
> - D=N là remainingDuration khởi tạo, không tự đổi thành N ply hay 2N ply. TICK_EFFECTS giảm effect trên quân theo màu gốc quân; trên player theo targetId; trên ô theo sourcePlayer, tại tickTiming. Bỏ tick nếu appliedTurn/appliedPlayer trùng lượt hiện tại. Mặc định bên dưới là turnEnd; counter riêng được mô tả riêng. Queue FIFO có thể xử lý REMOVE_EFFECT sau SWITCH_TURN/START_TURN dù tick được enqueue trước SWITCH_TURN.
> - Active entry đều cooldown=0, usageRule=once_per_turn; mặc định tối đa 1 skill/ply, Cherubim khai báo 2 skill khác ID. Root command qua requester/phase/AP/canActivate; getTargetRequirements là gợi ý, không phải validator tự bảo đảm mọi filter/region. Ally/enemy của nhiều skill dùng piece.color, khác controller của root move.
> - Execute có thể mutate state trước SPEND_AP trong queue. Emerald Domain cộng 1 vào base cost; Phoenix/Puppet còn trừ extra sau đó. OnSkillUsed.actualCost không bao gồm extra này. Không bảo đảm refund khi derived action no-op vì target mất/đổi ID/vị trí; queue giới hạn 500 chưa rollback.
> - Stacking theo type tại target: refresh chỉ đổi remainingDuration, không đổi metadata/source/duration cũ; ignore giữ effect cũ; stack tăng stackCount và refresh thời hạn. OnEffectApplied vẫn có thể phát dù ignore hoặc target không còn.
> - Shield chỉ chặn capture, không destroy/skill/explosion/sacrifice; mỗi lần chặn giảm remainingDuration tối đa một lần cùng turnNumber/currentTurn, ngoài tick thời gian. Aegis reject việc chọn enemy có Aegis kể cả skill không debuff; APPLY_EFFECT chặn mọi effect từ phe khác trừ aegis, không chặn DESTROY_PIECE.
> - Stun chặn normal move/capture. Bind giới hạn từng đích trong 5×5 quanh vị trí hiện tại, không vùng cố định 3×3. Các derived move không qua toàn bộ root validator.
> - Capture AP theo Pawn/Knight/Bishop/Rook/Queen: bên bắt 2/3/3/4/5, bên mất 1/2/2/3/4; King=0. Destroy thường không thưởng capture/loss, ngoại lệ Shelter ghi riêng. Sacrifice thưởng LOSS_AP, phát OnPieceDestroyed nhưng không OnBeforePieceDestroyed/OnCapture. Special piece dùng registry reward. Death passive có thể thưởng thêm.
> - Legacy DESTROY_PIECE King vẫn đưa vào pendingDeadKings, trái luật đích chỉ capture King mới thắng. Silent removal không phải death/capture. Vùng vuông cắt theo board. Nửa sân White rank 1–7, Black rank 9–15; rank 8 không thuộc nửa sân.
> - Nguồn chung: [ActionPipeline.ts](../packages/game-core/src/action/ActionPipeline.ts) (submitAction/applyAction/TICK_EFFECTS/SkillValidator), [Match.ts](../packages/game-core/src/match/Match.ts) (setVariants/useSkill), [EffectRegistry.ts](../packages/game-core/src/effect/EffectRegistry.ts), [EventBus.ts](../packages/game-core/src/event/EventBus.ts). Mô tả cơ chế được xác nhận bằng đọc code; smoke start không chứng minh mọi tổ hợp gameplay.

# -Lightning
Passive – Lightning Speed
- Tên theo frontend. ThunderTrapHandler khi OnMove vào thunder_trap khác màu quân enqueue +2 AP cho sourcePlayer, kể cả Aegis chặn Stun; không giới hạn tổng trigger.

Skill 1 – Thunder Trap (3 AP)
- Đúng 1 ô không quân, chưa có thunder_trap của mình; không giới hạn tầm. Bẫy ẩn D=null, ignore.
- OnMove vào bởi khác màu: Stun D=2 refresh, +2 AP, xóa bẫy; King có thể bị Stun. Không nghe OnCapture/OnPiecePushed nên capture đáp bẫy không kích hoạt nhánh này.

Skill 2 – Electric Terrain (8 AP)
- Không target; reject nếu bất kỳ electric_terrain đã tồn tại. Effect theo dõi ở A1 D=5 ignore.
- Hook OnEffectApplied/Expired/TurnStart đặt turnTimeoutOverride=3000, skillsDisabled=true cho cả hai bên; hết effect bỏ override/mở skill.
- GameService dùng override_skip 3 giây thay đường nextDeadline khi có override. Hết hạn: Match.handleTimeoutSkip chọn quân cùng màu không King bằng DeterministicRng, Stun D=3 rồi END_TURN. Match.endPlyWithoutClockChange không trừ chess clock ở lượt kết thúc dưới override. White first-ply exemption của hard timeout thường không đồng nghĩa miễn override.

Ultimate – Raigeki (12 AP)
- Không target; cần enemy có Stun. Chỉ quét enemy theo màu gốc, destroy quân Stun không King; King chỉ xóa Stun đầu tiên. Không destroy ally như bản cũ.
- Nguồn: [LightningVariant.ts](../packages/game-core/src/variant/variants/LightningVariant.ts), ThunderTrapHandler/updateElectricTerrainState, GameService.armTurnDeadline.

# -Dynamite
Passive – Explosives
- OnSkillUsed skillId=dynamite_detonation +2 AP cho player hook, không kiểm activePlayer; mirror có thể thưởng cả hai.
- Bomb nổ khi OnPieceDestroyed, gồm capture/destroy/sacrifice; không thưởng AP khi chỉ gắn Bomb.

Skill 1 – Live Charge (3 AP)
- Tên code thay Suicide Bomber. Chọn ally không King/chưa bomb; bomb D=null ignore, isDebuff=false.
- BombHandler khi chết enqueue xóa Bomb rồi destroy mọi quân hai phe không King trong 3×3, gồm quân bắt vừa đáp vào. Bomb nạn nhân tiếp tục chain; Shield không chặn explosion.

Skill 2 – Landmine (3 AP)
- Ô không quân/chưa landmine của mình; hidden, D=null ignore, không giới hạn tổng mìn.
- OnMove/OnCapture khác màu: gắn Bomb D=null isDebuff=true, trừ King; xóa mìn kể cả King/Aegis không nhận Bomb.

Ultimate – Detonation (9 AP)
- Không target, không cần có Bomb; destroy tất cả quân hai phe có Bomb trừ King. BombHandler xử lý chain và passive trả 2 AP.
- Nguồn: [DynamiteVariant.ts](../packages/game-core/src/variant/variants/DynamiteVariant.ts), BombHandler, LandmineHandler.

# -Zombie
Passive – Zombie Infection
- Match.makeMove chuyển attack của Zombie vào target khác effective owner/chưa Walker thành ZOMBIE_BITE. Attacker đứng nguyên; target không chết, không OnCapture/graveyard/capture AP; gắn Walker D=null, isDebuff=true, controlledBy=currentTurn; tiêu main move.
- Walker giữ màu/type, root quyền theo controller, chỉ đi ô trống, không capture. Pawn vẫn hướng/promote theo màu gốc legacy. Target đã Walker thì thử capture thường. isZombieBite không loại King.
- Tối đa 5 Zombie chỉ kiểm Infection/Mutation, đếm quân màu player có zombie; không giới hạn Walker.

Skill 1 – Infection (0 AP cho 3 lần dùng đầu, sau đó 5 AP)
- Chọn ally chưa zombie/walker và số Zombie<5; không loại King. Gắn zombie D=null ignore.
- freeInfectionRemaining=3, execute giảm mỗi cast miễn phí; không phải 3 vòng đầu như bản cũ/luật đích.

Skill 2 – Mutation (4 AP)
- Bất kỳ Walker, không cần controller cũ là mình; cần số Zombie<5. Xóa Walker, đổi color sang caster nếu khác, giữ type rồi gắn zombie D=null ignore.

Ultimate – Outbreak (8 AP)
- Không target; cần ít nhất 1 ally graveyard có ô chết trống. Sort turnDied giảm dần, chọn tối đa 2 ô trống khác nhau; không cần đủ 2, không loại King trong source filter.
- Spawn cùng ID/type, clear effects, Walker D=null controlledBy=player isDebuff=false. Không xóa entry graveyard; cùng vòng chưa có death sequence để phân biệt thứ tự.
- Nguồn: [ZombieVariant.ts](../packages/game-core/src/variant/variants/ZombieVariant.ts), zombieAttack.isZombieBite, WalkerHandler, ActionPipeline.ZOMBIE_BITE.

# -Magician
Passive – Grand Illusions
- PositionSwapHandler nghe OnBeforePieceDestroyed: hủy cặp, Shield D=2 cho partner sống; MovesetSwapHandler trả type partner, hủy cặp, Stun D=2. Không chỉ death committed; Shield có thể hủy event trước hook, sacrifice không có before event.
- Không có giới hạn vùng 5×5 như bản cũ; tên passive từ frontend.

Skill 1 – Now You See Me (4 AP)
- Hai ally khác ID, không King/chưa position_swap hoặc moveset_swap, không tầm. SWAP_POSITIONS rồi gắn position_swap D=3 ignore, partnerPieceId.
- Hết tự nhiên và partner còn effect thì swap vị trí hiện tại, gỡ partner reason=reverted. Partner chết thì hủy cặp, không đổi lại vị trí.

Skill 2 – Misdirection (7 AP)
- Hai enemy khác ID, không King/chưa hai loại swap; đổi trực tiếp piece.type, gắn moveset_swap D=3 ignore lưu originalType.
- Hết trả type; partner chết trả type quân sống +Stun D=2. AP capture dùng originalType; promotion Pawn gốc có cleanup riêng.

Ultimate – Carnival of Fools (12 AP)
- canActivate nhận 1–5 quân khác ID, bất kỳ phe, không King, dù requirements liệt kê 5.
- Fool D=5 refresh: OnTurnStart màu quân tự tiến 1 ô theo màu nếu trong bàn/trống/không Flame; không capture, bị cản thì đứng. FOOL_MOVE không tiêu main move, có OnMove/promotion.
- Nguồn: [MagicianVariant.ts](../packages/game-core/src/variant/variants/MagicianVariant.ts), PositionSwapHandler/MovesetSwapHandler/FoolHandler.

# - Nephalem
Passive – Fallen Grace
- OnPieceDestroyed ally: graveyard ally hiện tại +1 chia hết 3 thì +4 AP. Không riêng Pawn, không loại King/summoned/special, không phân biệt capture/destroy/sacrifice.
- Graveyard enqueue sau event; nhiều death cùng queue có thể nhìn cùng count.

Skill 1 – Judgment Chains (5 AP)
- Enemy không King, Stun D=2 refresh. Khác quyết định đích 3 vòng.

Skill 2 – Berserk Curse (4 AP)
- Enemy kể cả King; Berserk D=null ignore, captureCountdown=4, isFirstTurnStart=true.
- BerserkHandler bỏ OnTurnStart màu target đầu tiên rồi giảm mỗi đầu lượt; về 0 chưa capture thì Stun D=3 và gỡ. Capture gỡ nếu đúng attacker tại to; stayInPlace có thể không gỡ. Không Silence.

Ultimate – Divine Silence (8 AP)
- Không target; silence enemy player D=3 refresh, blockUltimate mặc định true, chặn mọi skill, không chặn move.
- Nguồn: [NephalemVariant.ts](../packages/game-core/src/variant/variants/NephalemVariant.ts), BerserkHandler, submitAction silence gate.

# -Guardian
Passive – Holy Aura
- Holy Shield cost=2 khi graveyard ally>=8, còn lại 4. Không cờ giảm vĩnh viễn; hồi sinh xóa entry có thể tăng giá lại. Count mọi loại. Tên từ frontend.

Skill 1 – Holy Shield (4 hoặc 2 AP)
- 1 ally kể cả King, shield D=2 refresh; chỉ chặn capture.

Skill 2 – Sanctuary (5 AP)
- 1 cell tâm; requirements empty nhưng canActivate không kiểm trống. Sanctuary 3×3 D=4 refresh.
- OnCapture ở ô sanctuary: quân hiện ở to khác sourcePlayer thì Stun D=2, không kiểm màu nạn nhân/đúng attacker ID. StayInPlace có thể không trigger. Legacy 4/2 khác luật đích 3/1.

Ultimate – Divine Shield (8 AP)
- Không target, mọi ally kể cả King nhận shield D=5 refresh.
- Nguồn: [GuardianVariant.ts](../packages/game-core/src/variant/variants/GuardianVariant.ts), ShieldHandler/SanctuaryHandler.

# - Requiem
Passive – Soul Harvest
- OnCapture activePlayer=caster +1 AP; không kiểm màu/type nạn nhân. Cộng reward chung, không trigger destroy/sacrifice thuần.

Skill 1 – Soul Break (4 AP)
- Enemy không King; Berserk D=null ignore, countdown=2. Bỏ đầu lượt target đầu tiên rồi đếm 2 đầu lượt. Capture đúng ID tại to gỡ; timeout Stun D=3. Không duration cố định 3.

Skill 2 – Thread of Fate (6 AP)
- Target thứ tự ally rồi enemy, cả hai không King. Fate D=3 ignore, linkedPieceId/linkedEffectId.
- Before death enqueue destroy partner và cleanup. Shield priority trước Fate có thể hủy capture. Xóa/cleanse/expiry một Fate xóa partner; sacrifice bypass before nên không đảm bảo kéo chết partner.

Ultimate – Reaper's Decree (10 AP)
- Hai enemy khác ID không King; Fate D=5 ignore, cùng cơ chế cleanup/chain Skill 2.
- Nguồn: [RequiemVariant.ts](../packages/game-core/src/variant/variants/RequiemVariant.ts), FateHandler/BerserkHandler.

# -Ruler
Passive – Royal Decree (tài liệu cũ: Law Territory)
- LawValidator áp dụng root CAPTURE nếu from/to đều D4–L12. Mặc định Law 1: cùng piece.type mới bắt.
- Rank King6>Queen5>Rook4>Bishop3>Knight2>Pawn1, loại lạ=0; không Bishop=Knight. Không áp dụng trực tiếp destroy/bite hay derived capture bypass validation.

Skill 1 – Order of Hierarchy (4 AP)
- Không target, reject Law 3 đang có; set Law2, counter3, attacker rank>target. Tick cuối lượt Ruler gồm lượt cast; hết về Law1, cast lại reset.

Skill 2 – Decree of the Weak (4 AP)
- Không target, reject Law2; set Law3, counter3, attacker rank<target; tick/reset như Skill1.

Ultimate – Absolute Domain (10 AP)
- Không target; domain counter5, chặn vượt biên vùng: sliding kiểm toàn đường, jump kiểm hai đầu. Counter giảm cuối lượt caster gồm lượt cast.
- Snapshot ID hai màu trong vùng; OnPieceDestroyed loại ID, nhóm vừa mất quân cuối thì kết thúc sớm. Không check nhóm rỗng lúc cast/không thêm summoned ID; cast lại reset.
- Nguồn: [RulerVariant.ts](../packages/game-core/src/variant/variants/RulerVariant.ts), LawValidator/isPathValid/DomainBoundaryModifier.

# -Kaze
Passive – Blessing of the Wind God
- Runtime id=kaze, name=Kazehime. windSigils=6; Skill1/2 cần >0, trừ 1 cho batch5 ô. Trigger xóa batch và hồi 1 tối đa6 nếu state có key; cleanse không có hook hoàn sigil chung. Ultimate reset6, không tiêu sigil.

Skill 1 – Wind Reversal (2 AP)
- Tâm+4 ô ngang/dọc đều trong bàn/trống/không repel hoặc soulless_cell. Repel hidden D=null ignore.
- OnMove/OnCapture khác màu PUSH về from trừ Aegis; vẫn xóa batch/hồi sigil. Capture đã xảy ra không rollback quân chết/AP.

Skill 2 – Illusory Wind (3 AP)
- Tâm+4 ô chéo với cùng điều kiện. Soulless_cell hidden D=null ignore; trigger gắn soulless D=2 refresh lưu originalPosition=from.
- Cấm move/capture; quân khác cùng màu đi/capture vào originalPosition gỡ sớm. Hết D gỡ, không chuyển thành Repel. Aegis có thể chặn nhưng batch vẫn xóa/hoàn sigil.

Ultimate – Eye of the Divine Storm (12 AP)
- 1 cell bất kỳ, không check trống. Reset sigil6, xóa repel/soulless_cell caster nhưng không soulless đã gắn quân.
- Storm radius3, cuối mỗi lượt caster gồm cast: enemy không King trong vùng tăng count, >=2 lần liên tiếp destroy, ra vùng reset. Sau damage giảm radius3→2→1→0 rồi xóa, vùng7×7→5×5→3×3→1.
- Nguồn: [KazehimeVariant.ts](../packages/game-core/src/variant/variants/KazehimeVariant.ts), RepelHandler/SoullessCellHandler/SoullessHandler.

# -Predator
Passive – Hunter's Instinct
- OnCapture activePlayer=caster, nạn nhân khác màu và type=Pawn thì +2 AP, không +1 mọi capture. Pawn transform không tính; destroy không trigger.

Skill 1 – Evolution Spore (3 AP)
- Ally Pawn, evolution D=null refresh, roundsWithEvolution=0. Cuối lượt caster gồm cast tăng tiến độ.
- Capture đúng attacker tại to luôn gỡ evolution; >=2/3/4/5 tick thành Knight/Bishop/Rook/Queen, <2 chỉ gỡ. Chặn promotion khi còn effect; tái cast refresh không reset metadata tiến độ.

Skill 2 – Shadow Prowl (4 AP)
- Ô không quân/Flame/repel/soulless_cell, isSquareAttackedBy ally tới được. Code cho mọi loại ally, không chỉ Pawn; attack query không đồng nhất legal chain.
- Soulless_cell hidden D=null ignore, một batch; trigger/giải phóng như Kaze, soulless D=2. Handler có thể tăng windSigils nếu key tồn tại.

Ultimate – Apex Camouflage (9 AP)
- Không target; reset revealedPieceIds, player effect D=5 refresh. DTO ẩn ally không King.
- Cuối mọi lượt, kề enemy8 ô ghi ID lộ trong lần camo; capture đúng ID tại to cũng lộ. Expiry clear list, cast lại reset list ngay.
- Nguồn: [PredatorVariant.ts](../packages/game-core/src/variant/variants/PredatorVariant.ts), AttackDetection, MatchView.projectBoard.

# - Fire Phoenix
Passive – Rebirth
- ActionPipeline sau drain pendingDeadKings: Phoenix chưa rebirth thì thay terminal bằng PHOENIX_REBIRTH, gồm King destroy legacy. Chỉ một lần.
- Silent remove mọi ally; enemy chỉ ID khớp dạng đội hình ban đầu được trả về hàng đầu theo ID, giữ type/effects; ID khác bị bỏ âm thầm. Không death/reward cho các silent removal.
- Spawn King H1/H15, Rook A1/A15, Bishop C1/C15 và F1/F15, Knight B1/B15; occupier ô spawn bị xóa im lặng. Set phoenixSkillsDisabled[player], cấm cả3 skill về sau.

Skill 1 – Ashes of Reanimation (Pawn3; Knight/Bishop5; Rook7; Queen10 AP)
- ID ally graveyard không King + ô trống nửa sân mình; đủ actualCost. Core trừ3, execute thêm cost−3.
- Xóa graveyard entry, spawn cùng ID/type clear effects, summon_duration D=4 ignore. Hết tự nhiên destroy; cleanse duration sớm không despawn vì handler lọc reason=expired.

Skill 2 – Solar Flare (5 AP)
- Enemy được >=2 ally Bishop attack theo getAttackedPieces, không cấm King ở canActivate. Stun D=2 rồi Flame5×5 D=4, đều refresh; Flame chặn đáp ô cả hai/sliding.

Ultimate – Supernova (11 AP)
- 1 cell; requirements empty nhưng không check trống. Reject khi warning active. Warning7×7 công khai D=null, detonationPly=currentPly+6.
- OnTurnStart hai bên tới deadline destroy mọi quân hai phe không King, xóa warning/clear state; Shield không chặn.
- Nguồn: [PhoenixVariant.ts](../packages/game-core/src/variant/variants/PhoenixVariant.ts), applyAction.PHOENIX_REBIRTH, SummonDurationHandler.

# - Verdant Dragon
Passive – Dragon Counter
- Opponent OnSkillUsed +3 AP, không +1. Mỗi caster OnAPGained cộng event.amount vào counter, gồm passive/loss; spend không giảm, ghi AP trực tiếp không có event không tăng. Wrath reset0, reward queue sau đó có thể tăng lại.

Skill 1 – Verdant Shelter (3 AP)
- Ally kể cả King, shelter D=4 refresh. Capture reward đối thủ floor(half), loss reward đủ.
- Destroy sheltered cũng trả floor(captureAP/2) cho màu đối diện nạn nhân và LOSS_AP cho nạn nhân, kể cả ally/expiry gây destroy; ngoại lệ AP legacy.

Skill 2 – Dragon's Gaze (4 AP)
- Enemy kể cả King, gaze D=2 refresh hasMoved=false. OnMove/OnCapture đúng ID: mark moved, +2 AP source, gỡ ngay. Expired/cleanse khi chưa moved trừ2 AP đối thủ, không chỉ vòng kế tiếp.

Ultimate – Emerald Domain / Dragon's Wrath (9 hoặc 0 AP)
- Counter<100: đúng3 enemy khác ID không King; Stun D=3, không Root; player enemy emerald_domain D=3, refresh. Không khóa King caster.
- Enemy skill +1 base AP, Verdant nhận ceil(OnSkillUsed.actualCost/2) cộng +3 passive; actualCost không gồm extra Phoenix/Puppet.
- Counter>=100: cùng entry tự chuyển Wrath, không target, base0; Stun D=4 enemy rows index6–9 tức rank7–10, kể cả King; trừ3 AP enemy, reset counter. Không destroy.
- Nguồn: [VerdantDragonVariant.ts](../packages/game-core/src/variant/variants/VerdantDragonVariant.ts), DragonGazeHandler, CAPTURE/DESTROY_PIECE shelter branches.

# - Thunder Dragon
Passive – Static Charge
- OnTurnStart caster +1 AP mỗi enemy theo màu đang có Stun, kể cả King; một quân đếm một lần.

Skill 1 – Dragon's Scale (3 AP)
- Ally kể cả King, electric D=2 refresh (không Electron; description1 vòng không đổi giá trị D2). OnCapture nạn nhân có electric nguồn khác attacker: Stun D=2 attacker. Destroy/sacrifice không trigger.

Skill 2 – Thunder Fang (6 AP)
- Ally kể cả King, D=1 refresh; OnTurnEnd màu quân gỡ thủ công ngay lượt cast. Modifier thêm capture tới enemy đầu tiên mỗi8 tia Hậu, không chỉ normal moveset. Validator gắn stayInPlace nếu source=màu attacker.
- OnCapture tạo thunder_trap D=2 refresh tại to. Fallback tìm attacker chỉ scan khi to null, không khi to có quân sai ID.
- ThunderTrapHandler chỉ đăng ký bởi LightningVariant; Thunder Dragon đơn lẻ có thể tạo bẫy không consumer, chưa hoàn chỉnh toàn luồng trigger.

Ultimate – Dragon's Wrath (12 AP)
- Chọn1 ô trong8 ô kề King, vùng rộng3 sâu10 từ ô tiếp theo King theo direction/perpendicular, cắt board.
- Enemy đã Stun trước cast thì destroy; còn lại Stun D=4 refresh. Không Stun rồi destroy hết cùng lần. Không loại King trong destroy, trái luật đích.
- Nguồn: [ThunderDragonVariant.ts](../packages/game-core/src/variant/variants/ThunderDragonVariant.ts), computeWrathZone/ThunderFangCaptureValidator, ThunderFangHandler/ElectricHandler.

# - Water Turtle
Passive – Turtle's Retaliation
- OnCapture ally có Aegis: đúng attacker tại to khác màu caster nhận Bind D=2 refresh. StayInPlace có thể không trigger. Bind là5×5 quanh từng vị trí, không3×3 cố định.

Skill 1 – Transference (4 AP)
- Hai quân khác ID, dest không King. Auto effect đầu hợp lệ trong stun/shield/blessing/electron/ghost; không Silence, không electric.
- Buff từ enemy→ally hoặc debuff ally→enemy. REMOVE nguồn rồi APPLY bản sao đổi source=caster, duration=remaining cũ; giữ metadata, ghi lại appliedTurn/player.
- Enemy explicit source/dest có Aegis bị reject; trùng type đích dùng stacking cũ có thể ignore dù nguồn đã xóa.

Skill 2 – Aegis Blessing (4 AP)
- Ally không King, Aegis D=2 refresh; không miễn capture/destroy.

Ultimate – Great Sanctuary (10 AP)
- Không target; Aegis D=5 refresh mọi ally không Pawn/King, có thể gồm special.
- Nguồn: [TurtleVariant.ts](../packages/game-core/src/variant/variants/TurtleVariant.ts), TRANSFERABLE_EFFECTS/BindHandler, SkillValidator/APPLY_EFFECT.

# - Angel
Passive – Heavenly Grace
- OnPieceDestroyed ally +2 AP mọi nguyên nhân, gồm King/summoned/expiry/sacrifice. Không silent removal/bite không chết, không giới hạn.

Skill 1 – Holy Seal (6 AP)
- Enemy không King, Stun D=3 refresh; không cooldown target3 vòng như bản cũ, cooldown entry0.

Skill 2 – Blessing (4 AP)
- Ally kể cả King; blessing D=0 ignore để OnEffectApplied xử lý ngay. Có debuff thì xóa mọi isDebuff=true, không có thì Shield D=1 refresh, sau đó gỡ Blessing.
- Judgment mark isDebuff=false không cleanse; gỡ debuff có thể chạy handler expiry khác.

Ultimate – Divine Judgment (14 AP)
- Không target; window per player counter10, giảm mọi OnTurnEnd gồm cuối cast. Opponent OnCapture gắn mark D=null ignore isDebuff=false lên attackerId, nhưng tìm ở to có thể sai với stayInPlace.
- Hết window destroy mọi mark nguồn caster, không loại King. Capture King vẫn terminal/Rebirth ngay, không chờ window.
- Nguồn: [AngelVariant.ts](../packages/game-core/src/variant/variants/AngelVariant.ts), BlessingHandler/JudgmentHandler.

# - Devil
Passive – Infernal Pact
- Mỗi OnTurnStart caster +1 AP, gồm lượt đầu nếu nạp trước start.

Skill 1 – Devil's Eye (5 AP)
- Ally không King; reject khi bất kỳ quân hai phe đã devil_eye. D=2 ignore.
- Cuối mọi lượt, getAttackedPieces enemy tới quân Eye thì Stun D=3 tất cả attackers, gỡ Eye; không cần capture, phụ thuộc attack query.

Skill 2 – Wrath Curse (4 AP)
- Enemy không King, Berserk D=null ignore countdown4, bỏ đầu lượt đầu rồi giảm mỗi đầu lượt target. Capture đúng ID tại to gỡ; timeout Stun D=3, không Silence.

Ultimate – Hellish Toll (14 AP)
- Không target, counter12 giảm mọi cuối lượt gồm cast. Chỉ MOVE_PIECE legacy chịu phí/check: Pawn/King0, Knight/Bishop2, Rook3, Queen4; CAPTURE/BITE không chịu phí.
- Thiếu AP reject; sacrifice ally không King lấy LOSS_AP, không tiêu main move/skill, có thể lặp theo điều kiện hiện tại. Không tự chọn quân.
- Nguồn: [DevilVariant.ts](../packages/game-core/src/variant/variants/DevilVariant.ts), DevilEyeHandler/DevilTollHandler/Validator, SACRIFICE_PIECE.

# - Phantom
Passive – Ghost Inheritance
- Before destroy ally Ghost: gần nhất Chebyshev, không King/Knight/đã Ghost/khác ID; hòa scan row/col. Ghost D=1 refresh, stealth nếu Spirit Walk. Sacrifice bypass before không trigger.
- Ghost sliding vượt obstacle đầu, có thể capture enemy obstacle thứ2 rồi dừng; Pawn nhảy2 qua vật cản. Không sửa hành vi này theo luật đích.

Skill 1 – Haunt (3 hoặc 0 AP)
- Ally không King/Knight, ghost D=3 refresh; freeSkill1Remaining>0 thì free và giảm1. Spirit Walk yêu cầu metadata.stealth=true cho effect mới; refresh cũ không cập nhật metadata.

Skill 2 – Possession (4 AP)
- Không target, player possession_active D=0 refresh. Ally Ghost capture đổi type vĩnh viễn thành captured.type, gỡ Ghost; không check loại nạn nhân.
- D0 skip tick lượt cast, không hook gỡ ngay cuối cast; có thể kéo tới cuối lượt caster kế tiếp, không đảm bảo “chỉ lượt này”.

Ultimate – Spirit Walk (7 AP)
- Set Ghost ally đang có duration/remaining5, stealth=true; cấp3 lần Haunt miễn phí, không3 vòng. Haunt mới vẫn D3. Player spirit_walk D=null.
- Cuối lượt màu quân kề enemy8 ô hoặc capture thì stealth=false. Ghost hết thì stealth mất; Maintenance gỡ Spirit Walk khi hết free use và không Ghost stealth của activePlayer.
- Nguồn: [PhantomVariant.ts](../packages/game-core/src/variant/variants/PhantomVariant.ts), PossessionHandler/StealthMaintenanceHandler, MoveGenerator Ghost functions.

# - Cannibal
Passive – Cannibal King
- King caster dùng moveset type đã ăn với allowAllyCapture=true; OnCapture tìm attacker tại to/from, lưu type nạn nhân. Ally capture nhận cả CAPTURE_AP+LOSS_AP, không AP destroy.
- State moveset flat, chưa cô lập mirror.

Skill 1 – Royal Guard (3 AP)
- Target chính ally King; shield D=2 refresh.

Skill 2 – Devour (5 AP)
- Ally không King; reject ultimate active. Snapshot moveset King, set type target làm moveset; devour D3 King +Stun D3 target, refresh, không giết target.
- OnEffectExpired trả snapshot kể cả cleanse; recast có thể ghi đè snapshot.

Ultimate – Apex Predator (8 AP)
- Không target, reject King có devour remaining>0. Snapshot moveset, active=true/count0, apex_predator D10 refresh.
- Queen+Knight moves, ăn ally được; mỗi2 King capture Shield D1 refresh. Expiry tắt/trả snapshot; captures trong ulti vẫn cập nhật state type nhưng hết ulti trả snapshot.
- Nguồn: [CannibalVariant.ts](../packages/game-core/src/variant/variants/CannibalVariant.ts), getBaseMovesForType, CAPTURE rewards.

# - Wizard
Passive – Arcane Mastery
- Skill1/2 dùng chung useCount per player, cost=base+floor(count/2)×2, không cap. OnSkillUsed tăng count.
- DeathCounterHandler mỗi OnTurnEnd: enemy đang bị Wizard attack tới +1 counter tối đa6, không theo số attackers. Không attack tăng turnsSinceLastAttacked, đủ6 cuối lượt gỡ.
- Before death trả count AP source, không sacrifice; chưa loại King, có thể reward trước handler sau hủy death. Aegis chặn effect mới, không check khi tăng metadata đã có. Attack query không full legal.

Skill 1 – Arcane Swap (base5 AP + escalation)
- Hai enemy khác ID không King; swap rồi enemy_position_swap D2 ignore. Hết tự nhiên swap vị trí hiện tại nếu partner còn effect; before death hủy cặp, không Shield/Stun.
- Không reject target có swap cũ; ignore có thể giữ liên kết cũ sau swap mới.

Skill 2 – Arcane Bind (base4 AP + escalation)
- Enemy không King, Bind D3 refresh, 5×5 quanh từng vị trí hiện tại.

Ultimate – Arcane Annihilation (14/12/10/8 AP)
- Không target, cần enemy Death Counter source=caster count đúng6. Số target1/2–3/4–5/>=6 tương ứng14/12/10/8.
- Destroy mọi target, không loại King trong getUltimateTargets; Shield không chặn, legacy King destroy có thể terminal.
- Nguồn: [WizardVariant.ts](../packages/game-core/src/variant/variants/WizardVariant.ts), getUltimateTargets/getEscalatedCost, DeathCounterHandler/EnemySwapHandler.

# - Earth
Passive – Ground Dominion
- Đầu lượt caster chốt Skill2 cost=max(3,6−số ally Mountain), không cập nhật lại khi tạo núi giữa lượt. Mountain/earth_reservation registry không moves, không attacked, reward0.

Skill 1 – Raise the Mountain (3 AP)
- Ô không quân, spawn Mountain special piece, mountain_timer D5 ignore. Không cell effect; chặn sliding/attack, không capture; expiry hook destroy. Không coi mọi jump đều bị cản bởi núi ở giữa.

Skill 2 – Shifting Peaks (3–6 AP chốt đầu lượt)
- Ally Mountain + ô trống khác cùng hàng/cột/chéo. Path không ally/other Mountain. Mô phỏng enemy xa trước gần sau, đẩy tối đa3 ô theo hướng, dừng biên/vật cản; reject nếu quân vẫn trên path/đích.
- PUSH rồi destroy núi cũ, spawn núi đích và nguồn ngay cùng queue, giữ remaining timer; không chờ cuối lượt. Không destroy enemy trực tiếp, có thể push King.

Ultimate – Earth-Burst Heavenly Star (10 AP)
- >=3 ally Mountain, enemy không King. Enqueue xóa núi, trực tiếp remove target không death/AP/graveyard; lưu snapshot, spawn reservation ở ô cũ với timer D=N số núi.
- Timer expiry hook destroy reservation/spawn target, gỡ shadow entry; cleanse timer có thể trả sớm. Không transaction rollback.
- Nguồn: [EarthVariant.ts](../packages/game-core/src/variant/variants/EarthVariant.ts), simulateShiftingPeaks, specialPieceRegistry.

# - Time
Passive – Temporal Burden
- ultimateUseCount chung2 Ultimate; cost lần1/2/3+ =6/9/15. Execute tăng kể cả không snapshot hữu ích; không passive thưởng AP.

Skill 1 – Rewind (4 AP)
- Không target, luôn canActivate. positionSnapshots[length−3], fallback đầu khi <3; không snapshot thì no-op vẫn mất AP. Snapshot mỗi START_TURN, giữ15.
- applySnapshot chỉ quân sống có ID trong snapshot, remove vị trí hiện tại rồi set vị trí cũ. Không hồi quân chết/tua AP/effects/type/graveyard; quân mới ở lại nhưng có thể bị setPiece ghi đè ô. Không OnMove riêng từng quân.

Skill 2 – Future Prediction (5 AP)
- Enemy +cell dự đoán, không cần legal destination/hướng, không cấm King. prediction D1 refresh.
- OnMove/OnCapture đầu đúng ID tại to: đúng ô thì Stun D4, đúng/sai đều gỡ. Không move thì expiry không phạt; stayInPlace có thể không resolve.

Ultimate – Grand Rewind / Time Freeze (6 → 9 → 15 AP)
- Core có2 entry ultimate, không command Time Collapse; cùng mục Skill3 giữ cả hai.
- Grand Rewind/time_grand_rewind: snapshot[length−11], fallback đầu, position-only, không thưởng AP.
- Time Freeze/time_time_freeze: player caster D6 refresh; enemy không King move/capture đúng ID tại to bị Stun D bằng remaining time_freeze hiện tại. Không chỉ chậm animation. Nếu cả hai TF tồn tại, handler ưu tiên White.
- Nguồn: [TimeVariant.ts](../packages/game-core/src/variant/variants/TimeVariant.ts), applySnapshot, PredictionHandler/TimeFreezeHandler.

# - Space
Passive – Spatial Outworld
- Skill1/2 tạo Outworld D2 refresh ở cổng mới; tên từ frontend, logic trong execute. Outworld chặn enemy đáp/sliding theo màu gốc; có thể ngăn root move trước portal interception.

Skill 1 – Dimension Link (3 AP)
- Hai ô không quân: odd sân mình/even sân enemy, không rank8; không check portal đã tồn tại. Cặp portal ẩn D=null, kèm Outworld D2.
- MOVE/CAPTURE path tới odd phe khác: enqueue destroy occupant even bất kỳ, MOVE tới even, REMOVE_PORTALS thay action gốc; không capture reward occupant.
- Ally tại odd: đầu lượt caster ghi occupant ID, đầu lượt caster kế còn cùng ID thì destroy occupant đích/FOOL_MOVE/xóa cặp. Cleanup occupant đầu/cuối lượt; không đợi vòng sau xóa sau teleport. King đích không bị loại khỏi destroy request.

Skill 2 – Spatial Shift (4 AP)
- Cell portal mình: đổi cột, giữ row (A1/O15→O1/A15). Destroy enemy effective owner ở hai đích, kể cả King; sửa pair, public portals, sync, Outworld D2.
- Không dịch ally đứng cổng/check ally đích. Sync chỉ xóa dimension, Outworld cũ còn.

Ultimate – Cosmic Void (9 AP)
- Không target, không ẩn/remove2 ally. Player D10 refresh, expiryRound=turnNumber+10.
- OnCapture nạn nhân khác màu caster khi còn buff tạo Outworld tại to D=expiry−turnNumber; hook không check activePlayer. Generic tick/skip, không sweep absolute expiry, không đảm bảo mọi block hết đồng thời.
- Nguồn: [SpaceVariant.ts](../packages/game-core/src/variant/variants/SpaceVariant.ts), syncDimensionPortalCellEffects/cleanupPortalOccupants, checkPortalInterception.

# - Puppet
Passive – Puppet Strings
- OnEffectExpired Stun metadata sourceSkill=puppet_strings/puppetPlayer=caster, quân sống nhận Bind D2+puppet_no_capture D=null; OnMove đầu gỡ no_capture.
- Puppet_control gỡ thuộc caster cũng Bind D2 nếu target sống, kể cả cleanse. Soul Binding trực tiếp Bind ở redirect, không generic mọi skill.

Skill 1 – Soul Binding (4 AP)
- Hai ally khác ID Main/Voodoo, không cấm King. Xóa mọi main/voodoo hai phe rồi gắn cặp mới D=null ignore.
- CAPTURE Main tìm Voodoo đầu toàn board, Bind D2 attacker, enqueue CAPTURE từ from tới Voodoo giữ stayInPlace; Main sống. Voodoo chết xóa mọi Main. Direct destroy Main không redirect.

Skill 2 – Puppet Strings (3 AP)
- Ô không quân/chưa puppet_trap, hidden D=null ignore. OnMove/OnCapture khác màu: Stun D2 refresh metadata chain, xóa trap.
- Gỡ Stun tạo Bind2/no_capture; refresh Stun có sẵn giữ metadata cũ nên chain có thể không chạy.

Ultimate – Puppet Master (Pawn2; Knight/Bishop5; Rook8; Queen11 AP)
- Enemy không King/walker/puppet_control, đủ actualCost; core trừ2, extra cost−2, unknown type fallback2.
- Control D7 ignore controlledBy=caster, giữ màu, quyền ngay. remaining>5 chỉ cấm capture, vẫn move ô trống; <=5 được capture. Tick theo màu gốc, Pawn hướng màu gốc/cấm promotion.
- Expiry/gỡ trả quyền màu gốc, Bind D2 nếu sống; không2 vòng “không được di chuyển” như bản cũ.
- Nguồn: [PuppetVariant.ts](../packages/game-core/src/variant/variants/PuppetVariant.ts), PuppetControlHandler/PuppetTrapHandler/PuppetNoCaptureHandler, CAPTURE redirect.

# - Cherubim
Passive – Dual Casting
- maxSkillsPerTurn2, preventDuplicateSkillsPerTurn: hai skill khác ID một ply đủ AP/trước pass. Auto-end đã move và dùng>=1 skill thì kết thúc, không đợi2; muốn đủ2 phải cast trước move.

Skill 1 – Ascend (2 AP)
- Ally Pawn, Ascend D=null ignore progress0/completed=false. Bỏ cuối lượt cast, sau5 tick cuối lượt caster ready, không tự transform. Recast ignore không reset.
- Pawn promotion thường vẫn được vì ascend không trong no-promotion gate; OnPawnPromotion gỡ Ascend.

Skill 2 – Fountain of Youth (5 AP)
- Ô không quân, cell effect được. Totem special piece D3 totem_timer, moves rỗng, bị capture được/reward0.
- Cuối mọi lượt cleanse3×3 mọi Totem: mọi cell effect, ally chỉ debuff, enemy mọi piece effect trừ ascend. Gỡ timer kể cả cleanse destroy Totem; không cleanse ngay execute. Mirror hook quét Totem có thể hai lần.

Ultimate – Divine Ascension (12 AP)
- Có ally Pawn Ascend.completed: không target, đổi tất cả thành Queen/gỡ Ascend/PAWN_PROMOTION; không enqueue promotion AP như promotion thường.
- Không ready:1 ô trống nửa sân mình, spawn Pawn thường vĩnh viễn, không auto Ascend/no_promotion.
- Nguồn: [CherubimVariant.ts](../packages/game-core/src/variant/variants/CherubimVariant.ts), cleanseAroundTotem, TurnPhaseValidator/auto-end.

# - Joker
Passive – Counterplay
- CHƯA XÁC ĐỊNH TỪ CODE. Chỉ thiết kế cũ Counterplay/Real Seal; không registry/catalog/handler runtime.

Skill 1 – Jester's Trick (runtime/AP: CHƯA XÁC ĐỊNH TỪ CODE)
- CHƯA XÁC ĐỊNH TỪ CODE. Thiết kế cũ4 AP:3 Seal1 thật/2 giả, Stun/Silence/Berserk/Fool/Bind, cấm lặp debuff2 vòng; không phải luật đã triển khai.

Skill 2 – Joker's Gift (runtime/AP: CHƯA XÁC ĐỊNH TỪ CODE)
- CHƯA XÁC ĐỊNH TỪ CODE. Thiết kế cũ4 AP:3 Seal1 thật/2 giả, Blessing/Shield/Marksman/Ghost/Electron.

Ultimate – Choice of Fate (runtime/AP: CHƯA XÁC ĐỊNH TỪ CODE)
- CHƯA XÁC ĐỊNH TỪ CODE. Thiết kế cũ8 AP: Joker Đen xóa Seal debuff giả/nhân duration thật; Joker Đỏ đổi Seal buff giả thành thật.
- Hoãn, chỉ tài liệu; nguyên văn mọi duration/target/ngoại lệ thiết kế được giữ trong [snapshot](rebuild-audit/Variants.original.md), không tự implement.

# - Dragon Sentinal
Passive – Dragon Guard
- Runtime name=Dragon Sentinel/id=dragon_sentinel, giữ heading cũ. Cuối Black tăng counter flat; mỗi counter chẵn ally không King gần King nhất Manhattan nhận Shield D1 refresh; hòa scan row/col, gồm special, không bỏ quân đã Shield.
- Mirror có thể tăng2 lần/cùng state, không xác nhận độc lập mỗi bên.

Skill 1 – Subterranean Escape (4 AP)
- Ally không King/chưa escape, D2 refresh. Before death reason=capture lưu snapshot bỏ escape, returnRound=turnNumber+2.
- Handler không cancelled: death/capture/AP/graveyard vẫn xảy ra. Đầu lượt owner tới round: destroy occupant ô cũ bất kỳ kể cả King rồi spawn snapshot. Không “capture bị hủy”.

Skill 2 – Shockwave (3 AP)
- Ally tâm, cần enemy trong8 ô quanh. Enemy kể cả King push xa1 theo dc/dr nếu trong bàn/đích không quân; cản thì giữ. Không destroy/check mọi cell effect đích.

Ultimate – Dragon's Roar (10 AP)
- Cell cùng hàng/cột khác King, không cần kề; reject roar active. Snapshot vị trí/hướng; channeling D5 turnStart khóa King.
- Mọi ally không King OnPieceDestroyed khi channel giảm remaining, không chỉ sacrifice; gỡ channel khi<=0, expiry hook bắn beam.
- Beam hướng tới rìa destroy enemy không King/đặt beam cells D5 turnEnd, channeling mới D5 turnStart khóa King thêm. Enemy không King OnMove/OnCapture đáp beam destroy. Channel expiry lần2 clear roar; hai timing không bảo đảm cùng cleanup.
- Nguồn: [DragonSentinelVariant.ts](../packages/game-core/src/variant/variants/DragonSentinelVariant.ts), fireBeam/SubterraneanEscapeHandler/DragonsRoarBeamHandler.

# -Colossus
Passive
- CHƯA XÁC ĐỊNH TỪ CODE hiện hành. Thiết kế cũ Titan tồn tại4 vòng nhận4 AP; không registered definition.

Skill 1 – Titan Summoning (runtime/AP: CHƯA XÁC ĐỊNH TỪ CODE)
- CHƯA XÁC ĐỊNH TỪ CODE. Thiết kế cũ5 AP:4 ally chờ4 vòng/hiến tế thành Titan2×2, đi trước4 ô/4 mạng; asset không chứng minh runtime.

Skill 2 – Guardian Link (runtime/AP: CHƯA XÁC ĐỊNH TỪ CODE)
- CHƯA XÁC ĐỊNH TỪ CODE. Thiết kế cũ4 AP,2 ally giá trị khác nhau liên kết2 vòng, death redirect/Shield theo loại.

Ultimate – Earth Tremor (runtime/AP: CHƯA XÁC ĐỊNH TỪ CODE)
- CHƯA XÁC ĐỊNH TỪ CODE. Thiết kế cũ10 AP, Stun enemy trong hướng Titan3 vòng.
- Hoãn; stale dist/asset Titan không nguồn luật. Nguyên văn thiết kế/ngoại lệ giữ tại [snapshot](rebuild-audit/Variants.original.md).

# - Lord
Passive – Overwhelm
- Cuối Black khi turnNumber chia hết5, +abs(chênh số quân hai màu) AP, kể cả caster ít quân. Count King/summoned/special; bằng nhau không thưởng.

Skill 1 – Vanguard Command (4 AP)
- Ally nguồn, scan3 ô cùng cột phía trước màu caster cần enemy trong khoảng; destroy quân đầu gặp kể cả ally, King đầu thì reject. Không move/capture AP.

Skill 2 – Reinforcements (4 AP)
- Chọn min(2,ô trống sân mình) ô khác nhau; hết ô có thể0 target/cast mất AP không spawn.
- Pawn no_promotion D=null; count trước summon ally>=enemy → summon_duration D3; ít hơn1–3 → D5; ít hơn>3 → vĩnh viễn. Expiry tự nhiên destroy, cleanse duration có thể tránh despawn.

Ultimate – Iron Authority (9 AP)
- Không target, silence enemy D3 nếu ally<=enemy, D5 nếu nhiều hơn; refresh, blockUltimate=false: chỉ Skill1/2. Refresh silence cũ không thay metadata, có thể vẫn chặn Ultimate từ nguồn khác.
- Nguồn: [LordVariant.ts](../packages/game-core/src/variant/variants/LordVariant.ts), getVanguardTarget/countSurvivingPieces, SummonDurationHandler.

# - Pirate
Passive – Debt of the Seas
- Setup pirateDebtEnabled player; cast khi AP>=0 và AP−baseCost>=−10, đang âm cấm skill tiếp. SPEND clamp−10, GAIN cộng tự trả nợ; không debt record riêng.

Skill 1 – Bet (4 AP)
- Không target, reject nợ/còn Bet; player pirate_bet D2 ignore. Opponent OnSkillUsed bất kỳ +8 AP/xóa Bet; hết không thưởng/phạt thêm.

Skill 2 – Sailing (7 AP)
- Ally không King/chưa sailing +ô trống bất kỳ; D2 ignore, block normal move/capture.
- OnEffectExpired mọi reason: còn quân/đích trống thì MOVE; enemy không King thì CAPTURE; ally/King enemy thì đứng. Derived có trap/portal/Shield, không root validators; có thể set hasMoved tại lượt cleanup. Cleanse kích hoạt sớm.

Ultimate – Broadside (12 AP)
- Không target/không cần Rook. Scan ally Rook row/col, bắn quân đầu cùng cột phía trước; ally/King chặn. Enemy không King CAPTURE stayInPlace, sau đó destroy enemy không King trong3×3, không ally.
- Grid mô phỏng deduplicate/nạn nhân cho Rook sau chưa mô phỏng Shield/redirect thật; blast có thể chạy dù capture bị hủy.
- Nguồn: [PirateVariant.ts](../packages/game-core/src/variant/variants/PirateVariant.ts), SailingHandler/PirateBetHandler/APValidator.
