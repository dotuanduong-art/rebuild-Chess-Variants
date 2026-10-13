# 01 — Kiểm kê project legacy

Ngày kiểm kê: 2026-10-13. Phạm vi là working tree D:/Variants, không chỉ HEAD. HEAD lúc bắt đầu: cf85a31 (G1.8: keep roadmap pending for coverage gaps). Đã đọc git log 20 commit và bảng task hiện tại; G1.4–G1.7 đã có commit, G1.8 vẫn SẴN SÀNG trong roadmap. Đây là công việc tài liệu A/B độc lập, không tuyên bố hoàn tất task gameplay nào.

Working tree đã có nhiều thay đổi source/config/spec, docs/Variants.md đã modified; AGENTS.md, Effect.md, Variants.md ở root chưa track. Không reset/clean hoặc sửa các thay đổi này. Snapshot Variants được lấy từ nội dung working tree, không từ HEAD.

## Cấu trúc xác nhận

| Đường dẫn | Chức năng thực tế |
|---|---|
| package.json, package-lock.json, tsconfig.base.json | npm workspaces packages/* và apps/*; build core→backend→frontend |
| packages/game-core/src | TypeScript engine, Match, state/action/event/effect/move/variant/view |
| apps/backend/src | NestJS, app bootstrap/controller; auth port/provider/session registry; GameService/GameGateway |
| apps/backend/test | 2 E2E spec: app.e2e-spec.ts, authoritative-protocol.e2e-spec.ts; jest-e2e.json |
| apps/frontend/src/app | Next App Router, page/layout/CSS, font local |
| apps/frontend/src/components | Board/Piece/Square, Lobby/Draft/Reveal/Loading, ActionBar, thông tin/timer/panel, VariantsViewer |
| apps/frontend/src/lib | Socket.IO client, Supabase client, variantsData catalog |
| apps/frontend/src/store/gameStore.ts | Zustand, socket events, target selection, animation, local legal hints |
| apps/frontend/src/debug/layoutMask.ts | Debug UI |
| apps/frontend/public | 44 PNG và 5 SVG, xem manifest; artwork/pieces/effects/logo/background |
| docs | GDD.md, Effect.md, Variants.md, audit cũ; rebuild-audit mới |
| GDD.md, Effect.md, Variants.md, AUDIT.md | Tài liệu root trùng/chồng với docs; giữ nguyên để đối chiếu, chưa chọn một bản bằng tên |
| .github/workflows/ci.yml | CI install/build/typecheck/unit/E2E/lint report/offline build/hygiene |
| AGENTS.md, apps/frontend/AGENTS.md, apps/frontend/CLAUDE.md | Hợp đồng làm việc và hướng dẫn frontend; tham khảo trước khi sửa repository mới |
| node_modules, packages/game-core/dist, apps/*/dist, apps/frontend/.next | Dependency/build/cache, không nguồn luật; đường dẫn tồn tại có thể khác tùy build local |

## Module core

- board: Board.ts, Position.ts — grid 15×15 và cell effects, algebraic.
- pieces: Piece.ts, initialLayout.ts, SpecialPieceRegistry.ts — màu/type/controller, đội hình 60 quân, special pieces.
- movement: MoveGenerator.ts, slidingMoves.ts và pawn/rook/bishop/knight/queen/kingMoves.ts.
- modifier: MoveModifier.ts, MoveModifierChain.ts, CellEffectBlockModifier.ts.
- combat: AttackDetection.ts — threat query dùng bởi nhiều passive/skill.
- validation: MoveValidator.ts; validator root/phase/AP/skill còn nằm trong action/ActionPipeline.ts.
- action: Action.ts, ActionQueue.ts, ActionPipeline.ts, ActionHistory.ts.
- state: GameState.ts, Graveyard.ts, Snapshot.ts.
- event: GameEvent.ts, EventBus.ts, ResolutionOrder.ts.
- effect: Effect.ts, EffectHandler.ts, EffectRegistry.ts, zombieAttack.ts, handlers/*.ts.
- match: Match.ts, TurnClock.ts, terminal.ts.
- region: Region.ts; rng: DeterministicRng.ts.
- variant: Variant.ts, Skill.ts, VariantRegistry.ts, allVariants.ts, apCostConfig.ts, variants/*.ts.
- view: MatchView.ts — projection theo 5 role.

## Registration và integration

[CONFIRMED] ALL_VARIANTS có 27 definition; Match constructor register tất cả. GameService.startMatch gọi setVariants rồi start; setVariants nạp hook/effect/modifier/validator. Source không có definition Joker/Colossus được import vào registry. StubVariants.ts chỉ còn helper createStubSkill trả action rỗng, không exported variant. Frontend VARIANTS_LIST có 27 ID tương ứng; Time frontend một Ultimate, core hai entry. Xem 06_VARIANT_AUDIT.md để có danh sách đầy đủ.

## Tests và tài nguyên

[CONFIRMED] Có 55 unit spec dưới apps/backend/src (gồm game/auth/variant/core và app smoke); không có thư mục test core riêng đang dùng. Hai E2E spec dùng Nest application/Socket.IO thật. Một Jest snapshot được unit suite kiểm tra. Chưa có perft/mirror gameplay matrix toàn variant được xác minh chỉ bằng file names.

[CONFIRMED] Public artwork có 13 hình variant, 12 hình classic pieces, 3 hình skill Lightning, 7 hình effect Lightning/Phoenix/Space, 4 hình special Earth/Cherubim, 2 hình Titan và 3 hình logo/background (tổng44 PNG). Số13 artwork không bằng27 runtime variant. Có Titan Colossus asset nhưng không active source. Font PressStart2P-Regular.ttf đi cùng OFL.txt; layout dùng next/font/local. Không tìm thấy file audio/video trong danh sách source/assets không-generated đã quét. Quyền artwork chưa được chứng minh từ các PNG.

## Persistence và cấu hình

[CONFIRMED] GameService.rooms là Map trong process, AuthSessionRegistry quản lý session trong process. Snapshot/serialization có trong core nhưng không đồng nghĩa database/restart restore. Không thấy migration/schema/ORM/game datastore module trong source/dependency manifests đã kiểm; Supabase hiện được dùng cho Auth, không phải bằng chứng persistence match.

Chỉ kiểm tên đường dẫn env, không đọc hoặc chép credential. .env.example là template phải rà soát trước tái sử dụng. Config kiến trúc cũ và package-lock chỉ là tham khảo của baseline, không lệnh tự nâng dependency.
