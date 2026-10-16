# First concrete producers — approval matrix (02B-5A)

## Current 02B-6 Live Charge approval overlay

Owner approves the six Live Charge-only answers in OPEN_DECISIONS §02B-6 and authorizes this bounded implementation. They supersede UNKNOWN/PROPOSED Live Charge fields in the historical §4 table below, and only the Live Charge branch of shared Q-SCOPE/Q-SOURCE/Q-REMOVAL. Guardian answers remain unchanged; Landmine/Sanctuary/full Variants remain NOT_READY. Gameplay APPROVED; producer now IMPLEMENTED / READY / ENABLED only for explicitly selected factory players. Overall milestone READY_WITH_CONDITIONS: runtime HTTP smoke EACCES; all engine checks/611 tests PASS. Evidence: [02B-6 report](PHASE_02B_6_LIVE_CHARGE_REPORT.md).

| Field | Current approved Live Charge value / provenance |
|---|---|
| Variant / skill / scope | dynamite / dynamite.live_charge; experimental one-skill-only; D-22.FIRST_PRODUCER.SCOPE / Dynamite |
| Definition / category / payload | effect.bomb.charge / BUFF / existing empty immutable schema; Batch A consumer unchanged |
| Source / required refs | Invoking player, exact dynamite/dynamite.live_charge/null/null; player-originated-v1; D-05.FIRST_PRODUCER.SOURCE_PROFILE / Live Charge |
| Target / King / units | One live currently actor-controlled ordinary-original supported non-King; no special/summoned/unknown provenance; D-22.DYNAMITE.LIVE_CHARGE.PROFILE / targets |
| Lifetime / boundary / refresh | Permanent; no N/deadline; family application ignore/no refresh; prior Batch A |
| Cast duplicate / preconditions | Correct profile/turn/slot/AP3, valid target without any active Bomb family; duplicate cast rejects before debit; D-22.DYNAMITE.LIVE_CHARGE.PROFILE / duplicate cast |
| Cost / typed plan | Fixed3 AP, root debit once/one skill slot; pure plan one effect_apply; D-22.DYNAMITE.LIVE_CHARGE.PROFILE / cost |
| Removal / invalidation | Bearer committed-death and terminal cleanup only; no source invalidation or explicit removal; D-06.FIRST_PRODUCER.REMOVAL_PROFILE / Live Charge |
| Relocation | Either-controller ordinary-original non-King; preserve ID/source/payload/permanent data; allegiance not continuing; targets answer |
| Reactions / accounting | Existing committed capture/destruction death-centered blast, own original source per chain, owner loss AP/no destruction capture AP; prior Batch A |
| Engine gate / tests | IMPLEMENTED: createLiveChargeExperimentalRuleset, pinned v1 profile/hash and existing root/consumer/codec seams. PASS58 new cases, including mirrored real cast/duplicate/provenance/AP/slot/blast/rollback/restore/replay and AP0 public workflow. No Live Charge gameplay field remains UNKNOWN within this bounded profile |

## Historical 02B-5C implementation authorization

2026-10-16: owner authorizes real experimental Holy Shield-only producer implementation and acceptance against the six answers below. No new gameplay field approved. The authorized actor/target/cost/profile integration has passed acceptance as recorded below; all other producers remain NOT_READY/disabled. No full Guardian or automatic next milestone. Results and exact pins: PHASE_02B_5C_REPORT.

**Accepted5C:** Holy Shield IMPLEMENTED/READY/ENABLED=true **only** in the explicitly selected `guardian.holy-shield-only.experimental` v1 factory profile. Engine0.6.0/state1.1.0;57 real-producer tests, root549/29 and all required checks PASS; Standards/Spec0 findings. Exact state/ruleset pins, codec, source, ordinary-origin/removal constraints and limitations in [5C report](PHASE_02B_5C_REPORT.md). No approval or enablement of any other producer/full Guardian.

## Approved 02B-5B overlay

Six decisions are now **APPROVED for Holy Shield only**: experimental Holy Shield-only Guardian (not complete Variant); cast one invoking-player-controlled supported ordinary piece including King/no special or summoned units; relocation to eligible ordinary either-player pieces including King, without continuing cast-allegiance restriction; N2/source-end/no cast tick/stable refresh; fixed4/no Holy Aura; required player + exact guardian/guardian.holy_shield + null caster/incarnation/no liveness; expiry/bearer-death/terminal cleanup only, other removals unavailable. See OPEN_DECISIONS current 5B table.

**Historical5B delivery:** producer remained NOT_READY/ENABLED=false while source-profile validation/projection proof passed45 new tests. Evidence: [5B report](PHASE_02B_5B_REPORT.md). The separate5C implementation/acceptance above now supersedes that producer status for Holy Shield only. Six Q-* sections below are historical options superseded only for Holy Shield; shared source/removal questions remain OPEN for others. Sanctuary/Live Charge/Landmine unchanged.

Historical5A baseline, 2026-10-15: **DOCUMENTATION ONLY; all producers NOT_READY / ENABLED=false.** Current six Holy Shield answers and5B source implementation supersede the historical options as stated above; other candidates remain unapproved. No answer is inferred from a recommendation, synthetic fixture or legacy implementation. First playable producer means an authoritative engine skill; networking/UI and a full Variant are separate gates.

## 1. Provenance and fixed rules

| Ref | Source / authority |
|---|---|
| R | Current owner request §4: preserve approved rules and numeric facts; 02B-5A permits documents only |
| M | [Approved manifest](PHASE_02B_BATCH_A_APPROVED_MANIFEST.md) §§2–6, current 02B-4 overlay: Batch A rules, separate approval/implementation/enablement |
| O | [Decision registry](OPEN_DECISIONS.md): P00-02/03/05/08/09/10/11, D-04.SHIELD, D-05.BATCH-A.*, D-06.*, D-12.BOMB.*, source-identity supplement |
| N | [Prior decisions](../audit/06-decisions.md) O-8/O-9; R explicitly preserves Sanctuary3/generated Stun1 and Chains-generated Stun3 |
| V-G | [Variants](../Variants.md), `# -Guardian`: legacy Holy Shield4/2, N2; Sanctuary5/AP, region3×3, inconsistent center occupancy and legacy4/2 timing |
| V-D | [Variants](../Variants.md), `# -Dynamite`: legacy Live Charge3/AP, ally non-King/no Bomb; Landmine3/AP, hidden empty cell/entry consumption |
| E | [Effect](../Effect.md): legacy descriptions only; global King immunity and turn-based wording are superseded by O/R |
| P | [Plugin spec](VARIANT_PLUGIN_SPEC.md) §§1/2/10: immutable plans, authoritative cost/targets, player isolation and explicit group/subset approval |
| C | [Batch A acceptance](PHASE_02B_BATCH_A_REPORT.md), [02B-4 evidence](PHASE_02B_4_REPORT.md): engine0.5.0 consumer capabilities and remaining gates |

`APPROVED` and `CONFIRMED_FROM_PRIOR_DECISION` are gameplay authority. `PROPOSED` is an option, `UNKNOWN` needs an owner answer, `BLOCKED_ENGINE` identifies missing implementation, `DEFERRED` lies outside the chosen subset. A field may have a confirmed part and an unknown extension; both are stated. Source evidence V-G/V-D/E never upgrades a field to approved.

Fixed across applicable attachments: Stun DEBUFF, Shield BUFF, Charge BUFF, Mine DEBUFF; original source-player ownership, public/unlinked attachments; exact captured source identity for Stun/Shield; same-source stable-ID refresh/new approved N, independent cross-source clocks; source-end/no cast tick; eligible relocation preserves ID/source/payload/deadline. Shield rejects capture atomically without consumption. Bomb family duplicate ignore/original-source blast/committed death/AP/King invariants remain unchanged. P00 decisions and numeric Sanctuary3/Stun1/Chains3 are not questions below. Cell Sanctuary/Landmine metadata is not approved by attachment metadata.

## 2. Guardian — Holy Shield (first candidate)

Divine Shield is a different producer despite sharing `effect.shield`; legacy N5/AP8/all-allies does not authorize it. It remains DEFERRED.

| Field | Value / boundary | Status; provenance |
|---|---|---|
| Variant ID | `guardian` | APPROVED exact source ID, 5B A5 |
| Skill ID/name | `guardian.holy_shield` / Holy Shield | APPROVED exact source ID, 5B A5 |
| Effect definition ID | `effect.shield` | APPROVED; M§4 |
| Category | BUFF | APPROVED; O D-06.SHIELD.CATEGORY |
| Source player | Validated invoking experimental Guardian player, captured on apply; never target controller | APPROVED; IMPLEMENTED5C root/profile authorization |
| Source variant/skill | Required captured `guardian` / `guardian.holy_shield` | APPROVED; 5B A5 |
| Caster piece/incarnation | Canonical null/null; no board caster, liveness or incarnation producer | APPROVED; 5B A5 |
| Target allegiance | Exactly one invoking-player-controlled piece at cast; not continuous validity after control transfer | APPROVED;5B A2; IMPLEMENTED5C planner |
| King eligibility | King eligible at cast and eligible relocation | APPROVED; 5B A2 |
| Special-unit eligibility | Supported ordinary board pieces only; special/summoned units excluded | APPROVED; 5B A2 |
| Duration N | N=2 only, reset2 on same-source recast | APPROVED; 5B A3 |
| Source-end boundary | N rounds, no cast-boundary tick, retained through control/swap | APPROVED / CONFIRMED_FROM_PRIOR_DECISION; R/M/P00-02 |
| Matching/refresh | Exact captured source + type + target; stable ID/new approved N; cross-source coexistence | APPROVED; M§4/O source supplement |
| Removal reasons/permissions | Natural expiry, bearer-death and terminal cleanup only; explicit cleanse/dispel/custom removal forbidden | APPROVED;5B A6; IMPLEMENTED5C permission contract |
| Source-invalidated behavior | Not enabled; no caster/liveness dependency; original source stays stable | APPROVED; 5B A5/A6 |
| Payload/refresh | Empty immutable Shield payload is sufficient for consumer; no charges. No new gameplay metadata needed for proposed player-originated profile | APPROVED empty consumer; C. Encoding/version/preserve-empty technical; nonempty behavior UNKNOWN |
| Relocation | Eligible ordinary pieces of either controller including King; preserve source/ID/payload/deadline | APPROVED; 5B A2 |
| Required references | Player/guardian/guardian.holy_shield, target, producer guardian.holy-shield v1; explicit null caster/incarnation | APPROVED source refs; technical pins IMPLEMENTED5C |
| Costs | Fixed4 AP; no discount/threshold/Holy Aura or alternate cost | APPROVED;5B A4; IMPLEMENTED5C single root debit |
| Preconditions | Enabled experimental profile, correct turn/remaining skill, one controlled ordinary-original target including King, sufficient fixed4 AP; no client source/N | APPROVED/P00-07/09; IMPLEMENTED and tested5C |
| Resulting typed operations | Pure trusted plan returns one `effect_apply`; root spends cost4/skill once | IMPLEMENTED5C; no direct planner mutation |
| Current capability | Complete bounded producer plus existing Shield defense/expiry/refresh/swap/rollback/replay | IMPLEMENTED5C; root549/29 PASS |
| Engine blocker | None for this accepted null-caster ordinary-original profile; broader graph/special-unit/interaction gates remain | READY for explicit experimental factory only |
| Gameplay approval status | Six bounded decisions APPROVED; exact experimental profile accepted5C | APPROVED, IMPLEMENTED, READY; ENABLED=true only for selected factory players |
| Independent acceptance tests | 57 real-producer cases plus prior source/consumer tests; actual root casting/security/turn/source-end/restore/replay/fault oracles | PASS5C; full results in report |

## 3. Guardian — Sanctuary-generated Stun

This profile includes dependencies on the producing region. A cell/region Sanctuary definition is not supplied by the existing Stun consumer. Legacy D4/D2 is superseded by confirmed3/1; do not ask those numbers again.

| Field | Value / boundary | Status; provenance |
|---|---|---|
| Variant ID | `guardian` | PROPOSED technical ID; V-G/P |
| Skill ID/name | `guardian.sanctuary` / Sanctuary | PROPOSED technical ID; name V-G |
| Effect definition ID | Generated `effect.stun`; outer region ID candidate `effect.guardian.sanctuary` | Stun APPROVED; outer ID PROPOSED technical, definition absent |
| Category | Generated Stun DEBUFF; outer region classification/removability is not inherited from Stun | APPROVED attachment / UNKNOWN outer policy; M/Q-SAN-REGION |
| Source player | Original Sanctuary source player owns generated Stun; actual captured attacker is target, not replacement source | APPROVED source preservation; M. Exact event producer mapping PROPOSED, Q-SAN-TRIGGER |
| Source variant/skill | Captured original `guardian` / `guardian.sanctuary`; retain after source/target movement/control | APPROVED captured-source invariant; literal producer refs PROPOSED, Q-SOURCE |
| Caster piece/incarnation | Capture producer refs at region creation if profile requires them; do not use each triggering attacker as caster | UNKNOWN required refs; Q-SOURCE |
| Target allegiance | Candidate hostile current-controller attacker on an approved committed capture; victim allegiance/event condition unspecified | UNKNOWN; V-G/O D-22, Q-SAN-TRIGGER |
| King eligibility | Attacker King may normally capture, but generated Stun attachment permission still producer-specific | UNKNOWN; M/Q-SAN-TRIGGER; terminal King-victim capture has no remaining cascade by P00-08 |
| Special-unit eligibility | Triggering special captures/units have no blanket permission; ordinary-profile subset proposed | UNKNOWN / DEFERRED unsupported capture mechanics; Q-SAN-TRIGGER |
| Duration N | Sanctuary3 rounds; generated Stun1 round. Chains Stun3 remains separate numeric fact, no producer enablement | CONFIRMED_FROM_PRIOR_DECISION; N/R |
| Source-end boundary | Approved source-clock/no cast tick for timed effects; generated Stun anchors at its application, not region's creation deadline | APPROVED source-end/P00-02; R/M. Region policy must bind the same declared clock; no numeric question |
| Matching/refresh | Stun exact-source/type/target refresh already fixed. Region same-center recast/different centers/overlap event multiplicity not fixed | APPROVED Stun / UNKNOWN region producer policy; Q-SAN-RECAST |
| Removal reasons/permissions | Stun due expiry/target death/terminal cleanup remain; region cleanse/dispels and generated-effect permissions unspecified | APPROVED base cleanup / UNKNOWN region permissions; Q-REMOVAL/Q-SAN-REGION |
| Source-invalidated behavior | Do region expiry/removal invalidate already emitted Stuns? No source mutation or unapproved linked group is allowed | UNKNOWN producer dependency; Q-REMOVAL |
| Payload/refresh | Generated Stun can remain `{}`; outer region needs approved center/geometry/lifetime and recast data policy | APPROVED empty Stun; UNKNOWN outer gameplay data, Q-SAN-REGION/Q-SAN-RECAST |
| Relocation | Generated Stun follows approved piece relocation; region relocation is not covered by piece whole-set swap | APPROVED attachment; DEFERRED region relocation pending explicit policy |
| Required references | Original player/variant/skill; legitimate caster if required; committed attacker and capture coordinate; region identity for dispatch/dedup | Existing source fields APPROVED; producer/event refs PROPOSED; per-region source-key extension is not approved |
| Costs | Legacy skill5 AP; no approval that Holy Aura changes it | UNKNOWN; V-G, Q-SAN-REGION |
| Preconditions | Valid center/occupancy, region shape/bounds, cost/turn/actor authorization; trigger only after permitted committed capture, never Shield cancellation | First predicates UNKNOWN; committed-only/atomic invariants APPROVED; Q-SAN-REGION/Q-SAN-TRIGGER |
| Resulting typed operations | Region skill would apply a separately validated region record; reviewed concrete capture reaction would emit Stun `effect_apply` N1 on actual attacker ID | PROPOSED plan; BLOCKED_ENGINE concrete region/reaction capability |
| Current capability | Cell targets/lifetimes declarable; Stun consumer/producer-rounds/FIFO and committed capture facts exist | APPROVED generic/Stun scope per C; concrete Sanctuary DEFERRED; declarations alone do not implement it |
| Engine blocker | E-PRODUCER, E-SOURCE-PROJECTION, E-SANCTUARY; event actor/death-coordinate transport and overlap preflight needed | BLOCKED_ENGINE; §6 |
| Gameplay approval status | Only numeric fields and shared Stun rules confirmed; placement/trigger/region policy incomplete | UNKNOWN → NOT_READY, ENABLED=false |
| Independent acceptance tests | SAN-1…SAN-4 and COMMON cases; final literals derived from signed profile, not legacy destination lookup | PROPOSED test plan; §7 |

## 4. Dynamite — Live Charge (historical5A profile; superseded by02B-6 overlay)

| Field | Value / boundary | Status; provenance |
|---|---|---|
| Variant ID | `dynamite` | PROPOSED technical ID; V-D/P |
| Skill ID/name | `dynamite.live_charge` / Live Charge | PROPOSED technical ID; name V-D |
| Effect definition ID | `effect.bomb.charge` | APPROVED; M§5 |
| Category | BUFF | APPROVED; O D-06.BOMB.CATEGORY |
| Source player | Original invoking Dynamite player; blast keeps this source through death/chain/swap | APPROVED attribution; M/P |
| Source variant/skill | Captured `dynamite` / `dynamite.live_charge` | PROPOSED required refs; Q-SOURCE |
| Caster piece/incarnation | Player-originated null/null versus actual named caster unresolved; permanent lifetime currently rejects non-null incarnation | UNKNOWN / BLOCKED_ENGINE conditional; Q-SOURCE/E-INCARNATION |
| Target allegiance | Legacy one ally; exact controller/owner rule unapproved | UNKNOWN; V-D, Q-LIVE |
| King eligibility | Legacy excludes King; no global immunity or blast exclusion decides attachment eligibility | UNKNOWN; M/V-D, Q-LIVE |
| Special-unit eligibility | Proposed supported ordinary profiles only; no automatic approval of summons/transformations | UNKNOWN / PROPOSED; Q-LIVE |
| Duration N | Permanent attachment, not duration N or client parameter | APPROVED; M§5 |
| Source-end boundary | None for permanent Bomb; no expiry tick. Do not invent N0 | APPROVED permanent contract; M |
| Matching/refresh | Unique family bomb/target across charge/mine/sources; duplicate application ignored with original data | APPROVED; O D-05.BATCH-A.BOMB; producer no-op legality separately Q-LIVE |
| Removal reasons/permissions | Committed bearer capture/destruction reaction fixed; cleanse/dispel cleanup does not explode; permission to invoke removal unspecified | APPROVED reaction/cleanup; UNKNOWN permissions, Q-REMOVAL |
| Source-invalidated behavior | Original source preserved after caster movement/death; whether profile has a separate invalidation cleanup dependency unspecified | APPROVED identity / UNKNOWN dependency; Q-REMOVAL |
| Payload/refresh | Existing empty immutable Bomb schema; no refresh, radius/reward overrides or producer metadata invented | APPROVED empty consumer capability; C/M |
| Relocation | Eligible piece destination keeps family/source/ID/permanent data; death uses new bearer coordinate | APPROVED invariant / UNKNOWN concrete eligibility; Q-LIVE |
| Required references | Validated player/variant/skill, bearer identity, optional genuine caster; root owns operation IDs/causes and death snapshot | Core invariant APPROVED; exact producer refs PROPOSED/UNKNOWN, Q-SOURCE |
| Costs | Candidate3 AP; no passive/Detonation refund is approved by attachment | UNKNOWN cost; V-D/Q-LIVE; refund/setup DEFERRED Q-SCOPE |
| Preconditions | Actor enabled, AP/skill slot, allowed target; is already-Bombed target a valid paid cast or producer-level reject? | Core invariants CONFIRMED_FROM_PRIOR_DECISION; exact producer predicate UNKNOWN, Q-LIVE |
| Resulting typed operations | One trusted `effect_apply` Charge with preserved source; not immediate explosion/destruction or AP reward | PROPOSED use of existing operation; P/C |
| Current capability | Family apply/import/swap validation, concrete committed-death consumer, blast/FIFO/source/AP/rollback/replay | APPROVED consumer scope; implemented evidence C; no executable Live Charge |
| Engine blocker | E-PRODUCER and E-SOURCE-PROJECTION; E-INCARNATION if required | BLOCKED_ENGINE; §6 |
| Gameplay approval status | Consumer approved, producer targets/King/cost/refs/removal incomplete | UNKNOWN → NOT_READY, ENABLED=false |
| Independent acceptance tests | LIVE-1…LIVE-3 plus COMMON cases | PROPOSED test plan; §7 |

## 5. Dynamite — Landmine (dependency inventory only)

No new owner question about hidden Landmine is required for the first producer. D-12/D-25/D-22 remain unresolved; this is not a proposal to implement a partial hidden trap.

| Field | Value / boundary | Status; provenance |
|---|---|---|
| Variant ID | `dynamite` | PROPOSED technical ID; V-D |
| Skill ID/name | `dynamite.landmine` / Landmine | PROPOSED technical ID; V-D |
| Effect definition ID | On entry `effect.bomb.mine`; outer hidden-cell ID candidate `effect.dynamite.landmine` | APPROVED attachment / PROPOSED outer ID |
| Category | Attached Mine DEBUFF; outer trap classification unknown | APPROVED attachment / UNKNOWN outer policy; M |
| Source player | Original trap producer remains source of resulting attachment/blast | APPROVED attribution invariant; M; trigger transport DEFERRED |
| Source variant/skill | Original `dynamite` / `dynamite.landmine`, not entrant or trigger actor | PROPOSED required refs consistent with M/P |
| Caster piece/incarnation | Exact profile unspecified; non-null incarnation on permanent attachment unsupported | UNKNOWN / BLOCKED_ENGINE conditional |
| Target allegiance | Cell placement then eligible entrant; controller/owner/entry-cause predicate unresolved | UNKNOWN / DEFERRED; D-12/V-D |
| King eligibility | Placement under King versus King entry/consume/attachment are separate unanswered policies | UNKNOWN / DEFERRED; D-12; no global immunity |
| Special-unit eligibility | Entry/teleport/forced movement/exile-return and transformed units unresolved | UNKNOWN / DEFERRED; D-12/D-17 |
| Duration N | Attached Bomb permanent approved; outer trap permanent is legacy candidate only | APPROVED attachment / PROPOSED outer policy; V-D/M |
| Source-end boundary | No boundary for permanent attachment; any outer timer requires its own approval | APPROVED attachment / DEFERRED outer policy |
| Matching/refresh | Attached family ignore fixed; cell per-player/per-cell overlap, cap and recast unspecified | APPROVED attachment / UNKNOWN outer rules; V-D/D-12 |
| Removal reasons/permissions | Attachment cleanup and committed-death rules fixed; cell consumption/disarm/blocked-entry/cleansing permissions unknown | APPROVED attachment / UNKNOWN, DEFERRED outer rules |
| Source-invalidated behavior | Captured original source immutable; cell lifetime and generated attachment dependency not approved | APPROVED identity / UNKNOWN dependency |
| Payload/refresh | Attachment `{}` available; hidden trap needs typed entry/visibility/consume data and source refs | Existing consumer APPROVED; outer payload UNKNOWN / BLOCKED_ENGINE |
| Relocation | Piece attachment eligible relocation fixed; cell trap movement/whole-set participation not authorized | APPROVED attachment / DEFERRED cell behavior |
| Required references | Trap/source/entry-cause/event identities and resulting bearer; no full hidden-state client payload | PROPOSED technical transport; privacy invariant P; exact contract DEFERRED |
| Costs | Legacy3 AP | UNKNOWN / DEFERRED; V-D/D-22 |
| Preconditions | Empty cell/no own mine/max count/setup/target half/bounds need explicit profile; no defaults from code | UNKNOWN / DEFERRED; V-D/D-12/D-22 |
| Resulting typed operations | Would create hidden cell record, consume by approved entry outcome, then apply public Mine attachment; no immediate blast merely on attach | PROPOSED dependency outline only; BLOCKED_ENGINE producer |
| Current capability | Mine attachment consumer only; generic metadata/events do not supply hidden trap behavior | APPROVED attachment consumer per C/M; hidden producer DEFERRED |
| Engine blocker | Entry-cause contract, reviewed concrete entry reaction, consume/reveal transaction, role-safe views/hints, trap/source projector, E-PRODUCER | BLOCKED_ENGINE / DEFERRED; D-12/D-25 |
| Gameplay approval status | Hidden placement/entry/reveal not approved | UNKNOWN / DEFERRED → NOT_READY, ENABLED=false |
| Independent acceptance tests | Future approved entry/nonentry matrix, King/Aegis/duplicate outcomes, hidden-view leaks, mirror isolation, consume-once/fault/replay | PROPOSED future tests only, DEFERRED |

## 6. Capability gaps — engineering, not gameplay votes

| Gate | Existing evidence / missing seam | Minimum safe next work when separately authorized |
|---|---|---|
| E-PRODUCER | IMPLEMENTED5C: versioned target intent, profile-authorized immutable planning context, root-owned debit/slot/FIFO and persisted per-player selection. Only experimental Holy Shield planner is registered | Other producers still require their own complete signed profile, target/cost planner, acceptance and explicit authorization; generic capability is not enablement |
| E-SOURCE-PROJECTION | `EffectRepetitionContext` supplies target/group/remaining lifetime, no source graph; fixture emits raw piece/incarnation | Independent **02B-5B** technical gate in [normalization plan](SOURCE_REPETITION_NORMALIZATION_PLAN.md); no generic graph implementation now |
| E-COST-LEDGER | `GameStateSchema` has no committed graveyard ledger; position history is not death inventory. Static skill cost cannot express Holy Aura's proposed live count | Only if that option approved: typed committed-death inventory/count semantics + pure actualCost quote, serialization/projection/replay. Do not build revive to count deaths |
| E-SANCTUARY | `EffectTriggerHandler.mode` is synthetic-v1; concrete reviewed reaction is Bomb death only. Capture fact names attacker but does not carry full region-ready capture context/death coordinate | After region/event rules signed: explicit concrete capability + immutable actual attacker/victim/controller/death-position context; region matching/dedup/lifetime under root; never masquerade as synthetic-v1 |
| E-INCARNATION | Timed profiles validate supported incarnation strings, but `PieceSchema` has no incarnation field/producer. `resolveEffectLifetime` rejects non-null incarnation for permanent policies | No blocker if approved profile has no caster incarnation. Otherwise separately pin real incarnation/lineage producer and compatible permanent source validation; no fake IDs |
| E-LANDMINE | Hidden entry/consume/reveal and client-safe projection absent | Deferred; no relevance to first Holy Shield enablement |

Common runtime removal descriptor is cleanup behavior, not permission. `planEffectCleanup` handles target loss/terminal, not automatic source invalidation. Permission/source-dependency checks must be explicit in the approved producer/removal planner, not inferred from descriptor coverage. Existing custom bundle repetition projection is not a drop-in fix: `runtimeRepetitionProjection` rebuilds unlinked effect entries from definition projectors, so a custom `effects` value alone does not replace their raw refs.

## 7. Proposed independent acceptance matrix

These are future tests, **not run in 02B-5A**. Unknown costs/N/eligibility get literal expected values only after the relevant answers are recorded. No fixture stands in for real producer authorization.

| Test ID | Required oracle at public boundary |
|---|---|
| COMMON-1 | Actor with another Variant, disabled skill, forged source/N/derived operations, invalid target/schema reject with no AP/slot/RNG/ID/history/events mutation; valid target intent produces trusted original source |
| COMMON-2 | White/Black mirrors and two matches; same-source recast/other-source coexistence where applicable; source remains captured through caster death/control/swap; no live-target owner substituted |
| COMMON-3 | Exact clone/codec/replay/events/hashes, malformed profile rejection and old incompatible archive rejection; independent normalized equivalence/negative pairs from 5B |
| COMMON-4 | Mid-plan/queue fault rolls back everything; one authoritative cost/skill debit; P00 main/skill/End order retained; full baseline regression checks in implementation milestone |
| HS-1 | Signed target allegiance/King/special-unit predicate applied at cast and final relocation; invalid destinations reject entire transaction |
| HS-2 | Approved literal N at source-end/no cast tick; recast stable ID/reset, different-source clocks; Shield-canceled capture unchanged, no death/AP/Bomb/terminal |
| HS-3 | Approved literal base/discount cost, exact AP insufficiency boundary; if Holy Aura approved, below/at threshold, mirror source isolation and approved record-consume semantics. If excluded, no hidden discount path |
| HS-4 | Removing one source retains protection; only signed removals allowed; source disappearance tested against signed dependency rule; no on-cleanse blast |
| HS-5 | Ordinary destruction still commits with owner loss AP; no accidental Stun/main-action/threat modifier or turn-slot redesign |
| SAN-1 | Region3/generated Stun1 clocks tested independently; approved placement/shape/clipping/occupied-center and cost predicates |
| SAN-2 | Real committed attacker ID receives Stun; signed victim/allegiance/death-coordinate rule, Shield-canceled capture no Stun, terminal King capture no remaining reaction |
| SAN-3 | Same-center recast/different centers/overlap apply-fact count uses owner-approved oracle; no invented per-region source key, and generated Stun survives or is cleaned only as explicitly approved |
| SAN-4 | Capture-style consumers outside supported boundary stay disabled; mirror zones/source clocks, fault between region event and Stun application, exact replay |
| LIVE-1 | Signed ally/King/special-unit target and literal cost; duplicate producer-level reject-or-paid-no-op has approved AP/slot outcome while generic family ignore remains unchanged |
| LIVE-2 | One valid Charge apply, no attachment AP reward; later committed capture/destruction/source-bearing chain; Shield cancel no explosion, King blast exclusion, owner loss AP once |
| LIVE-3 | No free setup Bomb/Detonation refund from this skill; relocate/swap then actual death-center explosion; forged incarnation/plan rejected, exact source projection/replay |

## 8. Owner questions — unresolved fields only

The stable decision IDs are the bold IDs below; Q-* labels elsewhere are short references. These are historical 5A questions: six answers now APPROVED for Holy Shield only in the current 5B overlay. Other producer fields remain **UNKNOWN / OPEN**; no parent decision or whole Variant is closed. Choosing to defer leaves the dependent producer NOT_READY.

### Q-SCOPE — D-22.FIRST_PRODUCER.SCOPE

**Current: APPROVED Holy Shield-only limited experimental Guardian, not a full Variant. Other producer subset permissions remain OPEN.** Historical alternatives below are not unanswered Holy Shield questions.

- **Producer/context:** first Holy Shield (then Sanctuary/Live Charge). P §10 normally expects a full group record; this request prepares a smaller first producer, not full Guardian/Dynamite.
- **Confirmed:** consumer rules ready conditionally; all producers disabled. **UNKNOWN:** permission for an explicitly limited executable Variant profile with sibling skills/passives/setup absent.
- **Options:** A approve Holy Shield-only player profile, other Guardian skills/passive unavailable until separately approved; B require complete Guardian passive+skills before any playable profile; Live Charge later needs the analogous explicit Dynamite subset.
- **Recommendation/impact:** A gives shortest engine-playable producer without silently granting Holy Aura/Divine Shield. B needs additional unrelated profile decisions/capabilities and delays first playability. Neither enables anything in 5A.
- **READY condition:** selected subset and exclusions signed, then all applicable profile/engine gates pass; no partial profile presented as full Guardian/Dynamite.

### Q-HS-TARGET — D-22.GUARDIAN.HOLY_SHIELD.TARGETS

**Current: APPROVED one controlled ordinary cast target including King, either-controller ordinary relocation including King; no special/summoned units or continuous cast-allegiance removal.**

- **Confirmed/context:** Shield has piece attachment and no global King immunity; V-G's one ally including King is candidate evidence only.
- **UNKNOWN:** allegiance basis, cardinality, King/special-unit eligibility and the corresponding relocation destination predicate.
- **Options:** A cast on one controller-ally ordinary supported piece including King, with eligible relocation to ordinary pieces of either controller including King; B same but exclude King at both cast and relocation; C owner-ally requiring actor also controls it, with explicit King and relocation predicate supplied. Any special-unit inclusion needs a named profile, not blanket permission.
- **Recommendation/impact:** A follows the documented cast candidate and leaves beneficial attachments transferable between otherwise eligible ordinary pieces; that cross-controller relocation choice is PROPOSED, not inherited approval. B excludes King; C excludes owned enemy-controlled pieces at cast and needs its distinct destination rule. Cast allegiance is not an automatic continuous-validity/removal rule after control transfer, and never rewrites source.
- **READY condition:** exact predicate pinned for cast and attachment relocation; special units outside signed subset fail closed; Q-HS-N/COST/SOURCE/REMOVAL also answered.

### Q-HS-N — D-22.GUARDIAN.HOLY_SHIELD.DURATION

**Current: APPROVED N2/source-end/no cast tick/stable refresh and independent sources.**

- **Confirmed:** source-end N rounds/no cast tick, stable same-source refresh/reset are fixed. **UNKNOWN:** Holy Shield N; Divine Shield5 and fixture1/3 do not answer it.
- **Options:** A N=2 from V-G; B owner specifies another positive integer N. No client-chosen N.
- **Recommendation/impact:** A is the least speculative catalog candidate, still requires approval. B changes the producer's declared allowed N and timing test literals; generic consumer semantics unchanged.
- **READY condition:** signed numeric N bound to a trusted versioned producer profile, apply/decode/refresh/replay tests pass.

### Q-HS-COST — D-22.GUARDIAN.HOLY_SHIELD.COST_PROFILE

**Current: APPROVED fixed4 only, Holy Aura/discount/graveyard/alternate cost unavailable.**

- **Context/confirmed:** root debits actualCost once; no new passive reward is authorized. V-G proposes4/2 at graveyard≥8, O D-22 leaves count/permanence open.
- **UNKNOWN:** actual cost and whether this first subset includes Holy Aura; if included, count ownership/reasons/current-versus-permanent threshold behavior.
- **Options:** A explicit narrow skill-only base4 AP, Holy Aura unavailable in this subset; B full proposed Holy Aura: base4→2 at current qualifying graveyard count≥8, no permanent unlock, approve whose records qualify (candidate owner-at-death) and which committed capture/destruction records remain after consumption; C defer Shield until another exact cost/passive profile is specified.
- **Recommendation/impact:** A minimizes dependencies but requires explicit limited-profile approval, not an automatic nerf to full Guardian. B requires E-COST-LEDGER/quote/repetition and threshold tests; it does not authorize revival or extra death causes. C keeps producer blocked.
- **READY condition:** exact cost/discount/exclusion policy signed; no numeric4/2/8 promoted from legacy automatically.

### Q-SOURCE — D-05.FIRST_PRODUCER.SOURCE_PROFILE

**Current Holy Shield: APPROVED required player/guardian/guardian.holy_shield/null/null, no caster/liveness/incarnation producer. Sanctuary/Live Charge source requirements remain OPEN.**

- **Producers/context:** Holy Shield, Sanctuary, Live Charge; generic structured identity is already approved and is not being asked again.
- **UNKNOWN:** for each producer, whether there is any board caster; whether caster/incarnation refs are required; whether cast ability depends on caster state.
- **Options:** A player-originated Variant ability with required source player/variant/skill and canonical caster/incarnation null; B the same required player/variant/skill plus a named legitimate board caster with explicit eligibility/usage predicate and optional supported incarnation; if incarnation required, specify its actual producer/lifecycle before enablement.
- **Recommendation/impact:** A fits documents that select a target/center but name no caster, and avoids inventing one; approve it explicitly, not to conceal normalization gaps. B needs live-caster validation, source normalization and possibly E-INCARNATION; Stun does not automatically forbid using it for a skill. For Sanctuary, generated Stun inherits the original producer tuple, not attacker-as-caster.
- **READY condition:** signed per-producer requirement/ability predicate; no fake incarnation or client-provided trusted source; 5B acceptance. Source tuple and root attribution remain unchanged by projection.

### Q-REMOVAL — D-06.FIRST_PRODUCER.REMOVAL_PROFILE

**Current Holy Shield: APPROVED expiry/bearer-death/terminal cleanup only; cleanse/dispel/source-invalidated/custom paths unavailable. Other producer permissions/dependencies remain OPEN.**

- **Confirmed:** timed due expiry, target-death/terminal cleanup, source stability and P00-11 cleanup-only; Bomb explodes only on its approved committed bearer death, not removal.
- **UNKNOWN:** extra removal permissions/source-invalidated dependencies; especially whether Sanctuary removal invalidates already generated Stun.
- **Options:** A first enabled subset exposes no cleanse/dispel/source-invalidation action; attachments persist to their own approved deadline/bearer death/terminal, and emitted Stun is independent of region expiry/removal. Future remover permissions remain UNKNOWN/disabled; B name each additional authorized remover, actor/target/source predicate and exact source-invalidated condition; without those details keep that path disabled. Neither option silently adds a linked group or on-cleanse reaction.
- **Recommendation/impact:** A allows a bounded producer without a new removal mechanic, explicitly preserving original source after caster absence. B adds permission/dependency validation and tests; any region-induced cleanup must be approved, not inferred from a reference. Apply answers separately if profiles differ.
- **READY condition:** signed enabled-reason/permission/dependency profile; cleanup descriptor values are never treated as authorization.

### Q-SAN-REGION — D-22.GUARDIAN.SANCTUARY.REGION_PROFILE

- **Confirmed:** duration3 and generated Stun1, source clock, committed/terminal/cleanup invariants. **UNKNOWN:** placement/cardinality/geometry/outer classification and removability/cost; V-G has empty-center conflict.
- **Options:** A one empty valid center, clipped3×3, base5 AP; B one valid center regardless occupancy, clipped3×3, base5 AP; C require full3×3 in bounds and empty center, base5 AP. Outer category options are a neutral region or a source BUFF region, with explicit enabled removal permissions in either case; these are PROPOSED, and piece DEBUFF does not classify the cell region. If neither category is acceptable, owner must supply the exact alternative before registration.
- **Recommendation/impact:** A with neutral region metadata is the minimal candidate; neutral is not removal immunity. B permits occupied-center casts; C forbids edge/corner centers. All are PROPOSED and need exact metadata, including cost5. Unknown region category/removal keeps registration blocked even after placement choice.
- **READY condition:** complete region schema/eligibility/lifetime/category/removal profile signed, with no region relocation action enabled in this proposed subset (future cell relocation stays deferred); no reapproval of3/1 or source clock; E-SANCTUARY passes.

### Q-SAN-TRIGGER — D-08.GUARDIAN.SANCTUARY.TRIGGER_PROFILE

- **Context/confirmed:** use immutable committed attacker identity, never infer attacker from destination; canceled capture has no committed trigger; King terminal suppresses remaining cascade.
- **UNKNOWN:** triggering capture's attacker/victim relation, cell predicate, King/special-unit attachment eligibility.
- **Options:** A hostile current-controller attacker commits capture of a Guardian-controlled victim whose actual death coordinate is in region; B any hostile attacker's committed capture in region, without victim-allegiance filter. Explicitly choose allow/deny King as a non-terminal attacker and supported unit/capture profiles. A future stand-still capture must use actual attacker/death cell if separately enabled, not attacker occupancy at destination.
- **Recommendation/impact:** A makes Sanctuary's defended-victim scope explicit; B permits broader future capture types. Both target the actual attacker with Stun1 and require a reviewed concrete post-capture binding; neither approves forced capture, pre-death stun or full priority matrix.
- **READY condition:** exact event/eligibility predicate and unsupported-style boundary signed; source preservation and atomic rollback tests pass.

### Q-SAN-RECAST — D-05.GUARDIAN.SANCTUARY.REGION_RECAST

- **Confirmed:** generated same-source Stun refreshes; distinct approved source tuples coexist; Stun remains unlinked. **UNKNOWN:** outer-region same-center recast, multiple centers and overlapping-zone application facts.
- **Options:** A same-center/same-source region stable-ID refresh/reset3; different centers coexist; overlapping regions of one source apply Stun once per committed event+attacker+source. B same region placement/refresh policy, but each matching region submits an application; repeated same-source applications refresh the same Stun and may emit extra refresh facts.
- **Recommendation/impact:** A avoids redundant applications/facts; B preserves region-by-region multiplicity requiring deterministic ordering and replay tests. Neither creates independent same-source Stuns by inventing a cell-as-caster or per-region skill ID. Independent per-region Stun identity would need a separate explicit source-contract extension and remains outside this proposed first profile.
- **READY condition:** outer policy and event dedup/fact multiplicity signed; exact source key unchanged, expiry/source dependency answered in Q-REMOVAL.

### Q-LIVE — D-22.DYNAMITE.LIVE_CHARGE.PROFILE

- **Confirmed:** Charge category/permanence/family ignore/blast/source/AP are fixed. **UNKNOWN:** target predicate/King/special units, cost and whether an already-Bombed target is a valid cast.
- **Options:** A cast on one controller-ally supported ordinary non-King, cost3, reject producer cast on any existing Bomb family before debit; attachment relocation may target ordinary non-Kings of either controller. B same cast/relocation eligibility/cost but permit paid no-op cast against existing family (generic apply still ignores). C owner specifies alternate allegiance/King/cost/relocation tuple explicitly before enablement. Additional unit types need named approval.
- **Recommendation/impact:** A matches V-D's cast candidate and prevents a no-op cast consuming resources; its cross-controller relocation predicate still needs explicit approval and is not a new confirmed rule. B is a different skill-validity outcome, not a change to family ignore, and needs literal AP/slot tests. C changes the producer only, never Bomb blast/King destruction rules. Cast allegiance is not automatic removal after control transfer. No setup Bomb, Detonation or refund is included by this approval.
- **READY condition:** exact profile signed plus Q-SCOPE (Dynamite subset)/SOURCE/REMOVAL and required technical gates; consumer remains disabled until separately implemented/verified.

## 9. Recommended sequence

**Earliest candidate: Holy Shield**, six profile decisions now approved but implementation not READY/enabled. Narrow constant-cost/player-originated normalization is implemented/proven at consumer seams in5B; authoritative target/actor/cost/permission producer belongs to separately authorized5C. **Next in requested priority: Sanctuary-generated Stun**, requiring region/reaction rules and adapter; **then Live Charge**, technically smaller than Sanctuary but still gated on its own profile. **Landmine remains deferred** behind entry/hidden-projection decisions.

Current next proposed path: six Holy Shield answers recorded and5B bounded proof implemented → separately authorize **02B-5C** minimal actor-authorized target planner, approved fixed4/N2/null-source producer, permission/eligibility tests and enablement gate. No ledger/incarnation dependency belongs to this approved profile. No automatic5C execution from these documents; other profiles need their own answers.
