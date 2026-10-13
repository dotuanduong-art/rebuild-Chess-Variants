# 05 — Handoff cho Codex tại repository mới

Mục tiêu: clean rebuild dựa trên bằng chứng, không copy engine/store cũ trực tiếp. Bộ này ghi hành vi legacy; quyết định đích đã chốt có thể yêu cầu khác code.

## Đọc trước theo thứ tự

1. AGENTS.md của repository mới để biết scope/permission; AGENTS.md legacy chỉ là tham khảo.
2. docs/rebuild-audit/01_PROJECT_INVENTORY.md và 02_REBUILD_FILE_MANIFEST.md.
3. docs/audit/06-decisions.md rồi 07-roadmap-final.md: luật đích, dependency, release gates.
4. docs/Variants.md và docs/rebuild-audit/06_VARIANT_AUDIT.md: code-first legacy,82 active entries/27 passive mechanisms, ngoại lệ và call chain.
5. docs/GDD.md, docs/Effect.md; so với snapshot docs/rebuild-audit/Variants.original.md và tài liệu root, không chọn bản bằng ngày/tên.
6. docs/rebuild-audit/03_GAMEPLAY_SYSTEM_INVENTORY.md và 04_REBUILD_RISKS.md; docs/audit/02-findings.md/08-variant-diff.md như lịch sử phải mở lại source.

## Module cần nghiên cứu

- Match→ActionPipeline validators→USE_SKILL→queue→EventBus→handler→tick/remove; đọc cả canActivate lẫn execute và consumer cuối.
- GameState/Board/Snapshot và Piece.getPieceOwner; tạo state/effect/snapshot contracts mới có deep clone, namespaces, revision, deterministic IDs.
- VariantRegistry/EffectRegistry/allVariants; nạp/unload và mirror lifecycle phải test riêng.
- MoveGenerator/AttackDetection/MoveModifierChain; threat/query/action legality không được nhập nhằng.
- GameService/GameGateway/AuthPrincipal/MatchView; authoritative seam và DTO role cần giữ yêu cầu, không copy toàn serializer.
- TurnClock/terminal và timers; persistence ngoài process chưa có implementation đáng port.
- gameStore chỉ để tham khảo UX, tránh mang listener/timer stale board writes sang.

## Luật legacy đã xác nhận cần đưa vào hồ sơ

- Board15×15,30 quân/bên; White rank1/2, Black15/14; Bishop thêm ngang1; không check/checkmate legality.
- Capture/loss AP và promotion AP có bảng ở ActionPipeline; skill cost nhiều nhánh động/extra.
- Root identity theo socket/seat/principal, effective owner cho Walker/Puppet; màu gốc vẫn ảnh hưởng nhiều effect trong legacy.
- Shield chỉ capture, Aegis targeting/application; nhiều expiry hook chạy cả cleanse.
- 27 registered definitions, Time4 active entries; Joker/Colossus chỉ thiết kế hoãn; AI hoãn.
- Ghost second obstacle và Devil sacrifice hiện trạng là quyết định giữ, không “fix” bằng luật chess thường.

## Luật đích khác legacy — đừng port sai

Áp Q-03 scheduler round, Q-13 Zombie miễn phí3 round đầu, Q-12 Predator Pawn range, Q-11 Thunder Fang normal moveset, Q-17 controller Pawn/promote, Q-14 destroy loss AP không capture AP, Devil Toll mọi main move, O-6/O-6b King effects/destruction, O-7 Time canonical mode, O-8/O-9 duration Sanctuary/Chains. Không migrate nửa chừng một counter hai nghĩa.

## Chưa rõ / cần bằng chứng tiếp

- Ruleset mới phải thiết kế explicit event order/transaction, before-death reward và cleanse lifecycle; tất cả tổ hợp chưa được runtime coverage đầy đủ.
- Consumer Thunder Fang trap thiếu khi không có Lightning; không đánh dấu variant complete chỉ vì definition đủ.
- E2E real socket cần chạy ở môi trường cho phép network; source/unit pass không đủ public-release gates.
- License artwork, exhaustive fixtures/perft/mirror gameplay, external datastore schema/version/restore chưa xác minh.

Không tạo secret/database/repo/ZIP từ bộ này. Bắt đầu bằng safety net và contracts; implementation gameplay đi sau khi dependency/gates đã đủ. Giữ các test oracle đúng; expected trái quyết định phải được thay có lý do, không đóng băng toàn suite cũ thành luật mới.
