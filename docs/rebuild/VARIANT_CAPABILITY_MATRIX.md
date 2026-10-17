# Variant capability matrix — Phase 02B-7

## Current B1 authorization — two Stun producers (2026-10-16)

The owner has APPROVED and authorized one batch implementing Judgment Chains-only Nephalem and Holy Seal-only Angel. Six scoped field groups and exact decision IDs are recorded in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b1--two-bounded-stun-producer-approvals-2026-10-16): scope, targets/relocation, cost/usage, duration/refresh, source and removal. Each casts one live enemy-current-controller ordinary-original non-King anywhere on the board, without range/path restriction; cost5/6 respectively, normal skill slot and mandatory main move; both apply empty-payload StunN3/source-end/no cast tick. Exact player/Variant/skill/null/null source; stable same-source refresh, independent sources. Relocation allows ordinary non-King destinations of either controller; control/owner changes do not invalidate the bearer. Only expiry/bearer death/terminal cleanup; no extra removal/reward/skill ban.

Technical pins: nephalem.judgment_chains / angel.holy_seal; separate profiles nephalem.judgment-chains-only.experimental / angel.holy-seal-only.experimental v1.0.0; separate effect.stun v1.0.0 registries under experimental-nephalem-judgment-chains-v1-w{0|1}-b{0|1} / experimental-angel-holy-seal-v1-w{0|1}-b{0|1}, ruleset v1.0.0. Preserve exact one-pair source guards, existing Stun consumers and Holy Shield/Live Charge behavior. Engine0.6.0/state1.1.0 retained; no core/schema change. No mixed factory, full Variant, passive/sibling, new mechanic, Phase03, dependencies or commit/push.

Gameplay APPROVED; implementation **PASS / READY / ENABLED only for selected players in the two separate pinned factories** after B1 acceptance:747 tests/36 files and all required checks PASS, including runtime smoke after an environment-approved rerun. Evidence: [B1 acceptance report](PHASE_02B_B1_STUN_PRODUCERS_REPORT.md). This current overlay supersedes only the two precise B1 rows in historical planning below. Parent decisions and all other producers remain open. Work order: signed docs → focused vertical red/green public-seam tests → isolated planners/factories → public AP0 acceptance/snapshot/replay → independent Standards/Spec reviews/full checks → batch report and stop. No automatic B2. Historical milestone evidence remains intact.


Planning baseline `9261007`, engine0.6.0/state1.1.0. All116 rows in [inventory](VARIANT_SKILL_INVENTORY.md) are classified below. Evidence is inspected source/contracts, not a new test run. [Readiness](PRODUCER_READINESS_MATRIX.md) tracks approvals independently.

## Classification and reusable contracts

A = EXISTING_CAPABILITY: mainly existing approved mechanics; does not imply producer approval. B = SMALL_EXTENSION: exact bounded addition to an existing mechanism listed below. C = NEW_MECHANIC: one or more new reusable gameplay capabilities. D = BLOCKED: no bounded design to schedule (deferred drafts). All non-enabled rows are separately **BLOCKED_RULES** until their signed fields are complete, even if class A. Classes describe full documented ability, including dependent mechanics; no “same effect name => ready” shortcut. Complexity LOW/MEDIUM/HIGH is relative engineering judgment, not time. Confidence H/M/L refers to feasibility of this bounded classification, not approval or performance.

| API key | Existing source-level evidence / limits |
|---|---|
| T | [transaction.ts](../../packages/game-core/src/transaction.ts): RulesetBundle, SkillPlanningContext, SkillPlan, DerivedOperation, resolveCommand. One root cost/slot/FIFO/rollback. [shared schemas](../../packages/shared-types/src/index.ts): RootCommandSchema only move/skill/end/destroy; skill intent only piece-target-v1 or targetless; PlayerProfilesSchema pins one profile/player |
| E | [effects.ts](../../packages/game-core/src/effects.ts): EffectDefinition/createEffectRegistry/validateEffectInstance; [effect-runtime.ts](../../packages/game-core/src/effect-runtime.ts): typed matching/lifetime/cleanup and runtime guards; [effect-parameters.ts](../../packages/game-core/src/effect-parameters.ts): source profile and approved producer N. Event-count/progress/declared removal reactions unsupported |
| Q | [action-legality.ts](../../packages/game-core/src/action-legality.ts): queryLegalMainActions/queryCaptureThreats, RulesetLegalityPolicy/effectAllowsAction. Base capture geometry + Stun restrictions; true for forced-reposition/skill-target restriction is not an implemented operation |
| H | [shield-consumer.ts](../../packages/game-core/src/shield-consumer.ts): SHIELD_CONSUMER_CONTRACT/SHIELD_CAPTURE_DEFENSE_BINDINGS; only atomic non-consuming capture rejection |
| B | [bomb-consumer.ts](../../packages/game-core/src/bomb-consumer.ts): BOMB_CONSUMER_CONTRACTS, planBombBlast and reviewed committed-death binding; [committed-death.ts](../../packages/game-core/src/committed-death.ts): CommittedDeathContext. Specific Bomb reaction authorization does not enable arbitrary death/priority handlers |
| X | [effect-relocation.ts](../../packages/game-core/src/effect-relocation.ts): planEffectRelocation; [effect-links.ts](../../packages/game-core/src/effect-links.ts): validation/normalization callbacks. DerivedOperation permits effect_relocate/effect_sets_swap, not physical movement/position swap |
| V | GameState variantState, DerivedOperation.variant + ruleset repetition callback. Serializable namespace state is not a reviewed passive/counter/ledger subsystem. [repetition.ts](../../packages/game-core/src/repetition.ts), [snapshot.ts](../../packages/game-core/src/snapshot.ts), [replay.ts](../../packages/game-core/src/replay.ts) provide deterministic persistence seams |
| D | [delayed-actions.ts](../../packages/game-core/src/delayed-actions.ts): createDelayedActionRegistry/collectDueDelayedActions; DelayedActionDefinitionMetadataSchema mode is synthetic-v1. [effect-triggers.ts](../../packages/game-core/src/effect-triggers.ts): EffectTriggerHandler.mode synthetic-v1 only. Never disguise concrete behavior as synthetic to enable it |

[Core public exports](../../packages/game-core/src/index.ts) expose these contracts; several planners/normalizers remain internal implementation seams. [Variant public exports](../../packages/game-variants/src/index.ts) expose only plugin identity plus the two accepted factories/profiles. VariantPluginDescriptor has only id/version, not the full proposed lifecycle in VARIANT_PLUGIN_SPEC §1. No mutable full-Variant runtime exists.

## Capability families (applies to each referenced row)

| Family | Reuse | Exact missing capability / bounded extension / risk | Interaction dependencies |
|---|---|---|---|
| STUN | T+E+Q | Complete producer definition/profile around STUN_CONSUMER_CONTRACT, source guard and producer-rounds; no new Stun runtime. Separate factories avoid multi-producer source-guard collision. | Stun/Shield coexistence; future-source projection |
| SHIELD | T+E+H | Complete own producer declaration using existing SHIELD_*; approved Holy Shield is implemented, Royal Guard still needs its own signed profile. | Capture defense/time/King |
| BOMB | T+E+B | Accepted Live Charge uses existing permanent Bomb and exact source; no new capability. | Death/FIFO/family/Shield |
| DESTROY | T+B | Trusted plan can return destroy operations; select/range/blocker policies must be signed. No forced attack/capture added. | Committed death/Bomb/King |
| MULTI | T+E+H | Bounded targetless planner expands approved set into effect_apply operations, root cost once; no arbitrary client target list. Mixed Shield producers require a source-profile composition review. | King/source/multi-target atomicity |
| SWAP | T+X | Add versioned two-piece intent and trusted final-assignment planner; existing effect_sets_swap does the effect transport. No physical piece swap. | Every attached effect eligibility, future Aegis/groups |
| AP | T+V+B | Add bounded source-bearing AP delta/reward planning, eligible-event subscriptions and semantic counter policy; pure AP helpers do not create a root AP-adjust operation. Debt additionally changes nonnegative AP schema/quote rules. | Owner/controller/source, exactly-once rewards and rollback |
| COST | T+V | Trusted cost quote exists; add approved per-source counter/quote revision and atomic update using explicit variant namespace/projector. Mountain counting requires unit capability separately. | AP insufficiency/turn boundaries/replay |
| REACTION | T+E+Q+B | Add narrowly authorized concrete committed/boundary consumer binding and required context; synthetic-v1 is not production approval. Retired capture bearer data needs explicit transport for Electric. | Stun targets/threat/retired attachments/Shield cancellation |
| REMOVE | T+E+B | Authorize exact removal selection/reasons and permissions; for Blessing add pure cleanse-vs-Shield branch and whole-plan validation. Cleanup-only consequences already exist. | Shield/Stun/Bomb permissions, no on-cleanse reactions |
| SILENCE | T+E | Add approved skill-execution restriction seam shared with skill availability; skill tier metadata if tier-selective; exact-source matching/removal and source-clock contract. | Divine Silence vs Iron Authority arbitration, one skill slot |
| LAW | T+Q+V | Bounded fixed-region/rank capture restriction and semantic law state via RulesetLegalityPolicy; must define threat/derived action coverage. Persistent dynamic regions are not implied. | Root capture/King/threat and opposite laws |
| BIND | T+E+Q+V | Bounded destination/threat restriction using existing policy callbacks, signed moving/fixed region semantics and timed definition; add approved escalation counter. No forced-move operation. | Stun/Ghost/threat and cost quote |
| SLOT | T+V | Replace/extend scalar normal-skill usage policy only after distinct-slot/order/auto-end approval. | P00-07 single-skill baseline, End/skill availability |
| CONTROL | T+E+V | NEW typed controller/owner transition, control arbitration/restoration and effective action profile; origin/type fields alone implement none of these. | Pawn direction/promotion/King, attached effects/source |
| UNIT | T+B+V+D | NEW unit/death record/incarnation/spawn/revive/exile/lifespan contracts as applicable; no current derived operation for them. Delay schema only permits synthetic mode today. | Loss AP, death-vs-despawn, occupancy/King/source graphs |
| LEDGER | T+B+V | NEW authoritative death/graveyard ledger and signed eligibility/consume semantics; history snapshots and death facts are not a graveyard. | Holy Aura cost/records, revive and future lineage |
| TRANSFORM | T+E+Q+V | NEW real type vs movement-profile ledger, layered restore/promotion/value rules and typed transitions. | Royal identity/King/AP/promotion and linked restoration |
| PAIR | T+E+X+B | NEW concrete paired behavior: physical position operations/return collision or linked committed-death consequences; existing reference validation is only a seam. | Shield/redirect/Fate priorities, group cleanup and source topology |
| FORCE | T+Q+B | NEW typed forced-reposition operation with final-occupancy preflight, cause/event/source transport; delayed capture requires separate attack capability. | King/entry/terrain/traps, does not consume normal main slot by default |
| ATTACK | T+Q+B | NEW stationary/derived capture contract, interception/commit/source accounting and root queue dedup; RootCommand.move is a normal main action, not derived attack. | Shield/Bomb/King terminal, entry and capture-dependent blast |
| GHOST | T+Q+E | NEW effect-aware path/movement profile integration; approved second-obstacle geometry must apply consistently to threats/legality. | Bind/terrain/King/forced actions; current base generator is insufficient |
| REGION | T+E+B+D | NEW persistent region/geometry/occupant consumer or concrete delayed region executor as appropriate; cell target schema is data only. Sanctuary also needs committed capture context and reviewed reaction mode. | Source clock/overlap, current occupants, threat, King and linked expiry |
| HIDDEN | T+E+Q | NEW hidden objects/stealth plus role-safe projection and entry/consume/reveal policy; internal full-state facts cannot be exposed as views. | D-25/Phase03 projection gate, forced entry and immunity |
| DEFENSE | T+E+H+B | NEW effect-application/category interception or redirect/defense ordering. Atomic Shield cannot be generalized to Aegis/Fate/Phoenix without approval. | D-04/D-06/King terminal and removal/relocation |
| PROGRESS | T+E+V+D | NEW approved gameplay progress/countdown/window executor and event cause policy; declared event-count/progress lifetimes currently reject. | Capture/death/boundary ordering, removal permissions and semantic counters |
| REWIND | T+V | NEW typed living-piece position restore/history query and collision preflight; technical decodeSnapshot/replay is not gameplay rewind. Freeze adds a separate reviewed movement reaction. | P00-04, history retention, moves/traps/King/source clock |
| PORTAL | T+Q+E+X+D | NEW paired traversal/path interception/exit-occupancy/waiting contracts and source-linked cell lifecycle. Group refs alone do not teleport. | Capture-vs-destroy/King, hidden view and source graph |
| CLOCK | T+E | NEW approved gameplay clock exception plus Phase03 trusted clock inputs; no wall-clock/core side effects. Skill disable is a separate bounded gate. | P00 dual clocks, first White exemption/disconnect |
| SACRIFICE | T+B+V | NEW typed non-capture sacrifice reason/reward/slot exception and toll quote across approved main-action kinds. No Bomb trigger on sacrifice inferred. | P00-05/08, AP/death/source, repeated actions |
| DRAFT | T (seam only) | No bounded executable contract exists; do not schedule inferred draft mechanics. | Q-20 deferred; all related priority/hidden/unit decisions |

## Per-ability classification

Each row inherits only the APIs and missing capabilities in its named family above; its exact outstanding gameplay question is below, with the parent decision from the inventory. “NONE” in blocker means already accepted bounded profile, not full Variant. Confidence: H for A (direct source reuse), M for B (bounded analysis), L for C/D (unresolved mechanic semantics). C can be MEDIUM for one displacement operation while remaining a genuinely new mechanic.

| Inventory row / ability | Capability | Family / reusable APIs | Approval dependency / exact unresolved field | Complexity / confidence |
|---|---|---|---|---|
| V01.P Lightning Speed | B | AP: T+V+B | D-07/D-12/D-22.Lightning; BLOCKED_RULES: Trap reward/consume on blocked Stun, source and allowed entry causes | MEDIUM / M |
| V01.S1 Thunder Trap | C | HIDDEN: T+E+Q | D-07/D-12/D-22.Lightning; BLOCKED_RULES: Trap entry/consume/reveal/King/reward | HIGH / L |
| V01.S2 Electric Terrain | C | CLOCK: T+E | D-07/D-12/D-22.Lightning; BLOCKED_RULES: Clock exception/debit, global skill lock, arbitration | HIGH / L |
| V01.U Raigeki | B | REMOVE: T+E+B | D-07/D-12/D-22.Lightning; BLOCKED_RULES: Allegiance/targets/cost and authorized King Stun removal | MEDIUM / M |
| V02.P Explosives | B | AP: T+V+B | D-12/D-22.Dynamite; BLOCKED_RULES: Refund/setup selection, source-only reward and no-op cost | MEDIUM / M |
| V02.S1 Live Charge | A | BOMB: T+E+B | NONE within accepted profile | LOW / H |
| V02.S2 Landmine | C | HIDDEN: T+E+Q | D-12/D-22.Dynamite; BLOCKED_RULES: Placement/entry/reveal/consume/King/immunity/source | HIGH / L |
| V02.U Detonation | B | AP: T+V+B | D-12/D-22.Dynamite; BLOCKED_RULES: Any-family selection/no-useful-target rejection; refund approval/AP operation | MEDIUM / M |
| V03.P Zombie Infection | C | CONTROL: T+E+V | D-13/D-17/D-22.Zombie; BLOCKED_RULES: Bite target/King, action replacement, control arbitration | HIGH / L |
| V03.S1 Infection | C | CONTROL: T+E+V | D-13/D-17/D-22.Zombie; BLOCKED_RULES: Targets/King/cap, later cost, Zombie/Walker mechanics | HIGH / L |
| V03.S2 Mutation | C | CONTROL: T+E+V | D-13/D-17/D-22.Zombie; BLOCKED_RULES: Which controller/owner eligible, cap and conversion | HIGH / L |
| V03.U Outbreak | C | UNIT: T+B+V+D | D-13/D-17/D-22.Zombie; BLOCKED_RULES: Records consumed, incarnation/King/occupancy/lifespan | HIGH / L |
| V04.P Grand Illusions | C | PAIR: T+E+X+B | D-04/D-06/D-14/D-22.Magician; BLOCKED_RULES: Committed reason, defense priority, bonus and pair cleanup | HIGH / L |
| V04.S1 Now You See Me | C | PAIR: T+E+X+B | D-04/D-06/D-14/D-22.Magician; BLOCKED_RULES: Targets/return collision/recast/cleanup/position operations | HIGH / L |
| V04.S2 Misdirection | C | TRANSFORM: T+E+Q+V | D-04/D-06/D-14/D-22.Magician; BLOCKED_RULES: Moveset vs real type, AP/promotion/restore layers | HIGH / L |
| V04.U Carnival of Fools | C | FORCE: T+Q+B | D-04/D-06/D-14/D-22.Magician; BLOCKED_RULES: Cardinality/forced steps/cause, blocks and expiry | HIGH / L |
| V05.P Fallen Grace | B | AP: T+V+B | D-05/D-06/D-22.Nephalem; BLOCKED_RULES: Eligible committed death reasons/types and counter | MEDIUM / M |
| V05.S1 Judgment Chains | A | STUN: T+E+Q | NONE within B1 approved limited profile; IMPLEMENTED / READY / ENABLED in its bounded factory | LOW / H |
| V05.S2 Berserk Curse | C | PROGRESS: T+E+V+D | D-05/D-06/D-22.Nephalem; BLOCKED_RULES: Countdown anchor/capture response/King/cleanse outcome | HIGH / L |
| V05.U Divine Silence | B | SILENCE: T+E | D-05/D-06/D-22.Nephalem; BLOCKED_RULES: Tier/block-all, matching/removal/source/cost/duration | MEDIUM / M |
| V06.P Holy Aura | C | LEDGER: T+B+V | D-22.Guardian/D-22.GUARDIAN.SANCTUARY.REGION_PROFILE; BLOCKED_RULES: Graveyard threshold/permanent unlock; excluded from current producer | HIGH / L |
| V06.S1 Holy Shield | A | SHIELD: T+E+H | NONE within accepted profile | LOW / H |
| V06.S2 Sanctuary | C | REGION: T+E+B+D | D-22.Guardian/D-22.GUARDIAN.SANCTUARY.REGION_PROFILE; BLOCKED_RULES: Center/geometry/region category/overlap, committed attacker/victim, cost | HIGH / L |
| V06.U Divine Shield | B | MULTI: T+E+H | D-22.Guardian/D-22.GUARDIAN.SANCTUARY.REGION_PROFILE; BLOCKED_RULES: Exact set/provenance/King/cost/N/source/removal; no full Guardian | MEDIUM / M |
| V07.P Soul Harvest | B | AP: T+V+B | D-04/D-05/D-06/D-22.Requiem; BLOCKED_RULES: Eligible victim/cause/source and reward operation | MEDIUM / M |
| V07.S1 Soul Break | C | PROGRESS: T+E+V+D | D-04/D-05/D-06/D-22.Requiem; BLOCKED_RULES: Countdown/attacker recognition/removal/payload/source | HIGH / L |
| V07.S2 Thread of Fate | C | PAIR: T+E+X+B | D-04/D-05/D-06/D-22.Requiem; BLOCKED_RULES: Target/King, capture/destruction/sacrifice reasons and death links | HIGH / L |
| V07.U Reaper's Decree | C | PAIR: T+E+X+B | D-04/D-05/D-06/D-22.Requiem; BLOCKED_RULES: Pair topology/eligible death causes/priority/cleanup | HIGH / L |
| V08.P Royal Decree (Law Territory alias) | B | LAW: T+Q+V | D-08/D-22.Ruler; BLOCKED_RULES: Region/rank table/controller/derived capture/threat scope | MEDIUM / M |
| V08.S1 Order of Hierarchy | B | LAW: T+Q+V | D-08/D-22.Ruler; BLOCKED_RULES: Law replacement/timing/rank and complete capture validator coverage | MEDIUM / M |
| V08.S2 Decree of the Weak | B | LAW: T+Q+V | D-08/D-22.Ruler; BLOCKED_RULES: Mutual law arbitration/timing and query agreement | MEDIUM / M |
| V08.U Absolute Domain | C | REGION: T+E+B+D | D-08/D-22.Ruler; BLOCKED_RULES: Snapshot/live membership, jumps/new units/empty groups | HIGH / L |
| V09.P Blessing of the Wind God | B | AP: T+V+B | D-06/D-12/D-22.Kaze; BLOCKED_RULES: Batch counters, refund triggers/cleanse and mirror scope | MEDIUM / M |
| V09.S1 Wind Reversal | C | HIDDEN: T+E+Q | D-06/D-12/D-22.Kaze; BLOCKED_RULES: Entry causes, return collision/committed capture, immunity/consume | HIGH / L |
| V09.S2 Illusory Wind | C | HIDDEN: T+E+Q | D-06/D-12/D-22.Kaze; BLOCKED_RULES: Hidden batch, release origin/links and blocked application | HIGH / L |
| V09.U Eye of the Divine Storm | C | REGION: T+E+B+D | D-06/D-12/D-22.Kaze; BLOCKED_RULES: Cast tick/exposure membership/destruction/sigil reset | HIGH / L |
| V10.P Hunter's Instinct | B | AP: T+V+B | D-08/D-12/D-22.Predator/D-25; BLOCKED_RULES: Current/original type, committed capture and credit | MEDIUM / M |
| V10.S1 Evolution Spore | C | TRANSFORM: T+E+Q+V | D-08/D-12/D-22.Predator/D-25; BLOCKED_RULES: Progress/recast/promotion/capture/real type | HIGH / L |
| V10.S2 Shadow Prowl | C | HIDDEN: T+E+Q | D-08/D-12/D-22.Predator/D-25; BLOCKED_RULES: Authoritative Pawn threat/entry/King/hidden isolation | HIGH / L |
| V10.U Apex Camouflage | C | HIDDEN: T+E+Q | D-08/D-12/D-22.Predator/D-25; BLOCKED_RULES: Visibility/reveal adjacency/capture/skill/reset refs | HIGH / L |
| V11.P Rebirth | C | UNIT: T+B+V+D | D-04/D-17/D-22.Phoenix; BLOCKED_RULES: Terminal exception, reset occupancy/source/lifecycle; no approval | HIGH / L |
| V11.S1 Ashes of Reanimation | C | UNIT: T+B+V+D | D-04/D-17/D-22.Phoenix; BLOCKED_RULES: Records/incarnations/type cost/lifespan/reward/placement | HIGH / L |
| V11.S2 Solar Flare | C | REGION: T+E+B+D | D-04/D-17/D-22.Phoenix; BLOCKED_RULES: Threat oracle, King/targets/terrain path/visibility | HIGH / L |
| V11.U Supernova | C | REGION: T+E+B+D | D-04/D-17/D-22.Phoenix; BLOCKED_RULES: Warning/cancel/due clock/approved concrete executor/King | HIGH / L |
| V12.P Dragon Counter | B | AP: T+V+B | D-05/D-06/D-22.Verdant; BLOCKED_RULES: Threshold counter/reward causes/source/quote events | MEDIUM / M |
| V12.S1 Verdant Shelter | B | AP: T+V+B | D-05/D-06/D-22.Verdant; BLOCKED_RULES: Capture reward rounding; destruction stays owner-loss-only per Q14 | MEDIUM / M |
| V12.S2 Dragon's Gaze | B | AP: T+V+B | D-05/D-06/D-22.Verdant; BLOCKED_RULES: Move/capture actor, deadline/cleanse/no-move/King/AP floor | MEDIUM / M |
| V12.U Emerald Domain / Dragon's Wrath | C | PROGRESS: T+E+V+D | D-05/D-06/D-22.Verdant; BLOCKED_RULES: Two modes/target set/counter/tax/transfer/rows/N | HIGH / L |
| V13.P Static Charge | B | AP: T+V+B | D-08/D-12/D-22.ThunderDragon; BLOCKED_RULES: Unique bearer count/allegiance/King/source credit | MEDIUM / M |
| V13.S1 Dragon's Scale | B | REACTION: T+E+Q+B | D-08/D-12/D-22.ThunderDragon; BLOCKED_RULES: Duration conflict, eligible committed capture attacker, concrete binding | MEDIUM / M |
| V13.S2 Thunder Fang | C | ATTACK: T+Q+B | D-08/D-12/D-22.ThunderDragon; BLOCKED_RULES: Root/derived attack mode and trap payload/entry/source | HIGH / L |
| V13.U Dragon's Wrath | C | REGION: T+E+B+D | D-08/D-12/D-22.ThunderDragon; BLOCKED_RULES: Direction/targets/pre-cast Stun snapshot/N/King/ordering | HIGH / L |
| V14.P Turtle's Retaliation | C | DEFENSE: T+E+H+B | D-04/D-06/D-08/D-10; BLOCKED_RULES: Aegis approval/actual attacker/Bind/King/priority | HIGH / L |
| V14.S1 Transference | B | SWAP: T+X | D-04/D-06/D-08/D-10; BLOCKED_RULES: Two-piece intent, target/King/Aegis/empty-set rules D10 | MEDIUM / M |
| V14.S2 Aegis Blessing | C | DEFENSE: T+E+H+B | D-04/D-06/D-08/D-10; BLOCKED_RULES: Debuff-only vs targeting/relocation block, matching/priority | HIGH / L |
| V14.U Great Sanctuary | C | DEFENSE: T+E+H+B | D-04/D-06/D-08/D-10; BLOCKED_RULES: Set/Pawn exclusion/provenance/priority plus Aegis contract; confirmed King exclusion preserved | HIGH / L |
| V15.P Heavenly Grace | B | AP: T+V+B | D-06/D-22.Angel; BLOCKED_RULES: Eligible death reasons/types/current owner vs controller | MEDIUM / M |
| V15.S1 Holy Seal | A | STUN: T+E+Q | NONE within B1 approved limited profile; IMPLEMENTED / READY / ENABLED in its bounded factory | LOW / H |
| V15.S2 Blessing | B | REMOVE: T+E+B | D-06/D-22.Angel; BLOCKED_RULES: Removable categories/permissions, branch rules/ShieldN1 | MEDIUM / M |
| V15.U Divine Judgment | C | PROGRESS: T+E+V+D | D-06/D-22.Angel; BLOCKED_RULES: Capture actor/mark categories/countdown/cleanup/reaction | HIGH / L |
| V16.P Infernal Pact | B | AP: T+V+B | D-06/D-08/D-22.Devil; BLOCKED_RULES: Cast/initial boundary/reward identity | MEDIUM / M |
| V16.S1 Devil's Eye | B | REACTION: T+E+Q+B | D-06/D-08/D-22.Devil; BLOCKED_RULES: Threat scope/all attackers/trigger timing/uniqueness/N | MEDIUM / M |
| V16.S2 Wrath Curse | C | PROGRESS: T+E+V+D | D-06/D-08/D-22.Devil; BLOCKED_RULES: Capture deadline/remove/King/source dependencies | HIGH / L |
| V16.U Hellish Toll | C | SACRIFICE: T+B+V | D-06/D-08/D-22.Devil; BLOCKED_RULES: Sacrifice operation/rewards/turn exceptions/fees/window | HIGH / L |
| V17.P Ghost Inheritance | C | GHOST: T+Q+E | D-04/D-08/D-14/D-15; BLOCKED_RULES: Committed/intercept reason/tie/targets/caster lineage/stealth | HIGH / L |
| V17.S1 Haunt | C | GHOST: T+Q+E | D-04/D-08/D-14/D-15; BLOCKED_RULES: Ghost path and non-King Haunt restriction preserved; other target/N/free-use fields unsigned | HIGH / L |
| V17.S2 Possession | C | TRANSFORM: T+E+Q+V | D-04/D-08/D-14/D-15; BLOCKED_RULES: Current-turn window/type borrow/capture actor/reversion | HIGH / L |
| V17.U Spirit Walk | C | HIDDEN: T+E+Q | D-04/D-08/D-14/D-15; BLOCKED_RULES: Free counter/reveal/source refs/expiry/refresh payload | HIGH / L |
| V18.P Cannibal King | C | TRANSFORM: T+E+Q+V | D-14/D-22.Cannibal; BLOCKED_RULES: Royal identity/profile ledger/ally reward/mirror state | HIGH / L |
| V18.S1 Royal Guard | A | SHIELD: T+E+H | D-14/D-22.Cannibal; BLOCKED_RULES: Exact King/ordinary allegiance/source/cost/N/removal/profile unsigned | LOW / H |
| V18.S2 Devour | C | TRANSFORM: T+E+Q+V | D-14/D-22.Cannibal; BLOCKED_RULES: Profile layering/Stun donor/expiry/real type/AP value | HIGH / L |
| V18.U Apex Predator | C | TRANSFORM: T+E+Q+V | D-14/D-22.Cannibal; BLOCKED_RULES: Profile/capture counter/ally capture/restore/Shield source | HIGH / L |
| V19.P Arcane Mastery | C | PROGRESS: T+E+V+D | D-04/D-06/D-08/D-14/D-22.Wizard; BLOCKED_RULES: Threat/reward committed death/counter/price AP operation | HIGH / L |
| V19.S1 Arcane Swap | C | PAIR: T+E+X+B | D-04/D-06/D-08/D-14/D-22.Wizard; BLOCKED_RULES: Cost/source/group return/recast/King/priority | HIGH / L |
| V19.S2 Arcane Bind | B | BIND: T+E+Q+V | D-04/D-06/D-08/D-14/D-22.Wizard; BLOCKED_RULES: Bind movement/threat/cost/matching/removal unsigned | MEDIUM / M |
| V19.U Arcane Annihilation | C | PROGRESS: T+E+V+D | D-04/D-06/D-08/D-14/D-22.Wizard; BLOCKED_RULES: Threshold/cost/pre-death credit vs committed, King exclusion | HIGH / L |
| V20.P Ground Dominion | B | COST: T+V | D-08/D-17/D-22.Earth; BLOCKED_RULES: Authoritative quote/revision/time and unit count requires Mountain | MEDIUM / M |
| V20.S1 Raise the Mountain | C | UNIT: T+B+V+D | D-08/D-17/D-22.Earth; BLOCKED_RULES: Unit footprint/moves/capture/rewards/lifespan | HIGH / L |
| V20.S2 Shifting Peaks | C | FORCE: T+Q+B | D-08/D-17/D-22.Earth; BLOCKED_RULES: Unit motion/multi-push/final occupancy/King/entry | HIGH / L |
| V20.U Earth-Burst Heavenly Star | C | UNIT: T+B+V+D | D-08/D-17/D-22.Earth; BLOCKED_RULES: Exile/return/incarnation/collision/timer/removal/reward | HIGH / L |
| V21.P Temporal Burden | B | COST: T+V | D-11; BLOCKED_RULES: Counter progression/no-useful-history cost and isolation | MEDIUM / M |
| V21.S1 Rewind | C | REWIND: T+V | D-11; BLOCKED_RULES: Lookback/insufficient history/trigger causes/retention | HIGH / L |
| V21.S2 Future Prediction | B | REACTION: T+E+Q+B | D-11; BLOCKED_RULES: Two-field intent, first move/standstill/guess/removal/source | MEDIUM / M |
| V21.U Time Collapse — Grand Rewind / Time Freeze | C | REWIND: T+V | D-11; BLOCKED_RULES: Mode command/history/Freeze event timing/King/sourceN | HIGH / L |
| V22.P Spatial Outworld | C | REGION: T+E+B+D | D-08/D-12/D-19; BLOCKED_RULES: Who may land/path/threat/source/time linking | HIGH / L |
| V22.S1 Dimension Link | C | PORTAL: T+Q+E+X+D | D-08/D-12/D-19; BLOCKED_RULES: Entry/exit/path/capture/King/occupant wait/reveal/consume | HIGH / L |
| V22.S2 Spatial Shift | C | PORTAL: T+Q+E+X+D | D-08/D-12/D-19; BLOCKED_RULES: Exit collision/allegiance/paired rewrite/Outworld/King | HIGH / L |
| V22.U Cosmic Void | C | REGION: T+E+B+D | D-08/D-12/D-19; BLOCKED_RULES: Co-expiry/generated cells/committed actor/source/filter | HIGH / L |
| V23.P Puppet Strings | C | PROGRESS: T+E+V+D | D-04/D-06/D-16; BLOCKED_RULES: Reason-specific reaction permission/chain/source matching | HIGH / L |
| V23.S1 Soul Binding | C | DEFENSE: T+E+H+B | D-04/D-06/D-16; BLOCKED_RULES: King/redirected capture/defense priority/group cleanup | HIGH / L |
| V23.S2 Puppet Strings | C | HIDDEN: T+E+Q | D-04/D-06/D-16; BLOCKED_RULES: Entry/reveal/removal permissions/chain topology | HIGH / L |
| V23.U Puppet Master | C | CONTROL: T+E+V | D-04/D-06/D-16; BLOCKED_RULES: Control arbitration/King/restore/Bind cleanup/source graphs | HIGH / L |
| V24.P Dual Casting | B | SLOT: T+V | D-17/D-18; BLOCKED_RULES: Distinct slots/order/End/auto-end exceptions require policy change | MEDIUM / M |
| V24.S1 Ascend | C | PROGRESS: T+E+V+D | D-17/D-18; BLOCKED_RULES: Ready vs auto-transform/promotion/recast/lifetime | HIGH / L |
| V24.S2 Fountain of Youth | C | UNIT: T+B+V+D | D-17/D-18; BLOCKED_RULES: Unit/source cleanse categories/timer immune/reward/cadence | HIGH / L |
| V24.U Divine Ascension | C | UNIT: T+B+V+D | D-17/D-18; BLOCKED_RULES: Mode targeting/readiness/true promotion AP/ordinary provenance | HIGH / L |
| V25.P Dragon Guard | B | REACTION: T+E+Q+B | D-04/D-06/D-17/D-22.DragonSentinel; BLOCKED_RULES: Boundary/cadence/tie/source/N/ordinary types | MEDIUM / M |
| V25.S1 Subterranean Escape | C | UNIT: T+B+V+D | D-04/D-06/D-17/D-22.DragonSentinel; BLOCKED_RULES: Cancel capture vs real death/record/return collision/lossAP | HIGH / L |
| V25.S2 Shockwave | C | FORCE: T+Q+B | D-04/D-06/D-17/D-22.DragonSentinel; BLOCKED_RULES: Targets/King/collision/order/entry/threat/source | MEDIUM / L |
| V25.U Dragon's Roar | C | REGION: T+E+B+D | D-04/D-06/D-17/D-22.DragonSentinel; BLOCKED_RULES: Phase timing/sacrifice acceleration/King lock/beam cleanup | HIGH / L |
| V26.P Overwhelm | B | AP: T+V+B | D-06/D-17/D-22.Lord; BLOCKED_RULES: Advantage-only vs absolute value/unit counts/boundary | MEDIUM / M |
| V26.S1 Vanguard Command | A | DESTROY: T+B | D-06/D-17/D-22.Lord; BLOCKED_RULES: Enemy-only vs first ally, blockers/cost/range/profile; confirmed non-King victim preserved | LOW / H |
| V26.S2 Reinforcements | C | UNIT: T+B+V+D | D-06/D-17/D-22.Lord; BLOCKED_RULES: No-op reject/counts/placement/lifespan/promotion exception | HIGH / L |
| V26.U Iron Authority | B | SILENCE: T+E | D-06/D-17/D-22.Lord; BLOCKED_RULES: Tier schema/matching vs Divine Silence/source/cost/N | MEDIUM / M |
| V27.P Debt of the Seas | B | AP: T+V+B | D-06/D-12/D-17/D-22.Pirate; BLOCKED_RULES: Debt floor/actual cost/repayment/compatibility schema | HIGH / M |
| V27.S1 Bet | B | AP: T+V+B | D-06/D-12/D-17/D-22.Pirate; BLOCKED_RULES: Source filtering/once/cancel/removal/reward operation/debt | MEDIUM / M |
| V27.S2 Sailing | C | FORCE: T+Q+B | D-06/D-12/D-17/D-22.Pirate; BLOCKED_RULES: Natural expiry only vs cleanup, destination/Shield/traps/slot | HIGH / L |
| V27.U Broadside | C | ATTACK: T+Q+B | D-06/D-12/D-17/D-22.Pirate; BLOCKED_RULES: Commit-dependent blast/Shield/priority/multiple shooters/AP | HIGH / L |
| V28.P Counterplay | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: Truth/reveal/counters/targets/IDs/spec absent | HIGH / L |
| V28.S1 Jester's Trick | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: All profile/timing/source/category/King/real-fake rules | HIGH / L |
| V28.S2 Joker's Gift | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: All producer and Seal/realization rules | HIGH / L |
| V28.U Choice of Fate | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: All mode/lifetime/visibility/IDs | HIGH / L |
| V29.P UNKNOWN (unnamed passive) | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: Passive name/ID/unit/reward/source/window missing | HIGH / L |
| V29.S1 Titan Summoning | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: All footprint/sacrifice/incarnation/lifespan/ID rules | HIGH / L |
| V29.S2 Guardian Link | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: All targets/defense/priority/paired lifetime | HIGH / L |
| V29.U Earth Tremor | D | DRAFT: T (seam only) | Q-20 (DEFERRED); BLOCKED_RULES: All geometry/targets/King/source/IDs | HIGH / L |

Counts: B=33, C=69, A=6, D=8; total116. D is not silently substituted for A/B/C merely because a producer needs owner approval.

## Composition and semantic-source gate

The two accepted factories are separate; no Guardian-vs-Dynamite combined factory is exported. New registered skill names cannot bypass requiredProfile; PlayerProfilesSchema permits one exact profile/player. For different Stun producers, ProducerRoundsPolicySchema can list multiple approved producers, but current sourceAttribution.profile player-originated-v1 pins one exact sourceVariant/sourceSkill. createEffectRegistry rejects duplicate type IDs. Therefore two isolated producer factories can reuse effect.stun today; a shared cross-Variant definition needs a separately reviewed bounded definition-owned source authorization contract, consistent payload/eligibility/removal permissions and hash/version pinning. Do not register the same type twice or weaken the null-caster guard. Non-null caster/incarnation/linked-source graph normalization remains unavailable; raw references cannot be deleted from repetition keys to enable a producer.

No new API/definition/factory is introduced in02B-7. See [batch roadmap](PHASE_02B_BATCH_ROADMAP.md) for conditional implementation order and version decisions.
