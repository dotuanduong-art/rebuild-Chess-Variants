# Phase 02B Batch A — Approval Report

2026-10-15. **Documentation rules freeze COMPLETE; implementation NOT_STARTED; concrete enablement NOT_READY.** Source: owner prompt APPROVED BATCH A RULES FREEZE. Không authorization 02B-1 từ milestone tài liệu này.

## Approved decisions

Đã ghi **10 named decision IDs** và **6 metadata groups** (16 scoped approval blocks, không phải 16 parent decisions CLOSED):

- D-05.BATCH-A.STUN, D-06.STUN, D-08.STUN: refresh/reset stable ID, independent sources, active-set main-action/threat restriction, no forced/skill-target/owner/controller/AP behavior tự suy.
- D-05.BATCH-A.SHIELD, D-06.SHIELD, D-04.SHIELD: independent timed boolean Shields; no charges; blocked capture atomic reject, no main-slot/AP/RNG/lifetime debit/death/AP/Bomb/King terminal. Không accepted blocked mutation outcome.
- D-12.BOMB, D-05.BATCH-A.BOMB, D-12.BOMB.ATTRIBUTION, D-06.BOMB.CATEGORY: committed capture/destruction death-center3×3/all non-King/capturer, original Bomb source, FIFO/dedup/terminal/AP invariants; one family bomb/target, duplicate ignore; charge BUFF/mine DEBUFF, shared consumer và independent schemas.
- Source/time, visibility, links, relocation, target/King boundaries và removal common semantics được ghi riêng qua sáu BATCH-A.META.* labels. Chỉ Batch A: source-player; Stun/Shield source-end theo approved N; permanent Bomb; bốn public/unlinked piece attachments; eligible-target relocation preserve source/ID/payload/deadline, no apply/expire, whole-swap rollback.

**D-04/05/06/08/12 vẫn OPEN/PARTIALLY_APPROVED.** D-10 Turtle skill và các other effect/group decisions vẫn OPEN. Prior P00-02/03/05/08/10/11, Q-18/O-6/O-6b/O-8/O-9 giữ đúng scope; không approval mới cho priority matrix, hidden cell reveal hoặc missing N/King profiles.

## Files changed

1. `OPEN_DECISIONS.md`: approval tables +scoped parent status annotations +remaining freeze questions.
2. `EFFECT_SYSTEM_SPEC.md`: §8 Concrete Effect Batch A — Approved Rules; approved semantics tách implementation requirements/unknowns/future gates. Existing generic contracts giữ nguyên.
3. `PHASE_02B_BATCH_A_APPROVED_MANIFEST.md` (mới): bốn entries, approval status per field, adapters và NOT_READY gates.
4. `PHASE_02B_IMPLEMENTATION_PLAN.md`: thay historical alternatives bằng approved-answer table; exact Stun → Shield → Bomb gates, producer separation và acceptance requirements.
5. `PHASE_02B_BATCH_A_APPROVAL_REPORT.md` (mới): báo cáo này.
6. `CONCRETE_EFFECT_CATALOG.md`: chỉ thêm historical/current overlay để các UNKNOWN/proposals ở snapshot02B-0 không phủ định current approval. Non-Batch-A entries không đổi luật.

Tất cả thuộc `docs/rebuild/`. Các source/docs staged từ milestones trước được giữ nguyên; không stage/commit/push trong milestone này.

## Manifest status

| Entry | Rules đã có nguồn approved | Enablement |
|---|---|---|
| Stun, stable proposed ID `effect.stun` | Restriction/threat/matching/reset +source-end/public/unlinked/relocation subset | **NOT_READY**: required category/source key/producer profile và engine adapters còn thiếu |
| Shield, stable proposed ID `effect.shield` | Time-only capture protection, atomic reject/no consumption; matching/reset +metadata | **NOT_READY**: category/source key/approved N/eligibility/removal profile và adapters còn thiếu |
| Approved ID `effect.bomb.charge` | Family bomb, BUFF, permanent/public/unlinked, exact blast/source/uniqueness rules | **NOT_READY**: death/family/concrete reaction/attribution adapters +producer/target/King/removal/schema gate |
| Approved ID `effect.bomb.mine` | Family bomb, DEBUFF; cùng pure consumer/uniqueness, public attachment sau apply | **NOT_READY**: shared adapters +approved producer profile; không enabled hidden Landmine |

Manifest phân biệt **APPROVED**, **CONFIRMED_FROM_PRIOR_DECISION**, **UNKNOWN**, **BLOCKED_ENGINE**, **DEFERRED**; không executable registration, không unknown→default. Naming proposals Stun/Shield và schema/version pin là technical design sau authorization, không cần owner quyết literal strings.

## Remaining unknowns

- **Source identity cho matching:** player-only hay thêm variant/skill/piece/incarnation? Approved same-source/cross-source behavior không trả lời exact tuple. Cần owner chốt trước dependent matching implementation, không hỏi lại refresh/reset policy.
- **Stun/Shield classification:** prompt chỉ literal-classify hai Bomb leaves. Không tự gán Stun DEBUFF/Shield BUFF để pass definition schema; cần answer trước concrete registration/schema field freeze.
- **Producer profiles:** exact allowed N/targets/King/special-unit/source-ref/acting-piece policies, concrete removal permissions/exceptions/source invalidation. O-8 Stun1/O-9 Chains3 là partial numeric evidence đã approved; Shield legacy2/5 và full Guardian/Nephalem profiles chưa approved.
- **Non-lifetime refresh payload** nếu có gameplay data: không chọn preserve/replace/merge từ đề xuất cũ. Empty payload/schema naming có thể thiết kế kỹ thuật trong authorized scope, không thêm flags/reactions.
- **Deferred:** full Shield priority/redirect/Fate/Phoenix/Aegis, Aegis/Blessing/category cleanse, hidden Landmine placement/entry/consume/reveal, Sanctuary trigger/overlap, full Variant costs/passives/setup, non-Stun threat semantics và Turtle skill restrictions.

Không phát sinh câu hỏi buộc dừng việc hoàn tất tài liệu. Không yêu cầu approve 27 Variants trước reusable foundation.

## Required engine adapters và tasks có thể tiến tới

**Hiện tại chỉ documentation đã được phép. Khi nhận authorization implementation riêng:**

- Stun: có đủ approved restriction/threat oracle để xây effect-aware query/root validation/forced End +threat foundation, và thiết kế validated producer-N source-end adapter. Source tuple/category/producer fields phải đóng trước matching/definition enablement phụ thuộc chúng.
- Shield: có đủ oracle để bind atomic capture-cancel adapter; reuse existing rejection behavior, **không redesign consuming blocked outcome**. Timed refresh/source/category/producer gates phải đủ trước registration/enable.
- Bomb: có đủ oracle cho frozen committed death position/retired-source/cause transport, bounded concrete consumer mode, source-bearing derived attribution, cross-definition family ignore và shared pure blast planner. Không giả concrete executor là synthetic; producer King/targets/removal profile phải đóng trước apply/live-enable.
- Chung: version/schema/codec/repetition/replay/meaningful-order review và public-seam rollback/mirror acceptance sau implementation. Không chọn engine version mới trong docs milestone.

Exact sequence/acceptance: [plan](PHASE_02B_IMPLEMENTATION_PLAN.md) §4–5. Full definitions/producer enablement vẫn blocked; future interactions không tự chạy vì đã approved shared semantics.

## Verification

**PASS** documentation consistency/confirmed-rule scope; existing parent-decision references; đúng 10 named approval rows +6 metadata rows; bốn manifest entries đủ field/status và NOT_READY; internal file links; whitespace/newlines kể cả files chưa track; `git diff --check`; tracked non-doc source diff không có thay đổi của milestone. Scope edits chỉ sáu files trong `docs/rebuild/` đã liệt kê.

Không sửa Game Core/TypeScript/dependencies/lockfile, không thêm tests hoặc chạy build/full suites. **310 tests/23files của engine0.2.0 là inherited 02A evidence, không new PASS run.** Không gameplay acceptance mới.

**Dừng tại documentation approval gate. Không Phase 02B-1 hoặc commit/push.**
