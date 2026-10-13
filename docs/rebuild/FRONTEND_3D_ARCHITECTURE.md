# FRONTEND_3D_ARCHITECTURE — Dark Arcana Nouveau

Ngày 2026-10-13. Thiết kế mới hoàn toàn, không copy UI/layout/components/store frontend legacy. CONFIRMED stack:Next.js/React/TypeScript, Three.js/R3F/Drei và Tailwind HTML. GSAP chỉ bổ sung khi có timeline cần nó. Phase 00 không frontend/source/assets; procedural geometry chỉ dành prototype ở phase được duyệt.

## 1. Product flow và visual direction đề xuất

Flow mới: auth → chọn Variant → create/join/matchmaking → setup/reveal → arena → result → authorized replay. Scope random matchmaking vs room-code và reveal privacy D-23; không tự mở ranked/social/shop. Matchmaking không ảnh hưởng luật engine.

Dark Arcana Nouveau: nền than mực, hình học đá khắc tối giản, đường kim loại cổ, nét cong thực vật/sigil ở viền; ánh sáng fantasy có kiểm soát. White vật liệu xương sáng/brass, Black obsidian/patina; khác silhouette/outline/pattern ngoài màu để đọc được. Artwork Variant dẫn theme sau licensing review, không áp ảnh legacy làm bắt buộc layout.

Arena đề xuất board giữ trung tâm visual, camera nghiêng nhẹ; status bar/AP/timer hai bên trong HTML; skill tray có mode selector Time; target prompt ngắn và xác nhận server outcome rõ. Inspector contextual cho quân/effects đã biết; history/replay rail mở khi cần, tránh lấp225 ô. HTML typography dễ đọc, font bundled local Q-28, controls lớn và focus/keyboard navigation. Dark art không giảm contrast/đọc rank/file.

## 2. Layers

| Layer đề xuất | Ownership |
|---|---|
| App shell | Routes/auth/lobby/accessibility/layout responsive |
| MatchSession | Socket listeners, revision/epoch/dedup/sync, role-safe views; cleanup khi unmount |
| MatchViewStore | Logical authoritative DTO hiện tại, AP/turn/status/selection provenance; replace ngay khi commit đến |
| InputController | Picking/selection/query targets/mode/intent command; chặn stale revision và nhiều submit cùng input |
| ScenePresenter | Map DTO thành visible entities/material/status glyphs; không luật movement/capture |
| AnimationDirector | Projected domain events+diff, per-piece tracks/cause batches, cancellation epoch |
| AssetRegistry | Geometry/material/model/VFX key, lazy load/cache/dispose; không gameplay data |

Three/R3F Canvas ở Client Component, client-only lazy import từ client boundary để tránh WebGL trên SSR. Shell/loading/error/HTML UI không phụ thuộc Canvas boot. [Next lazy loading](https://nextjs.org/docs/app/guides/lazy-loading). Không chọn version packages ở Phase 00; phase setup kiểm peer compatibility React/Next/R3F/Drei và lockfile.

## 3. Scene và coordinate system

225 cells trên XZ plane: center board tại origin, Y lên; file A→O tăng X, rank1→15 tăng Z. Transform canonical không đổi khi camera Black xoay; camera preset White/Black/top/isometric chỉ view. Picking round-trip algebraic/file/rankIndex phải test cả hai góc nhìn.

Board:shared geometry, two cell material groups hoặc instancing; labels HTML/texture pooled tránh225 text meshes mới mỗi frame. Quân có PieceEntity visual riêng keyed stable id/incarnation, root transform và model child; sáu type procedural placeholder dễ phân biệt trong prototype. Special units Mountain/Totem/portal dùng visual adapters riêng sau approval, không coi variant artwork là model quân.

Model lâu dài GLB/glTF shared geometry/material, normalized origin/scale/bounds, optional animation clips. Ownership/controller indicator là overlay riêng, không đổi material gốc bất ngờ khi control; conversion có transition rõ. Missing asset fallback procedural giữ gameplay playable. Asset license/source/version manifest là gate release D-27, không tạo/download assets ở Phase 00.

## 4. Camera và pointer input

Drei OrbitControls với target board center, distance/polar limits tránh đi dưới bàn, yaw/presets cho White/Black/top; pan bounded để bàn không biến mất. Reset view và reduced-motion camera transitions; lock picking drag threshold để orbit không gửi move.

R3F pointer events/raycast cung cấp hit/instanceId; resolve tới pieceId hoặc cell key trong registry hiện tại. Decorative VFX không bắt pointer; stop propagation khi selection hợp lệ; clear selection khi target biến mất. [R3F events](https://r3f.docs.pmnd.rs/api/events).

Click piece → server legal preview query ở revision đó → highlights, click target → intent theo command schema. Skill/mode selection → server target schema/preview; ordered targets được hiển thị và validate từng step. Khi view đổi revision invalidate quote/highlight và query lại, không submit old hints. D-25 quyết thông tin hidden của previews; không tính full legal từ projected board.

## 5. Coverage 14 yêu cầu 3D

| Yêu cầu | Giải pháp trình bày và acceptance |
|---|---|
| 1 Board15×15 | Canonical225 cell mapping, camera fit ở laptop1366×768; pick cả cạnh/center đúng |
| 2 Sáu models | Six model keys, distinct silhouette placeholder trước final GLB; 60 initial entities |
| 3 White/Black | Two controlled material palettes +shape/outline readability; control badge riêng |
| 4 Orbit/presets | Limits+presets+reset, board visible, drag không accidental click |
| 5 Picking | Raycast instance→stable entity/cell; VFX không chặn input; touch-compatible |
| 6 Highlights | Overlay legal-preview/skill-target từ server, attack/move/selected phân biệt bằng hình+label |
| 7 Move | Track from/to trong render-only transforms; logical DTO đã cập nhật ngay |
| 8 Capture/death | Capture và destruction events có victim ref; dissolve/shatter nhẹ theo reason, pooling |
| 9 Skill | Effect-independent cue table keyed skill/mode/cause; unknown skill có fallback |
| 10 Status VFX | Glyph/ring/aura giản lược từ visible effects, owned by instance; expire/cleanse/swap khác nhau |
| 11 Summon/transform | Entity lifecycle diff, spawn cue/identity model transition; id/incarnation không tái dùng stale track |
| 12 Replay/Rewind | Seek bằng snapshot-view và projected diff; rewind chạy group position tracks; không đảo network revision |
| 13 Cancel/resync | Animation epoch kill/rebuild ngay full sync, bỏ stale promises/tweens; context loss recovery |
| 14 Performance60+ | Shared geometry/material, bounded VFX, measured frame-time/latency/memory budgets |

## 6. Logical state không chờ animation

CONFIRMED: gameplay events điều khiển animation nhưng engine/backend không chờ animation xong. Nhận committed envelope→apply logical view ngay→schedule cosmetic tracks riêng. UI AP/turn/result đi theo revision mới, không timeout ghi board cũ sau tween. Nếu network cập nhật trước track xong, director nối/fast-forward/cancel theo epoch; board không rollback về old frame.

Projected event fields cần entity/cause IDs, positions, visible effect summaries và removal/movement reasons. Derived sequences trong transaction giữ causal order trong presentation; có thể parallel cosmetic cues cho group swap/rewind, không reorder gameplay. Render clock local/interpolation không thuộc deterministic core. Random VFX độc lập simulation seed và không tác động luật.

AnimationDirector contract đề xuất: tracks map theo entity incarnation, transaction group, current authorityEpoch/view revision; dispose returns/abort token guard cho async asset loads; finish callback chỉ tháo VFX, không mutate logical store. Hidden event bị redact không có secret cue “tại ô bẫy”; chỉ animate reveal/outcome được quyền xem.

Ví dụ input packet r12 move tớiE5, r13 capture tớiF6 tới khi move còn tween: store áp r13 ngay, director retarget trajectory; pending tween r12 không được set position board authoritative. Reconnect epoch đổi: kill tất cả tracks, clear selection/quotes, replace view và snap transforms; bật cosmetic resume sau rebuild, không phát lại backlog secret animations.

## 7. Replay và seek

Replay viewer chỉ authorized postgame; load pinned ruleset playback output thông qua server hoặc local worker chỉ khi full dataset đã được cấp. Renderer dùng ViewStore riêng, không live socket state. Seek hủy tracks/current async VFX, replace snapshot DTO, scrub presentation; replay pause/speed controls không đổi logic. Large jump dùng immediate scene rebuild; neighboring step dùng projected events. Rewind là event trong replay, không tua cursor kỹ thuật trừ viewer chọn seek.

## 8. Performance plan và kiểm chứng

Prototype mục tiêu ĐỀ XUẤT: laptop reference1366×768, evergreen Chromium/WebGL2, DPR≤1.5 mặc định; 60 quân +225 ô +20 visible statuses, p95 frame≤16.7ms khi camera/move (60 fps target), low preset≤33.3ms; pointer-to-highlight feedback≤100 ms khi hints đã có. Hardware/GPU cụ thể và mobile gate D-28; không hứa60 fps mọi máy. Initial assets budget≤5MB compressed prototype, draw calls≤200 mục tiêu, visible triangles≤150k, measured cold-load/network record; chốt lại bằng profiler prototype.

Shared geometry/material trước instancing quân; board/highlights instancing đơn giản. VFX pooling, cap particles/lights, một hoặc ít shadow casters/baked environment, texture budgets, adaptive DPR/quality. Demand rendering khi idle, invalidate trong controls/tweens; active perpetual aura dùng animation frame có giới hạn. R3F hỗ trợ resource reuse, instancing, demand render; chọn áp dụng theo scene measurements. [Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Không React setState mỗi frame; useFrame cập nhật refs/transforms cosmetic. Memo selectors/asset cache, dispose khi unmount/route change; repeat remount/reconnect không tăng listener/GPU resource count. Bloom/postprocess optional quality tier, tắt nếu budgets fail. GSAP chưa là dependency bắt buộc; simple movement dùng useFrame, phức tạp timeline chỉ thêm khi đo/UX yêu cầu.

Reduced-motion short cues, disable flashing, symbols cho debuffs/control; DOM fallback error/connection/retry controls nếu WebGL unavailable/context lost. Context restore tạo scene từ logical DTO hiện tại. Screen-reader summary/keyboard cell navigation qua HTML overlay, không yêu cầu screen reader hiểu canvas. Mobile small-screen board readability D-28, không giả định grid225 cells đọc tốt ở mọi viewport.

## 9. Acceptance và nguồn

Automated mock DTO tests cho r12/r13 order, stale completion/cancel epoch, disappear/transform, hidden events; browser integration two seats +spectator; screenshots đúng board/count/camera/HTML; performance trace camera/move/bomb chain/replay seek; memory100 reconnect/remount; visual review Dark Arcana Nouveau bằng mock/prototype phase sau, không tạo asset ở Phase 00.

Source constraints: [GDD](../GDD.md), [06 decisions](../audit/06-decisions.md) Q-28/34, [rebuild risks](../rebuild-audit/04_REBUILD_RISKS.md) stale store/timers, [manifest](../rebuild-audit/02_REBUILD_FILE_MANIFEST.md) không cho phép reuse trái yêu cầu hiện tại. Reference frontend không có trong snapshot; không coi thumbnail/layout mô tả trong audit là design specification. [Network](NETWORK_ARCHITECTURE.md), [engine](ENGINE_ARCHITECTURE.md), [tests](TEST_STRATEGY.md), [open decisions](OPEN_DECISIONS.md) là contracts liên quan.
