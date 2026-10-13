# NETWORK_ARCHITECTURE — authority, persistence và reconnect

Ngày 2026-10-13. Ràng buộc CONFIRMED từ [06 decisions](../audit/06-decisions.md) Q-01/02/21…26/33…35 và O-1…5; implementation strategy là ĐỀ XUẤT. Không tạo DB, secrets hoặc deploy trong Phase 00.

## 1. Topology và trust boundary

Frontend Next.js ở Vercel; backend NestJS + Socket.IO ở Render đã chốt Q-21. DB ngoài process bắt buộc để sống qua restart Q-22. Đề xuất một backend authority process lúc đầu, một relational datastore có transaction/CAS; provider/gói/backup cụ thể D-21. Supabase Auth đã chốt, không suy auth provider đồng nghĩa phải dùng Supabase game DB.

Gateway parse schema và auth context; application service resolve principal→seat/controller→match, serialize commands và timers, gọi core; projector tạo outbound per role. Socket room là kênh delivery tạm, không match identity hay source of truth. `matchId` ổn định; connection/session/seat là identity riêng. Frontend intent không chứa authority AP/cost/effects/moveType/result hoặc playerId credential được tin.

Nest có Socket.IO adapter gateway support; đây chỉ là transport shell, không gameplay boundary. [Nest gateways](https://docs.nestjs.com/websockets/gateways).

## 2. Auth và permissions

CONFIRMED O-1: Supabase Auth Google +email magic link, account bắt buộc public play. Guest live spectate public read-only bằng signed capability; replay mặc định account +access grant. Port `AuthPrincipal` provider-neutral; socket handshake xác minh token, issuer/expiry/signature bằng library chính thức/current SDK, không decode rồi tin claims. [Supabase JWT](https://supabase.com/docs/guides/auth/jwts).

Seat binding là server record; client publicPlayerRef chỉ display. Reconnect credential secret gắn principal/seat/match, rotate/revoke và không đưa vào views/replay/logs. Multi-tab ownership/active session takeover D-24; không tự biến socket ID thành player ID. `user_metadata` do user chỉnh không là quyền điều khiển match. Service secret chỉ server; frontend chỉ public config/key; token không nằm gameplay state.

Changelog được kiểm ngày2026-10-13: endpoint markdown không đọc được bởi web parser nên đọc [changelog HTML](https://supabase.com/changelog). Lúc triển khai cần kiểm SDK/framework bridge hiện hành, tránh đóng băng adapter package từ reference. Không chọn package versions hay tạo OAuth redirect config ở phase thiết kế.

## 3. Contracts và sequencing

| Contract đề xuất | Các trường bắt buộc / semantics |
|---|---|
| SubmitCommand | protocolVersion, matchId, commandId, expectedRevision, command kind +typed payload; requester do server bind |
| CommandReceipt | commandId, accepted/rejected, committedRevision nếu success, stable error code, resyncRequired; không hidden target reasons |
| MatchViewEnvelope | matchId, authorityEpoch, revision, viewSchemaVersion, role, full safe view; clock/connectivity safe data |
| EventBatch | batch/transaction identity, revision, view-local event order và typed projected events; không raw internal log |
| SyncRequest | last seen epoch/revision, role-context bound session; server chọn diff hoặc full view |
| LegalQuery/Quote | queryId, revision, piece/skill/mode +targets; response bound revision và authorized preview policy |
| SystemInput | server-only deadlineId/epoch/side/expected state boundary, reason/normalized timing; ordered như command |

Mỗi match một serial queue. Core deterministic input index khác network revision; một root +cascades là một gameplay transaction. Control/connectivity transitions có revision được persist theo loại; frontend không hiểu revision=ply. `commandId` dedup per match/principal, receipt stored cùng commit; retry duplicate trả cùng result, payload khác cùng ID reject. Stale expectedRevision reject +resync; không auto-merge move đã cũ.

Socket.IO giữ message order nhưng mặc định delivery at-most-once; application ACK/idempotency/persistence làm xử lý command đúng một lần về hiệu quả. Không hứa transport exactly-once. [Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/). D-24 chốt retention receipts và pending command UX sau reconnect.

## 4. Projection và hidden information

| Role | Live | Postgame/replay đã authorized |
|---|---|---|
| White/Black | Public +own hidden | Full hidden hai phe |
| Spectator guest/account | Public only; capability read-only | Cần replay access grant; full nếu được cấp |
| Replay viewer | Không live replay endpoint | Full game data, không credential/PII |
| Server persistence log | Full game data nội bộ | Internal only |

Allowlist projector áp cho board/effect instances/payload/variantState/snapshots/targets/events/errors/action history. Không chỉ xóa `hidden:true` trên cell. Hidden trap/location/source IDs có thể lọt qua event target hoặc error text; role-view contract test phải bao phủ. RNG seed/state và full-state hash chỉ server/postgame cần quyền; live DTO không có nested raw state hoặc public `toSerializable`.

Legal hints/query cần đầy đủ rule authority nhưng không được trở thành oracle tiết lộ traps/stealth. D-25 quyết hints từ thông tin công khai vs precise full legality; không trả “blocked by enemy trap at X”. Đề xuất preview public eligibility, authoritative submit kiểm full state và cho coarse outcome/reveal đúng luật. Move highlight cần label rõ preview khi unknown; frontend không tự quyết gameplay. Chỉ hint own known effect/targets được quyền xem.

Internal event IDs/cause chain có thể lộ số trigger ẩn; projector phát view-local event order, không gửi missing internal sequence numbers hoặc effect count của hidden queue. Revision theo committed root không theo từng hidden derived operation. Network nhận same revision duplicate ignore; view hash tính trên role-safe payload, không hidden-state fingerprint.

## 5. Clock authority

CONFIRMED:15 phút mỗi bên +hard15giây/ply; chỉ first White ply miễn hard timer, chess clock vẫn chạy từ start. Skills không reset15giây; hết deadline sinh ordered terminal input. Timer callbacks gắn deadlineId/authorityEpoch/side/turn identity; callback cũ sau move/reconnect bị bỏ.

Backend dùng monotonic elapsed khi process sống, wall-clock server cho reconnect grace/deadline/persisted outage metadata. Normalize elapsed thành integer timing facts trong ordered log để replay không đọc thời gian máy. Clock runtime persistence cập nhật cùng gameplay input/transition; server restart không trừ outage vào player clock. Boundary command đến đúng deadline và two callbacks cùng lúc D-24: đề xuất server receipt-time arbitration với deadline equality timeout wins, persist order để replay khớp; chưa duyệt gameplay race policy.

Terrain3giây/auto skip và +5giây low-clock của [legacy TurnClock](../../reference/old-project/packages/game-core/src/match/TurnClock.ts)/[Match](../../reference/old-project/packages/game-core/src/match/Match.ts) chưa được duyệt D-07; không làm chess clock dừng chỉ vì legacy override.

## 6. Persistence contract

Đề xuất logical records, chưa là DB schema:

| Record | Nội dung |
|---|---|
| Match header | id/config/seats public refs, lifecycle, ruleset/engine/schema/RNG versions, current revision/authority epoch, retention metadata |
| Snapshot | revision/input sequence/full internal state +clock/connectivity/Time history/RNG/IDs/delayed/repetition; checksum/schema |
| Input/event log | contiguous ordered trusted inputs, deterministic domain events/outcome hashes, normalized clock/connectivity facts |
| Receipt | principal-safe commandId/payload digest/decision/revision, dedup bound |
| Access records | principals/seat/replay capability permissions; credentials ngoài game replay |

Một DB transaction append log/receipt, write snapshot/checkpoint và CAS expected revision. Snapshot mỗi accepted root lúc đầu để đơn giản và restore ngắn; tối ưu checkpoint frequency chỉ sau benchmark. Query heavy replay có thể offload sau release, chưa cần Kafka/event-store framework/CQRS.

Broadcast sau durable commit; process chết sau commit trước broadcast: restore từ snapshot/log và retry receipt. Process chết trước commit: action chưa accepted. Periodic snapshot optional sau profiler; replay reducer chạy actions, stored events là verification/output data, không double-apply events lẫn commands.

Restore verify checksum/schema/ruleset availability, last contiguous commit/revision, event/state hashes và invariants trước enable match. Không cố repair state hỏng bằng latest ruleset. Corruption/version unavailable → infrastructure pause/quarantine +operator alert, không player forfeit.

CONFIRMED retention Q-22:active infrastructure interruption/abandoned resume24h; completed replay/events30ngày; light metadata tối đa90ngày. Cleanup job theo status/time policy và được test, không xóa active hợp lệ vì TTL generic. Abandoned cần giữ snapshot full đủ resume24h trước chuyển policy completed; D-26 quyết reopen terminal transition semantics. Postgame dump không token/cookie/PII không cần thiết. Backup retention cần tương thích giới hạn/privacy, D-21 chọn policy thực tế.

## 7. Disconnect, restart và recovery

CONFIRMED Q-25/O-4/5: mỗi disconnect grace=min(60s, remaining180s budget), budget trừ actual outage per player. Freeze game state/timers/effect/delayed. Deadline server wall-clock vẫn chạy. Reconnect đúng hạn full role-view +clock remaining, không giảm duration. Hết deadline `forfeit_disconnect`; budget0 lần sau thua sau debounce ngắn, độ dài debounce D-24.

Hai player disconnect: independent deadlines/budget; ai hết trước thua, cùng tick `abandoned` không hòa. Infrastructure restart không tiêu disconnect budget, không xử thua do outage server; match restore và resume trong24h. Ghi disconnect/reconnect/expiry/resume vào ordered log. Phải phân biệt user disconnect và infrastructure interruption bằng authority shutdown/heartbeat/recovery record, không trừ budget khi server chết.

Recovery protocol đề xuất:

1. Xác minh principal/capability và seat trước join Socket room.
2. Restore/claim match authority nếu cần; game đang frozen, không apply client pending moves tự động.
3. Client gửi cursor; server gửi full role-view khi epoch đổi/gap/history unavailable. Baseline luôn hỗ trợ full sync.
4. Client hủy animation/input stale; replace logical view ở revision mới, rebuild scene; query pending command receipt trước resend.
5. Khi policy resume đủ player đáp ứng, server ghi Resume input và tiếp tục clocks với remaining; không reset15giây.

Socket.IO connection recovery là optimization có thể fail, không persistence/authorization solution; vẫn có full-sync fallback. [Connection state recovery](https://socket.io/docs/v4/connection-state-recovery/).

## 8. Public release và scaling

TLS, origin allowlist chính xác cho prod/preview, strict bounded payloads, per-principal/IP/socket/match quotas, token-safe logs, health/readiness, authz matrix, abuse monitoring, graceful shutdown/drain và backup/restore drill. Rate limit legal queries để chặn hidden oracle và CPU abuse. Metrics cần transaction latency/rollback/queue limit/DB commit/restore failure/timer drift/socket count/desync, không full hidden payload logs public.

Single instance đáp ứng prototype; public release cần restart survival và tải chứng minh, không bắt buộc multi-instance chỉ để “đúng kiến trúc”. Khi scale: distributed match ownership +lease/fencing/CAS, adapter broadcast và nếu polling cần routing/sticky theo transport; adapter không tự giải quyết two writers. Instance restart restore kiểm cross-process. Xác minh gói Render/Vercel/DB lúc release, không chốt giá/giới hạn từ audit cũ.

Sources legacy: [GameService](../../reference/old-project/apps/backend/src/game/game.service.ts), [GameGateway](../../reference/old-project/apps/backend/src/game/game.gateway.ts), [MatchView](../../reference/old-project/packages/game-core/src/view/MatchView.ts). Requirements dùng lại; source implementation chỉ đọc. Tests/gates: [TEST_STRATEGY](TEST_STRATEGY.md), [roadmap](IMPLEMENTATION_ROADMAP.md), D-21/D-24/25/26 trong [OPEN_DECISIONS](OPEN_DECISIONS.md).
