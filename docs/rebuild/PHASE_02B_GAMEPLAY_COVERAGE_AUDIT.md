# Phase 02B gameplay coverage and next batch planning audit

2026-10-17 (Asia/Saigon). **PLANNING_READY.** This report completes the authorized planning audit. No gameplay, source, tests, fixtures, AP artifacts, dependency, script, CI or app changes are made. Every next implementation candidate below needs a separate owner instruction and its unresolved gameplay fields signed first. A recommendation is not approval.

## 1. Actual repository baseline and evidence

| Item | Observed result |
|---|---|
| HEAD | a84467cb9304ac6740d3b52af5fb73ae16ece060 |
| Local origin/main | a84467cb9304ac6740d3b52af5fb73ae16ece060 |
| Commit | feat(engine): add Shockwave and Sanctuary gameplay foundations |
| Parent | ee85b7121d6a97fb1c876baea95273d75d31c95b; B1 checkpoint |
| Committed tree | 113d2659afaf03debfe04205ca6f7c428f48649d |
| Combined B2+B3 content | 40 paths; 24 added / 16 modified; +4,926 / -33 lines |
| Start status/index | Clean working tree, no untracked files, empty index |
| End scope | Only this new report, unstaged; index stays empty |
| Accepted baseline | 960 tests / 46 files; six skill producers, zero enabled passives, zero full Variants |
| Runtime pins | Sanctuary explicitly engine0.7.0; base and five historical skill factories engine0.6.0; state1.1.0 |

The earlier checkpoint was staged at ee85b71. Actual history now contains the combined commit a84467c; its tree is exactly the tree reported at checkpoint preparation. This is an observed repository change since that handoff, not an assumption that this agent committed or pushed. Local origin/main matches HEAD; no fetch or remote server verification was performed, so this does not independently attest current remote-server state.

History inspected: a84467c (B2+B3), ee85b71 (B1 plus planning), 9261007 (Live Charge), de00b07 (earlier engine/Holy Shield checkpoint). No B2-only commit appears between the accepted B1 and combined checkpoint.

Authority/evidence read: [AGENTS](../../AGENTS.md), [CONTEXT](../../CONTEXT.md), [gameplay](GAMEPLAY_SPEC.md), [effects](EFFECT_SYSTEM_SPEC.md), [plugin contracts](VARIANT_PLUGIN_SPEC.md), [decision registry](OPEN_DECISIONS.md), all116 rows of [inventory](VARIANT_SKILL_INVENTORY.md) and [capability matrix](VARIANT_CAPABILITY_MATRIX.md), [readiness](PRODUCER_READINESS_MATRIX.md), [batch roadmap](PHASE_02B_BATCH_ROADMAP.md), [implementation plan](PHASE_02B_IMPLEMENTATION_PLAN.md), [B2 acceptance](PHASE_02B_B2_SHOCKWAVE_REPORT.md), [B3 acceptance](PHASE_02B_B3_SANCTUARY_REPORT.md), and relevant engine/network/3D/phase architecture. Source and existing test assertions were inspected directly; legacy catalogue values remain evidence of candidate designs only.

No fresh gameplay test, lint, typecheck, build or runtime smoke run is claimed in this planning task. Latest verified baseline is the accepted B3 report and the preceding combined-checkpoint verification (960/46, all required checks PASS). The current committed tree equals that verified checkpoint tree. Static inventory, links, scope, UTF-8/EOF, diff and status checks are recorded in section10.

## 2. Current public surface and actual producers

The [core entry point](../../packages/game-core/src/index.ts) exports setup/board/coordinate/movement/AP helpers, authoritative legal-main/capture-threat queries, resolveCommand, effect registry/runtime/source bindings, delayed foundation, snapshot/repetition/replay, radial reposition query and Sanctuary region queries. Internal committed-capture planning is deliberately not a general public callback API.

The [variant entry point](../../packages/game-variants/src/index.ts) exports exactly six factory functions plus their profiles and two cost artifacts. [Shared types](../../packages/shared-types/src/index.ts) export strict command/state/effect/region/event/replay schemas. [Testkit exports](../../packages/game-testkit/src/index.ts) are a transport command fixture and serializable clone, not gameplay setup, production producer registration or a client SDK. All four package manifests expose only the root entry under ESM/CJS/types conditions; internal source paths and developer acceptance runners are not package subpath exports. This is static export-map inspection, not a fresh built-package smoke run.

| Exact real skill / factory | Authorized scope and public execution | Pin / cost / lifetime |
|---|---|---|
| guardian.holy_shield / createHolyShieldExperimentalRuleset | Selected players only; one controlled ordinary-original piece, King allowed | engine0.6 / AP4 v1 / ShieldN2 source-end |
| dynamite.live_charge / createLiveChargeExperimentalRuleset | Selected players only; one controlled ordinary-original non-King; existing Bomb rejects producer cast | engine0.6 / AP3 v1 / permanent Charge |
| nephalem.judgment_chains / createJudgmentChainsExperimentalRuleset | Selected players only; one enemy-current-controller ordinary-original non-King, unrestricted range | engine0.6 / AP5 v1 / StunN3 source-end |
| angel.holy_seal / createHolySealExperimentalRuleset | Selected players only; same bounded target profile, independent exact Angel source | engine0.6 / AP6 v1 / StunN3 source-end |
| dragon_sentinel.shockwave / createShockwaveExperimentalRuleset | Selected players only; own ordinary non-King center, simultaneous radial adjacent-enemy push | engine0.6 / AP4 v1 / no persistent effect |
| guardian.sanctuary / createSanctuaryExperimentalRuleset | Selected players only; one public fixed clipped3x3 cell region/source, ordinary TriggerA | engine0.7 / AP5 v2 / regionN3 and independent StunN1 |

All profile/ruleset versions are1.0.0. Each factory selects White/Black independently within that single skill profile. No export composes different producers or Holy Shield plus Sanctuary. Six producers span five Variant identities (Guardian has two separate profiles); none is a complete playable Variant kit. No passive, Holy Aura, Divine Shield, Landmine or other sibling is implicitly enabled.

AP v1 retains Holy Shield4, Live Charge3, Chains5, Seal6, Shockwave4, diagnostic fingerprint2a56da8ff953d29b. AP v2 composes v1 plus Sanctuary5, fingerprint e268dfc077cf52ff, in the same [cost module](../../packages/game-variants/src/config/skill-costs.ts). Historical factories keep v1 and original identities. These fingerprints detect drift; they are not cryptographic trust/authentication.

## 3. Capability coverage matrix

P = implemented public reusable core; X = real execution only in explicitly selected experimental profiles; F = executable technical foundation with no authorized producer; M = missing or explicitly blocked. A row can be P+X or P+F because a reusable operation and permission to invoke gameplay are separate facts.

| Capability | Coverage and evidence | Meaningful tests / limits and next gaps |
|---|---|---|
| Basic movement/capture | P: createGame, generateBaseMoves, queryLegalMainActions, resolveCommand;15x15/60 pieces/controller-based capture and Pawn direction | movement/base-game/ap/integration tests cover geometry, Bishop lateral1, automatic Queen promotion, turn/King rules. No check/checkmate/castling/en-passant; no stationary/derived capture, portals, Ghost or control transition |
| AP economy/skill slots | P: capture/controller reward, owner loss reward, promotion+3, root debit once, one optional skill plus mandatory main | ap/death-ap/transaction and six acceptance runners cover AP0 funding, invalid rollback and skill order. No root AP-adjust operation, passive credit executor, debt, general modifier ledger or multicasting |
| Registry/lifecycle | P+F: immutable versioned definitions, payload validation, apply/ignore/replace/refresh/stack-instance, removal/expiry and eligibility bindings | effects/effect-runtime/effect-dispatch tests cover immutability, reset/extend and rollback. Schema declarations for event-count/progress, intensity, arbitrary removal reactions/declared visibility do not mean executable support |
| Stun | P consumer + X producers: main Move/Capture and occupied-target capture-threat restrictions; exact-source refresh | stun-foundation, stun-producers, Sanctuary and public acceptance tests. No universal skill ban, King immunity, Silence or generic movement blocker |
| Shield | P atomic defense + X Holy Shield | shield-foundation/holy-shield-source and integration tests: canceled capture has no debit/death/AP/Bomb/terminal. Destruction bypasses Shield; redirects/Fate/Phoenix/Aegis priority not approved |
| Bomb | P consumer + X Live Charge; Mine attachment F without Landmine producer | bomb-foundation/live-charge tests: one family/target, duplicate-ignore in runtime, real producer duplicate-reject, source-bearing FIFO death blast, protected King. Hidden cell mines and additional death causes missing |
| Exact source/matching | P for approved player/Variant/skill/null/null profiles; source key API and producer-N policy | holy-shield-source, stun-producers and effect-relocation tests preserve identity/deadline and independent sources. Non-null caster/incarnation canonicalization and arbitrary linked-source graphs remain gated |
| Delayed actions/FIFO | P+F scheduler/registry; synthetic-v1 executors only. Bomb and Sanctuary are separately reviewed concrete queue tickets | delayed-actions tests cover due order, exactly-once restore, tied-order semantics, cancellation, missing targets, terminal freeze and full rollback. No concrete Sailing/Supernova/channel executor; pending delayed records are frozen after terminal, not generally canceled |
| Atomic effect relocation | P+F derived effect_relocate/effect_sets_swap; no real Transference producer | effect-relocation tests cover unequal/empty sets, whole final assignment, groups/invalid refs, source/time preservation, rollback and replay. Two-piece player intent and Turtle-specific target/empty/King rules missing. This does not move board pieces |
| Forced piece reposition | P helper + X Shockwave-only cause/operation | forced-reposition and shockwave integration test all225 centers, occupancy, no-displacement rollback, AP0 acceptance, effects preserved. No general push chain, random movement, terrain entry, teleport or delayed capture |
| Public regions/deadlines | P queries + X Sanctuary-only record/namespace, fixed center, N3 source-end, replace per source | sanctuary-region/sanctuary tests cover clipping, recast, exact deadline/codec/public validation, source isolation. No generic arbitrary-region registration, aura membership executor, hidden region or terrain DSL |
| Ordinary committed capture reactions | X reviewed concrete TriggerA context: pre-death current controller/cell and actual committed event; living eligible attacker revalidated | sanctuary.integration tests cover attacker from outside, controller != owner, overlap-at-most-one, Shield cancel, Bomb exclusion, dead attacker skip and terminal. Not an unrestricted callback; attached-victim Electric and arbitrary derived capture need their own contract |
| Terminal cleanup | P for committed death/terminal effect cleanup; X engine0.7 Sanctuary/threefold region cleanup | bomb, transaction, Sanctuary integration/determinism tests. King capture stops queued reactions, no King destruction. Preserve historical0.6 behavior; no blanket claim all timers/opaque state are removed or all terminal input kinds are executable |
| Snapshot/repetition/replay | P immutable clone, strict compatible restore, full hash vs semantic key, exact committed replay | snapshot/repetition/replay and producer determinism tests cover meaningful negative pairs, ID renaming, independent continuation, faults and five retained JSON archives. No silent migration, gameplay Time rewind, role-safe snapshot projection or universal graph canonicalizer |
| Versioned AP artifacts | P immutable authored v1/v2; X factories bind exact retained table | skill-costs and sanctuary tests cover literal values, fingerprint failure, old archives. No mutable latest config/client override; further balancing needs retained artifact plus new ruleset identity |

Representative test/source links: [core tests](../../packages/game-core/tests), [variant tests](../../packages/game-variants/tests), [AP0 public runners](../../tests), [action legality](../../packages/game-core/src/action-legality.ts), [effect runtime guards](../../packages/game-core/src/effect-runtime.ts), [concrete capture](../../packages/game-core/src/committed-capture.ts). A passing test of a trusted composition verifies that scoped interaction, not public mixed-factory authorization.

## 4. Inventory reconciliation and discrepancies

All116 inventory keys are unique and match the capability matrix one-for-one:29 Variant records x (passive, skill1, skill2, ultimate).87 skills =81 across27 historical IDs plus6 deferred draft skills;29 passives =28 named plus the unnamed Colossus passive. Time ultimate remains one logical entry with two modes. Do not count an ultimate mode, a source, or an underlying operation as an additional skill.

| Scope | APPROVED | PARTIALLY_APPROVED | PROPOSED | UNKNOWN/deferred | Total |
|---|---:|---:|---:|---:|---:|
| Skills | 6 | 22 | 53 | 6 | 87 |
| Passives | 0 | 0 | 27 | 2 | 29 |
| All contracts | 6 | 22 | 80 | 8 | 116 |

All6 APPROVED profiles are implemented/enabled only as section2 describes. The other81 skills and29 passives are unimplemented/disabled. Partial means specific signed facts, not a usable complete contract; global P00 invariants do not promote every PROPOSED row. Joker/Colossus8 rows remain UNKNOWN and Q-20 deferred, with no invented runtime IDs. Preserve time_collapse's approved identifier and modes; it is not executable.

AppendixA reconciles every row, including passives, with one primary capability family, current reuse level and producer-specific unresolved fields. Families are shared dependencies, not31 additional missing mechanics or110 separate engineering projects. Secondary dependencies matter (e.g. a unit skill may also need cost and delayed behavior). Appendix assignments retain the established inventory family for traceability; they do not claim that one family alone completes a skill.

Verified documentation drift, recorded without editing owner contracts/history:

| Location / observed claim | Actual source/test evidence and interpretation |
|---|---|
| Capability matrix API table T and subsequent export/composition paragraphs say intent only piece-target/targetless and only two factories | Shared RootCommandSchema now also has strict cell-target-v1; variant index exports six factories. Historical engine0.6 still rejects cell intent. Current B2/B3 overlays are correct; underlying baseline paragraphs lag |
| Capability matrix FORCE/REGION and accepted rows retain classC labels | Those labels describe originally new mechanics, not present-day missing status. Shockwave/Sanctuary are live bounded implementations; do not read historical classC as NOT_IMPLEMENTED |
| Old family BIND text says no forced-move operation | B2 now provides Shockwave-only forced_reposition. No Bind-compatible arbitrary forced-motion contract follows from it |
| Historical implementation-plan sections still say all other producers/Sanctuary/Live Charge disabled, and “current work order” names02B-6 | Newer B1/B2/B3 overlays and final reports supersede those milestone snapshots. No reason to reopen signed B1/B2/B3 decisions |
| Plugin coverage shows legacy Shockwave3, Holy Shield4/2 and older target/cost descriptions | The table explicitly labels its numbers LEGACY. Authoritative Shockwave cost4 and fixed Holy Shield4 are correct in central artifacts and owner registry; no balance correction is authorized |
| Acceptance reports/overlays await a later combined checkpoint and report ee85b71/empty index | Correct at those report dates. Actual combined checkpoint is now committed at a84467c; section1 supplies the present fact without rewriting evidence |

No observed mismatch requires changing gameplay approvals, AP artifacts, source or tests. Historical text is retained and its current applicability clarified here. This report grants no extra status, IDs or defaults.

## 5. Dependency graph and reuse priorities

Edges mean technical reuse potential after signed semantics, not phase authorization or an already implemented generic framework.

~~~mermaid
flowchart TD
  BASE["Base root, AP, queries, snapshots, replay"] --> EFFECT["Effect registry, source clocks, runtime"]
  EFFECT --> SWAP["Existing atomic effect-set transport"]
  SWAP --> TRANSFER["Candidate: Transference + two-piece intent"]
  EFFECT --> SILENCE["Candidate: skill execution restriction + tier metadata"]
  EFFECT --> COUNT["Candidate: reviewed countdown/progress executor"]
  COUNT --> CURSES["Berserk Curse / Soul Break; later Wrath Curse"]
  BASE --> CAPTURE["Bounded committed contexts: Bomb and Sanctuary"]
  CAPTURE --> ATTACHED["Candidate: attached-victim capture reaction"]
  ATTACHED --> SCALE["Dragon's Scale; later Devil's Eye"]
  BASE --> APDELTA["Future source-scoped AP reward / quote contract"]
  APDELTA --> PASSIVES["Reward passives, Gaze, Bet; later counters"]
  BASE --> FORCE["Shockwave-only forced reposition"]
  BASE --> REGION["Sanctuary-only public region / cell intent"]
  FORCE --> ENTRY["Future concrete entry cause/consume policy"]
  REGION --> ENTRY
  ENTRY --> HIDDEN["Hidden objects + role-safe projection"]
  HIDDEN --> TRAPS["Candidate later: Landmine / Thunder Trap"]
  BASE --> UNITS["Future units, graveyard, control, profiles, rewind"]
  UNITS --> COMPLEX["Later summon / exile / Time / Space groups"]
~~~

Existing atomic effect transport is ready for a bounded producer once target rules are signed. Countdown and skill restrictions each unlock several abilities without hidden-state/network dependencies. Concrete capture transport can inform attached reactions but cannot be reused by pretending Sanctuary's region context already includes retired Electric attachments. Root AP delta/event credit is a separate high-reuse gap (16 primary AP rows); normal capture/loss helpers do not fill it.

Public Sanctuary geometry and Shockwave positions are useful building blocks for later entry tests. They do not resolve path traversal, trap consumption, hidden views, unit lifecycles or unrelated region shapes.

## 6. Ranked candidate next batches

Planning labels C1…C5 below are not assigned milestone numbers or owner decision IDs. Exact runtime IDs remain UNKNOWN/unassigned until a signed producer profile needs engineering pins. Sizes are rough engineering estimates including meaningful TDD, compatibility review and acceptance, excluding owner response time; they are not delivery commitments. Do not bundle all five.

### C1 — Turtle Transference-only: recommended immediate owner gate

- Exact candidate: V14.S1 Transference; no Aegis Blessing, Great Sanctuary or Turtle passive.
- Approval: PARTIALLY_APPROVED P00-03 confirms whole-set/source/identity/deadline preservation and atomic rejection. D-10 still open for targets, King, allegiance, empty-set behavior, cost, source/removal and scope. Legacy AP4 is not approved.
- Reuse: effect_sets_swap final-assignment transport, runtime eligibility, strict root plans/AP/slots, source projection, snapshot/replay. No new effect mechanic is needed for reviewed unlinked attachments.
- Required extension: strict versioned two-piece intent and bounded authorized producer/profile. A real production composition that can obtain transferable attachments must be explicitly approved; tests may use labeled trusted attachment setup, but cannot claim this is a full playable Turtle kit. No auto-registration of other producers or weakened exact-source guard.
- Decisions: approve two distinct live targets/allegiances/King/provenance/range; both-empty versus one-empty outcome; fixed cost/normal usage; which exact existing attachment definitions and unsupported link/control/Aegis outcomes; exact null-caster source and any producer lifecycle constraints. Preserve P00-03 and existing destination eligibility, including non-King restrictions.
- Interactions: medium; per-effect final eligibility, Bomb family uniqueness, Stun/Shield source clocks, invalid whole-set rollback. Regions never transfer.
- Replay risk: low-to-medium; new intent/profile pin review required, old0.6 archives and command boundary retained; do not silently widen historical rulesets.
- Size/reuse: S–M, approximately2–4 engineering days; directly serves Turtle and reuses transport needed to test many future attachment definitions, not physical position swaps.
- Why next: largest gap between a well-tested reusable operation and absent public intent/producer, without another root reaction branch. Conditional on explicit scope and a credible acceptance path; defer rather than invent a mixed factory.

### C2 — Nephalem Berserk Curse + Requiem Soul Break, shared countdown foundation

- Exact candidates: V05.S2 Berserk Curse and V07.S1 Soul Break, separate experimental profiles. Devil V16.S2 Wrath Curse is downstream, not automatically included.
- Approval: both PROPOSED; no complete countdown/source/removal/King/cost approval. Existing Chains approval covers no sibling.
- Reuse: Stun consumer/source/N, immutable effect records, source boundaries, FIFO, AP/slots, technical delayed registry, codec/repetition.
- Required new capability: one concrete reviewed countdown/window record with exact event/reset/cancel/expiry rules and Stun emission. Existing progress lifetime rejects; synthetic delayed executor must not masquerade as gameplay.
- Decisions: capture countdown purpose and actor recognition; source boundary/no cast tick; first/any capture and terminal/cancel behavior; expire-to-Stun versus cleanse behavior; same-source recast/cross-source policy; targets/King, exact costs, N/countdown and generated StunN. Legacy countdown4/2, AP4, Stun3 are proposals.
- Interactions: medium-high; captured bearer cleanup, region-generated Stun, source independent clocks, relocation, exactly-once firing and late rollback.
- Replay risk: medium-high; persisted executable countdown meaning and new event/definition pins require explicit runtime/schema review and old archive tests.
- Size/reuse: M–L, approximately4–7 days; three curse skills across Nephalem/Requiem/Devil, with later separately reviewed countdown reuse for Prediction/Judgment/channel. Those later windows are not identical.
- Why second: stronger new foundation reuse than another direct Stun producer; more unresolved gameplay and serialization work than C1. Start with one vertical consumer, add the second only if its signed contract uses the same mechanism.

### C3 — Nephalem Divine Silence + Lord Iron Authority, bounded skill restriction

- Exact candidates: V05.U Divine Silence and V26.U Iron Authority, separate profiles; no passives or full Variant.
- Approval: both PROPOSED. Stun does not approve skill disablement; tier1/2 versus all-skills remains unsigned.
- Reuse: timed effects on player targets, source matching, immutable root planner, AP/slots, restore/repetition and query policy seams.
- Required new capability: authoritative skill-execution/availability restriction shared by preview and submit, with versioned skill tier metadata only where required. Current SkillDefinition has requiredProfile/plan or a trusted static plan, no tier or public availability catalogue.
- Decisions: blocked tiers/ultimates/target player; coexistence/refresh arbitration between differing block policies; exact AP/N/source/removal and recast/no-op policy; whether skill failure permits main action unchanged. No accidental global Stun skill ban.
- Interactions: medium; AP/slot validation before debit, one skill slot, own/other source expiry, player-target relocation policy. No capture-priority rewrite.
- Replay risk: medium; historical skill execution and tier absence must retain old behavior; new definition/profile/hash and runtime boundary reviewed explicitly.
- Size/reuse: M, approximately3–5 days; two direct skills, later source-scoped exceptions for Terrain/other restrictions only after separate approval.
- Why third: useful distinct consumer with limited spatial complexity; lower downstream breadth than countdown and needs an honest query/availability contract.

### C4 — Thunder Dragon Dragon's Scale-only, reviewed attached capture reaction

- Exact first candidate: V13.S1 Dragon's Scale. V16.S1 Devil's Eye is a downstream candidate after its threat/all-attacker semantics are signed; it is not assumed identical.
- Approval: Scale and Eye PROPOSED. Electric versus Electron alias and duration1/2 conflict unresolved under D-12; no fully approved producer/reaction.
- Reuse: committed ordinary-capture identity/controller/cell from B3, Bomb's reviewed retired attachment snapshot pattern, Stun runtime, FIFO/terminal/Shield-cancel guards.
- Required new capability: bounded immutable attached-victim reaction context/consumer with its own exact registration. Sanctuary context snapshots eligible regions, not arbitrary retired attachments; Bomb transport is private to Bomb and cannot become an unrestricted callback. Eye may additionally require D-08 threat observer semantics.
- Decisions: duration/category/target/King/source/stacking/removal; ordinary capture only or other reasons; attacker eligibility and StunN; attachment consume/expiry; reaction ordering versus Bomb and terminal, including attacker death before apply. No new priority may be inferred.
- Interactions: high; Shield/Bomb/King and cross-source effects, current controller versus owner, relocation preserving original source, cause/event dedup.
- Replay risk: medium-high; new concrete cause/definition/execution pins and exact old streams retained.
- Size/reuse: M–L, approximately4–7 days for Scale; Eye requires separate estimation if its trigger differs. Capture-retaliation context informs other reactive abilities, but Bind/Aegis/Turtle passive remain separate.
- Why fourth: valuable reuse of B3 lessons, but adds reaction ordering surface before broader priority decisions are closed.

### C5 — Later hidden-entry batch: Dynamite Landmine + Lightning Thunder Trap

- Exact candidates: V02.S2 Landmine (prior proposed dynamite.landmine is not an enabled pin) and V01.S1 Thunder Trap (runtime ID UNKNOWN).
- Approval: both PROPOSED. Approved attached Bomb mine semantics are not hidden cell placement/consume rules; Stun consumer is not a trap.
- Reuse: cell-target schema, board cells, Bomb mine attachment, Stun, source clocks, deterministic root and Shockwave cause facts as test inputs.
- Required new capability: per-source hidden cell object and concrete entry taxonomy/consume/reveal dispatch plus role-safe state/event/error/target projection. Portal/rewind/swap/standstill causes are not currently equivalent.
- Decisions: D-12 and D-25 exact entry causes, placement/range/occupation, King/Aegis/no-effect consume, reveal/removal/recast, source/reward, AP/lifetimes, forced-entry failure policy. Decide whether a bounded public-only precursor is desired; do not silently change hidden skill intent to simplify it.
- Interactions: very high; entry/capture/destruction/Bomb ordering, immunity, opponent hints, mirror isolation, leakage and source credit.
- Replay risk: high; new persisted hidden objects/entry semantics and projected contracts. Full internal replay and live views must stay distinct.
- Size/reuse: L–XL, approximately8–15+ days plus separately authorized projection work; entry mechanism potentially serves Landmine, Thunder Trap, Fang trap, Puppet Strings, Wind Reversal/Illusory Wind and Shadow Prowl, with individual payload policies.
- Why defer: broad reuse but highest approval/cross-layer risk. D-25/projector scope belongs to a separate authorization; public Sanctuary is insufficient evidence to start hidden mechanics or Phase03.

Recommendation: ask for C1's exact bounded profile first; C2 is the best next new reusable gameplay foundation if the owner prefers mechanics breadth over exposing an existing operation. C3 is a smaller alternative. C4 and C5 need more interaction decisions. Royal Guard/Divine Shield can reuse Shield after their own approvals, but adding them alone offers less new capability. No implementation starts in this audit.

## 7. Architecture health: observations versus future risks

| Observation with source evidence | Assessment / bounded implication |
|---|---|
| Root now contains Sanctuary cast/expire/reaction, forced reposition, Bomb reaction, effect/delayed branches in one approximately900-line resolveCommand module: transaction.ts lines83–105,237–285,350–520,790–845 | Observed concentration and special-case growth, not proof of a gameplay defect. Keep the authoritative transaction owner; if another similar concrete consumer is authorized, review a small typed internal seam before adding another bespoke branch. No general handler DSL or refactor now |
| Core/shared schemas contain explicit guardian.sanctuary identities, regionN3 validation and StunN1 production: sanctuary-region.ts lines21–60, committed-capture.ts lines50–77; state.ts lines95–104 | Observed deliberate bounded coupling. Dependency direction remains core -> shared-types, variants -> core; core does not import game-variants. Reuse currently means adapting a reviewed pattern, not arbitrary registration. A second region/reaction is an architectural review trigger |
| Producer and root both check profile/source/targets; forced-reposition apply recomputes full assignment, Sanctuary root preflights intent/namespace | Observed duplicated authority checks are intentional defense against forged trusted plans. Do not remove them as cosmetic duplication. Future divergence is a maintenance risk; independent negative tests should stay literal |
| Bomb death tickets enqueue before Sanctuary tickets; Bomb expansion appends destroy operations behind already queued work: transaction.ts lines790–824 and Sanctuary integration tests223–294 | Explicit tested micro-order, not a general priority matrix. Stun can apply before subsequently expanded blast death cleanup; already queued destruction may retire attacker first. Further retaliations require signed ordering; “all post-capture reactions” is not one interchangeable hook |
| Effect source/eligibility/removal and namespace semantics are checked at root/codec/final assignment; querySanctuaryRegions returns empty for historical0.6 | Good fail-closed boundaries. Opaque per-player JSON plus engine-specific interpretation increases version review burden; adding a top-level schema version alone would not solve replay meaning. Preserve historical opaque namespace test |
| engine0.7 threefold terminal cleanup is explicit, while old0.6 streams are retained: transaction.ts lines858–879 | Observed compatibility split, intentionally accepted. Do not generalize newest cleanup behavior into old factories. Future rollout needs a retained-runtime dispatcher/retention policy; this repo does not implement hosting that archive service |
| effect-runtime.ts lines219–284 rejects unsupported progress, declared policies and removal reactions; synthetic trigger/delay modes remain bounded | Good separation of declaration from execution. A future producer cannot be authorized by merely having a schema enum; each concrete capability needs validation/replay tests |
| SkillDefinition lacks tiers/display/target catalogue and TransactionResult.code is string; catch returns Error.message: transaction.ts lines145–157,895–897 | Observed API gaps for UI and network errors, not evidence of a current remote exploit. Need a stable coarse client error mapping before external exposure; raw invariant messages/full contexts should remain internal |
| Repetition is composed across effect/delayed/variant projections; Sanctuary introduces an engine-gated reserved namespace | Existing semantic/negative/ID-renaming tests are valuable. Universal source graph and arbitrary state projections are not proven. Require cross-module meaningful-difference tests for each new mechanic |
| Existing negative tests cover forged operation/source/duration, profiles, malformed schemas, queue budgets and late failures | No observed missing mandatory B2/B3 acceptance case from inspection. Missing acceptance concerns are future capabilities: hidden-view leaks, concrete countdown/tier restrictions, public mixed producer composition, system terminal commands and client receipts, not proof that960 tests cover them |

No runtime architectural defect was reproduced in this planning-only task. Document drift and the absent presentation/transport APIs are verified findings; future scalability, priority proliferation and schema sprawl are risks, not current failures. No refactor, test change or generalized new interface is made.

## 8. Small local playable 3D slice readiness

**READY_WITH_CONDITIONS for a separately authorized bounded local slice.** The deterministic gameplay core can support normal play plus one selected existing experimental profile (including mirrors). The current app is a starter shell, not an already playable3D or multiplayer product. All87 skills are not prerequisites.

| Area | Actual readiness / condition |
|---|---|
| Authoritative actions | Ready core seam: queryLegalMainActions + resolveCommand share restrictions/defense. queryCaptureThreats is enemy-occupied capture geometry, not an empty-square attack map. Never render it as an arbitrary attacked-cell map |
| State and public projection | Full internal GameState is available; role-safe MatchView projector is missing. Even with all currently enabled effects public, do not expose raw RNG/seed/history/full hashes/internal errors. A bounded local host-to-presentation DTO needs explicit scope |
| Render data |225 cells, stable piece IDs, currentType, owner/controller/originalSide and positions support six ordinary placeholders. Region queries and public effects provide status data. No special units/incarnations/assets/scene picking currently implemented |
| Variant selection | Exact frozen profiles exist, but no general display/skill/tier/target catalogue. Choose one approved factory and permitted White/Black flags. Guardian-vs-Dynamite or Holy Shield+Sanctuary needs a separately approved composition; do not label a one-skill profile full Guardian |
| Skill targeting | piece-target-v1, cell-target-v1 and targetless schema exist; trusted planners enforce legality. No public generic skill-target preview/quote API. A bounded adapter can expose only signed target forms after its own review; no UI copy of gameplay validation |
| State updates/replay | Frozen deterministic root results, typed causal facts and snapshot/replay work. Presentation must apply logical state immediately and animate independently; cancellation/resync/seek tests still need implementation |
| Error/authority boundary | Player/system separation is trusted input, not authenticated networking. destroy is system-only. UI must submit intents to the approved local authority adapter, map coarse errors and never supply source/AP/operations or arbitrary rulesets |
| Later multiplayer | Preserve planned seat binding, serial revision/idempotency, role views, clocks, persistence and reconnect boundary. None is provided by the current health/starter apps or testkit transport fixture. Local demonstration does not prove multiplayer readiness |

Blocking conditions before starting that slice: explicit owner selection of scope/profile and local authority placement (D-20); approved minimal safe view/event/error and skill-metadata adapter; dependency-boundary review if considering a local core predictor; presentation acceptance for picking/coordinates/main+skill+End/AP/status/region/death/replay, animation cancellation and basic accessibility/performance. D-27/D-28 cover placeholder/final asset and reference-device choices. These are separate authorizations, not tasks silently started here.

[Engine architecture](ENGINE_ARCHITECTURE.md) currently keeps the frontend on shared-types and raw full core state inside authority. A local presentation proposal must respect that or obtain an explicit bounded exception with leak review. It does not need real auth, a datastore or multiplayer clocks merely to assess a local hotseat prototype; those remain mandatory for the later multiplayer product under [network architecture](NETWORK_ARCHITECTURE.md). [3D architecture](FRONTEND_3D_ARCHITECTURE.md) and [phase roadmap](IMPLEMENTATION_ROADMAP.md) are design/gate evidence, not proof these adapters or scene exist.

## 9. Explicit owner gates

- Next gameplay: choose one bounded candidate and sign its exact unresolved profile fields under existing D-* parents; then separately authorize implementation/TDD/acceptance. No new decision ID is marked approved in this report.
- Preserve existing B1, B2-01…08/ZERO_DISPLACEMENT and B3-01…12; no reopening cost, TriggerA, source, King, N3/N1 or approved rollback semantics.
- Multi-producer ruleset, two-skill Guardian, passive, hidden state, new priority pair, non-null caster/source graph, control/unit/rewind/portal and additional concrete delayed behavior each need their own applicable gate.
- The local slice requires its own presentation/authority scope instruction. This planning result is not Phase03, frontend/backend/3D implementation or deployment authorization.
- Combined B2+B3 is already the committed baseline; do not prepare a B2-only checkpoint. This audit leaves its report unstaged and stops.

## 10. Verification and exact changed files

Only new file: docs/rebuild/PHASE_02B_GAMEPLAY_COVERAGE_AUDIT.md. Existing planning/approval documents are unchanged; discrepancies are scoped in section4 rather than silently changing owner history.

Planning verification performed: actual HEAD/origin/main/history/tree and status/index inspected; all116 inventory rows parsed and unique-key matched to116 capability rows; totals and status partitions independently counted; six real source-exported factories and two AP artifacts checked; every unimplemented row mapped below. A local-link check across14 documents (root instructions/glossary, the11 required rebuild documents and this report) resolved360 local links, including56 anchor references, with zero errors. All28 local links in this report resolve. Strict UTF-8, single final newline, trailing whitespace and both tracked/untracked scope checks passed; git diff --check passed. Final Git state is one untracked report, no tracked modifications and no staged paths.

No fresh runtime/test execution is claimed. Historical baseline960/46 and its full PASS checks are cited in section1. Remaining conditions concern implementation authorization and future slice readiness, not incomplete work required to deliver this planning report. No commit/push/staging or automatic next batch.

## Appendix A — all116 contract rows reconciled

Status codes preserve the inventory exactly: A=APPROVED, P=PARTIALLY_APPROVED, R=PROPOSED, U=UNKNOWN/deferred. A applies only to the signed bounded profile, not its Variant.

Reuse column: LIVE=real authorized producer; YES=existing core operations can support the candidate after its own complete signed profile/planner/registration (no new reusable mechanic); PARTIAL=current foundation exists but the named family needs a bounded new contract/consumer or additional mechanics; DEFERRED=no bounded draft contract. YES does not mean approved or enabled. Every non-LIVE row also inherits Q-BASE/Q-SOURCE/Q-REMOVE in the readiness ledger for unspecified fields. Exact names below are catalogue display names, not synthesized runtime IDs.

Primary family meanings, shared once across rows:

| Family | Current reusable base / primary missing piece |
|---|---|
| AP | Base AP settlement and committed facts; missing source-scoped root reward/delta/event credit (debt additionally needs schema/quote change) |
| HIDDEN | Cell intent and effect consumers; missing hidden object, entry/consume/reveal and safe projection |
| CLOCK | Logical turns exist; missing signed clock exception/trusted clock input and global lock |
| REMOVE | Cleanup/reasons exist; missing producer-authorized selection/permissions and conditional cleanse/Shield behavior |
| BOMB | Existing Live Charge/Bomb runtime; no missing piece within approved profile |
| CONTROL | Piece controller field/queries exist; missing typed control/conversion/arbitration/restoration |
| UNIT | Occupancy/death/delay seams; missing approved special unit, graveyard/incarnation/spawn/revive/exile/lifespan as applicable |
| PAIR | Reference validation and effect transport; missing concrete linked positions/return/death behavior |
| TRANSFORM | Current/base type fields exist; missing actual profile/type transition and restore/value/promotion ledger |
| FORCE | Shockwave radial operation exists; missing other motion/collision/entry/forced-step contracts for remaining rows |
| STUN | Existing consumer/source/producer-N; no missing piece within approved profiles |
| PROGRESS | Boundaries/namespace/delay foundation; missing concrete progress/countdown/window executor and reason policy |
| SILENCE | Player effects/root plans; missing shared skill-availability/submit restriction and optional tier metadata |
| LEDGER | Committed death facts/history exist; missing authoritative eligible/consumable graveyard ledger |
| SHIELD | Existing capture-only consumer; Royal Guard needs signed profile/registration, no new Shield mechanic |
| REGION | Sanctuary region only; other rows need their own region/path/terrain/channel/area-operation semantics, not another copy of Sanctuary |
| MULTI | Root accepts multiple effect applications; signed set planner/definition source authorization needed, no universal multi-Variant factory |
| LAW | Geometry and legality policy seams; missing approved capture-law state/derived-cause/threat semantics |
| REACTION | Bounded capture/death contexts and source clocks; missing exact attached/boundary/move observation and concrete binding for each candidate |
| ATTACK | Normal root capture exists; missing stationary/derived capture commit/defense/source/entry contract |
| DEFENSE | Isolated Shield exists; missing approved Aegis/category interception or redirect/priority semantics |
| SWAP | Atomic attachment set-swap exists; missing strict two-piece player intent and signed producer target contract |
| SACRIFICE | Destruction/AP seams exist; missing explicit sacrifice reason/reward/toll and repeat-action accounting |
| GHOST | Base geometry exists; missing approved effect-aware path integration and Ghost semantics |
| BIND | Query restriction hooks exist; missing destination/window/threat consumer and cost counter where applicable |
| COST | Fixed quote/root debit exists; missing authoritative dynamic counter/quote state and any unit-count dependency |
| REWIND | Technical history/snapshot exists; missing approved living-position gameplay restore/collision and Freeze branch |
| PORTAL | Coordinates/links exist; missing traversal/replacement/exit occupancy/wait lifecycle |
| SLOT | Normal one-skill turn exists; missing signed distinct multi-slot/order/End policy |
| DESTROY | Existing authoritative destroy operation/AP/Bomb handling; signed Vanguard selector/source/producer still needed |
| DRAFT | Only generic seams; complete draft semantics and Q-20 scope remain deferred |

| Row / exact display name | Status | Primary family | Existing foundations sufficient? | Specific missing rule / contract (plus common unsigned fields) |
|---|---|---|---|---|
| V01.P — Lightning Speed | R | AP | PARTIAL | Trap reward/consume on blocked Stun, source and allowed entry causes |
| V01.S1 — Thunder Trap | R | HIDDEN | PARTIAL | Trap entry/consume/reveal/King/reward |
| V01.S2 — Electric Terrain | R | CLOCK | PARTIAL | Clock exception/debit, global skill lock, arbitration |
| V01.U — Raigeki | P | REMOVE | PARTIAL | Allegiance/targets/cost and authorized King Stun removal |
| V02.P — Explosives | R | AP | PARTIAL | Refund/setup selection, source-only reward and no-op cost |
| V02.S1 — Live Charge | A | BOMB | LIVE | None within accepted bounded profile; see section2; siblings remain disabled |
| V02.S2 — Landmine | R | HIDDEN | PARTIAL | Placement/entry/reveal/consume/King/immunity/source |
| V02.U — Detonation | R | AP | PARTIAL | Any-family selection/no-useful-target rejection; refund approval/AP operation |
| V03.P — Zombie Infection | R | CONTROL | PARTIAL | Bite target/King, action replacement, control arbitration |
| V03.S1 — Infection | P | CONTROL | PARTIAL | Targets/King/cap, later cost, Zombie/Walker mechanics |
| V03.S2 — Mutation | R | CONTROL | PARTIAL | Which controller/owner eligible, cap and conversion |
| V03.U — Outbreak | R | UNIT | PARTIAL | Records consumed, incarnation/King/occupancy/lifespan |
| V04.P — Grand Illusions | R | PAIR | PARTIAL | Committed reason, defense priority, bonus and pair cleanup |
| V04.S1 — Now You See Me | P | PAIR | PARTIAL | Targets/return collision/recast/cleanup/position operations |
| V04.S2 — Misdirection | P | TRANSFORM | PARTIAL | Moveset vs real type, AP/promotion/restore layers |
| V04.U — Carnival of Fools | P | FORCE | PARTIAL | Cardinality/forced steps/cause, blocks and expiry |
| V05.P — Fallen Grace | R | AP | PARTIAL | Eligible committed death reasons/types and counter |
| V05.S1 — Judgment Chains | A | STUN | LIVE | None within accepted bounded profile; see section2; siblings remain disabled |
| V05.S2 — Berserk Curse | R | PROGRESS | PARTIAL | Countdown anchor/capture response/King/cleanse outcome |
| V05.U — Divine Silence | R | SILENCE | PARTIAL | Tier/block-all, matching/removal/source/cost/duration |
| V06.P — Holy Aura | R | LEDGER | PARTIAL | Graveyard threshold/permanent unlock; excluded from current producer |
| V06.S1 — Holy Shield | A | SHIELD | LIVE | None within accepted bounded profile; see section2; siblings remain disabled |
| V06.S2 — Sanctuary | A | REGION | LIVE | None within accepted bounded profile; see section2; siblings remain disabled |
| V06.U — Divine Shield | R | MULTI | YES | Exact set/provenance/King/cost/N/source/removal; no full Guardian |
| V07.P — Soul Harvest | R | AP | PARTIAL | Eligible victim/cause/source and reward operation |
| V07.S1 — Soul Break | R | PROGRESS | PARTIAL | Countdown/attacker recognition/removal/payload/source |
| V07.S2 — Thread of Fate | R | PAIR | PARTIAL | Target/King, capture/destruction/sacrifice reasons and death links |
| V07.U — Reaper's Decree | R | PAIR | PARTIAL | Pair topology/eligible death causes/priority/cleanup |
| V08.P — Royal Decree (Law Territory alias) | R | LAW | PARTIAL | Region/rank table/controller/derived capture/threat scope |
| V08.S1 — Order of Hierarchy | R | LAW | PARTIAL | Law replacement/timing/rank and complete capture validator coverage |
| V08.S2 — Decree of the Weak | R | LAW | PARTIAL | Mutual law arbitration/timing and query agreement |
| V08.U — Absolute Domain | R | REGION | PARTIAL | Snapshot/live membership, jumps/new units/empty groups |
| V09.P — Blessing of the Wind God | R | AP | PARTIAL | Batch counters, refund triggers/cleanse and mirror scope |
| V09.S1 — Wind Reversal | R | HIDDEN | PARTIAL | Entry causes, return collision/committed capture, immunity/consume |
| V09.S2 — Illusory Wind | R | HIDDEN | PARTIAL | Hidden batch, release origin/links and blocked application |
| V09.U — Eye of the Divine Storm | P | REGION | PARTIAL | Cast tick/exposure membership/destruction/sigil reset |
| V10.P — Hunter's Instinct | R | AP | PARTIAL | Current/original type, committed capture and credit |
| V10.S1 — Evolution Spore | R | TRANSFORM | PARTIAL | Progress/recast/promotion/capture/real type |
| V10.S2 — Shadow Prowl | P | HIDDEN | PARTIAL | Authoritative Pawn threat/entry/King/hidden isolation |
| V10.U — Apex Camouflage | R | HIDDEN | PARTIAL | Visibility/reveal adjacency/capture/skill/reset refs |
| V11.P — Rebirth | R | UNIT | PARTIAL | Terminal exception, reset occupancy/source/lifecycle; no approval |
| V11.S1 — Ashes of Reanimation | R | UNIT | PARTIAL | Records/incarnations/type cost/lifespan/reward/placement |
| V11.S2 — Solar Flare | R | REGION | PARTIAL | Threat oracle, King/targets/terrain path/visibility |
| V11.U — Supernova | P | REGION | PARTIAL | Warning/cancel/due clock/approved concrete executor/King |
| V12.P — Dragon Counter | R | AP | PARTIAL | Threshold counter/reward causes/source/quote events |
| V12.S1 — Verdant Shelter | R | AP | PARTIAL | Capture reward rounding; destruction stays owner-loss-only per Q14 |
| V12.S2 — Dragon's Gaze | P | AP | PARTIAL | Move/capture actor, deadline/cleanse/no-move/King/AP floor |
| V12.U — Emerald Domain / Dragon's Wrath | P | PROGRESS | PARTIAL | Two modes/target set/counter/tax/transfer/rows/N |
| V13.P — Static Charge | R | AP | PARTIAL | Unique bearer count/allegiance/King/source credit |
| V13.S1 — Dragon's Scale | R | REACTION | PARTIAL | Duration conflict, eligible committed capture attacker, concrete binding |
| V13.S2 — Thunder Fang | P | ATTACK | PARTIAL | Root/derived attack mode and trap payload/entry/source |
| V13.U — Dragon's Wrath | P | REGION | PARTIAL | Direction/targets/pre-cast Stun snapshot/N/King/ordering |
| V14.P — Turtle's Retaliation | R | DEFENSE | PARTIAL | Aegis approval/actual attacker/Bind/King/priority |
| V14.S1 — Transference | P | SWAP | PARTIAL | Two-piece intent, target/King/Aegis/empty-set rules D10 |
| V14.S2 — Aegis Blessing | R | DEFENSE | PARTIAL | Debuff-only vs targeting/relocation block, matching/priority |
| V14.U — Great Sanctuary | P | DEFENSE | PARTIAL | Set/Pawn exclusion/provenance/priority plus Aegis contract; confirmed King exclusion preserved |
| V15.P — Heavenly Grace | R | AP | PARTIAL | Eligible death reasons/types/current owner vs controller |
| V15.S1 — Holy Seal | A | STUN | LIVE | None within accepted bounded profile; see section2; siblings remain disabled |
| V15.S2 — Blessing | R | REMOVE | PARTIAL | Removable categories/permissions, branch rules/ShieldN1 |
| V15.U — Divine Judgment | R | PROGRESS | PARTIAL | Capture actor/mark categories/countdown/cleanup/reaction |
| V16.P — Infernal Pact | R | AP | PARTIAL | Cast/initial boundary/reward identity |
| V16.S1 — Devil's Eye | R | REACTION | PARTIAL | Threat scope/all attackers/trigger timing/uniqueness/N |
| V16.S2 — Wrath Curse | R | PROGRESS | PARTIAL | Capture deadline/remove/King/source dependencies |
| V16.U — Hellish Toll | P | SACRIFICE | PARTIAL | Sacrifice operation/rewards/turn exceptions/fees/window |
| V17.P — Ghost Inheritance | R | GHOST | PARTIAL | Committed/intercept reason/tie/targets/caster lineage/stealth |
| V17.S1 — Haunt | P | GHOST | PARTIAL | Ghost path and non-King Haunt restriction preserved; other target/N/free-use fields unsigned |
| V17.S2 — Possession | R | TRANSFORM | PARTIAL | Current-turn window/type borrow/capture actor/reversion |
| V17.U — Spirit Walk | R | HIDDEN | PARTIAL | Free counter/reveal/source refs/expiry/refresh payload |
| V18.P — Cannibal King | R | TRANSFORM | PARTIAL | Royal identity/profile ledger/ally reward/mirror state |
| V18.S1 — Royal Guard | R | SHIELD | YES | Exact King/ordinary allegiance/source/cost/N/removal/profile unsigned |
| V18.S2 — Devour | R | TRANSFORM | PARTIAL | Profile layering/Stun donor/expiry/real type/AP value |
| V18.U — Apex Predator | R | TRANSFORM | PARTIAL | Profile/capture counter/ally capture/restore/Shield source |
| V19.P — Arcane Mastery | R | PROGRESS | PARTIAL | Threat/reward committed death/counter/price AP operation |
| V19.S1 — Arcane Swap | R | PAIR | PARTIAL | Cost/source/group return/recast/King/priority |
| V19.S2 — Arcane Bind | R | BIND | PARTIAL | Bind movement/threat/cost/matching/removal unsigned |
| V19.U — Arcane Annihilation | R | PROGRESS | PARTIAL | Threshold/cost/pre-death credit vs committed, King exclusion |
| V20.P — Ground Dominion | R | COST | PARTIAL | Authoritative quote/revision/time and unit count requires Mountain |
| V20.S1 — Raise the Mountain | R | UNIT | PARTIAL | Unit footprint/moves/capture/rewards/lifespan |
| V20.S2 — Shifting Peaks | R | FORCE | PARTIAL | Unit motion/multi-push/final occupancy/King/entry |
| V20.U — Earth-Burst Heavenly Star | P | UNIT | PARTIAL | Exile/return/incarnation/collision/timer/removal/reward |
| V21.P — Temporal Burden | R | COST | PARTIAL | Counter progression/no-useful-history cost and isolation |
| V21.S1 — Rewind | P | REWIND | PARTIAL | Lookback/insufficient history/trigger causes/retention |
| V21.S2 — Future Prediction | R | REACTION | PARTIAL | Two-field intent, first move/standstill/guess/removal/source |
| V21.U — Time Collapse — Grand Rewind / Time Freeze | P | REWIND | PARTIAL | Mode command/history/Freeze event timing/King/sourceN |
| V22.P — Spatial Outworld | R | REGION | PARTIAL | Who may land/path/threat/source/time linking |
| V22.S1 — Dimension Link | R | PORTAL | PARTIAL | Entry/exit/path/capture/King/occupant wait/reveal/consume |
| V22.S2 — Spatial Shift | R | PORTAL | PARTIAL | Exit collision/allegiance/paired rewrite/Outworld/King |
| V22.U — Cosmic Void | P | REGION | PARTIAL | Co-expiry/generated cells/committed actor/source/filter |
| V23.P — Puppet Strings | R | PROGRESS | PARTIAL | Reason-specific reaction permission/chain/source matching |
| V23.S1 — Soul Binding | R | DEFENSE | PARTIAL | King/redirected capture/defense priority/group cleanup |
| V23.S2 — Puppet Strings | R | HIDDEN | PARTIAL | Entry/reveal/removal permissions/chain topology |
| V23.U — Puppet Master | P | CONTROL | PARTIAL | Control arbitration/King/restore/Bind cleanup/source graphs |
| V24.P — Dual Casting | R | SLOT | PARTIAL | Distinct slots/order/End/auto-end exceptions require policy change |
| V24.S1 — Ascend | R | PROGRESS | PARTIAL | Ready vs auto-transform/promotion/recast/lifetime |
| V24.S2 — Fountain of Youth | R | UNIT | PARTIAL | Unit/source cleanse categories/timer immune/reward/cadence |
| V24.U — Divine Ascension | R | UNIT | PARTIAL | Mode targeting/readiness/true promotion AP/ordinary provenance |
| V25.P — Dragon Guard | R | REACTION | PARTIAL | Boundary/cadence/tie/source/N/ordinary types |
| V25.S1 — Subterranean Escape | R | UNIT | PARTIAL | Cancel capture vs real death/record/return collision/lossAP |
| V25.S2 — Shockwave | A | FORCE | LIVE | None within accepted bounded profile; see section2; siblings remain disabled |
| V25.U — Dragon's Roar | R | REGION | PARTIAL | Phase timing/sacrifice acceleration/King lock/beam cleanup |
| V26.P — Overwhelm | R | AP | PARTIAL | Advantage-only vs absolute value/unit counts/boundary |
| V26.S1 — Vanguard Command | P | DESTROY | YES | Enemy-only vs first ally, blockers/cost/range/profile; confirmed non-King victim preserved |
| V26.S2 — Reinforcements | R | UNIT | PARTIAL | No-op reject/counts/placement/lifespan/promotion exception |
| V26.U — Iron Authority | R | SILENCE | PARTIAL | Tier schema/matching vs Divine Silence/source/cost/N |
| V27.P — Debt of the Seas | R | AP | PARTIAL | Debt floor/actual cost/repayment/compatibility schema |
| V27.S1 — Bet | R | AP | PARTIAL | Source filtering/once/cancel/removal/reward operation/debt |
| V27.S2 — Sailing | R | FORCE | PARTIAL | Natural expiry only vs cleanup, destination/Shield/traps/slot |
| V27.U — Broadside | R | ATTACK | PARTIAL | Commit-dependent blast/Shield/priority/multiple shooters/AP |
| V28.P — Counterplay | U | DRAFT | DEFERRED | Truth/reveal/counters/targets/IDs/spec absent |
| V28.S1 — Jester's Trick | U | DRAFT | DEFERRED | All profile/timing/source/category/King/real-fake rules |
| V28.S2 — Joker's Gift | U | DRAFT | DEFERRED | All producer and Seal/realization rules |
| V28.U — Choice of Fate | U | DRAFT | DEFERRED | All mode/lifetime/visibility/IDs |
| V29.P — UNKNOWN (unnamed passive) | U | DRAFT | DEFERRED | Passive name/ID/unit/reward/source/window missing |
| V29.S1 — Titan Summoning | U | DRAFT | DEFERRED | All footprint/sacrifice/incarnation/lifespan/ID rules |
| V29.S2 — Guardian Link | U | DRAFT | DEFERRED | All targets/defense/priority/paired lifetime |
| V29.U — Earth Tremor | U | DRAFT | DEFERRED | All geometry/targets/King/source/IDs |

Rows checked:116; LIVE6, YES3, PARTIAL99, DEFERRED8. This reuse partition is an audit assessment, independent of approval counts; it does not authorize any additional producer. The family shorthand and row-specific missing fields must be read together.
