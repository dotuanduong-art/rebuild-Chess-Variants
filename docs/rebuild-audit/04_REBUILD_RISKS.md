# 04 — Rủi ro có bằng chứng

Đây là finding của hiện trạng, không sửa source. [CONFIRMED] nghĩa đã đọc logic hoặc có probe nêu rõ; severity dưới là mức cần giải quyết cho rebuild, không đánh giá exploit hoàn chỉnh.

| Ưu tiên | Finding | Bằng chứng source/symbol | Hệ quả/việc phải quyết |
|---|---|---|---|
| P0 | Queue chưa atomic/rollback | ActionPipeline.submitAction/drainQueue:500 chỉ warn rồi success; execute mutation trực tiếp | Định nghĩa root transaction gồm derived/history/events và rollback trước port |
| P0 | Snapshot chưa sâu đầy đủ | Board.clone/toSerializable shallow Effect.metadata; GameState.fromSerializable spread variantState; SnapshotManager capture/key round | Đừng dùng snapshot như immutable oracle; clone nested, identity ply/player |
| P0 | Mirror flat state/hook coupling | VariantRegistry.loadForPlayer spread getInitialState; Ruler/currentLaw, Cannibal/ultimateActive, Kaze/windSigils; Cherubim hooks scan mọi Totem | Namespace player/variant, test self-match; smoke start27 không gameplay isolation proof |
| P0 | Destroy King vẫn terminal | ActionPipeline.DESTROY_PIECE→pendingDeadKings; ThunderDragon Wrath/Wizard annihilation/Space requests không exclude King | Phân biệt capture/destroy theo O-6b trước chốt ruleset |
| P0 | Clock override lệch dual-clock đích | GameService.armTurnDeadline dùng override_skip thay nextDeadline; Match.submitAction endPlyWithoutClockChange | Quyết định Terrain với clock chung; không giả định song song hoạt động dưới override |
| P0 | Persistence process-only | GameService.rooms Map; không game datastore/migration trong source quét | State/event/version/TTL/restart restore phải được thiết kế mới |
| P1 | Thunder Fang thiếu consumer trong match đơn | ThunderDragonVariant effectHandlers chỉ Electric/ThunderFang; ThunderTrapHandler nội bộ LightningVariant | Runtime probe: handler=false, move vào trap không Stun, trap còn. Không chỉ từ tên class |
| P1 | Attack query khác full legal chain | AttackDetection.getPieceAttackSquares bỏ Stun nhưng không áp Ghost/Bind/Sailing/Cannibal/Fang modifiers; getAttackedSquares dùng owner nhưng Pawn direction màu gốc | Devil Eye/Phoenix/Predator/Wizard nhận semantics threat khác action legality |
| P1 | Controller và màu gốc không thống nhất | Piece.getPieceOwner vs MoveGenerator/PawnMoves/ActionPipeline.checkPawnPromotion/TICK_EFFECTS | Walker/Puppet Pawn vẫn hướng màu gốc, Puppet cấm promote; Q-17 chưa migrate |
| P1 | Non-deterministic ID/time | LightningVariant/handlers/ThunderDragonVariant Date.now/Math.random; GameState constructor Date.now seed; SnapshotManager Date.now | Inject RNG/ID/clock, không coi seeded RNG đủ replay determinism |
| P1 | Effect remove/refresh contract | ActionPipeline.REMOVE_EFFECT cell branch không set removed; refresh chỉ remaining; OnEffectApplied luôn emit | Collision/owner/metadata cũ, chain cleanse/expiry không nhất quán |
| P1 | Death trước committed/state coupling | Fate/Phantom/DeathCounter OnBeforePieceDestroyed; EventBus cancelled dừng hook sau; sacrifice bypass before | Phải kiểm reward/cleanup khi death hủy; trước-death không đồng nghĩa death thật |
| P1 | Graveyard-based passive count | Nephalem graveyard+1 trước ADD_TO_GRAVEYARD; Guardian giá theo length; Zombie revive không remove entries | Multi-death cùng queue, resurrect và discount/progress có thể khác ý đồ |
| P1 | Hardcoding/cycles | ActionPipeline import SpaceVariant.syncDimensionPortalCellEffects; SpaceVariant import Action; GameState↔Match import; Match imports Kaze helpers/skill-specific target logic | Có import cycles trực tiếp, chưa chứng minh cycle runtime fail; đặt shared model và port riêng |
| P1 | Target hint khác validation | Guardian/Phoenix requirements empty nhưng canActivate không empty; SkillValidator chỉ Aegis +canActivate | UI có thể hạn chế hơn server; không coi requirements là protocol schema |
| P1 | Runtime duration khác descriptions | TICK_EFFECTS owner/source tick +skip; Phantom Possession D0; Thunder Scale D2; Judgment10/Toll12 all-ply counters; Ruler cast tick | Chốt scheduler contract round/ply trước port expected |
| P1 | Client board ordering/listener lifecycle | gameStore.initSocketListeners socket.on không off/cleanup trong function; timeout board=data.board ở1041/1140/1207 (line kiểm tại lần quét) | Event mới có thể bị stale timer ghi đè; revision/cancel và remount tests |
| P1 | Server legal query chưa full authority hints | GameService.getLegalMoves tạo Board từ view rồi getLegalMoves base; Match.getLegalMovesAt dùng modifier chain khác | Hints/special restrictions có thể khác validator; không dùng projected board làm full engine |
| P1 | Dynamic cost không một seam | Phoenix/Puppet base+extra; Emerald transfer chỉ OnSkillUsed.actualCost | UI/currentCost và reward/cost log cần tổng actual cost rõ ràng |
| P2 | Assets không đầy đủ/license unknown | Public13 variant PNG vs27 runtime; Colossus Titan images; OFL font license có, artwork license không thấy | Rà soát artwork quyền/trùng lặp và fallback, không infer variant từ asset |

## Code và docs/decisions lệch nhau

[CONFIRMED] Zombie free3 uses, Predator mọi ally range, Thunder Fang ray captures, Guardian Sanctuary4/Stun2, Nephalem Chains2, Time hai Ultimate/King immunity, generic destroy AP, Puppet controller/promotion đều chưa là luật đích. Q/O đã chốt không cần hỏi lại để xác định luật đích, nhưng nhiệm vụ này chỉ ghi nhận. Space/Verdant phải ghi theo code hiện tại trong catalog legacy, không giữ mô tả cũ. Chi tiết mỗi variant tại 06_VARIANT_AUDIT.md và docs/Variants.md.

## Giới hạn chứng minh

- Unit55/681 pass là baseline legacy, không chứng minh mọi oracle đúng theo Q/O.
- Registration/start và mirror/start27 pass không chứng minh self-match skills/cleanup/state độc lập.
- [UNKNOWN] đầy đủ tổ hợp Shield/Bomb/Fate/control/portals; chưa có exhaustive adversarial/perft corpus.
- E2E trong sandbox cần xem kết quả cuối tại06; websocket error không được tự quy thành bug luật hay kết luận production networking hoạt động.
- Không chạy dependency security/network audit, không khẳng định package an toàn; không đọc secret và không sửa runtime.
