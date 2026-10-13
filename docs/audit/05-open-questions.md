# 05 — Câu hỏi cần chủ dự án quyết định

Các câu hỏi này không chặn việc xác nhận bug kỹ thuật, nhưng câu trả lời sẽ quyết định hướng sửa rules/state sau audit.

## Luật và product

1. **[UNKNOWN] Q-01 — Identity/reconnect:** Game dự kiến anonymous room-code như hiện tại, có account, hay dùng signed guest session? `playerId` có được xem là secret không (`game.service.ts:48-53`; `game.gateway.ts:384-417`)?
2. **[UNKNOWN] Q-02 — Threat model:** Có cần chống người chơi sửa client/devtools và spectator map-hack, hay chỉ cần client “bình thường”? Code hiện gửi internal state nên câu trả lời ảnh hưởng toàn DTO (`GameState.ts:141-229`).
3. **[UNKNOWN] Q-03 — Turn vs round:** Một `duration: 2` nghĩa là hai lượt riêng lẻ hay hai vòng đủ White+Black? `turnNumber` hiện là round nhưng tài liệu dùng thuật ngữ lẫn nhau (`ActionPipeline.ts:888-894,1016-1057`; working diff `docs/Variants.md`).
4. **[UNKNOWN] Q-04 — Mirror match:** Hai người có chính thức được chọn cùng variant không? Audit cũ nói có (`AUDIT.md:8-12`), nhưng state không tách player (`VariantRegistry.ts:105-110`).
5. **[UNKNOWN] Q-05 — Source of truth:** Khi `GDD.md`, `docs/Variants.md`, frontend `variantsData.ts`, test và code khác nhau, thứ tự ưu tiên mong muốn là gì?
6. **[UNKNOWN] Q-06 — Board orientation:** GDD nói Black ở rank 1, White ở rank 15; code làm ngược (`docs/GDD.md:165-177`; `initialLayout.ts:30-56`). Muốn sửa docs hay đổi code/assets/UI orientation?
7. **[UNKNOWN] Q-07 — Draw:** Chỉ cần threefold như GDD, hay thêm 50-move, insufficient material, agreement và disconnect draw? Variant effects/AP/hidden state có tham gia position identity không (`docs/GDD.md:230-240`)?
8. **[UNKNOWN] Q-08 — Space ultimate:** Rule đúng là “ẩn hai ally 10 round” theo docs hay “capture tạo Outworld trong 10 round” theo code (`docs/Variants.md:218-229`; `SpaceVariant.ts:369-406`)?
9. **[UNKNOWN] Q-09 — Verdant Dragon:** Gaze đúng +1/-1 hay +2/-2? Emerald Domain là Root + khóa King hay Stun không khóa King (`docs/Variants.md:146-152`; `VerdantDragonVariant.ts:132-307`)?
10. **[UNKNOWN] Q-10 — Puppet Master:** Tổng thời lượng đúng 5 hay 7 round, và AP table nào đúng (`docs/Variants.md:241-248`; `PuppetVariant.ts:407-490`; `apCostConfig.ts:131-141`)?
11. **[UNKNOWN] Q-11 — Thunder Dragon:** Skill 2 là generic Marksman hay Thunder Fang ray capture? Ultimate là 3×8 hay 3×10 (`docs/Variants.md:154-157`; `ThunderDragonVariant.ts:263-332`)?
12. **[UNKNOWN] Q-12 — Predator:** Shadow Prowl chỉ trong attack range của Pawn hay bất kỳ ally (`docs/Variants.md:105-110`; `PredatorVariant.ts:269-301`)?
13. **[UNKNOWN] Q-13 — Zombie free use:** Miễn phí ba round đầu hay ba lần Infection đầu (`docs/Variants.md:37-40`; `ZombieVariant.ts:31-43`)?
14. **[UNKNOWN] Q-14 — Destroy AP:** Quân bị skill/effect destroy có nhận loss AP như bị capture không? Hiện chỉ capture và Shelter special case trả AP (`ActionPipeline.ts:675-716,1081-1169`).
15. **[UNKNOWN] Q-15 — Devil sacrifice:** Sacrifice có thay main move, chỉ được một lần, hay được lặp đến đủ AP rồi vẫn move (`ActionPipeline.ts:1174-1230`)?
16. **[UNKNOWN] Q-16 — Ghost:** Cho capture obstacle thứ hai trong khi obstacle thứ nhất còn nguyên có đúng chủ ý (`MoveGenerator.ts:33-67`)?
17. **[UNKNOWN] Q-17 — Controlled Pawn:** Walker/Puppet Pawn giữ hướng/promotion theo màu gốc hay theo controller (`pawnMoves.ts:20-24`; `getPieceOwner` tại `Piece.ts`)?
18. **[UNKNOWN] Q-18 — King effects:** Rule global “Effect không thể dùng lên King” trong `docs/Effect.md:2-5` còn hiệu lực, hay mỗi skill tự quyết?
19. **[UNKNOWN] Q-19 — Check events:** Vì game không có check legality, event `OnCheck` chỉ là “King đang bị attack” để kích effect hay nên bỏ khỏi public terminology (`AttackDetection.ts:205-270`; `ActionPipeline.ts:109-153`)?
20. **[UNKNOWN] Q-20 — Joker/Colossus:** Hai variant này bị hủy, hoãn, hay vẫn nằm roadmap? Có source Colossus cũ nào ngoài tracked `dist` cần khôi phục không?

## Runtime, storage và release

21. **[UNKNOWN] Q-21 — Deployment:** Target là Windows/Linux, self-host, Vercel hay nền tảng khác? Điều này ảnh hưởng `next/font`, CORS, Socket.IO sticky sessions và applicability advisory.
22. **[UNKNOWN] Q-22 — Persistence:** Có cần resume game qua server restart, hay room chỉ là ephemeral session? Nếu cần, retention và privacy của replay/history là bao lâu?
23. **[UNKNOWN] Q-23 — Clock:** Ý định là chess clock 15 phút mỗi bên, hard turn timeout 15 giây, hay cả hai? `Match.getTurnTimeoutMs()` trả 15 giây nhưng gateway thường schedule theo remaining clock (`Match.ts:118-125`; `game.gateway.ts:64-68`).
24. **[UNKNOWN] Q-24 — First turn:** White có được miễn timeout như code hiện tại không (`game.gateway.ts:57-62`)? Nếu không, lỗi D-02 phải sửa ngay.
25. **[UNKNOWN] Q-25 — Reconnect/forfeit:** Grace period 60 giây có phải requirement chính thức? Game state nên frozen, clock vẫn chạy hay pause trong thời gian này (`game.gateway.ts:442-464`)?
26. **[UNKNOWN] Q-26 — Spectator:** Có planned spectator/replay endpoint không? Nếu có, per-viewer redaction cần role thứ ba thay vì chỉ White/Black.
27. **[UNKNOWN] Q-27 — Generated `dist`:** Bạn muốn commit build artifacts để deploy trực tiếp, hay chuyển sang clean build trong CI? Hiện package runtime trỏ `dist` và stale module còn tồn tại.
28. **[UNKNOWN] Q-28 — Browser support/offline build:** Có yêu cầu build không network không? `next/font/google` đang làm production build trong môi trường audit thất bại (`layout.tsx:2-18`).
29. **[UNKNOWN] Q-29 — Dependency policy:** Có chấp nhận patch/minor ngay để xử lý critical/high advisories, hay cần giữ exact version để phục hồi behavior trước?
30. **[UNKNOWN] Q-30 — Historical intent:** Có branch/local backup/issue tracker ngoài Git hiện tại chứa quyết định rules hoặc work Colossus/Joker không? Git chỉ cho thấy `main` và tag alpha.

## Testing và mức hoàn thiện mong muốn

31. **[UNKNOWN] Q-31 — Definition of done:** Mục tiêu gần nhất là local prototype, closed playtest hay public internet release? Security/persistence/observability threshold khác nhau đáng kể.
32. **[UNKNOWN] Q-32 — Perft semantics:** Vì không có self-check, perft nên đếm pseudo-legal moves đúng như code hiện tại. Bạn có muốn giữ thiết kế King-as-regular-piece tuyệt đối không (`docs/GDD.md:193-200`)?
33. **[UNKNOWN] Q-33 — Determinism:** Replay cùng seed có phải requirement không? Nếu có, cần loại wall-clock/random khỏi gameplay IDs và event order.
34. **[UNKNOWN] Q-34 — Client prediction:** Muốn server trả legal moves authoritative cho mỗi selection, hay giữ tính local để latency thấp và port toàn modifier context sang client?
35. **[UNKNOWN] Q-35 — Rule compatibility:** Save/replay trong tương lai có cần phát lại game từ version cũ sau khi rules thay đổi không? Nếu có, rule-set version phải đi vào snapshot/event log từ đầu.

## Thứ tự câu trả lời hữu ích nhất

Nếu chỉ trả lời một lượt ngắn, ưu tiên: Q-04 (mirror), Q-03 (round), Q-05 (source of truth), Q-08–Q-13 (rule conflicts), Q-23 (clock), Q-20 (Joker/Colossus), rồi Q-21/Q-22/Q-31 (release scope).
