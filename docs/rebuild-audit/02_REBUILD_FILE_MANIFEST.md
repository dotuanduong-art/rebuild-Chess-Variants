# 02 — Manifest Clean Rebuild

Đường dẫn đều repository-relative. Đây là danh sách tham chiếu, không có source copy/ZIP/migration. KEEP nghĩa là giữ bằng chứng/tài sản, không mặc nhiên biến mọi oracle legacy thành luật rebuild. P0=cần đọc trước thiết kế, P1=cần cho implementation/verification, P2=tùy UI/scope, X=không chuyển.

| Đường dẫn gốc / nhóm | Phân loại | Mục đích, lý do | Mức cần | Phụ thuộc/lưu ý |
|---|---|---|---|---|
| docs/rebuild-audit/*.md | KEEP | Handoff, inventory, risk, evidence, snapshot gốc | P0 | Không xem runtime smoke như acceptance mọi luật |
| docs/Variants.md | KEEP | Hành vi legacy từng khả năng, code-first | P0 | Đối chiếu quyết định đích; D không tự đổi thành ply |
| docs/GDD.md, docs/Effect.md | KEEP | Design/spec context | P0 | Có thể lệch code; không oracle runtime |
| docs/audit/06-decisions.md, 07-roadmap-final.md | KEEP | Luật đích, dependency và release gates | P0 | Cao hơn hành vi legacy khi chọn ruleset mới |
| docs/audit/00-overview.md, 01-rules-as-implemented.md, 02-findings.md, 03-unfinished-work.md, 05-open-questions.md, 08-variant-diff.md, 09-implementation-log.md | KEEP | Bằng chứng/điểm chưa xong/đối chiếu lịch sử | P0 | Mở lại source, line cũ có thể trôi |
| docs/audit/04-roadmap.md, docs/audit/archive/ | REFERENCE ONLY | Lịch sử đề xuất | P2 | Không thay roadmap-final bằng bản cũ |
| GDD.md, Effect.md, Variants.md, AUDIT.md | KEEP | Ngữ cảnh thiết kế và thay đổi chưa commit | P1 | So sánh với docs; không overwrite/rename các bản gốc |
| AGENTS.md, apps/frontend/AGENTS.md, apps/frontend/CLAUDE.md | REFERENCE ONLY | Hợp đồng thao tác/hướng dẫn cũ | P0 | Repository mới phải xác lập lại scope phù hợp |
| packages/game-core/src/match/, action/, state/ | REFERENCE ONLY | Luồng authoritative, reducer/queue/snapshot/clock | P0 | Không copy trực tiếp mutation/rollback gaps |
| packages/game-core/src/variant/variants/ | REFERENCE ONLY | Từng canActivate/execute/passive/modifier | P0 | allVariants mới là runtime list; Stub helper không variant |
| packages/game-core/src/variant/allVariants.ts, VariantRegistry.ts, apCostConfig.ts | REFERENCE ONLY | Wiring, AP baseline, runtime IDs | P0 | Dynamic cost còn trong execute và apCost; namespace flat cần thiết kế lại |
| packages/game-core/src/effect/handlers/, EffectRegistry.ts, zombieAttack.ts | REFERENCE ONLY | Execution/cleanup/chain/control, consumer thực | P0 | Có hardcoding và effect-name drift |
| packages/game-core/src/board/Board.ts, movement/MoveGenerator.ts, combat/AttackDetection.ts, modifier/MoveModifierChain.ts | REFERENCE ONLY | Base move, Ghost, threat, chain | P0 | Threat khác legal chain, shallow clone |
| packages/game-core/src/board/Position.ts, region/Region.ts, movement/*Moves.ts | REVIEW BEFORE REUSE | Utility/geometry/pure move rules | P1 | Bishop ngang1 là rule chính thức; kiểm biên/algebraic, effect/controller |
| packages/game-core/src/rng/DeterministicRng.ts | REVIEW BEFORE REUSE | Seed/counter PRNG | P1 | ID/clock còn nondeterministic ngoài RNG; kiểm replay trước giữ |
| packages/game-core/src/pieces/, validation/MoveValidator.ts, modifier/CellEffectBlockModifier.ts | REVIEW BEFORE REUSE | Piece ownership/initial layout/special/validation | P1 | Pawn color/controller, immunity/derived paths cần matrix |
| packages/game-core/src/variant/Skill.ts, Variant.ts, effect/Effect.ts, EffectHandler.ts, event/GameEvent.ts, ResolutionOrder.ts, action/Action.ts | REVIEW BEFORE REUSE | Shared contracts | P0 | Cần root/derived/event riêng, round semantics, bỏ any; không copy tên OnCheck |
| packages/game-core/src/view/MatchView.ts, match/terminal.ts, match/TurnClock.ts | REVIEW BEFORE REUSE | DTO role allowlist/terminal/clock seams | P0 | Giữ yêu cầu và tests, rà soát policy/version/new metadata |
| packages/game-core/src/event/EventBus.ts, action/ActionQueue.ts, ActionHistory.ts, index.ts | REVIEW BEFORE REUSE | Utilities/order/public exports | P1 | Event cancellation/order/registry scope/cycles cần chứng minh |
| apps/backend/src/game/game.service.ts, game.gateway.ts, game.module.ts | REFERENCE ONLY | Room/authz/timer/network transitions | P0 | Service seam, context socket; không copy Map như persistence |
| apps/backend/src/auth/auth.contract.ts, auth.tokens.ts | REVIEW BEFORE REUSE | AuthPrincipal/provider-neutral port | P0 | Không PII/credential trong public DTO |
| apps/backend/src/auth/auth-session.registry.ts, supabase-auth.provider.ts, auth.module.ts | REFERENCE ONLY | Adapter/session/reconnect baseline | P1 | Credentials từ môi trường mới, không copy token local |
| apps/backend/src/app*, main.ts | REFERENCE ONLY | Nest bootstrap/health/smoke wiring | P2 | Public networking/security policy phải xét lại |
| apps/backend/src/**/*spec.ts, apps/backend/test/*e2e-spec.ts | KEEP | Regression/fixtures/authority/DTO/timer evidence | P1 | Đọc oracle theo Q/O trước port; không giữ expected sai làm luật |
| apps/backend/src/**/__snapshots__/ | KEEP | Jest fixture snapshot nếu có | P1 | Kiểm snapshot đang được suite dùng; không generated build output |
| apps/frontend/src/store/gameStore.ts, lib/socket.ts, lib/supabase.ts, app/page.tsx, components/Board.tsx, Piece.tsx, Square.tsx, ActionBar.tsx | REFERENCE ONLY | Gameplay client/animation/socket/select targets | P1 | Revision/listener cleanup và legal hints chưa là authority |
| apps/frontend/src/lib/variantsData.ts | REFERENCE ONLY | Tên khả năng/UI metadata thứ ba để đối chiếu | P0 | Không nguồn runtime cho AP/duration; không copy drift |
| apps/frontend/src/components/Lobby.tsx, DraftScreen.tsx, RevealScreen.tsx, LoadingScreen.tsx, GameInfo.tsx, GameRightPanel.tsx, GameTimer.tsx, VariantsViewer.tsx | REVIEW BEFORE REUSE | UI độc lập/flow/components | P2 | Tách từ store/network contracts; chưa audit tương tác bằng browser |
| apps/frontend/src/app/layout.tsx, globals.css, favicon.ico, debug/layoutMask.ts | REFERENCE ONLY | Theme/layout/debug baseline | P2 | Font local là requirement, debug không bắt buộc sản phẩm mới |
| apps/frontend/public/pieces/classic/ | KEEP | 12 sprite quân cờ dùng cho board | P1 | Xác nhận license và kích thước UI trước release |
| apps/frontend/public/assets/variants/, skills/, effects/, images/ | KEEP | Artwork, icon/effect/background/branding | P1/P2 | Artwork chưa đầy đủ27, ownership chưa xác minh; không infer gameplay từ hình |
| apps/frontend/public/assets/pieces/earth/, cherubim/ | KEEP | Mountain/Totem special sprites | P1 | Đi cùng model special pieces, không Titan |
| apps/frontend/public/assets/pieces/Colossus/ | REFERENCE ONLY | Titan artwork dấu vết hoãn | P2 | Không active variant, không tự phục hồi implementation |
| apps/frontend/src/app/fonts/PressStart2P-Regular.ttf, OFL.txt | KEEP | Font bundled và giấy phép | P1 | Giữ license, build offline |
| apps/frontend/public/file.svg, globe.svg, next.svg, vercel.svg, window.svg | REVIEW BEFORE REUSE | SVG scaffold | P2 | Không cần mang sang nếu UI mới không dùng |
| package.json, package-lock.json, packages/game-core/package.json, apps/*/package.json | REFERENCE ONLY | Baseline version/dependency/build | P1 | Không nâng/cài package trong audit; chọn kiến trúc mới có chỉ định |
| tsconfig.base.json, packages/game-core/tsconfig.json, apps/*/tsconfig*.json, apps/backend/nest-cli.json, apps/frontend/next.config.ts, postcss.config.mjs, apps/*/eslint.config.mjs, .gitignore, apps/frontend/.gitignore | REFERENCE ONLY | Build/config old architecture | P2 | Offline/font/artifact hygiene cần giữ dưới config mới |
| .github/workflows/ci.yml, docs/audit/check-roadmap.mjs, apps/backend/test/jest-e2e.json | REVIEW BEFORE REUSE | CI/checker/test infrastructure | P1 | Lint baseline cũ không là release gate mới |
| apps/backend/README.md, apps/frontend/README.md | REFERENCE ONLY | Hướng dẫn cũ/scaffold | P2 | Không bằng chứng gameplay |
| .env.example | REVIEW BEFORE REUSE | Danh sách cấu hình mẫu | P1 | Chỉ chuyển bản sạch placeholder đã review, không nội dung credential |
| .env, .env.*, **/.env*, credential/key local (trừ template đã review) | EXCLUDE | Secret/runtime config | X | Chỉ ghi tên/path, không chép giá trị, cấp secret mới |
| node_modules/, **/node_modules/, **/dist/, **/.next/, **/coverage/, *.tsbuildinfo, **/*.tsbuildinfo, next-env.d.ts, runtime logs/temp/cache | EXCLUDE | Generated/dependency/cache/log | X | Không nguồn rule dù có Colossus stale dist; regenerate khi cần |
| .git/ | EXCLUDE | Metadata repo cũ | X | Không tạo repo mới/migration trong nhiệm vụ này |

## Thứ tự collection đề xuất

1. Mang theo docs/spec/decisions/audit và snapshot như hồ sơ, không tự chọn code legacy thắng quyết định đích.
2. Assets/font/license và fixtures đúng luật có thể giữ; rà soát quyền và oracle trước port.
3. Đọc source tại chỗ qua đường dẫn manifest; viết lại từ contracts, không copy toàn engine/store.
4. Sau khi định nghĩa state/effect/transaction mới, review riêng utility/shared types/DTO/auth port.

Không thấy database schema/migration hiện hành để phân loại REVIEW BEFORE REUSE; đây là kết quả quét source/config, không khẳng định hạ tầng bên ngoài không có datastore.


## Appendix — Chỉ mục từng file không-generated lúc bắt đầu

298 file tồn tại trong danh sách Git tracked +untracked không-ignored tại thời điểm baseline. Mỗi path tra mục đích/mức cần/phụ thuộc theo nhóm ở bảng trên; danh sách này không bao gồm mọi ignored cache/secret. Không đọc nội dung credential để tạo chỉ mục.

| Đường dẫn gốc | Phân loại |
|---|---|
| .env.example | REVIEW BEFORE REUSE |
| .github/workflows/ci.yml | REVIEW BEFORE REUSE |
| .gitignore | REFERENCE ONLY |
| AGENTS.md | REFERENCE ONLY |
| AUDIT.md | KEEP |
| Effect.md | KEEP |
| GDD.md | KEEP |
| Variants.md | KEEP |
| apps/backend/.prettierrc | REFERENCE ONLY |
| apps/backend/README.md | REFERENCE ONLY |
| apps/backend/eslint.config.mjs | REFERENCE ONLY |
| apps/backend/nest-cli.json | REFERENCE ONLY |
| apps/backend/package.json | REFERENCE ONLY |
| apps/backend/src/ap-cost-migration.spec.ts | KEEP |
| apps/backend/src/app.controller.spec.ts | KEEP |
| apps/backend/src/app.controller.ts | REFERENCE ONLY |
| apps/backend/src/app.module.ts | REFERENCE ONLY |
| apps/backend/src/app.service.ts | REFERENCE ONLY |
| apps/backend/src/auth/auth-session.registry.spec.ts | KEEP |
| apps/backend/src/auth/auth-session.registry.ts | REFERENCE ONLY |
| apps/backend/src/auth/auth.contract.spec.ts | KEEP |
| apps/backend/src/auth/auth.contract.ts | REVIEW BEFORE REUSE |
| apps/backend/src/auth/auth.module.ts | REFERENCE ONLY |
| apps/backend/src/auth/auth.tokens.ts | REVIEW BEFORE REUSE |
| apps/backend/src/auth/supabase-auth.provider.spec.ts | KEEP |
| apps/backend/src/auth/supabase-auth.provider.ts | REFERENCE ONLY |
| apps/backend/src/cell-effect-block-modifier.spec.ts | KEEP |
| apps/backend/src/cherubim.spec.ts | KEEP |
| apps/backend/src/dynamic-ap-cost.spec.ts | KEEP |
| apps/backend/src/game-core-angel.spec.ts | KEEP |
| apps/backend/src/game-core-attack-detection.spec.ts | KEEP |
| apps/backend/src/game-core-authority.spec.ts | KEEP |
| apps/backend/src/game-core-cannibal.spec.ts | KEEP |
| apps/backend/src/game-core-clock.characterization.spec.ts | KEEP |
| apps/backend/src/game-core-devil.spec.ts | KEEP |
| apps/backend/src/game-core-dragon-sentinel.spec.ts | KEEP |
| apps/backend/src/game-core-dynamite.spec.ts | KEEP |
| apps/backend/src/game-core-earth.spec.ts | KEEP |
| apps/backend/src/game-core-fullgame.spec.ts | KEEP |
| apps/backend/src/game-core-guardian.spec.ts | KEEP |
| apps/backend/src/game-core-kazehime.spec.ts | KEEP |
| apps/backend/src/game-core-lord.spec.ts | KEEP |
| apps/backend/src/game-core-magician.spec.ts | KEEP |
| apps/backend/src/game-core-nephalem.spec.ts | KEEP |
| apps/backend/src/game-core-phoenix.spec.ts | KEEP |
| apps/backend/src/game-core-pirate.spec.ts | KEEP |
| apps/backend/src/game-core-predator.spec.ts | KEEP |
| apps/backend/src/game-core-puppet.spec.ts | KEEP |
| apps/backend/src/game-core-requiem.spec.ts | KEEP |
| apps/backend/src/game-core-ruler.spec.ts | KEEP |
| apps/backend/src/game-core-security.spec.ts | KEEP |
| apps/backend/src/game-core-serialization.spec.ts | KEEP |
| apps/backend/src/game-core-space.spec.ts | KEEP |
| apps/backend/src/game-core-special-piece.spec.ts | KEEP |
| apps/backend/src/game-core-step2.spec.ts | KEEP |
| apps/backend/src/game-core-step3-extended.spec.ts | KEEP |
| apps/backend/src/game-core-step3.spec.ts | KEEP |
| apps/backend/src/game-core-step4.spec.ts | KEEP |
| apps/backend/src/game-core-step5.spec.ts | KEEP |
| apps/backend/src/game-core-step6.spec.ts | KEEP |
| apps/backend/src/game-core-terminal.spec.ts | KEEP |
| apps/backend/src/game-core-turn-clock.spec.ts | KEEP |
| apps/backend/src/game-core-turtle.spec.ts | KEEP |
| apps/backend/src/game-core-verdant-dragon.spec.ts | KEEP |
| apps/backend/src/game-core-wizard.spec.ts | KEEP |
| apps/backend/src/game-core-zombie.spec.ts | KEEP |
| apps/backend/src/game/g1.8-adversarial-characterization.spec.ts | KEEP |
| apps/backend/src/game/game-security-characterization.spec.ts | KEEP |
| apps/backend/src/game/game.gateway-auth.spec.ts | KEEP |
| apps/backend/src/game/game.gateway.spec.ts | KEEP |
| apps/backend/src/game/game.gateway.ts | REFERENCE ONLY |
| apps/backend/src/game/game.module.ts | REFERENCE ONLY |
| apps/backend/src/game/game.service.terminal.spec.ts | KEEP |
| apps/backend/src/game/game.service.ts | REFERENCE ONLY |
| apps/backend/src/game/match-view-delivery.spec.ts | KEEP |
| apps/backend/src/game/match-view.characterization.spec.ts | KEEP |
| apps/backend/src/game/match-view.spec.ts | KEEP |
| apps/backend/src/main.ts | REFERENCE ONLY |
| apps/backend/src/phantom.spec.ts | KEEP |
| apps/backend/src/time.spec.ts | KEEP |
| apps/backend/test/app.e2e-spec.ts | KEEP |
| apps/backend/test/authoritative-protocol.e2e-spec.ts | KEEP |
| apps/backend/test/jest-e2e.json | REVIEW BEFORE REUSE |
| apps/backend/tsconfig.build.json | REFERENCE ONLY |
| apps/backend/tsconfig.json | REFERENCE ONLY |
| apps/frontend/.gitignore | REFERENCE ONLY |
| apps/frontend/AGENTS.md | REFERENCE ONLY |
| apps/frontend/CLAUDE.md | REFERENCE ONLY |
| apps/frontend/README.md | REFERENCE ONLY |
| apps/frontend/eslint.config.mjs | REFERENCE ONLY |
| apps/frontend/next.config.ts | REFERENCE ONLY |
| apps/frontend/package.json | REFERENCE ONLY |
| apps/frontend/postcss.config.mjs | REFERENCE ONLY |
| apps/frontend/public/assets/effects/lightning/lightining_stun_trap.png | KEEP |
| apps/frontend/public/assets/effects/lightning/lightning_ultimate.png | KEEP |
| apps/frontend/public/assets/effects/phoenix/flame.png | KEEP |
| apps/frontend/public/assets/effects/phoenix/ultimate_warning.png | KEEP |
| apps/frontend/public/assets/effects/space/outworld.png | KEEP |
| apps/frontend/public/assets/effects/space/portal_even.png | KEEP |
| apps/frontend/public/assets/effects/space/portal_odd.png | KEEP |
| apps/frontend/public/assets/images/host-bg.png | KEEP |
| apps/frontend/public/assets/images/logo-bg.png | KEEP |
| apps/frontend/public/assets/images/logo.png | KEEP |
| apps/frontend/public/assets/pieces/Colossus/black_titan.png | REFERENCE ONLY |
| apps/frontend/public/assets/pieces/Colossus/white_titan.png | REFERENCE ONLY |
| apps/frontend/public/assets/pieces/cherubim/black_totem.png | KEEP |
| apps/frontend/public/assets/pieces/cherubim/white_totem.png | KEEP |
| apps/frontend/public/assets/pieces/earth/black_mountain.png | KEEP |
| apps/frontend/public/assets/pieces/earth/white_mountain.png | KEEP |
| apps/frontend/public/assets/skills/lightning_skill1.png | KEEP |
| apps/frontend/public/assets/skills/lightning_skill2.png | KEEP |
| apps/frontend/public/assets/skills/lightning_ultimate.png | KEEP |
| apps/frontend/public/assets/variants/angel.png | KEEP |
| apps/frontend/public/assets/variants/cherubim.png | KEEP |
| apps/frontend/public/assets/variants/devil.png | KEEP |
| apps/frontend/public/assets/variants/dragon_sentinel.png | KEEP |
| apps/frontend/public/assets/variants/guardian.png | KEEP |
| apps/frontend/public/assets/variants/kazehime.png | KEEP |
| apps/frontend/public/assets/variants/lightning.png | KEEP |
| apps/frontend/public/assets/variants/magician.png | KEEP |
| apps/frontend/public/assets/variants/nephalem.png | KEEP |
| apps/frontend/public/assets/variants/predator.png | KEEP |
| apps/frontend/public/assets/variants/requiem.png | KEEP |
| apps/frontend/public/assets/variants/thunder_dragon.png | KEEP |
| apps/frontend/public/assets/variants/wizard.png | KEEP |
| apps/frontend/public/file.svg | REVIEW BEFORE REUSE |
| apps/frontend/public/globe.svg | REVIEW BEFORE REUSE |
| apps/frontend/public/next.svg | REVIEW BEFORE REUSE |
| apps/frontend/public/pieces/classic/black_bishop.png | KEEP |
| apps/frontend/public/pieces/classic/black_king.png | KEEP |
| apps/frontend/public/pieces/classic/black_knight.png | KEEP |
| apps/frontend/public/pieces/classic/black_pawn.png | KEEP |
| apps/frontend/public/pieces/classic/black_queen.png | KEEP |
| apps/frontend/public/pieces/classic/black_rook.png | KEEP |
| apps/frontend/public/pieces/classic/white_bishop.png | KEEP |
| apps/frontend/public/pieces/classic/white_king.png | KEEP |
| apps/frontend/public/pieces/classic/white_knight.png | KEEP |
| apps/frontend/public/pieces/classic/white_pawn.png | KEEP |
| apps/frontend/public/pieces/classic/white_queen.png | KEEP |
| apps/frontend/public/pieces/classic/white_rook.png | KEEP |
| apps/frontend/public/vercel.svg | REVIEW BEFORE REUSE |
| apps/frontend/public/window.svg | REVIEW BEFORE REUSE |
| apps/frontend/src/app/favicon.ico | REFERENCE ONLY |
| apps/frontend/src/app/fonts/OFL.txt | KEEP |
| apps/frontend/src/app/fonts/PressStart2P-Regular.ttf | KEEP |
| apps/frontend/src/app/globals.css | REFERENCE ONLY |
| apps/frontend/src/app/layout.tsx | REFERENCE ONLY |
| apps/frontend/src/app/page.tsx | REFERENCE ONLY |
| apps/frontend/src/components/ActionBar.tsx | REFERENCE ONLY |
| apps/frontend/src/components/Board.tsx | REFERENCE ONLY |
| apps/frontend/src/components/DraftScreen.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/GameInfo.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/GameRightPanel.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/GameTimer.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/LoadingScreen.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/Lobby.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/Piece.tsx | REFERENCE ONLY |
| apps/frontend/src/components/RevealScreen.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/components/Square.tsx | REFERENCE ONLY |
| apps/frontend/src/components/VariantsViewer.tsx | REVIEW BEFORE REUSE |
| apps/frontend/src/debug/layoutMask.ts | REFERENCE ONLY |
| apps/frontend/src/lib/socket.ts | REFERENCE ONLY |
| apps/frontend/src/lib/supabase.ts | REFERENCE ONLY |
| apps/frontend/src/lib/variantsData.ts | REFERENCE ONLY |
| apps/frontend/src/store/gameStore.ts | REFERENCE ONLY |
| apps/frontend/tsconfig.json | REFERENCE ONLY |
| docs/Effect.md | KEEP |
| docs/GDD.md | KEEP |
| docs/Variants.md | KEEP |
| docs/audit/00-overview.md | KEEP |
| docs/audit/01-rules-as-implemented.md | KEEP |
| docs/audit/02-findings.md | KEEP |
| docs/audit/03-unfinished-work.md | KEEP |
| docs/audit/04-roadmap.md | REFERENCE ONLY |
| docs/audit/05-open-questions.md | KEEP |
| docs/audit/06-decisions.md | KEEP |
| docs/audit/07-roadmap-final.md | KEEP |
| docs/audit/08-variant-diff.md | KEEP |
| docs/audit/09-implementation-log.md | KEEP |
| docs/audit/archive/AUDIT-2026-07-23.md | REFERENCE ONLY |
| docs/audit/check-roadmap.mjs | REVIEW BEFORE REUSE |
| package-lock.json | REFERENCE ONLY |
| package.json | REFERENCE ONLY |
| packages/game-core/package.json | REFERENCE ONLY |
| packages/game-core/src/action/Action.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/action/ActionHistory.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/action/ActionPipeline.ts | REFERENCE ONLY |
| packages/game-core/src/action/ActionQueue.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/board/Board.ts | REFERENCE ONLY |
| packages/game-core/src/board/Position.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/combat/AttackDetection.ts | REFERENCE ONLY |
| packages/game-core/src/effect/Effect.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/effect/EffectHandler.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/effect/EffectRegistry.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/AegisHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/BerserkHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/BindHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/BlessingHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/BombHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/DeathCounterHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/DevilEyeHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/DevilTollHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/DragonGazeHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/DragonsRoarBeamHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/ElectricHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/EnemySwapHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/FateHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/FoolHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/GhostHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/JudgmentHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/LandmineHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/MovesetSwapHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PirateBetHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PositionSwapHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PossessionHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PredictionHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PuppetControlHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PuppetNoCaptureHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/PuppetTrapHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/RepelHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SailingHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SanctuaryHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/ShieldHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SilenceHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SoullessCellHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SoullessHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/StealthMaintenanceHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/StunHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SubterraneanEscapeHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/SummonDurationHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/ThunderFangHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/TimeFreezeHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/WalkerHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/handlers/ZombieHandler.ts | REFERENCE ONLY |
| packages/game-core/src/effect/zombieAttack.ts | REFERENCE ONLY |
| packages/game-core/src/event/EventBus.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/event/GameEvent.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/event/ResolutionOrder.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/index.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/match/Match.ts | REFERENCE ONLY |
| packages/game-core/src/match/TurnClock.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/match/terminal.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/modifier/CellEffectBlockModifier.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/modifier/MoveModifier.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/modifier/MoveModifierChain.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/MoveGenerator.ts | REFERENCE ONLY |
| packages/game-core/src/movement/bishopMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/kingMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/knightMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/pawnMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/queenMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/rookMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/movement/slidingMoves.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/pieces/Piece.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/pieces/SpecialPieceRegistry.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/pieces/initialLayout.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/region/Region.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/rng/DeterministicRng.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/state/GameState.ts | REFERENCE ONLY |
| packages/game-core/src/state/Graveyard.ts | REFERENCE ONLY |
| packages/game-core/src/state/Snapshot.ts | REFERENCE ONLY |
| packages/game-core/src/validation/MoveValidator.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/variant/Skill.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/variant/Variant.ts | REVIEW BEFORE REUSE |
| packages/game-core/src/variant/VariantRegistry.ts | REFERENCE ONLY |
| packages/game-core/src/variant/allVariants.ts | REFERENCE ONLY |
| packages/game-core/src/variant/apCostConfig.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/AngelVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/CannibalVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/CherubimVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/DevilVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/DragonSentinelVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/DynamiteVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/EarthVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/GuardianVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/KazehimeVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/LightningVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/LordVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/MagicianVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/NephalemVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/PhantomVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/PhoenixVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/PirateVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/PredatorVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/PuppetVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/RequiemVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/RulerVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/SpaceVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/StubVariants.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/ThunderDragonVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/TimeVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/TurtleVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/VerdantDragonVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/WizardVariant.ts | REFERENCE ONLY |
| packages/game-core/src/variant/variants/ZombieVariant.ts | REFERENCE ONLY |
| packages/game-core/src/view/MatchView.ts | REVIEW BEFORE REUSE |
| packages/game-core/tsconfig.json | REFERENCE ONLY |
| tsconfig.base.json | REFERENCE ONLY |
