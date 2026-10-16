# Phase 02B-5A — first concrete producer approval gate

2026-10-15. **Planning complete; gameplay approval gate OPEN.** DOCUMENTATION ONLY. No implementation, producer registration/enablement, engine/schema version change, dependency, backend/frontend or commit/push. No automatic 02B-5B/5C.

## 1. Deliverables and sources

| File changed in 5A | Purpose |
|---|---|
| [FIRST_PRODUCER_APPROVAL_MATRIX.md](FIRST_PRODUCER_APPROVAL_MATRIX.md) | Four producer profiles with field-level status/provenance, engine gaps, independent tests and ten owner decision questions/options |
| [SOURCE_REPETITION_NORMALIZATION_PLAN.md](SOURCE_REPETITION_NORMALIZATION_PLAN.md) | Exact raw-reference evidence, definition-owned normalization proposal, equivalence/negative pairs and SG-1…9 technical acceptance for proposed5B |
| [OPEN_DECISIONS.md](OPEN_DECISIONS.md) | Documentation authorization and index of outstanding child decisions; no answered/CLOSED change |
| [PHASE_02B_IMPLEMENTATION_PLAN.md](PHASE_02B_IMPLEMENTATION_PLAN.md) | Current docs-only scope and shortest proposed dependency sequence |
| `PHASE_02B_5A_REPORT.md` | This report and verification scope |

Read AGENTS/CONTEXT and selected gameplay/effect/plugin/decision/manifest/plan/02B-4 acceptance sections; read only Guardian/Dynamite catalog entries and relevant Effect descriptions. Checked O-6/8/9 rows in the referenced decision record to preserve prior authority. Source inspection limited to current public command/planner/state/source/lifetime/repetition/trigger/cleanup contracts and the existing normalization diagnostic. No legacy source or all-Variant audit. No skill implementation required for this planning milestone.

Baseline **engine0.5.0, 447 tests /27 files PASS** is evidence from [02B-4](PHASE_02B_4_REPORT.md)/[Batch A acceptance](PHASE_02B_BATCH_A_REPORT.md), not a fresh test run in 5A.

## 2. Producer readiness and shortest candidates

| Priority | Producer | Current readiness / reason |
|---|---|---|
| 1 | Guardian Holy Shield | NOT_READY; shortest candidate because Shield consumer exists. Need signed N/target/King/special-unit/cost/source/removal and limited-profile permission, plus target planner/normalization acceptance |
| 2 | Guardian Sanctuary-generated Stun | NOT_READY; Sanctuary3/Stun1 already confirmed, but region geometry/placement/category/removal/cost, committed trigger predicate, overlap/recast and concrete region reaction missing |
| 3 | Dynamite Live Charge | NOT_READY; Charge consumer already exists; target/King/cost/no-op-cast/source/removal profile and planner/projection missing. Technically smaller than Sanctuary and a possible earlier alternate if owner closes its decisions first |
| 4 | Dynamite Landmine | DEFERRED / NOT_READY; only attached Mine consumer exists. Hidden placement/entry-cause/consume/reveal/King/Aegis outcomes and safe views are separate dependencies, not prerequisites for Holy Shield |

No existing synthetic N/eligibility/removal policy is approval of these profiles. Divine Shield, Holy Aura, full Guardian/Dynamite, Detonation refund/setup and all other skills are not implicitly enabled by a first producer. A limited skill-only Variant profile requires explicit owner agreement because the plugin spec's normal group gate covers passive+skills.

## 3. Owner approval frontier

The matrix §8 contains context, confirmed facts, exact unknowns, valid options, recommendation/impact and READY conditions for each stable ID. None is answered by this milestone.

| Needed for first Holy Shield | Additional for later requested producers |
|---|---|
| D-22.FIRST_PRODUCER.SCOPE: narrow skill-only profile or wait for full group | D-22.GUARDIAN.SANCTUARY.REGION_PROFILE: placement/shape/outer metadata/cost |
| D-22.GUARDIAN.HOLY_SHIELD.TARGETS: one ally predicate, King/special units and relocation destination | D-08.GUARDIAN.SANCTUARY.TRIGGER_PROFILE: real attacker/victim/death-cell and eligibility |
| D-22.GUARDIAN.HOLY_SHIELD.DURATION: N2 candidate or owner-specified N | D-05.GUARDIAN.SANCTUARY.REGION_RECAST: region refresh/overlap multiplicity |
| D-22.GUARDIAN.HOLY_SHIELD.COST_PROFILE: explicit constant-cost subset or complete Holy Aura model | D-22.DYNAMITE.LIVE_CHARGE.PROFILE: target/King/special units/cost and already-Bombed cast legality |
| D-05.FIRST_PRODUCER.SOURCE_PROFILE: actual caster/incarnation requirements, per producer | Same common source question applied individually; never attacker-as-Sanctuary-caster |
| D-06.FIRST_PRODUCER.REMOVAL_PROFILE: enabled permissions/source-invalidated dependencies | Same common removal question applied individually, including region-parent expiry versus emitted Stun |

No questions reopen categories, exact structured identity, same-source refresh/cross-source coexistence, Shield atomic block, Bomb family ignore/source attribution, clocks or P00 invariants. Sanctuary3/generated Stun1 and Chains-generated Stun3 remain confirmed. Numeric evidence does not approve complete producers. Parent decisions remain OPEN/PARTIALLY_APPROVED.

## 4. Technical gaps, separately from gameplay

- **E-PRODUCER:** `RootCommandSchema` has no skill target payload; `RulesetBundle.skills` uses static cost/operations, and `VariantPluginDescriptor` is identity-only. First producer needs minimal versioned target intent, authoritative actor→enabled Variant binding, pure target/cost/plan validation and trusted source/N generation inside existing root isolation. Do not expose arbitrary EffectApplication/operations to clients.
- **E-SOURCE-PROJECTION (proposed5B):** definition callback lacks a semantic source graph context. Current fixture retains raw caster/incarnation tokens. Matching/attribution must keep exact captured tuples, while repetition represents semantic source relationships/equality classes independently of allocation spelling.
- **Conditional E-COST-LEDGER:** dynamic Holy Aura needs an approved committed inventory/count basis and actualCost quote; position history is not a graveyard. An explicitly approved constant-cost subset avoids this dependency without silently changing full Guardian.
- **Conditional E-INCARNATION:** timed schema validation of a string is not an incarnation producer; PieceSchema has no incarnation field, and permanent Bomb parameters reject non-null incarnation. Null/null is allowed only if it is the approved producer's real source semantics.
- **E-SANCTUARY / E-LANDMINE:** reviewed region/capture or entry/hidden capabilities absent. Synthetic trigger mode cannot authorize concrete Sanctuary; Bomb's reviewed death binding cannot stand in for a capture-region/entry rule.

Six basic piece types do not by themselves prove special-unit eligibility. Summon/revive/transform profiles must remain outside a first bounded subset unless separately signed and represented; no type-name shortcut grants them permission.

## 5. Semantic normalization acceptance

Proposed5B must establish the selected definition-owned dependency profile and all applicable SG-1…9 criteria: coherent allocation renaming equal; meaningful source/caster/incarnation sharing, family/category/order/remaining-time differences preserved; corresponding future recast/permission behavior; immutable exact source/matching/event data; fail-closed unsupported relationships; deterministic actionReady/replay/rollback and reviewed version pinning.

The normalization document supplies EQ-1…6 and NEG-1…8 pairs. A raw ID change is not automatically semantic inequality. Live/dead/incarnation relationships cannot be dropped merely because graph context is missing. For an explicitly player-originated null-ref first producer, prove that bounded profile and keep caster/incarnation profiles blocked; no universal graph canonicalizer is required just to greenlight Holy Shield. No graph algorithm, source mutation or new canonical key implemented in 5A.

## 6. Verification and stop point

Documentation checks actually run: PASS — 83 local file links across the five changed documents resolve; ten unique question IDs are indexed OPEN; all 25 requested fields/statuses appear in each of four producer tables; new documents pass UTF-8 replacement-character, final-newline and trailing-whitespace checks. `git diff --check`: PASS. No gameplay tests, full lint/typecheck/build or dependency installation run for this docs-only task. Previous 447-test evidence remains historical. No implementation behavior is claimed verified by reading contracts.

Shortest proposed sequence: **owner signs exact Holy Shield subset → separately authorize5B selected-profile semantic normalization → separately authorize5C minimal authoritative target planner + Holy Shield implementation/tests/enablement gate.** Add cost inventory or genuine incarnation capability only if the chosen profile requires it. Then Sanctuary per requested priority, or separately approved Live Charge alternate; hidden Landmine remains deferred. An engine-playable producer does not authorize Phase03 networking, persistence or frontend.

All concrete producers remain **ENABLED=false / NOT_READY**. Stop after these documents; no approval inferred from recommendations or elapsed time.
