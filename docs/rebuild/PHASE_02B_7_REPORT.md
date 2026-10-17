# Phase 02B-7 — Variant and skill batch planning

2026-10-16. DOCUMENTATION ONLY. Starting repository is clean at `9261007` (accepted Live Charge checkpoint), on main; engine0.6.0/state1.1.0 unchanged. The owner's prior611 tests/33 files and successful runtime HTTP smoke are accepted baseline evidence, not new tests run by this planning task. No production/test/script/dependency changes, new approvals/registration/enablement, staging, commit/push or next milestone.

## Deliverables and counts

Exactly five new documentation files:

1. [VARIANT_SKILL_INVENTORY.md](VARIANT_SKILL_INVENTORY.md):29 Variants,87 logical skills,29 passive records (28 named, Colossus passive unnamed).27 historical runtime Variant IDs and2 deferred drafts; no new runtime IDs invented. Time is one ultimate command with2 modes, not2 skill slots.
2. [VARIANT_CAPABILITY_MATRIX.md](VARIANT_CAPABILITY_MATRIX.md):all116 ability records classified individually:6 EXISTING_CAPABILITY,33 SMALL_EXTENSION,69 NEW_MECHANIC,8 BLOCKED/deferred. Exact API seams, missing capability, decisions/interactions, relative complexity and confidence are traceable per item.
3. [PRODUCER_READINESS_MATRIX.md](PRODUCER_READINESS_MATRIX.md):field-by-field candidate gates, common owner-question ledger, exact proposed two-Stun approval gate. No new producer READY_FOR_IMPLEMENTATION while mandatory fields remain UNKNOWN.
4. [PHASE_02B_BATCH_ROADMAP.md](PHASE_02B_BATCH_ROADMAP.md):three ranked conditional batches, all ten required scope/approval/capability/test/version/stop fields and scoped interaction matrix.
5. `docs/rebuild/PHASE_02B_7_REPORT.md`:this report.

Approval counts use **ability-contract records**, not registered EffectDefinitions:2 complete APPROVED,25 PARTIALLY_APPROVED,81 PROPOSED,8 UNKNOWN/deferred =116. Of87 skill records,2 complete/25 partial/60 incomplete (54 proposed+6 unknown); of29 passives,0 complete/0 partial/27 proposed+2 unknown. Partial means a specific cited fact, never a complete producer. All unapproved records have UNKNOWN mandatory gameplay fields mapped to owner questions. Only2 real producers are IMPLEMENTED/ENABLED, exclusively in their separate selected experimental factories: guardian.holy_shield and dynamite.live_charge. No full Variant/passive is enabled.

Effect count is explicit and nonsemantic:61 unique effect.* labels in the existing catalogue, plus18 rule/unit/lifecycle/delayed markers =79 identifiers. Aliases/legacy family names are not collapsed; four reviewed consumer contracts exist (Stun, Shield, Charge, Mine), but only Shield and Charge have enabled producer registrations. No global61-effect registry exists. Another prior proposal, effect.guardian.sanctuary, is an alternative outer-region label, not a new implemented effect/count inflation. Four catalogue labels lack a complete direct producer mapping; they remain recorded without invented skills.

## Ranked candidates and recommendation

1. **B1:Judgment Chains +Holy Seal**, bounded direct-Stun profiles. Lowest-risk reusable consumer/root source/N/legality/threat flow. Recommend a short owner decision freeze now, then separately authorized batched implementation. Runtime skill IDs remain unassigned; technical pinning does not manufacture missing gameplay permission.
2. **B2:forced-reposition +Shockwave**, one new reusable operation with explicit collision/cause/King/entry and root preflight. Medium bounded scope; defer actual implementation until signed.
3. **B3:public region +Sanctuary**, high-impact geometry/lifetime/overlap/capture context and concrete reaction capability. Many future consumers could reuse the seam, but each still needs its own approval. Preserve confirmed region3/generated Stun1; defer coding until complete producer rules.

Exact missing B1 decisions: limited Nephalem/Angel scope and sibling/passive exclusions; target allegiance/cardinality/range/provenance and Chains King policy; fixed cost proposals5/6; Holy Seal duration proposal3; player-originated null-caster source declarations; eligible relocation/control-dependency/removal permissions and bounded interaction scope. ChainsN3, Holy Seal's named non-King restriction, shared Stun refresh/coexistence/source-end/no cast tick/main/threat behavior are already confirmed and are not asked again. Full questions/options/impact/READY conditions are in readiness §3.

## Architectural gaps and discrepancies

- Core supports targeted/targetless trusted planners, normal one-skill slot, declared per-player profiles, effect source/N/matching/relocation, Stun restriction, Shield defense, Bomb death/FIFO and exact codec/repetition/replay. Current VariantPluginDescriptor is identity-only; the fuller proposed plugin lifecycle is not implemented.
- One sourceAttribution.profile pins one exact Variant/skill. Multiple producer declarations for N do not authorize multiple source profiles in one definition. Isolated factories can batch two Stun producers; a combined ruleset needs reviewed source authorization/composition before implementation. Duplicate effect type registrations are rejected. There is no combined Holy Shield/Live Charge factory.
- No general derived move/capture/control/owner-change/transform/spawn/revive/exile/rewind/AP-delta operation exists. Generic references/state/cell targets/lifetime declarations are seams, not those mechanics. Capture-context transport for arbitrary concrete reactions is not implied by the private reviewed Bomb death snapshot. Progress/event-count and arbitrary concrete trigger/delayed modes remain gated.
- Existing catalogue/old plan overlays include historical pre-consumer gaps, NOT_READY or EACCES wording. The current source plus final02B-6 report supersede those historical claims for the exact accepted producers only. No approved decision is reopened; existing historical documents are intentionally untouched.
- docs/Variants.md contains legacy usage/timing/AP/King/capture semantics that conflict with P00/Q/O or later producer approvals. All copied names/numeric evidence are labeled L, not an expected gameplay oracle. No legacy source, D:/Variants tree or all-Variant code audit was required; absent IDs/contracts stay UNKNOWN.
- Global roadmap Phase02/03/04 remains intact.02B-7 is a planning extension inside Phase02; B1/B2/B3 are proposal labels, not authorized milestone numbers. Local3D remains longer term; no frontend/Phase03 acceleration.

## Actual verification and focused reviews

Actual documentation checks PASS:117 local links and33 Markdown anchors resolve;29 source headings/27 documented Variant IDs match the inventory;116 unique inventory rows have116 capability rows; approval/class/count totals and the exact79-label catalogue set reconcile. Four documented legacy identifiers/tags are preserved separately from rebuild IDs;11 named public schema/API references were checked against source. The complete APPROVED allowlist remains only V02.S1/V06.S1; partial rows cite prior signed facts, not new approval. Whitespace checks covered all five untracked Markdown files in addition to git diff --check (exit0). Git confirms only the five new docs, no tracked production/test/script/dependency change and no staged changes. HEAD remains9261007. No lint/typecheck/test/build/runtime smoke was rerun or claimed as new regression proof in this documentation-only task.

Inventory completeness/traceability: independent read-only review completed. Two findings corrected: preserve previously approved O-6 restrictions/counts, and retain four available legacy identifiers separately. Its narrow follow-up caught one approval-precision issue: Great Sanctuary's King exclusion is confirmed by O-6, but Pawn exclusion is only a legacy observation. Corrected both inventory/capability rows; totals stay25 partial. Counts and catalogue reconciliation were independently confirmed. No old audit code observation was promoted to general gameplay approval.

Architecture/approval discipline: independent read-only review completed with0 actionable findings. Reviewer checked source guard/composition, source-owned root operations, synthetic/concrete limits, all ten batch fields, exact owner gates, version/replay/rollback and stop conditions. Both reviewers ran no tests/builds and edited no files. Findings were addressed within these five documents only.

## Next owner gate

Answer the six field groups in [the proposed B1 owner gate](PRODUCER_READINESS_MATRIX.md#3-exact-next-owner-gate--recommended-two-stun-batch), preserving the already confirmed facts, then explicitly authorize the bounded implementation batch. Non-null caster/new interaction requirements reclassify capability and keep the affected producer disabled until resolved. A recommendation is not approval. Stop after this planning report.
