# 03 — Hệ thống gameplay hiện hành

Các kết luận dưới là [CONFIRMED] qua code, trừ giới hạn được ghi [UNKNOWN]. Paths repository-relative; symbol giúp mở lại source khi line trôi.

| Hệ thống | Luồng thực thi / hành vi | Source và symbol |
|---|---|---|
| Board/piece | Grid 15×15, Piece id/type/color/effects/specialType; cell effects Map; controller từ Walker trước Puppet | packages/game-core/src/board/Board.ts: Board; pieces/Piece.ts: getPieceOwner |
| Đội hình | Mỗi bên30:15 Pawn, back rank R N B R N B Q K Q B N R B N R; White rank1/2, Black15/14 | pieces/initialLayout.ts: createInitialBoard |
| Movement | Pawn trước1/2 từ hàng đầu, capture chéo, không en-passant; Bishop chéo+ngang1; King thường không check legality; Queen/Rook/Knight base geometry | movement/*Moves.ts, MoveGenerator.getBaseLegalMoves |
| Legal action | Root requester/currentTurn/effective owner, phase/hasMoved, geometry+modifier; surrender được ngoài lượt | action/ActionPipeline.ts: RootActionAuthorityValidator/BasicMoveValidator/TurnPhaseValidator; validation/MoveValidator.ts |
| Modifier | Base moves rồi modifier priority tăng; modifier có thể thêm lại targets, không chỉ lọc | modifier/MoveModifierChain.ts: computeLegalMoves; EffectRegistry.wireToMoveModifierChain |
| Turn | START_TURN snapshot/OnTurnStart/tick start/reset; root move+skill/pass/không skill khả dụng auto end; END_TURN event/tick/end-cleanup/switch/start | ActionPipeline.applyAction; Match.submitAction |
| Round/duration | turnNumber tăng về White; generic effect counter theo màu target/source/player, skip lượt apply; Ruler/Kaze/Angel/Devil/counter riêng không cùng quy ước | ActionPipeline.TICK_EFFECTS, variants/*.ts, handlers/JudgmentHandler/DevilTollHandler |
| AP | Ban đầu0; capture2/3/3/4/5 và loss1/2/2/3/4, promotion3; no cap gain; SPEND clamp0 hoặc−10 Pirate; dynamic cost/surcharge/extra phân tán | ActionPipeline.CAPTURE_AP/LOSS_AP/PROMOTION_AP/APValidator/USE_SKILL/SPEND_AP |
| Effects | Piece/cell/player, refresh/ignore/stack theo type; apply event, tick, remove event; cleanup qua OnEffectExpired kể cả cleanse | effect/Effect.ts, EffectRegistry.ts, ActionPipeline.APPLY_EFFECT/REMOVE_EFFECT/TICK_EFFECTS |
| Status | Stun block move/capture, Silence player block skill tiers, Aegis targeting/application, Shield capture-only, Bind mỗi bước5×5, Soulless original-position release | effect/handlers/*.ts; ActionPipeline.SkillValidator/submitAction |
| Event/order | Synchronous handlers priority tăng, cancelled dừng handler sau; handlers enqueue FIFO derived action; effectType de-dup per event | event/EventBus.ts, ResolutionOrder.ts; effect/EffectRegistry.ts, variant/VariantRegistry.ts |
| Capture/death | Portal/Main interception trước before-death/before-capture; capture/move board; OnCapture/Destroyed/Death, graveyard/rewards queue; pending King resolve sau drain | ActionPipeline.CAPTURE/DESTROY_PIECE/SACRIFICE_PIECE/submitAction |
| Summon/revive | SPAWN overwrite bằng setPiece; temporary SummonDuration expire→destroy; Phoenix graveyard revive, Zombie Walker revive, Lord Pawn, Cherubim Totem/Pawn, Earth Mountain/reservation | ActionPipeline.SPAWN_PIECE; SummonDurationHandler; variant execute |
| Rule modifiers | Ruler capture laws/domain; Cannibal King move override; Ghost obstacle; Thunder Fang extra rays; Flame/Outworld restrictions | RulerVariant/CannibalVariant; movement/MoveGenerator; ThunderFangHandler; CellEffectBlockModifier |
| Terminal | Một applyTerminalTransition/GAME_OVER gate idempotent,7 reason; pending King có Phoenix intercept; destroy King legacy cũng tạo pending | match/terminal.ts; ActionPipeline.applyTerminalTransition/submitAction |
| Win/draw | King captured/dead legacy, clock/turn/disconnect/surrender; threefold/abandoned có type/factory nhưng không thấy automatic repetition detector trong source quét | terminal.ts, Match.ts, backend/game.service.ts |
| Clock | 15 phút/bên, hard15 giây trừ White ply0; remaining<60 giây sau end ply được +5 giây; override Terrain bỏ trừ chess clock và service dùng skip deadline riêng | match/TurnClock.ts, Match.submitAction, GameService.armTurnDeadline |
| Random/ID | DeterministicRng seed/counter được dùng skill/timeout; Date.now seed/effect IDs/snapshot và Math.random ID vẫn còn gameplay path | rng/DeterministicRng.ts, state/GameState.ts, Snapshot.ts, LightningVariant/ThunderDragonVariant/handlers |
| Variant setup | ALL_VARIANTS27; Match register, setVariants load handler/hooks/modifiers/setup/initial flat state/validators, rewire validation/moves | variant/allVariants.ts, VariantRegistry.loadForPlayer, Match.setVariants |
| Skill pipeline | Gateway→context→GameService.useSkill→Match.useSkill→root/phase/AP/Aegis/canActivate→USE_SKILL enqueue base cost→execute direct mutation/actions→OnSkillUsed→drain/history | backend/src/game/game.gateway.ts, game.service.ts; core ActionPipeline |
| Projection | White/Black/live spectator/postgame replay/server log allowlists, hide effects/stealth/state metadata, current costs and targets DTO | view/MatchView.ts: projectMatchView/projectGameStateView/projectActions |
| Networking/auth | Socket seat context, AuthPrincipal provider-neutral; Supabase adapter; committed result→deliveries; reconnect credential session registry | apps/backend/src/auth/*; game/game.service.ts, game.gateway.ts |
| Client | Zustand socket listeners/animation/delayed board writes; server targets có nhưng legal-move query còn dùng base projected board, không full modifier | apps/frontend/src/store/gameStore.ts; GameService.getLegalMoves |
| Persistence | Map rooms/session + serializable snapshots; chưa external game datastore/ordered event restore/TTL | GameService.rooms, AuthSessionRegistry, core state/serialization |

## Call chain cần nghiên cứu khi rebuild

1. GameGateway chỉ nhận event/context; GameService resolve seat và gọi Match, không tin màu client.
2. Match.setVariants nạp registry trước Match.start; registration không đồng nghĩa mọi handler đã có consumer/validator đúng.
3. submitAction root validation trước enqueue; drainQueue không validate lại mọi derived action, không transaction rollback.
4. USE_SKILL enqueue SPEND_AP nhưng execute chạy ngay; mutable state trong execute không được undo khi queue thất bại.
5. Event hook có thể enqueue action trước cleanup/reward; FIFO và cancelled priority phải thành contract/test rõ ràng.
6. DTO dùng allowlist, không public serialization toàn GameState. toSerializable là snapshot nội bộ, không thay thế projector.

Tham khảo từng khả năng tại docs/Variants.md và 06_VARIANT_AUDIT.md. Không “sửa” Bishop/Ghost/Devil sacrifice bằng luật cờ vua thông thường; không đưa Joker/Colossus/AI vào rebuild scope trước quyết định mở lại.
