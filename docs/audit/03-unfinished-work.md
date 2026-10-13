# 03 — Công việc dang dở và dấu vết lần làm cuối

## Tôi cho rằng bạn đã dừng ở đâu

**[CONFIRMED]** Tag gần nhất là `v0.1.0-alpha` tại `87ab5cb` (2026-06-19). Commit sau cùng `a8fe81a` (2026-07-23, “Cập nhật các tính năng và sửa lỗi mới”) là một batch rất lớn: 506 file, +42.176/-1.711; thêm hàng loạt variant, spec, asset, AP migration, Pirate, UI effect và `AUDIT.md`. Không có branch khác ngoài `main/origin/main`.

**[SUSPECTED]** Dự án bị bỏ giữa giai đoạn “đổ feature + test từng variant”, trước giai đoạn integration hardening. Dấu hiệu: 543 unit test pass nhưng test đếm variant vẫn 26; Pirate đã code nhưng docs mới chỉ nằm trong working copy; e2e không khởi động; identity/timer/surrender chưa có test; catalog UI và docs drift.

**[CONFIRMED]** Working tree tồn tại trước audit:

```text
 M docs/Variants.md
?? Effect.md
?? Variants.md
```

`docs/Variants.md` đang đổi hàng loạt “lượt” thành “vòng đấu”, sửa Joker/Colossus và thêm Pirate (`docs/Variants.md:266-341`). Hai file root `Effect.md`, `Variants.md` là bản untracked gần-duplicate của bản trong `docs/`. Audit không đụng các file này.

## Feature chưa hoàn tất hoặc chưa tích hợp

| Hạng mục | Label | Bằng chứng | Trạng thái thật |
|---|---|---|---|
| Threefold repetition | **[CONFIRMED]** | GDD yêu cầu tại `docs/GDD.md:235-240`; không có state/logic tương ứng | Chưa implement. |
| Joker | **[CONFIRMED]** | Spec dài tại `docs/Variants.md:266-294`; không có `JokerVariant.ts`, không nằm `allVariants.ts:29-57` | Chưa implement. |
| Colossus/Titan | **[CONFIRMED]** | Spec tại `docs/Variants.md:307-321`; không có source/registration | Source đã bị bỏ hoặc chưa port; chỉ còn image và stale `dist/variant/variants/ColossusVariant.*`. |
| Pirate migration | **[CONFIRMED]** | `PirateVariant.ts`, AP config và test có; `ap-cost-migration.spec.ts:16` vẫn expected 26 | Tích hợp gần xong nhưng suite đỏ và docs chưa commit. |
| Save/load | **[CONFIRMED]** | `GameState.fromSerializable` có (`GameState.ts:232-265`), nhưng `SerializedMatch` tối giản và không có `Match.fromSerializable` (`Match.ts:55-63`) | Chỉ primitive state round-trip, chưa có restore session hoàn chỉnh. |
| E2E | **[CONFIRMED]** | Một `app.e2e-spec.ts`; command fail resolve `.js` trước khi chạy test | Scaffold có, pipeline không hoạt động. |
| AI | **[CONFIRMED]** | Không có module/search/eval/API AI trong 174 source file | Không bắt đầu. |
| Draw/end-state UI | **[CONFIRMED]** | Winner chỉ Color/null; no draw type; surrender chỉ emit | Chưa model hóa terminal reason/draw authoritative. |
| Security/auth | **[CONFIRMED]** | Payload `playerId` được tin, reconnect không token, open CORS (`game.gateway.ts:17-21,231-439`) | Prototype-only. |
| Persistence/deploy | **[CONFIRMED]** | `GameService.rooms` là RAM Map (`game.service.ts:30-32`); không DB/migration/container/deploy config | Chưa làm. |

## Dead code, stale artifact và duplication

- **[CONFIRMED]** `packages/game-core/src/variant/variants/StubVariants.ts:1-28` chỉ chứa helper `createStubSkill` không được export/use.
- **[CONFIRMED]** Tracked `packages/game-core/dist` có `ColossusVariant`, `GuardianLinkHandler`, `MountainHandler`, `RootHandler` không có source counterpart. Vì `game-core` entry trỏ `dist` (`package.json:5-12`), đây không chỉ là rác thẩm mỹ.
- **[CONFIRMED]** `packages/game-core/src/index.ts:127-161` export một phần variant/handler, bỏ Zombie, Dynamite, Magician, Ruler, Kazehime, Devil, Thunder Dragon, Predator, Space, Pirate… trong khi Match đăng ký đủ qua private `ALL_VARIANTS`.
- **[CONFIRMED]** `apps/frontend/src/lib/variantsData.ts` lặp metadata/rules/AP của core trên 1.130 dòng. Drift đã xuất hiện ở Space, Verdant, Puppet, Thunder Dragon và Pirate.
- **[CONFIRMED]** `AUDIT.md` cũ vừa chỉ ra một số lỗi đúng (repetition, mirror state, snapshot) vừa khẳng định “95%” và “đã xong” cho stealth/WebSocket (`AUDIT.md:27-47`) mà không kiểm tra exploit runtime.
- **[CONFIRMED]** 470 generated file trong hai `dist` đang được track. `.gitignore` chỉ dài 14 byte và không thiết lập hygiene rõ cho artifacts.

## TODO/FIXME và code “hoàn chỉnh bề ngoài”

**[CONFIRMED]** Repository gần như không dùng TODO/FIXME; vì vậy tìm comment không đủ phát hiện unfinished work. Comment explicit đáng chú ý là fallback/no-op cho action chưa xử lý tại `ActionPipeline.ts:1468`, và test Guardian còn ghi “đề xuất 8 AP và đánh dấu TODO” tại `game-core-guardian.spec.ts:545`.

Các phần nhìn hoàn chỉnh nhưng integration chưa hoàn chỉnh:

- **[CONFIRMED]** `serializeForPlayer` lọc board đúng cho một số trap nhưng không lọc internal history/snapshot (`GameState.ts:141-229`).
- **[CONFIRMED]** `DeterministicRng` có seed/counter nhưng code vẫn dùng `Math.random`/`Date.now` cho gameplay IDs và effect randomness (`LightningVariant.ts:37`; `ThunderDragonVariant.ts:420`; nhiều handler).
- **[CONFIRMED]** `SnapshotManager` có serialize/restore nhưng shallow metadata và key theo round bị trùng (`Snapshot.ts:12-56`).
- **[CONFIRMED]** `AttackDetection` phát OnCheck nhưng GDD cố ý không có check legality; hàm bỏ qua phần lớn effect (`AttackDetection.ts:5-12,205-270`). Tên API dễ làm người sau hiểu sai mức hoàn thiện.
- **[CONFIRMED]** Server-authoritative move validation tồn tại, nhưng requester identity bị thay bằng `currentTurn` (`ActionPipeline.ts:1587-1595`).

## Test inventory và lỗ hổng

**[CONFIRMED]** Có 41 unit suite/544 test được Jest phát hiện; 40 suite/543 test pass. Test chủ yếu theo scenario từng variant: Zombie 23, Kazehime 31, Turtle 24, Cherubim 24, Wizard 23, Ruler 23, Magician 22, Predator/Lord/Cannibal 21, v.v. Đây là tài sản tốt để phục hồi dự án.

**[CONFIRMED]** Những lớp test còn thiếu:

- Perft/equivalent cho move generation; repo-wide search không có `perft`.
- Property/invariant: action failure không mutate, snapshot isolation, serialize(viewer) không leak.
- Mirror-match matrix 27×27 hoặc ít nhất self-match cho stateful variants.
- Gateway/service authorization adversarial tests.
- Hai real Socket.IO client: create/join/draft/play/reconnect/surrender/timeout.
- Replay/determinism và save/load full Match.
- Client event ordering/revision với delayed animation.

## Những phần đã audit nhưng chưa thể xác nhận bằng chạy thật

- **[UNKNOWN]** Frontend production build có pass khi Google Fonts reachable hay còn lỗi sau bước font; audit dừng đúng tại lỗi network của `next/font` và không đổi config.
- **[UNKNOWN]** Deployment target có Windows hay bật Next Image/Server Actions; điều này quyết định applicability cụ thể của advisory.
- **[UNKNOWN]** Asset nào được xem là production-ready; nhiều variant không có portrait riêng dù fallback UI tồn tại (`Piece.tsx:172-212`, `page.tsx:384-387`).
- **[UNKNOWN]** 2-client UI flow có animation/layout bug nào ngoài các race thấy tĩnh; e2e hiện không chạy và audit không thay config.
