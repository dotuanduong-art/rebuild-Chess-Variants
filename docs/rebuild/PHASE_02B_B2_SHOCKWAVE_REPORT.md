# Phase 02B B2 — Shockwave and centralized skill AP configuration

2026-10-17. **Batch B2 PASS / READY. Shockwave ENABLED only for selected players in its separate pinned experimental factory.** All required verification and independent reviews PASS; no remaining blockers. Starting HEAD/origin/main `ee85b7121d6a97fb1c876baea95273d75d31c95b`, clean index/worktree. B1 was committed before this session; baseline engine0.6.0/state1.1.0,747 tests/36 files. No stage/commit/push, dependencies/scripts/CI/apps changes or next batch.

## Authority and resolved gameplay gates

Recorded before production in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b2--shockwave-approvals-and-cost-consolidation-2026-10-17). Eight scoped approvals: D-22.B2-01.SCOPE, D-22.B2-02.CENTER, D-22.B2-03.AFFECTED, D-08.B2-04.RADIAL, D-08.B2-05.BLOCKED, D-08.B2-06.SIMULTANEOUS, D-06.B2-07.INTERACTIONS, D-22.B2-08.COST_SOURCE. D-22.B2.CENTRAL_AP_CONFIG separately approves only fixed cost consolidation and preserving existing semantics. Parent decisions and siblings/passive remain open.

**D-22.B2.ZERO_DISPLACEMENT:** owner explicitly answered in this session: reject the whole cast with no AP/skill-slot debit. No eligible enemies, all occupied destinations and all off-board results therefore reject NO_DISPLACEMENT. This was recorded before implementing/testing the real producer path. No recommendation or waiting time became approval.

**Geometry proof:** neighbor offset d has components in {-1,0,1}, d≠0 and Chebyshev norm1. Outward one-cell destination has offset2d and norm2. It cannot equal another mover's original adjacent cell or center. Map d→2d is injective, so two valid Shockwave movers cannot share a destination either. Exhaustive225-center/eight-direction checks prove the questioned occupied-vacated and conflict cases unreachable in this approved subset. No general chain-push/vacated-cell policy is introduced. Forged conflicting/overlapping batches are invalid operations and reject atomically.

## Pins, operation and root behavior

- Canonical Variant: dragon_sentinel, already documented in VARIANT_PLUGIN_SPEC §3/inventory V25; no legacy gameplay inferred.
- Stable new skill: dragon_sentinel.shockwave.
- Factory: createShockwaveExperimentalRuleset({white,black}).
- Profile: dragon-sentinel.shockwave-only.experimental v1.0.0.
- Ruleset: experimental-dragon-sentinel-shockwave-v1-w{0|1}-b{0|1}, v1.0.0.
- Internal operation: forced_reposition schema1.0.0; closed cause shockwave-v1.
- Exact source: invoking player/dragon_sentinel/dragon_sentinel.shockwave/null/null; selected center is not a caster.

Only trusted explicit boolean selections receive the profile. Frozen factory/profile/capability/skill configuration has no shared match state. Root and restore enforce selection/pins; no default registration or mixed factory. No sibling/passive, effect definition or setup attachment is registered.

Pure planner validates current actor, exact profile/skill, unused slot, AP>=4, piece-target-v1 and live own-current-controller ordinary-original non-King center. Range/line of sight do not constrain center selection. The pure core radial query selects only opposite-current-controller ordinary-original non-Kings in eight neighboring cells; all unaffected occupants still block destinations. Off-board/occupied candidates stay while independently valid moves succeed. Zero result rejects before returning a paid plan. Root alone debits fixed4 and one normal skill slot; main move remains mandatory under the existing shared legality/forced-End pipeline.

The derived batch carries explicit from/to/source/center and moves only board positions. Root independently parses a strict operation, checks originating root skill/intent, current actor/profile/exact source/null refs and opt-in capability, recomputes the full assignment from its candidate snapshot and compares all moves. Reordered valid assignments canonicalize by original coordinates; missing/extra/forged/duplicate targets or wrong destinations reject. Only one forced batch per root is allowed. createBoard constructs the simultaneous final board, preserving every other piece field and one-piece-per-cell integrity. No sequential board mutation or normal Move/Capture event occurs.

One pieces_repositioned fact contains center, canonical moves and exact typed cause/source, with existing root operation/cause IDs. Existing event processing still runs; it is not globally suppressed or masqueraded as normal movement. Failure in any later queue operation, RNG, final validation or budget rolls back AP/slots/board/effects/RNG/IDs/history/events. Independent retry equals restored execution.

## Effect and entry boundaries

Stun, Shield and Bomb consumer source is unchanged. Test-only composition applies their existing exact definitions, then casts the real Shockwave: Stunned/Shielded bearer moves, attachments/IDs/payload/source/deadlines remain byte-identical, no explosion/removal/reward. Stunned center remains a valid player-originated skill target. Shield still blocks a later ordinary capture; subsequent committed destruction still explodes Bomb at its new actual death position and gives only approved loss AP. No King is displaced/killed; a Pawn landing on promotion rank remains Pawn without promotion AP.

After constructing the final board, core revalidates effect runtime/link integrity and every declared eligibility binding against the final state. A test-only position-bound Shield eligibility rejects the whole root. This is piece movement, not effect-set relocation, so no P00-03 swap/apply/expiry semantics are borrowed.

Ruleset mandatoryEntryConsumers is an explicit fail-closed declaration boundary: any declared mandatory trap/portal/terrain/hidden consumer has no approved B2 cause policy and rejects UNSUPPORTED_FORCED_REPOSITION_INTERACTION. A declared forced-reposition legality policy is also unsupported in this bounded profile. No entry dispatcher, hidden object, trap/portal activation or new consumer is implemented. Undeclared arbitrary plugin code is not sandboxed; reviewed rulesets must declare mandatory consumers. Existing ordinary-movement semantics are unchanged.

## Central AP configuration and compatibility

One authored table in packages/game-variants/src/config/skill-costs.ts: SKILL_AP_COSTS_V1 = Holy Shield4, Live Charge3, Judgment Chains5, Holy Seal6, Shockwave4, keyed by exact stable skill IDs. It is typed, copied and runtime-frozen. pinFixedSkillCosts rejects negative/fractional/unsafe/nonfinite authored values, then checks the existing core canonical encoder/fingerprint against immutable v1 pin2a56da8ff953d29b. The fingerprint is diagnostic, not cryptographic authorization. No client/factory cost override exists. All real planners read this v1 artifact; existing producer source edits replace only inline costs, leaving target/source/lifecycle/root/slot logic and original profile/ruleset identities intact.

Historical values must never be edited in place. An approved balance change adds another retained artifact and a new versioned ruleset/factory identity; old matches/archives continue dispatching to v1. Editing v1 values under its existing signature fails closed. Importing a mutable latest config is not an archive strategy, and this module provides no remote balancing service. Four actual pre-refactor replay archives captured from accepted ee85b71 are pinned as test fixtures; their original snapshots, costs, exact events and final hashes execute unchanged after consolidation.

Retain **engine0.6.0/state1.1.0/effect-instance-v1/replay-v1**. No stored GameState field or old command meaning changed; the new internal operation/cause/event is reachable only through an explicit new ruleset capability/profile, under a new ruleset identity. Old accepted factories omit it and their recorded streams remain byte-identical. New archives require the new pinned Shockwave ruleset/operation-v1; old runtimes cannot substitute an old ruleset because hashes/profiles differ. Incompatible engine/state/profile/ruleset/definition pins still reject. This is an opt-in extension, not silent interpretation of historical streams.

## TDD and public acceptance

Focused105 new tests/5 files before reviews:11 AP/config/archive tests,5 core geometry/root/purity tests,33 Shockwave authorization/center/AP/slot tests,53 operation/interaction/determinism tests,3 public acceptance cases. Red→green evidence: missing cost table; missing cost validation/pin; missing radial query; absent root operation; missing real factory; missing acceptance harness. Typecheck caught one impossible effect-restriction comparison (the existing closed schema permits main/threat only) and an unused test import; both corrected without widening gameplay. Existing producer focused169/4 files also PASS after replacing costs. A further red/green regression caught the radial query freezing an aliased caller position; it now copies from-coordinates before freezing the returned plan, preserving mutable caller snapshots unchanged.

Reproduce using package exports:

```powershell
npm run test -- tests/shockwave.acceptance.test.ts --reporter=verbose
```

Harness uses a clearly labeled TRUSTED_TEST_ONLY eight-piece initial board; AP starts0 normally. Source Rook legally captures opponent Rook to earn4; owner receives3 loss AP. Legal turns reach the cast. Real Shockwave spends4/source AP0/opponent3, moves enemy I9→J10 (Black mirror I7→J6), keeps G8 enemy blocked by occupied F8, leaves center/obstacle/Kings unchanged, emits one exact source/cause batch and no capture/death/reward/effect fact. Main remains mandatory; an End attempt rejects. A pre-cast snapshot independently executes the cast and subsequent mandatory move, comparing full results/events/state each time; committed replay independently runs from AP0 and compares exact events/final hashes/semantic projections. White/Black and renamed match/piece runs pass. Archive fixtures' preseeded AP is separately labeled test-only and never used for this public positive path.

## Exact changed files

| Group | Files |
|---|---|
| Shared contracts | packages/shared-types/src/index.ts |
| Core | packages/game-core/src/forced-reposition.ts; packages/game-core/src/transaction.ts; packages/game-core/src/index.ts |
| Variant/config | packages/game-variants/src/config/skill-costs.ts; packages/game-variants/src/shockwave.ts; packages/game-variants/src/index.ts; packages/game-variants/src/holy-shield.ts; packages/game-variants/src/live-charge.ts; packages/game-variants/src/stun-producers.ts |
| Tests/fixtures | packages/game-core/tests/forced-reposition.test.ts; packages/game-variants/tests/skill-costs.test.ts; packages/game-variants/tests/fixtures/pre-b2-producer-replays.json; packages/game-variants/tests/shockwave.fixture.ts; packages/game-variants/tests/shockwave.test.ts; packages/game-variants/tests/shockwave.integration.test.ts; tests/shockwave.acceptance.ts; tests/shockwave.acceptance.test.ts |
| Docs | docs/rebuild/OPEN_DECISIONS.md; docs/rebuild/GAMEPLAY_SPEC.md; docs/rebuild/EFFECT_SYSTEM_SPEC.md; docs/rebuild/PHASE_02B_BATCH_ROADMAP.md; docs/rebuild/PRODUCER_READINESS_MATRIX.md; docs/rebuild/VARIANT_SKILL_INVENTORY.md; docs/rebuild/VARIANT_CAPABILITY_MATRIX.md; docs/rebuild/PHASE_02B_IMPLEMENTATION_PLAN.md; docs/rebuild/PHASE_02B_B2_SHOCKWAVE_REPORT.md |

27 paths:10 production,8 test/support/fixture and9 documentation. No existing tests weakened or rewritten; no legacy/reference/dependency/package scripts/apps/CI source changes. Golden archive JSON is intentional regression data, not build output. No staged changes or commit/push.

## Verification and reviews

All commands below actually ran with the existing pinned dependencies. No executable change followed the passing full suite; final edits only record documentation acceptance.

| Required check | Actual result |
|---|---|
| npm run lint | PASS exit0; ESLint, boundaries, formatting |
| npm run typecheck | PASS exit0; packages, tooling, all workspaces |
| npm run test | PASS exit0;852 tests/41 files, all747 accepted baseline cases retained |
| npm run build | PASS exit0; packages/backend/frontend production build |
| npm run smoke:exports | PASS exit0; four packages ESM/CJS, internal paths blocked |
| npm run smoke:runtime | PASS exit0 through environment-approved localhost escalation; backend /health HTTP200/exact JSON and frontend HTTP200/starter content |
| npm run check:boundaries | PASS exit0; six workspaces |
| npm run check:hygiene | PASS exit0; artifacts/env/secret-pattern/single-lockfile |
| git diff --check | PASS exit0; repeated after final docs; new untracked file whitespace checked separately |

The runtime smoke needed localhost access outside the restricted sandbox; the exact unchanged repository script passed through approved escalation. No environment-blocked check is counted as PASS. Public gameplay acceptance runs without servers/network. Existing producer focused regression169/4 and four original pre-B2 archive replays PASS; Stun/Shield/Bomb consumers were not edited.

**Independent Standards/architecture review:**0 actionable findings, no material code-smell findings. Reviewed pure core boundaries, root-only atomic mutation, independent source/profile authorization, simultaneous board construction, fail-closed entry handling, immutable AP configuration, historical archives and scope.

**Independent gameplay/specification review:**0 actionable findings. Checked B2-01…08, explicit zero-displacement owner answer, geometry proof, targets/controller/provenance/King, AP/slot/source, malformed/forged batches, effect attachment constraints, public AP0 acceptance, cost consolidation and version rationale against the owner brief. Both reviews covered accepted HEAD ee85b71 plus tracked diffs and every untracked B2 file; reviewers made no edits and ran no tests/builds/staging/commit/push.

Final metadata validation: exact27-path manifest, UTF-8, single final newline, tracked/untracked whitespace, documentation links/anchors,116 inventory records =5 APPROVED/23 PARTIALLY_APPROVED/80 PROPOSED/8 UNKNOWN, no secret-pattern/generated/dependency/script/CI/app changes. Index stays empty; HEAD/origin/main remain ee85b7121d6a97fb1c876baea95273d75d31c95b. No stage/commit/push.

## Remaining boundaries and next safe step

No remaining Shockwave gameplay ambiguity after the owner zero-displacement answer and geometry proof. Technical acceptance is complete; Shockwave is enabled only in its exact selected experimental factory. Full Dragon Sentinel, Dragon Guard/Escape/Roar, other forced producers, chain-push/damage, teleport/portal/hidden entry, new AP economy, mixed factories and Phase03/frontend/multiplayer remain disabled/outside scope. Existing broader D-* questions stay open.

Next safe recommendation is an owner decision freeze for B3 Sanctuary: precise region geometry/placement/occupancy/category/visibility/source/overlap/recast/capture-context/King/removal/cost, preserving confirmed region3/generated Stun1. Do not start B3 automatically. Stop after this B2 report.
