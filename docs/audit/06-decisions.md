# 06 — Nhật ký quyết định của chủ dự án

Ngày ghi: 2026-10-04; bổ sung xác nhận cuối ngày 2026-10-10. Nguồn: câu trả lời cho `05-open-questions.md` (hai lượt), phiên grill roadmap và các xác nhận bổ sung.
Trạng thái: **đã chốt toàn bộ**; không còn câu hỏi mở. Khi file này mâu thuẫn với `00`–`05`, file này thắng.

Nhãn dùng trong file:
- **[CHỐT]** chủ dự án đã trả lời trực tiếp.
- **[MẶC ĐỊNH]** chủ dự án ủy quyền ("làm theo ý bạn") hoặc câu trả lời còn mơ hồ nên tôi chọn mặc định hợp lý. Cần chủ dự án veto nếu không đồng ý.

---

## 1. Thứ tự nguồn sự thật (Q-05)

1. File quyết định này (`06-decisions.md`)
2. `apps/frontend/src/lib/variantsData.ts`
3. `docs/Variants.md`
4. `docs/GDD.md`
5. Test hiện có
6. Code hiện có

**[MẶC ĐỊNH]** Chủ dự án nói "ưu tiên variantsData nhất". Tôi đặt file quyết định lên trên cùng vì nhiều quyết định mới (Q-08 đến Q-13, Q-18) khác cả `variantsData.ts`. Hệ quả: `variantsData.ts` phải được cập nhật theo file này, và các R-DOC chưa được hỏi (04, 09, 17, 18, 19, 20, 21) sẽ được giải quyết bằng một lượt diff code ↔ `variantsData.ts`.

---

## 2. Bảng quyết định theo từng câu hỏi

Loại việc: **Code** = sửa engine/backend/frontend, **Docs** = sửa tài liệu/metadata, **Test** = thêm/sửa test, **Infra** = hạ tầng/CI/deploy.

### Luật và product

| ID | Quyết định | Loại việc |
|---|---|---|
| Q-01 | Giữ anonymous room-code để vào phòng, **nhưng account bắt buộc cho public release**. `playerId` là secret. Provider chưa chọn (xem phần 6). | Code, Infra |
| Q-02 | Phải chống người chơi hack (devtools, sửa client, map-hack). Server không gửi thông tin ẩn cho client. | Code, Test |
| Q-03 | `duration: N` = **N vòng đủ White + Black**. Thống nhất thuật ngữ trong code, docs, UI. | Code, Docs, Test |
| Q-04 | **Mirror match chính thức được hỗ trợ.** Hai người chơi được chọn cùng variant. | Code, Test |
| Q-05 | Xem phần 1. | Docs |
| Q-06 | Giữ hướng bàn cờ hiện tại (White hàng 1/2, Black hàng 15/14). Sửa GDD cho khớp code. | Docs |
| Q-07 | **Chỉ threefold repetition.** Position key gồm board, bên đi, effect, AP, `variantState`; bỏ clock và history (chi tiết phần 4.1). | Code, Test |
| Q-08 | **Chốt lại (thay thế câu trả lời cũ):** Space ultimate **không** ẩn/gỡ 2 ally. Giữ hành vi code hiện tại: buff 10 round, capture tạo ô Outworld. | Docs (code giữ nguyên) |
| Q-09 | Verdant Gaze **+2/-2**. Emerald Domain là **Stun, không khóa King chủ skill**. Code đã đúng. | Docs |
| Q-10 | Puppet Master tổng **7 round** = 2 round đầu chỉ được move (không capture) + 5 round tự do. AP là bảng dynamic trong `apCostConfig.ts`. | Docs, Test |
| Q-11 | **Chốt lại:** Skill 2 Thunder Dragon = capture một ô nằm trong **moveset thường** rồi **đứng yên**, vẫn tạo trap Stun. Không còn capture theo tia. Ultimate **3×10** (code đã đúng). | Code, Docs, Test |
| Q-12 | Predator Shadow Prowl chỉ trong tầm tấn công của **Pawn** ally. | Code, Test |
| Q-13 | Zombie Infection miễn phí **trong 3 round đầu** của trận (bỏ counter `freeInfectionRemaining`). | Code, Test |
| Q-14 | Quân bị destroy bởi skill/effect **nhận loss AP** như bị capture. Bên thi triển destroy **không** nhận AP. | Code, Test |
| Q-15 | Devil sacrifice **lặp được** đến khi đủ AP rồi vẫn move. Code hiện tại đúng ý, chỉ cần test khóa hành vi. | Test |
| Q-16 | Ghost capture obstacle thứ hai khi obstacle thứ nhất còn nguyên là **đúng chủ ý**. | Test |
| Q-17 | Pawn bị điều khiển (Walker/Puppet) đi và promote **theo controller**. | Code, Test |
| Q-18 | **Chốt lại (thay thế câu trả lời cũ):** King **bị dính effect như quân thường**, không miễn nhiễm toàn cục. Bỏ quy tắc "effect không dùng lên King" trong `docs/Effect.md`. | Code, Docs, Test |
| Q-19 | Bỏ `OnCheck` khỏi thuật ngữ công khai. Dùng tên nội bộ kiểu `OnKingAttacked`. | Code, Docs |
| Q-20 | Joker và Colossus **hoãn**, tính sau. Không suy đoán hành vi chưa có spec. | Docs |

### Runtime, storage và release

| ID | Quyết định | Loại việc |
|---|---|---|
| Q-21 | Frontend: **Vercel**. Backend: **Render**. | Infra |
| Q-22 | Active match phải sống qua restart, lưu theo `matchId` (snapshot + event log đủ để khôi phục toàn bộ state). Socket room chỉ là transport tạm. Match active bị bỏ dở resume được **24 giờ**. Replay/event history của trận đã kết thúc giữ **30 ngày**. Metadata nhẹ giữ tối đa **90 ngày**. Replay không chứa token, cookie hay dữ liệu cá nhân không cần thiết. | Code, Infra |
| Q-23 | **Cả hai**: chess clock 15 phút mỗi bên **và** turn timeout cứng 15 giây. | Code, Test |
| Q-24 | **Chốt lại:** chỉ miễn **turn timeout 15 giây** cho lượt đầu; chess clock vẫn chạy. Xem diễn giải về Black ở phần 3. | Code, Test |
| Q-25 | Grace 60 giây chính thức, state đóng băng, timer game dừng; deadline reconnect chạy theo wall-clock server; hết hạn thì thua. Phần cộng dồn và trường hợp đặc biệt: xem phần 4.2. | Code, Test |
| Q-26 | Spectator và replay là năng lực kiến trúc đã lên kế hoạch. Viewer có role ngoài White/Black; serialize/redact **theo role**. | Code, Test |
| Q-27 | **Không commit `dist`.** CI build sạch từ source rồi chạy bản compiled. | Infra |
| Q-28 | Không cần offline, nhưng production build **không phụ thuộc tải font từ xa**. Bundle font local (`next/font/local`). Hỗ trợ trình duyệt evergreen. | Code, Infra |
| Q-29 | Security patch/minor được nâng ngay nếu qua regression test tự động. Major cần review tương thích. Commit lockfile. | Infra |
| Q-30 | Không suy đoán ý định lịch sử ngoài repo. `main` và tag alpha là nguồn lịch sử duy nhất. | — |

### Testing và mức hoàn thiện

| ID | Quyết định | Loại việc |
|---|---|---|
| Q-31 | Mục tiêu gần nhất: **public internet release**. | Toàn bộ |
| Q-32 | Giữ thiết kế King-as-regular-piece. Perft đếm pseudo-legal moves. | Test |
| Q-33 | **Bắt buộc deterministic.** Cùng initial state + ruleset version + seed + chuỗi action có thứ tự thì phải ra cùng state và event sequence. Mọi ngẫu nhiên gameplay đi qua RNG theo match. Wall-clock không được ảnh hưởng kết quả gameplay. | Code, Test |
| Q-34 | Server là authoritative cho mọi action và move set. Client được tự tính move dự đoán để phản hồi nhanh. | Code |
| Q-35 | Mọi match, snapshot, replay ghi **engine/ruleset version** từ bản public đầu tiên. Replay chạy theo ruleset lúc chơi, không tự dùng luật mới. | Code, Infra |

---

## 3. Câu trả lời bị thay thế và diễn giải mặc định

### 3.1 Các quyết định đã bị thay thế

| ID | Câu trả lời cũ | Câu trả lời cuối |
|---|---|---|
| Q-08 | Cả hai: ẩn 2 ally là điều kiện trước khi capture tạo Outworld | Không ẩn ally; giữ nguyên hiệu ứng Outworld |
| Q-11 | Skill 2 chỉ là "capture không cần move" | Capture trong moveset thường, đứng yên, giữ trap Stun |
| Q-18 | King miễn nhiễm hoàn toàn | King bị dính effect như quân thường |
| Q-24 | Giữ miễn timeout như hiện tại | Chỉ miễn turn timeout 15 giây ở lượt đầu |

### 3.2 Diễn giải đã được xác nhận

1. **[CHỐT] Q-18, phạm vi.** "King bị dính effect như quân thường" nghĩa là engine không có luật miễn nhiễm chung. Các giới hạn **riêng của từng skill** (ví dụ Angel Stun "non-King", Magician Fool "trừ King", Raigeki chỉ gỡ Stun khỏi King) vẫn theo `variantsData.ts`. Raigeki giữ ngoại lệ. Cell effect dưới chân King và player effect hoạt động như bình thường.
2. **[CHỐT] Q-24, lượt đầu của Black.** **Chỉ lượt đầu của White được miễn turn timeout 15 giây; lượt đầu của Black bị tính 15 giây bình thường.**
3. **[CHỐT] Q-24, cách triển khai.** Miễn timeout lượt đầu phải dựa vào cờ rõ ràng trong state (ví dụ `firstTurnGraceUsed`), không dựa vào sentinel `moveHistory.length === 0`. Timer và chess clock vẫn khởi động ngay khi trận bắt đầu.
4. **[CHỐT] Q-26, spectator trực tiếp.** Trong trận đang diễn ra, spectator chỉ thấy thông tin công khai, **không thấy trap/stealth của cả hai bên**. Guest được spectate trận public ở chế độ read-only qua signed capability.

---

## 4. Spec chi tiết đã chốt

### 4.1 Threefold repetition (Q-07)

- **Điều kiện:** cùng một position key xuất hiện **3 lần** (không cần liên tiếp) thì trận hòa tự động. Lý do kết thúc: `threefold_repetition`.
- **Position key gồm:** vị trí, loại, màu và owner hiệu lực của mọi quân; bên đang đi; mọi effect (piece, cell, player, **kể cả effect ẩn như trap**) cùng `remainingDuration`; AP hai bên; `variantState`.
- **Position key không gồm:** chess clock, turn timer, `actionHistory`, `moveHistory`, `turnNumber`.
- **Yêu cầu kỹ thuật bắt buộc:** serialize **canonical** (thứ tự ổn định). Phải **bỏ các ID và timestamp dễ thay đổi**: audit đã ghi nhận effect ID và nhiều ID khác dùng `Date.now()`/`Math.random()`, nếu để vào key thì không bao giờ lặp. Cần rà `variantState` để loại trường nhiễu.
- **Hệ quả cần biết:** vì AP nằm trong key, vị trí lặp mà AP khác nhau không tính là lặp. Đây là chủ ý theo quyết định của bạn.
- **Thứ tự triển khai:** làm sau khi có terminal transition chung (task 0.4) và deterministic RNG/ID (task 2.6).

### 4.2 Disconnect và reconnect (Q-25)

Toàn bộ chính sách dưới đây đã được chủ dự án xác nhận:

1. Người chơi mất kết nối: server **đóng băng** match, dừng chess clock và turn timer. Effect duration, round counter, delayed action **không** tiến.
2. Mỗi lần ngắt kết nối có tối đa **60 giây** reconnect, tính theo wall-clock server.
3. **[CHỐT]** Mỗi người chơi có **ngân sách tổng 180 giây** ngắt kết nối cho cả trận. Mỗi lần ngắt trừ thời gian ngắt thực tế. Grace của một lần = `min(60 giây, ngân sách còn lại)`. Hết ngân sách thì lần ngắt kế tiếp thua gần như ngay (sau một khoảng debounce ngắn). Mục đích: chặn việc ngắt lặp lại để đóng băng trận.
4. Reconnect đúng hạn: server đồng bộ full state theo role, khôi phục turn timer với thời gian còn lại, tiếp tục trận.
5. Hết hạn: người ngắt kết nối **thua**. Lý do: `forfeit_disconnect`.
6. **[CHỐT]** Cả hai cùng ngắt: mỗi người có deadline riêng. Ai hết hạn trước thì thua. Nếu hết hạn cùng một tick: kết quả `abandoned`, **không có người thắng và không phải hòa**.
7. **[CHỐT]** Server restart hoặc sự cố hạ tầng: match được khôi phục từ persistence, coi như cả hai đang ngắt kết nối, **không trừ ngân sách** và không bị xử thua do lỗi server. Chính sách resume tối đa 24 giờ chỉ áp dụng cho gián đoạn hạ tầng hoặc match `abandoned`; người chơi ngắt quá 60 giây vẫn thua.
8. Mọi sự kiện ngắt/nối/hết hạn được ghi vào event log.

### 4.3 Quyền xem thông tin theo role (Q-02, Q-22, Q-26)

| Role | Trận đang diễn ra | Trận đã kết thúc (replay) |
|---|---|---|
| White / Black | Thông tin công khai + thông tin ẩn **của chính mình** | Toàn bộ thông tin, gồm trap/stealth của cả hai bên |
| Spectator | Chỉ thông tin công khai | Toàn bộ thông tin |
| Replay viewer | Không có (replay chỉ mở khi trận đã kết thúc) | Toàn bộ thông tin |

- Log phía server luôn lưu đủ thông tin ẩn. Không API nào của trận đang diễn ra được trả log đầy đủ.
- Replay xuất ra không chứa token, cookie, hay dữ liệu cá nhân không cần thiết.
- Hệ quả thiết kế: DTO phải là **allowlist theo role**. Payload không được chứa `playerId` bí mật của người khác; cần tách mã tham chiếu công khai (`publicPlayerRef`) khỏi credential bí mật.

### 4.4 Danh sách lý do kết thúc trận (terminal reasons)

`king_captured`, `clock_timeout` (hết chess clock), `turn_timeout` (hết 15 giây), `surrender`, `forfeit_disconnect`, `threefold_repetition` (hòa), `abandoned` (không thắng/thua/hòa). Mọi lý do đi qua **một** terminal transition duy nhất (task 0.4). Timeout và forfeit do timer sinh ra phải được ghi vào event log như một action có thứ tự, vì chúng quyết định kết quả trận mà vẫn phải replay được (Q-33).

---

## 5. Tác động lên các mục audit

### 5.1 Findings đổi trạng thái

| Finding | Thay đổi |
|---|---|
| A-09 (sacrifice nhiều lần) | Chuyển từ bug sang **hành vi chủ đích**. Chỉ cần test khóa. |
| A-12 (Ghost capture obstacle thứ hai) | Chuyển từ bug sang **hành vi chủ đích**. Chỉ cần test khóa. |
| D-02 (timer lượt đầu) | Một nửa là chủ đích (miễn 15 giây lượt đầu của White). Vẫn là bug: timer không khởi động ngay, và logic dựa vào sentinel `moveHistory.length === 0`. |
| A-08 (né Devil Toll qua capture) | Vẫn là bug. |
| B-01 (mirror chia sẻ state) | Vẫn là bug và giờ là **bắt buộc sửa** (task 0.7). |
| H-01, A-01, A-02, H-02 | Không đổi, vẫn Critical. H-02 mở rộng: phải làm DTO theo role. |

### 5.2 Giải quyết các sai lệch tài liệu ↔ code

| R-DOC | Giải quyết |
|---|---|
| 01 | Sửa GDD (Q-06). |
| 02 | Implement threefold (phần 4.1). |
| 03 Zombie | Sửa code: 3 round đầu. |
| 05 Predator | Sửa code: chỉ tầm Pawn. |
| 06 Verdant | Sửa docs/`variantsData.ts`. Code giữ. |
| 07 Space | Sửa docs/`variantsData.ts`. Code giữ. |
| 08 Puppet | Sửa docs. Xác nhận code tách đúng "2 round không capture + 5 round tự do". |
| 10 Thunder Dragon | Sửa code skill 2; ultimate 3×10 đã đúng. |
| 11 King effects | Sửa code/docs: bỏ luật miễn nhiễm toàn cục. |
| 12 Joker/Colossus | Đánh dấu "hoãn" trong docs, `variantsData.ts`, asset. |
| 13 Pirate | Commit docs Pirate, sửa test đếm 26 → 27. |
| 14 | Sửa code: kiểm tra requester và lượt cho mọi root action. |
| 15 | Sửa code: duration tính theo vòng đủ White + Black; thống nhất thuật ngữ. |
| 16 | Archive `AUDIT.md` cũ có ghi ngày và trạng thái. |
| 04, 09, 17, 18, 19, 20, 21 | **Chưa được hỏi.** Giải quyết bằng diff code ↔ `variantsData.ts` theo thứ tự nguồn ở phần 1. |

### 5.3 Các việc mới chưa có trong `04-roadmap.md`

1. Hệ thống account và xác thực (gắn socket với account, token trên handshake).
2. Persistence trên datastore ngoài (Render cần DB ngoài vì RAM mất khi restart; kiểm tra giới hạn gói hiện hành), job dọn dữ liệu 24 giờ / 30 ngày / 90 ngày.
3. Role spectator/replay và DTO theo role.
4. Thống nhất ngữ nghĩa `duration` (đụng hầu hết 27 variant và nhiều test).
5. Bỏ luật miễn nhiễm King (đụng nhiều test và skill).
6. Sửa luật theo phần 5.2 (Zombie, Predator, Thunder Dragon skill 2, controlled Pawn, destroy AP).
7. Diff code ↔ `variantsData.ts` và cập nhật `variantsData.ts`.
8. Rename `OnCheck`.
9. Hạ tầng public release: CORS allowlist (Vercel production + preview), rate limit, validation, logging/observability, sticky session hoặc adapter nếu chạy nhiều instance.
10. Local font, bỏ tracking `dist`, CI build sạch.
11. Ruleset version trong mọi snapshot/event log.

---

## 6. Các câu hỏi mở đã được chốt

Chủ dự án xác nhận ngày 2026-10-10 rằng toàn bộ phương án đề xuất trong phiên grill được chấp thuận. Không còn quyết định mở chặn triển khai.

| ID | Quyết định cuối |
|---|---|
| O-1 | Dùng **Supabase Auth** với Google và email magic link. Account bắt buộc để chơi public match. Guest chỉ spectate trận public read-only qua signed capability; replay mặc định cần account/quyền truy cập. Vẫn giữ abstraction `AuthPrincipal` provider-neutral. |
| O-2 | Chỉ first ply của White miễn hard timeout; first ply của Black có 15 giây. Chess clock chạy ngay từ đầu. |
| O-3 | Hết 15 giây là thua với `turn_timeout`; hard timer reset mỗi ply hợp lệ và chạy song song chess clock 15 phút. |
| O-4 | Resume 24 giờ chỉ dành cho gián đoạn server/hạ tầng hoặc `abandoned`; user disconnect quá 60 giây thua. |
| O-5 | Ngân sách disconnect 180 giây/người/trận; cùng deadline trong một tick → `abandoned`; restart không tiêu budget. |
| O-6 | Giữ restriction `non-King` riêng được `variantsData.ts` nêu; bỏ exemption chỉ tồn tại trong code; giữ ngoại lệ Raigeki. |
| O-6b | Non-capture destruction/AoE/beam không được phá King và không tạo terminal; chỉ capture King tạo `king_captured`. |
| O-7 | Time ultimate dùng một command canonical `time_collapse` với `mode: grand_rewind | time_freeze`; event log ghi mode, alias cũ migrate theo ruleset version. |
| O-8 | Guardian Sanctuary theo catalog: tồn tại 3 round, Stun 1 round. |
| O-9 | Nephalem Judgment Chains tồn tại 3 round. |

---

## 7. Đề xuất bước tiếp theo

### 7.1 Khuyến nghị: để AI đọc lại câu trả lời và chốt roadmap cuối **trước khi** triển khai

Không nên cho AI chạy thẳng theo `04-roadmap.md` hiện tại, vì:

1. **Roadmap cũ lệch ít nhất mười hạng mục.** Task 0.7 thành bắt buộc, 0.9 phải viết lại hoàn toàn, 0.1/0.3 phải mở rộng (account, role), cộng thêm các việc mới ở phần 5.3.
2. **Hai quyết định làm vỡ test hiện có.** Đổi ngữ nghĩa `duration` (Q-03) và bỏ miễn nhiễm King (Q-18) sẽ làm đỏ nhiều trong 543 test. Nếu AI sửa trước khi chốt, sẽ phải làm lại. Cần quyết định trước test nào là baseline mới.
3. Bảy R-DOC từng chưa có đáp án đã được giải bằng `08-variant-diff.md` và thứ tự nguồn ở phần 1.
4. Mâu thuẫn O-4 và hành vi O-3 đã được chốt trong phần 6; terminal transition và persistence không còn decision blocker.

Bước chốt roadmap chỉ là việc đọc và viết tài liệu, không sửa code, nên rẻ và nhanh.

### 7.2 Việc an toàn có thể chạy song song ngay (không phụ thuộc quyết định nào)

- 1.1 Sửa test đếm 26 → 27, nên lấy danh sách từ registry thay vì hard-code.
- 1.2 Sửa e2e module resolution.
- 2.8 Bỏ tracking `dist`, thêm `.gitignore`, thiết lập CI build sạch.
- Chuyển sang `next/font/local` để production build không tải font từ xa.
- 0.10 Nâng security patch/minor cho Next, Socket.IO, Nest, chạy lại test và `npm audit --omit=dev`.
- Viết **regression test tái hiện** H-01, A-01, A-02, H-02 (cho phép đánh dấu đang fail trước khi sửa).
- 0.2 Kiểm tra `requester === currentTurn` cho mọi root action (không phụ thuộc quyết định mới).

### 7.3 Lộ trình đề xuất

| Giai đoạn | Nội dung | Điều kiện qua cổng |
|---|---|---|
| R. Chốt roadmap | AI đọc `00`–`06`, tạo `07-roadmap-final.md`, cập nhật cột trạng thái trong `02-findings.md`, tạo `08-variant-diff.md` (code ↔ `variantsData.ts`). **Không sửa code.** | **HOÀN THÀNH 2026-10-10:** chủ dự án duyệt roadmap và chốt O-1…O-9. |
| 0. Song song | Các việc ở phần 7.2 | Build, test, audit xanh |
| 1. Giao thức authoritative | Account/session, requester và lượt, terminal transition chung, clock, DTO theo role | Adversarial test (mạo danh, sai lượt, leak) pass |
| 2. Nền state | Snapshot sâu, namespace `variantState` theo player (mirror), queue rollback, RNG/ID/clock inject | Self-match 27 variant, determinism test pass |
| 3. Persistence | Datastore ngoài, event log có ruleset version, restore, retention, reconnect/disconnect theo 4.2 | Restart giữa trận khôi phục đúng; replay khớp |
| 4. Luật | `duration` theo vòng, King không miễn nhiễm, các sửa luật ở 5.2, threefold, đồng bộ `variantsData.ts` | Test baseline mới pass, perft nền |
| 5. Public release | CORS allowlist, rate limit, validation, logging, spectator/replay, e2e hai client | Tiêu chí Q-31 đạt |

### 7.4 Prompt gợi ý cho giai đoạn R

```text
Đọc toàn bộ docs/audit/00 đến 06 (06-decisions.md là nguồn ưu tiên cao nhất).
KHÔNG sửa source code, config hay test.

Hãy tạo:
1. docs/audit/07-roadmap-final.md: roadmap cập nhật theo các quyết định, gồm
   task ID, effort, phụ thuộc, exit criteria, và đánh dấu task nào cần
   quyết định O-1..O-6. Nêu rõ test nào sẽ phải đổi baseline do Q-03 và Q-18.
2. docs/audit/08-variant-diff.md: so sánh từng variant giữa code và
   apps/frontend/src/lib/variantsData.ts (tên skill, AP, duration, mô tả),
   bao gồm R-DOC 04, 09, 17, 18, 19, 20, 21. Với mỗi lệch ghi rõ nên sửa code
   hay sửa variantsData theo thứ tự nguồn ở 06-decisions.md.
3. Cập nhật cột trạng thái trong 02-findings.md theo mục 5.1 của 06.

Cuối cùng liệt kê mọi điểm mơ hồ còn lại dưới dạng câu hỏi ngắn.
```
