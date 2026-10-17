# Variant / skill inventory — Phase 02B-7

## Current C1 authorization — Turtle Transference-only (2026-10-17)

Owner approves C1-01…10 as recorded in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-c1--turtle-transference-owner-approvals-2026-10-17). Exactly one current-controller allied and one enemy live non-King target, distinct, unlimited range/LOS; known valid ordinary/summoned/special categories permitted subject to complete final effect eligibility. One empty set allowed, both empty reject; generic complete set swap preserves every effect's original identity/source/sequence/payload/clock/references and validates all final constraints. Fixed4 AP, one normal skill slot, mandatory main unchanged. Exact skill source turtle/turtle.transference/null/null never replaces attachment sources. No passive/Aegis/Great Sanctuary/full or mixed factory.

Implementation authorized only for separate selected Transference-only profile, strict two-piece-target-v1 and retained immutable AP V3. Existing V1/V2/factories/archives remain exact. C1 acceptance PASS / READY / ENABLED only in the separate selected factory:1026 tests/50 files and all required verification plus independent Standards/Spec reviews PASS. See [C1 acceptance report](PHASE_02B_C1_TRANSFERENCE_REPORT.md). Explicit engine0.8/state1.1 and AP V3; old0.6/0.7 factories remain pinned. Preserve B1/B2/B3 history and the pre-existing untracked Coverage Audit byte-for-byte. No staging/commit/push, other batch or Phase03.

## Current B3 authorization — Guardian Sanctuary-only (2026-10-17)

The owner explicitly approves B3-01…12 in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b3--guardian-sanctuary-owner-approvals-2026-10-17): public clipped3x3 fixed cell region/AP5/one per source/recastN3, ordinary committed-capture TriggerA generates independent source-end StunN1 on eligible living ordinary non-King attacker. Original victim controller and capture destination decide eligibility; King terminal and Shield cancellation suppress reactions; Bomb destruction never qualifies. Exact guardian/guardian.sanctuary/null/null source. Separate Sanctuary-only factory; no Holy Aura/Divine Shield/full or mixed Guardian.

Implementation PASS / READY / ENABLED only for selected players in the separate pinned Sanctuary-only factory. All960 tests/46 files, required lint/typecheck/build/export/runtime/boundary/hygiene/diff checks and independent Standards/Spec reviews PASS. Evidence: [B3 acceptance report](PHASE_02B_B3_SANCTUARY_REPORT.md). Sanctuary pins engine0.7.0/state1.1.0; historical factories/archives keep engine0.6.0 and opaque namespace semantics. Preserve accepted B2 files/evidence and historical cost artifact; version and compatibility decisions are reviewed in the B3 registry entry/report. No stage/commit/push or B2-only checkpoint. Stop after B3 report; combined B2+B3 checkpoint awaits separate instruction.

## Current B2 authorization — Shockwave and fixed AP configuration (2026-10-17)

Eight scoped owner approvals and the central AP requirement are recorded in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b2--shockwave-approvals-and-cost-consolidation-2026-10-17). Shockwave-only dragon_sentinel profile, allied ordinary non-King center, adjacent enemy ordinary non-King radial pushes one cell; blocked bearers stay, independent movers succeed, simultaneous snapshot. No caster, King displacement, capture/death/promotion/AP reward, entry consumer or sibling. Pin dragon_sentinel.shockwave / dragon-sentinel.shockwave-only.experimental v1.0.0; separate opt-in factory only. Existing effects and source/deadline/identity are preserved. Costs4/3/5/6/4 become one immutable versioned approved configuration without changing the four accepted producer rulesets.

Geometry proves destination2d (Chebyshev norm2) cannot occupy a mover's initial adjacent cell d (norm1); distinct directions have distinct destinations. No chain-push/general occupied-vacated policy is approved. Owner reply now APPROVES zero-displacement rejection with no AP/skill-slot debit (D-22.B2.ZERO_DISPLACEMENT). The gameplay gate is resolved; real Shockwave is PASS / READY / ENABLED only for selected players in its separate pinned factory after B2 acceptance:852 tests/41 files, all required checks and independent Standards/Spec reviews PASS. Evidence: [B2 acceptance report](PHASE_02B_B2_SHOCKWAVE_REPORT.md). Historical B1/planning evidence below stays intact; this authorization does not start B3/Phase03. No stage/commit/push.

## Current B1 authorization — two Stun producers (2026-10-16)

The owner has APPROVED and authorized one batch implementing Judgment Chains-only Nephalem and Holy Seal-only Angel. Six scoped field groups and exact decision IDs are recorded in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b1--two-bounded-stun-producer-approvals-2026-10-16): scope, targets/relocation, cost/usage, duration/refresh, source and removal. Each casts one live enemy-current-controller ordinary-original non-King anywhere on the board, without range/path restriction; cost5/6 respectively, normal skill slot and mandatory main move; both apply empty-payload StunN3/source-end/no cast tick. Exact player/Variant/skill/null/null source; stable same-source refresh, independent sources. Relocation allows ordinary non-King destinations of either controller; control/owner changes do not invalidate the bearer. Only expiry/bearer death/terminal cleanup; no extra removal/reward/skill ban.

Technical pins: nephalem.judgment_chains / angel.holy_seal; separate profiles nephalem.judgment-chains-only.experimental / angel.holy-seal-only.experimental v1.0.0; separate effect.stun v1.0.0 registries under experimental-nephalem-judgment-chains-v1-w{0|1}-b{0|1} / experimental-angel-holy-seal-v1-w{0|1}-b{0|1}, ruleset v1.0.0. Preserve exact one-pair source guards, existing Stun consumers and Holy Shield/Live Charge behavior. Engine0.6.0/state1.1.0 retained; no core/schema change. No mixed factory, full Variant, passive/sibling, new mechanic, Phase03, dependencies or commit/push.

Gameplay APPROVED; implementation **PASS / READY / ENABLED only for selected players in the two separate pinned factories** after B1 acceptance:747 tests/36 files and all required checks PASS, including runtime smoke after an environment-approved rerun. Evidence: [B1 acceptance report](PHASE_02B_B1_STUN_PRODUCERS_REPORT.md). This current overlay supersedes only the two precise B1 rows in historical planning below. Parent decisions and all other producers remain open. Work order: signed docs → focused vertical red/green public-seam tests → isolated planners/factories → public AP0 acceptance/snapshot/replay → independent Standards/Spec reviews/full checks → batch report and stop. No automatic B2. Historical milestone evidence remains intact.


2026-10-16; inspected clean checkpoint `9261007`. Planning only. This is a catalogue of identifiable abilities, not an enabled manifest. Index: [capabilities](VARIANT_CAPABILITY_MATRIX.md), [readiness/questions](PRODUCER_READINESS_MATRIX.md), [batch roadmap](PHASE_02B_BATCH_ROADMAP.md), [report](PHASE_02B_7_REPORT.md).

## Counting, authority and status

29 identifiable Variants:27 historical runtime IDs plus2 deferred drafts.87 logical skill entries =81 across27 +6 draft skills; Time has one ultimate command with two modes, not an extra slot.29 passive records,28 named and one unnamed (Colossus). Local row labels V01.P/S1/S2/U are document references, never runtime IDs. No passive runtime IDs are assigned in the inspected public contracts. Missing skill IDs remain **UNKNOWN/unassigned**, not synthesized from display names. Joker/Colossus have no current authoritative runtime Variant ID.

Approval is separate from implementation and enablement. **APPROVED** applies to seven complete bounded skill profiles after C1 owner approval. PARTIALLY_APPROVED means the cited producer-specific fact is confirmed but other fields remain UNKNOWN. PROPOSED means a named legacy candidate with no complete approval; UNKNOWN means draft contract not established. Q-20 makes both draft Variants **DEFERRED**, independently of UNKNOWN approval. Global P00 invariants apply to all future designs without turning every producer into partially approved.

Totals across116 ability-contract records (87 skills +29 passives; some are operations, not effect producers):7 APPROVED,21 PARTIALLY_APPROVED,80 PROPOSED,8 UNKNOWN/deferred. All seven accepted producers are IMPLEMENTED/ENABLED only in separate selected experimental factories. The seven approved profiles are Holy Shield, Live Charge, Judgment Chains, Holy Seal, Shockwave, Sanctuary and Transference. Shockwave creates displacement; Sanctuary creates a public region with generated Stun. Every other row is **NOT_IMPLEMENTED / DISABLED**. Shared consumer infrastructure does not implement a Variant passive/skill.

Sources: [GAMEPLAY_SPEC](GAMEPLAY_SPEC.md) §§3–9; [decision registry](OPEN_DECISIONS.md); [Q/O approval evidence](../audit/06-decisions.md) §6; [plugin coverage](VARIANT_PLUGIN_SPEC.md) §3; [legacy descriptive catalogue](../Variants.md) at the exact headings named below; [effect catalogue](CONCRETE_EFFECT_CATALOG.md). All `L:` values and target descriptions tagged L are **LEGACY evidence only**, including N/D numbers; D does not become approved source-relative rounds. “Ally/enemy” L does not decide owner versus controller. All unspecified caster, King/special-unit, removal, refresh, range and targeting fields are UNKNOWN; resolve questions in [readiness §2](PRODUCER_READINESS_MATRIX.md#2-owner-question-ledger) before implementation. No legacy source code or D:/Variants tree was needed.

Effects column uses existing catalogue labels; except effect.stun/shield/bomb.charge/bomb.mine consumer contracts, labels are proposed representations, not registered definitions. No linked/region/unit lifecycle policy is inferred from a name. Per-item capability, missing engine capability, complexity, confidence and interaction dependencies are in the matrix under the same row key.

## V01 — `lightning` / Lightning

Source: [Variants catalogue](../Variants.md), heading Lightning; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-07/D-12/D-22.Lightning**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V01.P — Lightning Speed | UNKNOWN / unassigned | effect.thunder_trap | Trap entry reward; L:+2 AP; event-count unlimited | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V01.S1 — Thunder Trap | UNKNOWN / unassigned | effect.thunder_trap; effect.stun | Cell empty; L:AP3/permanent trap/StunD2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V01.S2 — Electric Terrain | UNKNOWN / unassigned | rule.electric_terrain | Global/no target; L:AP8/D5/3s skip | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V01.U — Raigeki | UNKNOWN / unassigned | effect.stun (query/remove) | Stunned enemies; L:AP12/instant; CONFIRMED King only loses Stun | PARTIALLY_APPROVED; O-6 Raigeki King exception | NOT_IMPLEMENTED / DISABLED |

## V02 — `dynamite` / Dynamite

Source: [Variants catalogue](../Variants.md), heading Dynamite; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-12/D-22.Dynamite**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V02.P — Explosives | UNKNOWN / unassigned | — | L:Detonation refund2; setup candidates; no attachment AP | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V02.S1 — Live Charge | `dynamite.live_charge` (registered) | effect.bomb.charge | APPROVED: one controlled ordinary-original non-King; AP3/permanent | APPROVED | IMPLEMENTED / ENABLED in bounded factory |
| V02.S2 — Landmine | `dynamite.landmine` (PROPOSED in prior matrix) | effect.landmine; effect.bomb.mine | Cell empty; L:AP3/permanent hidden trap; permanent attachment approved | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V02.U — Detonation | UNKNOWN / unassigned | effect.bomb.charge; effect.bomb.mine (query) | No target; L:AP9/destroy Bomb bearers/possible refund2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V03 — `zombie` / Zombie

Source: [Variants catalogue](../Variants.md), heading Zombie; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-13/D-17/D-22.Zombie**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V03.P — Zombie Infection | UNKNOWN / unassigned | effect.walker | L:stationary bite/controller takeover/permanent Walker | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V03.S1 — Infection | UNKNOWN / unassigned | effect.zombie | Ally; CONFIRMED free in rounds1–3; L:AP5 later/permanent | PARTIALLY_APPROVED; Q-13 free rounds1–3 | NOT_IMPLEMENTED / DISABLED |
| V03.S2 — Mutation | UNKNOWN / unassigned | effect.walker; effect.zombie | Walker target; L:AP4/convert owner/permanent | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V03.U — Outbreak | UNKNOWN / unassigned | effect.walker; lifecycle.summon_duration | Graveyard/empty death cells; L:AP8/up to2 revive | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V04 — `magician` / Magician

Source: [Variants catalogue](../Variants.md), heading Magician; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-06/D-14/D-22.Magician**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V04.P — Grand Illusions | UNKNOWN / unassigned | effect.position_swap; effect.moveset_swap; effect.shield; effect.stun | Linked partner death; L:Shield2/Stun2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V04.S1 — Now You See Me | UNKNOWN / unassigned | effect.position_swap | Two allies L; CONFIRMED non-King O-6; L:AP4/D3 return-swap | PARTIALLY_APPROVED; O-6 Magician non-King; plugin §3 | NOT_IMPLEMENTED / DISABLED |
| V04.S2 — Misdirection | UNKNOWN / unassigned | effect.moveset_swap | Two enemies L; CONFIRMED non-King O-6; L:AP7/D3 | PARTIALLY_APPROVED; O-6 Magician non-King; plugin §3 | NOT_IMPLEMENTED / DISABLED |
| V04.U — Carnival of Fools | UNKNOWN / unassigned | effect.fool | L:1–5 pieces/AP12/D5; CONFIRMED skill non-King restriction | PARTIALLY_APPROVED; O-6 named Fool non-King restriction | NOT_IMPLEMENTED / DISABLED |

## V05 — `nephalem` / Nephalem

Source: [Variants catalogue](../Variants.md), heading Nephalem; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-05/D-06/D-22.Nephalem**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V05.P — Fallen Grace | UNKNOWN / unassigned | — | L:each3 ally deaths -> AP4 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V05.S1 — Judgment Chains | `nephalem.judgment_chains` (B1 technical pin) | effect.stun | APPROVED: one enemy-current-controller ordinary-original non-King, unrestricted range; AP5/N3 source-end | APPROVED B1; O-9 preserved | IMPLEMENTED / READY / ENABLED in its bounded factory |
| V05.S2 — Berserk Curse | UNKNOWN / unassigned | effect.berserk; effect.stun | Enemy; L:AP4/countdown4 -> Stun3 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V05.U — Divine Silence | UNKNOWN / unassigned | effect.silence | Opponent player; L:AP8/D3/block-all | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V06 — `guardian` / Guardian

Source: [Variants catalogue](../Variants.md), heading Guardian; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-22.Guardian/D-22.GUARDIAN.SANCTUARY.REGION_PROFILE**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V06.P — Holy Aura | UNKNOWN / unassigned | — | L:death ledger>=8 discounts Holy Shield4->2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V06.S1 — Holy Shield | `guardian.holy_shield` (registered) | effect.shield | APPROVED: controlled ordinary-original incl King; AP4/N2 source-end | APPROVED | IMPLEMENTED / ENABLED in bounded factory |
| V06.S2 — Sanctuary | `guardian.sanctuary` (B3 pin) | region.guardian.sanctuary (not piece effect); generated effect.stun | APPROVED: public clipped3x3 fixed cell/AP5/recast per-source N3/ordinary committed TriggerA/StunN1 original source/null caster | APPROVED B3-01…12; no siblings/passive | IMPLEMENTED / ENABLED only in selected Sanctuary-only factory |
| V06.U — Divine Shield | UNKNOWN / unassigned | effect.shield | All allies incl King L; L:AP8/N5 candidate | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V07 — `requiem` / Requiem

Source: [Variants catalogue](../Variants.md), heading Requiem; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-05/D-06/D-22.Requiem**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V07.P — Soul Harvest | UNKNOWN / unassigned | — | L:own committed capture +1AP | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V07.S1 — Soul Break | UNKNOWN / unassigned | effect.berserk; effect.stun | Enemy non-King L; L:AP4/countdown2 -> Stun3 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V07.S2 — Thread of Fate | UNKNOWN / unassigned | effect.fate | Ordered ally+enemy L; L:AP6/D3 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V07.U — Reaper's Decree | UNKNOWN / unassigned | effect.fate | Two enemies L; L:AP10/D5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V08 — `ruler` / Ruler

Source: [Variants catalogue](../Variants.md), heading Ruler; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-08/D-22.Ruler**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V08.P — Royal Decree (Law Territory alias) | UNKNOWN / unassigned | rule.law_hierarchy; rule.law_weak | Fixed D4–L12 L; L:default same-type capture law | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V08.S1 — Order of Hierarchy | UNKNOWN / unassigned | rule.law_hierarchy | No target; L:AP4/counter3/higher-rank capture | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V08.S2 — Decree of the Weak | UNKNOWN / unassigned | rule.law_weak | No target; L:AP4/counter3/lower-rank capture | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V08.U — Absolute Domain | UNKNOWN / unassigned | rule.absolute_domain | Region members/path; L:AP10/counter5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V09 — `kaze` / Kazehime (Kaze)

Source: [Variants catalogue](../Variants.md), heading Kazehime (Kaze); canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-06/D-12/D-22.Kaze**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V09.P — Blessing of the Wind God | UNKNOWN / unassigned | effect.repel; effect.soulless_cell | L:6 sigils/refund per batch | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V09.S1 — Wind Reversal | UNKNOWN / unassigned | effect.repel | Five cross cells L; L:AP2/permanent hidden | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V09.S2 — Illusory Wind | UNKNOWN / unassigned | effect.soulless_cell; effect.soulless | Five diagonal cells L; L:AP3/trap permanent/SoullessD2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V09.U — Eye of the Divine Storm | UNKNOWN / unassigned | rule.divine_storm | Cell center L; CONFIRMED non-King Storm victims O-6; L:AP12/radius3->0/consecutive exposure2 | PARTIALLY_APPROVED; O-6 metadata Storm non-King; audit08 row Kazehime | NOT_IMPLEMENTED / DISABLED |

## V10 — `predator` / Predator

Source: [Variants catalogue](../Variants.md), heading Predator; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-08/D-12/D-22.Predator/D-25**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V10.P — Hunter's Instinct | UNKNOWN / unassigned | — | L:capture Pawn adds2AP | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V10.S1 — Evolution Spore | UNKNOWN / unassigned | effect.evolution | Ally Pawn L; L:AP3/progress2/3/4/5 until capture | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V10.S2 — Shadow Prowl | UNKNOWN / unassigned | effect.soulless_cell; effect.soulless | Cell; CONFIRMED only ally-Pawn attack range; L:AP4/permanent trap | PARTIALLY_APPROVED; Q-12 Pawn attack range | NOT_IMPLEMENTED / DISABLED |
| V10.U — Apex Camouflage | UNKNOWN / unassigned | effect.camouflage | Player/ordinary non-King pieces L; L:AP9/D5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V11 — `phoenix` / Fire Phoenix

Source: [Variants catalogue](../Variants.md), heading Fire Phoenix; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-17/D-22.Phoenix**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V11.P — Rebirth | UNKNOWN / unassigned | — | L:once-only King death interception/reset/skill disable | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V11.S1 — Ashes of Reanimation | UNKNOWN / unassigned | lifecycle.summon_duration | Death record+home empty cell L; L:AP3/5/7/10/D4 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V11.S2 — Solar Flare | UNKNOWN / unassigned | effect.stun; effect.flame | Target threatened by>=2 Bishops L; L:AP5/StunD2/FlameD4 in5x5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V11.U — Supernova | UNKNOWN / unassigned | effect.supernova_warning; delayed.supernova | Cell7x7 L; CONFIRMED non-King blast O-6/O-6b; L:AP11/ply+6 | PARTIALLY_APPROVED; O-6/O-6b non-King blast; metadata preservation | NOT_IMPLEMENTED / DISABLED |

## V12 — `verdant_dragon` / Verdant Dragon

Source: [Variants catalogue](../Variants.md), heading Verdant Dragon; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-05/D-06/D-22.Verdant**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V12.P — Dragon Counter | UNKNOWN / unassigned | — | L:opponent skill+3AP; gains accumulate counter100 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V12.S1 — Verdant Shelter | UNKNOWN / unassigned | effect.shelter | Ally incl King L; L:AP3/D4/halve capture reward | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V12.S2 — Dragon's Gaze | UNKNOWN / unassigned | effect.gaze | Enemy L; CONFIRMED +2/-2; L:AP4/D2 | PARTIALLY_APPROVED; Q-09 +2/-2 | NOT_IMPLEMENTED / DISABLED |
| V12.U — Emerald Domain / Dragon's Wrath | UNKNOWN / unassigned | effect.stun; effect.emerald_domain | CONFIRMED Domain Stun/no caster King lock; L:AP9 or0/threshold100/D3 or4 | PARTIALLY_APPROVED; Q-09 Stun/no King lock | NOT_IMPLEMENTED / DISABLED |

## V13 — `thunder_dragon` / Thunder Dragon

Source: [Variants catalogue](../Variants.md), heading Thunder Dragon; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-08/D-12/D-22.ThunderDragon**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V13.P — Static Charge | UNKNOWN / unassigned | effect.stun (query) | L:source turn +1AP per stunned enemy | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V13.S1 — Dragon's Scale | UNKNOWN / unassigned | effect.electric; effect.stun | Ally incl King L; L:AP3/ElectricD2 vs description1 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V13.S2 — Thunder Fang | UNKNOWN / unassigned | effect.thunder_fang; effect.thunder_trap | CONFIRMED normal-moveset stationary capture + shared trap; L:AP6/window | PARTIALLY_APPROVED; Q-11 normal-moveset stationary capture/trap | NOT_IMPLEMENTED / DISABLED |
| V13.U — Dragon's Wrath | UNKNOWN / unassigned | effect.stun | CONFIRMED 3x10 zone; L:AP12/StunD4 unless already Stunned then destroy | PARTIALLY_APPROVED; Q-11 3x10 | NOT_IMPLEMENTED / DISABLED |

## V14 — `turtle` / Water Turtle

Source: [Variants catalogue](../Variants.md), heading Water Turtle; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-06/D-08/D-10**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V14.P — Turtle's Retaliation | UNKNOWN / unassigned | effect.aegis; effect.bind | L:Aegis-bearing ally captured -> attacker BindD2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V14.S1 — Transference | `turtle.transference` (C1 pin) | Complete eligible attached Effect sets; no new Effect | APPROVED: one own-current-controller +one enemy distinct live non-King, known valid provenance/any range/one empty allowed/both empty reject/AP4/normal slot | APPROVED C1-01…10; P00-03 preserved | IMPLEMENTED / READY / ENABLED only in selected C1 factory |
| V14.S2 — Aegis Blessing | UNKNOWN / unassigned | effect.aegis | Ally non-King L; L:AP4/D2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V14.U — Great Sanctuary | UNKNOWN / unassigned | effect.aegis | CONFIRMED excludes King O-6; Pawn exclusion/all-allies set L; L:AP10/D5 | PARTIALLY_APPROVED; O-6 metadata non-King; audit08 Turtle ultimate Pawn observation remains LEGACY | NOT_IMPLEMENTED / DISABLED |

## V15 — `angel` / Angel

Source: [Variants catalogue](../Variants.md), heading Angel; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-06/D-22.Angel**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V15.P — Heavenly Grace | UNKNOWN / unassigned | — | L:ally death +2AP | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V15.S1 — Holy Seal | `angel.holy_seal` (B1 technical pin) | effect.stun | APPROVED: one enemy-current-controller ordinary-original non-King, unrestricted range; AP6/N3 source-end | APPROVED B1; O-6 preserved | IMPLEMENTED / READY / ENABLED in its bounded factory |
| V15.S2 — Blessing | UNKNOWN / unassigned | effect.blessing; effect.shield | Ally incl King L; L:AP4/instant cleanse OR ShieldD1 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V15.U — Divine Judgment | UNKNOWN / unassigned | rule.judgment_window; effect.judgment_mark | No target L; L:AP14/window10 end-ply/marks | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V16 — `devil` / Devil

Source: [Variants catalogue](../Variants.md), heading Devil; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-06/D-08/D-22.Devil**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V16.P — Infernal Pact | UNKNOWN / unassigned | — | L:each source turn+1AP | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V16.S1 — Devil's Eye | UNKNOWN / unassigned | effect.devil_eye; effect.stun | Ally non-King L; L:AP5/D2 -> attacker Stun3 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V16.S2 — Wrath Curse | UNKNOWN / unassigned | effect.berserk; effect.stun | Enemy non-King L; L:AP4/countdown4 -> Stun3 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V16.U — Hellish Toll | UNKNOWN / unassigned | rule.hellish_toll | CONFIRMED repeated sacrifice/main-action toll scope; L:AP14/12ply/fees0/2/3/4 | PARTIALLY_APPROVED; Q-15 repeat sacrifice/toll action scope | NOT_IMPLEMENTED / DISABLED |

## V17 — `phantom` / Phantom

Source: [Variants catalogue](../Variants.md), heading Phantom; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-08/D-14/D-15**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V17.P — Ghost Inheritance | UNKNOWN / unassigned | effect.ghost | L:dying Ghost transfers to closest eligible piece forD1 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V17.S1 — Haunt | UNKNOWN / unassigned | effect.ghost | CONFIRMED non-King Haunt O-6; other target restrictions L (Knight excluded); L:AP3 or0/GhostD3 | PARTIALLY_APPROVED; O-6 Haunt non-King; plugin §3 | NOT_IMPLEMENTED / DISABLED |
| V17.S2 — Possession | UNKNOWN / unassigned | effect.possession; effect.ghost | Player Ghost capture L; L:AP4/D0 ambiguous window | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V17.U — Spirit Walk | UNKNOWN / unassigned | rule.spirit_walk; effect.ghost | Player/Ghost set L; L:AP7/3 uses vs rounds/Ghost3 or5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V18 — `cannibal` / Cannibal

Source: [Variants catalogue](../Variants.md), heading Cannibal; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-14/D-22.Cannibal**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V18.P — Cannibal King | UNKNOWN / unassigned | — | L:King learns victim moveset/ally captures | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V18.S1 — Royal Guard | UNKNOWN / unassigned | effect.shield | Own King L; L:AP3/N2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V18.S2 — Devour | UNKNOWN / unassigned | effect.devour; effect.stun | Ally donor non-King L; L:AP5/D3 + bearer King profile | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V18.U — Apex Predator | UNKNOWN / unassigned | effect.apex_predator; effect.shield | King L; L:AP8/D10/ShieldD1 each2 captures | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V19 — `wizard` / Wizard

Source: [Variants catalogue](../Variants.md), heading Wizard; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-06/D-08/D-14/D-22.Wizard**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V19.P — Arcane Mastery | UNKNOWN / unassigned | effect.death_counter | L:shared escalation+2 per2 casts; threatened counter6 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V19.S1 — Arcane Swap | UNKNOWN / unassigned | effect.enemy_position_swap | Two enemies non-King L; L:AP5+escalation/D2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V19.S2 — Arcane Bind | UNKNOWN / unassigned | effect.bind | Enemy non-King L; L:AP4+escalation/D3/moving5x5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V19.U — Arcane Annihilation | UNKNOWN / unassigned | effect.death_counter (query) | Counter6 enemies L; L:AP14/12/10/8 by target count | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V20 — `earth` / Earth

Source: [Variants catalogue](../Variants.md), heading Earth; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-08/D-17/D-22.Earth**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V20.P — Ground Dominion | UNKNOWN / unassigned | unit.mountain | L:Shifting cost=max(3,6-Mountains) quoted turn start | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V20.S1 — Raise the Mountain | UNKNOWN / unassigned | unit.mountain; lifecycle.mountain_timer | Empty cell L; L:AP3/special blocker/D5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V20.S2 — Shifting Peaks | UNKNOWN / unassigned | unit.mountain; lifecycle.mountain_timer | Mountain+cell line L; L:AP3–6/push up to3/timer preserved | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V20.U — Earth-Burst Heavenly Star | UNKNOWN / unassigned | unit.reservation; lifecycle.reservation_timer | >=3 Mountains/target allegiance L; CONFIRMED non-King target O-6; L:AP10/exileN=Mountain count | PARTIALLY_APPROVED; O-6 metadata Earth ultimate non-King; audit08 Earth | NOT_IMPLEMENTED / DISABLED |

## V21 — `time` / Time

Source: [Variants catalogue](../Variants.md), heading Time; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-11**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V21.P — Temporal Burden | UNKNOWN / unassigned | — | L:shared ultimate cost6/9/15 by use count | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V21.S1 — Rewind | UNKNOWN / unassigned | — (position restore operation) | CONFIRMED living-piece position-only/atomic collision; L:AP4/lookback2ply | PARTIALLY_APPROVED; P00-04 position-only restore | NOT_IMPLEMENTED / DISABLED |
| V21.S2 — Future Prediction | UNKNOWN / unassigned | effect.prediction; effect.stun | Enemy+predicted cell L; L:AP5/D1 -> Stun4 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V21.U — Time Collapse — Grand Rewind / Time Freeze | `time_collapse` (APPROVED identifier; unimplemented) | effect.time_freeze; effect.stun | CONFIRMED one command/two modes, position-only rewind; L:AP6/9/15/lookback10ply orFreezeD6 | PARTIALLY_APPROVED; O-7 modes/P00-04 rewind | NOT_IMPLEMENTED / DISABLED |

## V22 — `space` / Space

Source: [Variants catalogue](../Variants.md), heading Space; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-08/D-12/D-19**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V22.P — Spatial Outworld | UNKNOWN / unassigned | effect.outworld | L:portal cells gain OutworldD2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V22.S1 — Dimension Link | UNKNOWN / unassigned | effect.dimension; effect.outworld | Two empty cross-half cells L; L:AP3/permanent paired portals | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V22.S2 — Spatial Shift | UNKNOWN / unassigned | effect.dimension; effect.outworld | Own portal cell L; L:AP4/column-reflect rank unchanged | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V22.U — Cosmic Void | UNKNOWN / unassigned | effect.cosmic_void; effect.outworld | CONFIRMED 10round/no two-ally removal; L:AP9/capture-generated cell | PARTIALLY_APPROVED; Q-08 10round/no ally removal | NOT_IMPLEMENTED / DISABLED |

## V23 — `puppet` / Puppet

Source: [Variants catalogue](../Variants.md), heading Puppet; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-06/D-16**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V23.P — Puppet Strings | UNKNOWN / unassigned | effect.stun; effect.bind; effect.puppet_no_capture | L:source-tagged Stun/control removal -> BindD2/no-capture | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V23.S1 — Soul Binding | UNKNOWN / unassigned | effect.puppet_main; effect.puppet_voodoo | Two allies ordered Main/Voodoo L; L:AP4/permanent | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V23.S2 — Puppet Strings | UNKNOWN / unassigned | effect.puppet_trap; effect.stun; effect.bind | Empty hidden cell L; L:AP3/trap permanent/Stun2 -> Bind2 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V23.U — Puppet Master | UNKNOWN / unassigned | effect.puppet_control; effect.bind | CONFIRMED control7=2 move-only+5 free; L:AP2/5/8/11 by type | PARTIALLY_APPROVED; Q-10 control7=2+5 | NOT_IMPLEMENTED / DISABLED |

## V24 — `cherubim` / Cherubim

Source: [Variants catalogue](../Variants.md), heading Cherubim; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-17/D-18**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V24.P — Dual Casting | UNKNOWN / unassigned | — | L:two distinct skills per turn; legacy auto-end conflict | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V24.S1 — Ascend | UNKNOWN / unassigned | effect.ascend | Ally Pawn L; L:AP2/progress5 then ready | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V24.S2 — Fountain of Youth | UNKNOWN / unassigned | unit.totem; lifecycle.totem_timer | Empty cell L; L:AP5/TotemD3/3x3 cleanse | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V24.U — Divine Ascension | UNKNOWN / unassigned | effect.ascend (query) | Ready Pawn set OR empty home cell L; L:AP12/transform or permanent spawn | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V25 — `dragon_sentinel` / Dragon Sentinel (legacy spelling Sentinal)

Source: [Variants catalogue](../Variants.md), heading Dragon Sentinel (legacy spelling Sentinal); canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-04/D-06/D-17/D-22.DragonSentinel**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V25.P — Dragon Guard | UNKNOWN / unassigned | effect.shield | L:every2round nearest ally non-King receives ShieldD1 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V25.S1 — Subterranean Escape | UNKNOWN / unassigned | effect.escape | Ally non-King L; L:AP4/D2/return+2 rounds after death | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V25.S2 — Shockwave | `dragon_sentinel.shockwave` (B2 pin) | forced_reposition / shockwave-v1; no effect | APPROVED: own ordinary non-King center; adjacent enemy ordinary non-King; radial1/blocked stay/simultaneous/AP4; zero-move reject | APPROVED B2-01…08 + ZERO_DISPLACEMENT; no siblings/passive | IMPLEMENTED / ENABLED only in selected Shockwave-only factory |
| V25.U — Dragon's Roar | UNKNOWN / unassigned | effect.channeling; effect.roar_beam | Cell direction from King L; L:AP10/channel5/beam5 | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V26 — `lord` / Lord

Source: [Variants catalogue](../Variants.md), heading Lord; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-06/D-17/D-22.Lord**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V26.P — Overwhelm | UNKNOWN / unassigned | — | L:every5round AP=abs(piece-count difference) | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V26.S1 — Vanguard Command | UNKNOWN / unassigned | — (destruction operation) | Ally column source L; CONFIRMED victim non-King O-6; L:AP4/first of3 forward cells | PARTIALLY_APPROVED; O-6 metadata Vanguard victim non-King; audit08 Lord | NOT_IMPLEMENTED / DISABLED |
| V26.S2 — Reinforcements | UNKNOWN / unassigned | effect.no_promotion; lifecycle.summon_duration | Up to2 empty home cells L; L:AP4/Pawn duration3/5/permanent by count | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V26.U — Iron Authority | UNKNOWN / unassigned | effect.silence | Opponent L; L:AP9/D3 or5 by counts/tiers1–2 only | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V27 — `pirate` / Pirate

Source: [Variants catalogue](../Variants.md), heading Pirate; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **D-06/D-12/D-17/D-22.Pirate**. Variant completeness remains unapproved; only signed subsets below are complete.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V27.P — Debt of the Seas | UNKNOWN / unassigned | — | L:AP floor-10/cast disabled while negative | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V27.S1 — Bet | UNKNOWN / unassigned | effect.pirate_bet | Opponent committed skill L; L:AP4/D2/reward8 | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V27.S2 — Sailing | UNKNOWN / unassigned | effect.sailing | Ally non-King+destination L; L:AP7/D2/delayed move or capture | PROPOSED | NOT_IMPLEMENTED / DISABLED |
| V27.U — Broadside | UNKNOWN / unassigned | — (stationary capture + destruction) | Rook rays L; L:AP12/first forward enemy then3x3 enemy-only blast | PROPOSED | NOT_IMPLEMENTED / DISABLED |

## V28 — ID UNKNOWN / Joker

Source: [Variants catalogue](../Variants.md), heading Joker; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **Q-20 (DEFERRED)**. DEFERRED Q-20; no runtime registration inferred from a draft name.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V28.P — Counterplay | UNKNOWN / unassigned | effect.seal | Draft real/false Seal; all values unknown | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |
| V28.S1 — Jester's Trick | UNKNOWN / unassigned | effect.seal | Draft AP4/three Seals; runtime/cost not confirmed | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |
| V28.S2 — Joker's Gift | UNKNOWN / unassigned | effect.seal | Draft AP4/three Seals; runtime/cost not confirmed | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |
| V28.U — Choice of Fate | UNKNOWN / unassigned | effect.seal | Draft AP8/Seal conversion/extension | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |

## V29 — ID UNKNOWN / Colossus

Source: [Variants catalogue](../Variants.md), heading Colossus; canonical ID evidence: [plugin coverage §3](VARIANT_PLUGIN_SPEC.md#3-coverage-catalog--tất-cả-27-active-và-hai-deferred). Outstanding gate: **Q-20 (DEFERRED)**. DEFERRED Q-20; no runtime registration inferred from a draft name.

| Row / ability | Exact current skill/passive ID | Associated effects / markers | Target / cost / timing evidence | Approval / specific confirmed fact | Implementation / enablement |
|---|---|---|---|---|---|
| V29.P — UNKNOWN (unnamed passive) | UNKNOWN / unassigned | unit.titan | Draft surviving Titan4round -> AP4; no runtime name | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |
| V29.S1 — Titan Summoning | UNKNOWN / unassigned | lifecycle.titan_assembly; unit.titan | Draft AP5/four-unit assembly4round/Titan2x2/four lives | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |
| V29.S2 — Guardian Link | UNKNOWN / unassigned | effect.guardian_link | Draft AP4/two different-value allies/link2round | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |
| V29.U — Earth Tremor | UNKNOWN / unassigned | effect.stun; unit.titan | Draft AP10/directional Stun3round | UNKNOWN | NOT_IMPLEMENTED / DISABLED; DEFERRED |


Legacy identifier evidence is retained separately from rebuild IDs: V02.U Detonation = `dynamite_detonation` (docs/Variants.md, Explosives OnSkillUsed); V21.U old entries `time_grand_rewind` / `time_time_freeze` (Time ultimate); V23.S2 source tag `puppet_strings` (Puppet Strings passive chain). These are LEGACY identifiers/tags, not enabled rebuild command IDs. Approved rebuild `time_collapse` retains two modes. Passive ID strings remain unavailable.

O-6 restriction facts are anchored by [decision registry approval evidence](../audit/06-decisions.md) §6 and [metadata-diff final decisions](../audit/08-variant-diff.md) §O-6/rows Turtle, Kazehime, Earth and Lord, plus current plugin coverage for Magician/Phantom/Angel. These references preserve only the explicitly confirmed King restrictions; audit08's other old “CONFIRMED” code observations remain LEGACY, not blanket gameplay approval. Phoenix metadata-specific King restrictions must be preserved; missing per-skill mappings remain an evidence gate, not permission to infer King eligibility.

## Effect catalogue reconciliation

The [existing catalogue](CONCRETE_EFFECT_CATALOG.md) contains **61 unique effect.* labels** and **18 non-effect rule/unit/lifecycle/delayed markers** =79 identifiers. This is a lexical inventory, not61 approved semantic definitions: effect.bomb is a historical family/alias label, charge/mine are distinct approved leaves; effect.landmine is a candidate hidden object; effect.electron is not proven equivalent to effect.electric. No IDs are merged to improve counts. The prior producer matrix also proposes effect.guardian.sanctuary as an alternative outer-region ID; it is not an additional implemented effect or part of the79-label count.

Four labels lack a complete direct producer mapping in the29-Variant ability rows: effect.bomb (historical family), effect.electron (alias unresolved), effect.marksman and effect.planted (described generic candidates). Joker draft names Marksman/Electron among possible seals without a complete producer contract. Preserve them as catalogue entries with producer UNKNOWN; do not invent a skill to fill the gap.

Exact effect-label set, for count/traceability validation:

- `effect.aegis`
- `effect.apex_predator`
- `effect.ascend`
- `effect.berserk`
- `effect.bind`
- `effect.blessing`
- `effect.bomb`
- `effect.bomb.charge`
- `effect.bomb.mine`
- `effect.camouflage`
- `effect.channeling`
- `effect.cosmic_void`
- `effect.death_counter`
- `effect.devil_eye`
- `effect.devour`
- `effect.dimension`
- `effect.electric`
- `effect.electron`
- `effect.emerald_domain`
- `effect.enemy_position_swap`
- `effect.escape`
- `effect.evolution`
- `effect.fate`
- `effect.flame`
- `effect.fool`
- `effect.gaze`
- `effect.ghost`
- `effect.guardian_link`
- `effect.judgment_mark`
- `effect.landmine`
- `effect.marksman`
- `effect.moveset_swap`
- `effect.no_promotion`
- `effect.outworld`
- `effect.pirate_bet`
- `effect.planted`
- `effect.position_swap`
- `effect.possession`
- `effect.prediction`
- `effect.puppet_control`
- `effect.puppet_main`
- `effect.puppet_no_capture`
- `effect.puppet_trap`
- `effect.puppet_voodoo`
- `effect.repel`
- `effect.roar_beam`
- `effect.sailing`
- `effect.sanctuary`
- `effect.seal`
- `effect.shelter`
- `effect.shield`
- `effect.silence`
- `effect.soulless`
- `effect.soulless_cell`
- `effect.stun`
- `effect.supernova_warning`
- `effect.thunder_fang`
- `effect.thunder_trap`
- `effect.time_freeze`
- `effect.walker`
- `effect.zombie`

Exact non-effect marker set (proposed representation only):

- `delayed.supernova`
- `lifecycle.mountain_timer`
- `lifecycle.reservation_timer`
- `lifecycle.summon_duration`
- `lifecycle.titan_assembly`
- `lifecycle.totem_timer`
- `rule.absolute_domain`
- `rule.divine_storm`
- `rule.electric_terrain`
- `rule.hellish_toll`
- `rule.judgment_window`
- `rule.law_hierarchy`
- `rule.law_weak`
- `rule.spirit_walk`
- `unit.mountain`
- `unit.reservation`
- `unit.titan`
- `unit.totem`
