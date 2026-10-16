# Phase 02B-0 — Concrete Effect Rules & Compatibility Gate

2026-10-15. **Specification gate hoàn tất; concrete implementation gate BLOCKED.** Chủ dự án chỉ phê duyệt nghiên cứu/catalog/kế hoạch 02B-0. Không effect/Variant được enable; không bắt đầu 02B-1.

## Deliverables và phạm vi

- [CONCRETE_EFFECT_CATALOG](CONCRETE_EFFECT_CATALOG.md): inventory piece/player/cell effects, distinct legacy aliases, linked markers, rule-state/unit/delayed candidates; proposed IDs, provenance, targets/King, source/owner/controller, lifetime, matching/removal, events/movement/threat, relocation/links, repetition/capabilities và proposed tests. Shared contracts S0/L0/M0/R0/X0/G0/P0/T0 áp dụng cho từng entry; UNKNOWN không được điền bằng default.
- [PHASE_02B_IMPLEMENTATION_PLAN](PHASE_02B_IMPLEMENTATION_PLAN.md): proposed batch order, gameplay questions tách technical choices, minimal engine gaps, acceptance matrix và stop gates.
- Báo cáo này. **Chỉ ba file mới**, không sửa OPEN_DECISIONS vì questions là refinements của existing unresolved D-*; không có owner answer mới để đổi status. Sau câu trả lời cần cập nhật decision registry/spec trước code/expected.

Đã đọc AGENTS, CONTEXT, GAMEPLAY_SPEC, EFFECT_SYSTEM_SPEC, VARIANT_PLUGIN_SPEC, OPEN_DECISIONS, PHASE_02A_REPORT, Effect.md, Variants.md và phần effect/related contracts của GDD. Đối chiếu roadmap gate và chỉ kiểm source contracts cần cho compatibility: effects validation, lifetime/matching, trigger dispatch, root transaction/interception/cleanup, application schema. Không đọc legacy source hoặc audit lại 27 implementations; source evidence không cần thiết để khẳng định các unknown đã ghi rõ trong tài liệu.

## 1. Effects READY

**Không có concrete effect READY hoặc READY_WITH_ADAPTER.** Các generic data/lifecycle/relocation/link/snapshot/FIFO capabilities đã được nghiệm thu ở 02A, nhưng chưa là approval của một concrete definition. Không effect nào có đủ concrete rules để classify BLOCKED_ENGINE-only; các gaps engine vẫn được ghi độc lập, không bị che bởi BLOCKED_RULES.

## 2. Blockers chính

| Effect | Primary status | Rules cần đóng | Engine compatibility thực tế |
|---|---|---|---|
| Stun | BLOCKED_RULES | D-05 matching, D-06 main/forced/skill scope, D-08 threat, concrete metadata | E-ACTION: shared legality/validation/forced-skip; E-DURATION: definition lifetime cố định không nhận per-producer N |
| Shield | BLOCKED_RULES | D-04 subset/defense outcome, D-05 sources, D-06 capture scope/consumption, producer duration | Existing interceptor là reusable seam; consuming blocked attempt xung đột rollback. Time-only sau approval có thể adapter nhỏ; hiện chưa READY_WITH_ADAPTER |
| Bomb | BLOCKED_RULES | D-12 geometry/eligibility/causes, D-05 duplicate/source credit, D-06 category/cleanse | Death snapshot/coordinate + retired listener, supported concrete reaction contract; definition-level category không tự biểu diễn buff/debuff theo producer |
| Silence (optional) | BLOCKED_RULES | D-05 tier merge, D-06 blocked tiers, D-22 N/producer | Skill validation/tier metadata; variable durations cũng vướng E-DURATION |
| Sanctuary | BLOCKED_RULES | D-22.Guardian trigger/region/overlap; **3 round / Stun1 đã CONFIRMED**, không hỏi lại | Stun + supported exact capture observer, victim coordinate/attacker reference |
| Landmine | BLOCKED_RULES | D-12/D-22 entry/immune-consume/category; D-25 live disclosure | Bomb + cause-aware entry adapter + role-safe hidden projection trước live client |
| Các entries còn lại trong catalog | DEFERRED | Per-effect D-04/05/06/08 và D-10–19/22; Joker/Colossus tiếp tục deferred | Query/profile/control/reaction/unit/hidden gaps được ghi từng row; không đồng nghĩa chỉ thiếu registration |

Các mâu thuẫn đáng chú ý:

1. GDD/Variants default clock/stacking/King immunity không được dùng làm luật concrete mới; P00/Q/O thắng nhưng không tự chốt fields còn thiếu.
2. `EffectApplicationSchema` không có N, `lifetimeData` lấy fixed lifetime và validator yêu cầu equal definition. Shared Stun1/Stun3 cần lifetime/family design, không chỉ payload adapter; duration-specific IDs làm matching khác nếu không arbitration.
3. `CaptureInterceptor.cancel` rollback root; legacy Shield “chặn rồi trừ duration” cần một accepted outcome khác nếu owner chọn consuming policy.
4. Cleanup chạy trước committed death; retired observers chỉ có own removal fact, không death position. Bomb center không thể lấy position-at-apply hoặc mutable event cache để né thiếu snapshot.
5. Bomb charge/mine legacy category khác nhau, schema category thuộc definition; cần approve classification trước chọn one ID/two IDs/policy extension.
6. Synthetic-only triggers/delayed executors và cleanup-only removal không được rename/bypass để thực thi concrete reactions. General AP/forced movement/control/spawn intents cũng chưa có trong current derived union.

Đây là compatibility gaps so với future concrete requirements, không kết luận baseline 02A đã vi phạm phạm vi được duyệt. Không sửa core trong 02B-0.

## 3. First batch đề xuất

**Batch A: Stun → Shield → Bomb**, optional Silence independent. Stun phục vụ Sanctuary; Shield có thể dùng cancellation seam nếu chọn time-only; Bomb sau cùng vì death facts/chain/classification. Batch đầu dùng isolated approved manifest, không tự thêm redirect/Fate/Aegis hoặc hidden trap. **Batch B sau approval riêng: Sanctuary → Landmine**, phục vụ Guardian/Dynamite Phase04.

Full Guardian/Dynamite vẫn cần D-22 costs/passives/setup/refund/discount và producer rules, D-20 slice approval liên quan, Phase03/04 hidden projection/entry policies. Hoàn tất isolated consumers không có nghĩa hai Variants đã playable hoặc approved.

## 4. Questions owner cần trả lời

Chi tiết context, confirmed facts, options, recommendation, impacts và blocked milestone nằm trong plan §3. Recommendation đều **PROPOSED**, không status update.

| Label / parent decision | Câu trả lời cần trước implementation |
|---|---|
| D-05.BATCH-A | Chọn matching/coexistence/refresh cho từng Stun/Shield/Bomb; Bomb family duplicates cross-producer và attribution giữ/replace/ignore |
| D-06.STUN + D-08.STUN | Main-only hay forced/skill restriction; Stun có còn đóng góp threat không? |
| D-06.SHIELD + D-04.SHIELD | Capture-only time-based hay consume khi block; action/slot outcome? Cho isolated subset không redirect/Fate trước hay cần full matrix? |
| D-12.BOMB | Approve 3×3/all non-King hai phe/capturer/death-center, capture+destroy causes và initial attachment eligibility; blast source credit là Bomb source hay root actor? |
| D-06.BOMB | Classification charge/mine: hai typed definitions, một category cố định, hay dynamic policy? Cleanse chỉ cleanup giữ đúng P00-11 |
| D-06.BATCH-A-ENVELOPE + D-10.BATCH-A | Approve concrete ownership/visibility/unlinked/boundary/N producers/removal/retarget eligibility theo từng field; không hỏi lại source-clock/swap invariants hoặc global King immunity |
| D-06.SILENCE + D-05.SILENCE — conditional | Chỉ nếu chọn optional Silence: all vs tier-specific, cross-source tier union/replace, N và expiry |
| D-22.GUARDIAN-SANCTUARY — later gate | Victim/attacker relation, center/overlap/stand-still coverage; không hỏi lại3/1 |
| D-12.LANDMINE — later gate | Entry causes, consume khi Bomb bị blocked, source/target predicate/reveal; D-25 trước live hidden slice |

Chỉ các rows Batch A cần trước isolated Stun/Shield/Bomb; không buộc owner đóng mọi Variant hoặc Sanctuary/Landmine/Silence để mở một effect không phụ thuộc chúng. Sau rules approval vẫn cần authorization **02B-1** riêng.

## Validation và kết thúc

Docs-only checks **PASS**: internal links, 77 proposed inventory IDs duy nhất (gồm effect/rule/unit/lifecycle/delayed candidates, không phải 77 approved effects), existing parent-decision references, whitespace và phạm vi file thay đổi. Independent review theo hai trục: **Standards 0 findings; Spec 0 findings**, không có issue được báo chưa xử lý. Không chạy tests/lint/build/typecheck vì không thay code/dependencies; **310 tests/23files, engine0.2.0 là inherited 02A evidence**, không claimed rerun trong 02B-0.

Không source gameplay/dependency change, không refactor, không concrete effects/skills, không commit/push. **Dừng tại specification/approval gate.**
