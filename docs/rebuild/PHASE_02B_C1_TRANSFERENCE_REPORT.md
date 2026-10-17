# Phase 02B C1 — Turtle Transference acceptance

2026-10-17. **BATCH_C1_PASS / READY.** Transference is ENABLED only in its separate explicitly selected experimental factory. All required verification and both independent reviews PASS; no remaining C1 blockers. Owner-approved C1 only. No staging/commit/push, other batch, dependency/scripts/CI/apps/legacy change or Phase03.

## Baseline and preserved prior audit

HEAD/local origin/main a84467cb9304ac6740d3b52af5fb73ae16ece060, combined B2+B3 tree113d2659afaf03debfe04205ca6f7c428f48649d; index empty.960 tests/46 files accepted. At start the sole untracked file was [Gameplay Coverage Audit](PHASE_02B_GAMEPLAY_COVERAGE_AUDIT.md). Its SHA256 is696e749d2c82f930971d00862e6abec71842cf573ed2c925d0a2ad4e7b3c46ea; C1 preserves it byte-for-byte and leaves it untracked. It is not a C1 deliverable or included in the C1 manifest.

Read AGENTS, CONTEXT, gameplay/effect/plugin/decision specs, Coverage Audit, inventory/capability/readiness/roadmap/implementation plan and actual relocation/runtime/source/intent/root/factory/codec/repetition/replay/AP/acceptance patterns. Prior report history remains unchanged.

## Owner approval and scope

[Decision registry](OPEN_DECISIONS.md#phase-02b-c1--turtle-transference-owner-approvals-2026-10-17) records D-22.C1-01.SCOPE, D-10.C1-02.TARGETS,03.KING,04.PROVENANCE,05.RANGE,06.EMPTY, D-22.C1-07.COST_TURN, D-05.C1-08.SOURCE, D-10.C1-09.WHOLE_SET and D-06.C1-10.ATOMICITY before production/tests. No gameplay recommendation was promoted to approval.

Exactly two distinct live board pieces: actor-current-controller ally and opponent-current-controller enemy; owner/original side do not decide allegiance. Neither may be King. No distance/LOS/adjacency restriction. Known valid ordinary-original, summoned and special categories are selectable, but every attachment's final eligibility still applies. Missing provenance is unknown and fails closed; a future category outside the current PieceSchema is rejected rather than guessed. This introduces no ordinary-only cast restriction or universal King immunity.

One empty set is allowed; both empty reject before cost/slot. Fixed4 AP and one optional normal skill slot; mandatory main and either skill/main order unchanged. No cooldown/passive/discount/reward/cap. Exact skill source player/turtle/turtle.transference/null/null; attachment sources remain their own original tuples.

No Turtle passive, Aegis Blessing, Great Sanctuary, full Turtle, mixed producer factory or default auto-registration.

## Intent, factory, source and pins

| Artifact | Pin / contract |
|---|---|
| Canonical Variant / skill | turtle (plugin/inventory V14) / turtle.transference |
| Public factory | createTransferenceExperimentalRuleset({white,black}) |
| Profile | turtle.transference-only.experimental v1.0.0 |
| Ruleset | experimental-turtle-transference-v1-w{0 or1}-b{0 or1}, v1.0.0 |
| Capability / internal wrapper | transference-v1 / transference_swap schema1.0.0 |
| Client intent | two-piece-target-v1, only alliedPieceId +enemyPieceId |
| Operation source | sourcePlayer / turtle / turtle.transference / null / null |
| Execution / storage | explicit engine0.8.0 / state1.1.0 |
| Costs | SKILL_AP_COSTS_V3, diagnostic fingerprint5791f7f2c9a23105 |
| Event | transference_committed with exact operation source and both targets; normal root transaction/operation/cause IDs |

Strict intent rejects extra effect IDs/payload/source/assignments/cost/deadline/trigger/caster fields, missing targets and malformed discriminators. Client never supplies the source-bearing wrapper. Separate boolean selections authorize White/Black independently; wrong actor, absent/mismatched profile/factory and fabricated extra skill registry reject. Factory/profile/skills/runtime definitions are frozen and match instances/registries independent.

The factory registers consumers only: unchanged pinned Chains-source Stun, Holy Shield and Live Charge definitions plus their existing source/eligibility/restriction/defense/death bindings. It does not register their skills or player profiles. Both source players can carry independent attachments. Exact source guards are retained, not relaxed to authorize every Stun producer tuple under a historical definition. A future registered definition uses the same generic transport if its complete state/bindings validate; no swap whitelist or per-effect transfer branch exists.

Mine and future-like definitions are registered only in explicitly labeled TRUSTED_TEST_ONLY bundles, not a new Landmine/future producer or a public arbitrary registry/composition parameter. The trusted C1 planning context receives the current bundle so newly registered valid effects are preflighted against the actual root registry; older engines retain their original planner context. Trusted callbacks are reviewed code, not an untrusted upload sandbox.

## Complete preflight and generic whole-set transport

The exported [preflight helper](../../packages/game-core/src/transference.ts) validates engine/capability/current actor/profile, exact root skill/intent, two target identities/current controllers, non-King/known provenance and nonempty union. It derives one strict source-bearing wrapper and compares any supplied wrapper against its independently derived literal structure.

It delegates both final sets to the existing planEffectRelocation effect_sets_swap operation. [Generic relocation](../../packages/game-core/src/effect-relocation.ts) is unchanged. All attachments move simultaneously using a complete proposed assignment; no selective filtering, copying, remove/apply, payload refresh or new effect ID allocation. Full runtime/family/eligibility/reference validation runs against that final assignment.

The real planner performs this preflight before returning the fixed V3 plan. Root checks required profile and independently validates exact cost, exactly one wrapper and the complete assignment before commitNormalSkillUsage/debit. Queued execution repeats preflight against the actual candidate. A second concrete ticket rejects TRANSFERENCE_SWAP_LIMIT, rolling back the first. Forged source/targets/fields/cost/count reject atomically.

Root alone owns debit, slot, IDs, events and candidate mutation. Generic relocation facts retain original effect attribution; transference_committed carries the separate Turtle operation source. Source/instance ID/application sequence/payload/anchor/deadline/remaining duration/references are preserved except target. Regions/board coordinates/AP rewards are untouched by effect transport.

Unsupported links, missing bindings, prohibited relocation, invalid final provenance/eligibility or invalid family state reject the whole command. Same- and cross-source attachments/deadlines survive, including stable independently expiring Shields after transfer to an opponent-controlled bearer. A whole-set bijection cannot introduce a new Bomb family collision from a valid input: both target sets exchange as sets. Invalid initial family duplication still rejects at runtime/import; no unreachable conflict fixture is presented as valid gameplay.

## Consumer integration, rollback and determinism

Real Stun on the new bearer suppresses main moves/captures and capture-threat contribution. Real Shield protects its new bearer with unchanged atomic CAPTURE_DEFENDED behavior. Transferred Bomb does not explode on swap; later committed death uses its new actual board coordinate and original Bomb source, with only owner loss AP and existing FIFO/King semantics. No apply/remove/expire/refresh, ordinary move/capture, board reposition or death is synthesized by swapping.

Custom future-like ID with nested nonempty payload swaps onto summoned/special pieces using its declared eligibility; the original producer code is unchanged. Real ordinary-only attachments correctly reject a special destination. Declared linked topology valid before swap but invalid after swapping rejects with EFFECT_LINK_INELIGIBLE; absent/unsupported references/bindings remain fail closed. No existing Stun/Shield/Bomb definition, consumer or linked validator was changed.

Tests cover late failure after queued RNG, queue-budget failure, final-validator failure, duplicated ticket and forged trusted plans. All roll back effects/AP/slot/RNG/IDs/history/events. Input/records stay immutable, restored continuations execute independently, exact committed replay events/full hashes match, coherent identity renaming preserves semantic keys and meaningful changed bearer/source states differ. Factory/match isolation and source deadline expiry are verified.

## Cost and old-version compatibility

V1 and V2 artifacts/fingerprints remain unchanged (2a56da8ff953d29b / e268dfc077cf52ff). V3 composes V2 plus turtle.transference4 in the same existing module and uses a new frozen checked fingerprint. Existing five engine0.6 factories still read V1; Sanctuary0.7 still reads V2. No mutable latest override/client balance input.

New two-piece intent, source-bearing wrapper, planning-context/bundle and executable root authorization are explicitly engine0.8 opt-in; historical0.6 and0.7 roots reject the new intent/operation. New snapshots/replays require the matching engine/capability/profile/hash. State1.1 is retained: no new stored field or reinterpretation of an old namespace; effect/replay envelopes remain v1 and RNG unchanged. Historical Guardian namespace semantics remain as before; C1 does not treat opaque namespace JSON as Sanctuary.

Four pre-B2 archives and the accepted pre-B3 Shockwave archive remain unchanged. A new pre-C1 Sanctuary archive was captured through built package exports on the accepted engine0.7 runtime before C1 core edits; it contains6 committed steps/18 events with original region/capture/Stun/expiry hashes. It is labeled TRUSTED_TEST_ONLY AP5 archival data, separate from positive AP0 producer acceptance. Tests re-execute all six archived producers step by step against saved literal events/hashes and independently executeReplay. No old expected hashes were regenerated to accommodate C1.

## Public exported API acceptance and TDD evidence

Reproduce with npm run test -- tests/transference.acceptance.test.ts. [Acceptance runner](../../tests/transference.acceptance.ts) imports only exported package APIs and public types, with a labeled seven-piece TRUSTED_TEST_ONLY board/registered initial Shield and Stun records. Deterministic initial IDs/counters and semantic initial repetition are validated by snapshot restore; AP starts0. Initial attachments are explicitly allowed by the owner's acceptance brief because Turtle cannot cast other producers.

A legal Rook capture earns4 AP; the captured Rook's owner gains3 normally. After legal main/End actions, actual Turtle two-piece command spends exactly4 and one skill slot, swaps both complete sets and preserves all clocks/source. The new allied Stun bearer loses actions/threats; the new enemy Shield bearer atomically rejects a real attempted capture. End before mandatory main rejects; a legal King move completes the turn. Both source colors pass. Every committed command also runs on an independently restored branch; full replay from AP0 compares complete events/state/hash. No fake producer cast or invented AP reward.

Vertical RED→GREEN evidence: missing V3 export/table; absent public factory and strict intent/root wrapper; duplicate concrete ticket initially hit only generic queue budget, then acquired an explicit once-per-root guard; a fabricated static mixed skill initially executed, then gained C1 registration rejection; a future-like registration initially exposed a factory-closure registry mismatch, corrected to use the root's current trusted bundle; absent public runner then real AP0 mirror acceptance. Further contract/regression tables verify existing generic behavior rather than reimplement it in expected values. Typecheck caught fixture readonly/JSON-union/exact-optional typing issues; fixed without changing gameplay.66 new tests across4 files (32 authorization/config,13 integration,19 determinism/archive,2 public acceptance) supplement960 retained baseline tests.

## Independent reviews

Architecture/security/standards:0 actionable findings,0 material smell findings. Gameplay/specification:0 actionable findings. Both independently inspected actual a84467c working-tree diff and all new C1 source/tests/fixture against owner C1 approvals, repo architecture and public API contracts. Reviews were read-only, no tests/build/stage/commit. Both then re-reviewed the final report/status overlays/manifest and strengthened integration tests:0 actionable findings on either axis. Executed-check evidence comes from the parent, not a claimed reviewer test run.

## Verification

| Check | Result |
|---|---|
| npm run lint | PASS exit0; ESLint, boundaries, formatting |
| npm run typecheck | PASS exit0; packages/tooling/all workspaces |
| npm run test | PASS exit0;1026 tests/50 files =960 retained +66 C1 |
| npm run build | PASS exit0; packages/backend/frontend |
| npm run smoke:exports | PASS exit0; four packages ESM/CJS and internal-path blocking |
| npm run smoke:runtime | PASS exit0 via permitted localhost escalation; backend health and frontend HTTP200 |
| npm run check:boundaries | PASS exit0;6 workspaces |
| npm run check:hygiene | PASS exit0; artifact/env/secret-pattern/lockfile |
| git diff --check | PASS exit0; final untracked UTF-8/EOF/whitespace checks also PASS |

No unexecuted check is PASS. No executable or test edits are planned after the final full suite unless a concrete failure/review finding requires a bounded fix and justified re-verification.

## Exact C1 manifest and handoff

24 C1 paths:8 production,7 tests/support/fixture,9 documentation. The pre-existing Coverage Audit is a separate25th working-tree path and is excluded below.

- docs/rebuild/EFFECT_SYSTEM_SPEC.md
- docs/rebuild/GAMEPLAY_SPEC.md
- docs/rebuild/OPEN_DECISIONS.md
- docs/rebuild/PHASE_02B_BATCH_ROADMAP.md
- docs/rebuild/PHASE_02B_C1_TRANSFERENCE_REPORT.md
- docs/rebuild/PHASE_02B_IMPLEMENTATION_PLAN.md
- docs/rebuild/PRODUCER_READINESS_MATRIX.md
- docs/rebuild/VARIANT_CAPABILITY_MATRIX.md
- docs/rebuild/VARIANT_SKILL_INVENTORY.md
- packages/game-core/src/index.ts
- packages/game-core/src/state.ts
- packages/game-core/src/transaction.ts
- packages/game-core/src/transference.ts
- packages/game-variants/src/config/skill-costs.ts
- packages/game-variants/src/index.ts
- packages/game-variants/src/transference.ts
- packages/game-variants/tests/fixtures/pre-c1-sanctuary-replay.json
- packages/game-variants/tests/transference.determinism.test.ts
- packages/game-variants/tests/transference.fixture.ts
- packages/game-variants/tests/transference.integration.test.ts
- packages/game-variants/tests/transference.test.ts
- packages/shared-types/src/index.ts
- tests/transference.acceptance.test.ts
- tests/transference.acceptance.ts

No prior acceptance report is rewritten. Final scope/links/UTF-8/EOF/index/audit-hash verification PASS; exact24-path C1 manifest plus preserved prior audit.299 local links including60 anchor references resolve across the nine C1 documents; all24 C1 files pass strict UTF-8/LF/single-EOF/trailing-whitespace and secret-pattern checks. Existing ignored dist/.next/type caches/node_modules remain outside deliverables. Inventory116 =7 APPROVED/21 PARTIALLY_APPROVED/80 PROPOSED/8 UNKNOWN, with no other approval changed. Index remains empty, HEAD/origin/main unchanged; all C1 changes and the prior audit remain unstaged. No remaining C1 gameplay gate, no automatic next batch. Stop after this report.
