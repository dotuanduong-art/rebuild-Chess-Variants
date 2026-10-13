# Variant Chess — clean rebuild

## Scope và nguồn luật

- Workspace này là clean rebuild. `reference/old-project/` và tài liệu legacy trong `docs/` ngoài `docs/rebuild/` chỉ được đọc; viết source mới từ contracts đã duyệt, không copy source/frontend/layout/components cũ.
- Trước việc gameplay hoặc architecture, đọc [GAMEPLAY_SPEC](docs/rebuild/GAMEPLAY_SPEC.md) và [OPEN_DECISIONS](docs/rebuild/OPEN_DECISIONS.md); dùng [CONTEXT](CONTEXT.md) cho từ vựng owner/controller/capture/destruction/rewind.
- `CONFIRMED` cần quyết định chủ dự án; source đã kiểm tra chỉ là `LEGACY`. Giữ mâu thuẫn/unknown thành câu hỏi có phương án và phase gate. Không lấy recommendation hoặc hết thời gian chờ làm phê duyệt.
- Q/O trong `docs/audit/06-decisions.md` và P00 trong decision registry là nguồn duyệt. GDD/catalog chưa duyệt giữ ứng viên; mỗi nhóm Variant cần phê duyệt trước triển khai.

## Phase gate

- Phase 01A đã hoàn tất; chủ dự án cho phép duy nhất milestone 01B-1: Board/Piece/coordinates và pure movement trong core/shared-types, unit tests và verification. Không AP, Turn Manager, transaction, concrete Variant/effect handlers, backend/frontend gameplay hoặc dependency mới khi không cần. Chưa cho phép 01B-2 hoặc milestone sau; hoàn tất 01B-1 rồi dừng.
- Trước chuyển phase, kiểm [IMPLEMENTATION_ROADMAP](docs/rebuild/IMPLEMENTATION_ROADMAP.md), báo deliverables/acceptance/testing và nhận phê duyệt trực tiếp. Scope đã được duyệt không cần hỏi lại cho thao tác thường lệ bên trong phase.
- Tạo/cập nhật tài liệu mới trong `docs/rebuild/`; ghi câu trả lời mới vào decision registry và spec liên quan trước code/expected. Chỉ sửa legacy khi người dùng thay đổi phạm vi rõ ràng.

## Implementation invariants khi phase được duyệt

- Core thuần/deterministic; backend authoritative; frontend chỉ intents và role-safe views. Theo [ENGINE_ARCHITECTURE](docs/rebuild/ENGINE_ARCHITECTURE.md) khi sửa contracts/reducer/RNG/snapshot/rollback.
- Plugin trả typed plans, reducer core duy nhất ghi state; effect/source/group/counter cô lập theo player và match. Theo [EFFECT_SYSTEM_SPEC](docs/rebuild/EFFECT_SYSTEM_SPEC.md) và [VARIANT_PLUGIN_SPEC](docs/rebuild/VARIANT_PLUGIN_SPEC.md) khi thêm effect/Variant; duyệt cả lifecycle, stacking, relocation, hidden và King eligibility.
- ID/RNG/queue/events/AP/slots thuộc root transaction; lỗi rollback toàn bộ. Gameplay Time rewind khác technical rollback/replay restore; giữ confirmed semantics riêng.
- Theo [NETWORK_ARCHITECTURE](docs/rebuild/NETWORK_ARCHITECTURE.md) khi sửa auth/commands/clocks/persistence/reconnect/projection. Live client DTO/log không lộ seed/full hidden state; authorized postgame replay được có seed và thông tin gameplay đầy đủ. Credential và PII không cần thiết bị loại khỏi views/replay/log ở mọi thời điểm.
- Theo [FRONTEND_3D_ARCHITECTURE](docs/rebuild/FRONTEND_3D_ARCHITECTURE.md) khi xây scene/input/animation; logical view cập nhật độc lập animation, resync hủy stale tracks. Frontend mới hoàn toàn.

## Verification và delivery

- [TEST_STRATEGY](docs/rebuild/TEST_STRATEGY.md) quy định meaningful behavioral/invariant/mirror/replay/leak tests theo change. Oracle dẫn approved decision; không đóng băng expected legacy trái luật.
- Báo checks đã chạy và limitations thật; environment-blocked không phải pass. Không cài/build dependencies hoặc chạy gameplay tests trong Phase00.
- Giữ changes trong phase scope; không secrets/generated build output vào deliverables. Pin versions/lockfile và verify current official docs khi triển khai dependency/hosting/auth thực tế.
