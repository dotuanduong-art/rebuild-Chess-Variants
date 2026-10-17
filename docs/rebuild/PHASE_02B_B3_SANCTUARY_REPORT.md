# Phase 02B B3 — Guardian Sanctuary acceptance

2026-10-17. **Batch B3 PASS / READY. Sanctuary ENABLED only for selected players in the separate pinned experimental factory.** All required checks/reviews PASS; no remaining B3 blockers. Accepted B2 working-tree baseline: engine0.6.0/state1.1.0,852 tests/41 files,27 uncommitted B2 paths, HEAD/origin/main ee85b7121d6a97fb1c876baea95273d75d31c95b; empty index. Preserve B2; no stage/commit/push, B2-only checkpoint, next batch or Phase03.

## Owner authority and bounded profile

Recorded before production/tests in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b3--guardian-sanctuary-owner-approvals-2026-10-17). All12 owner approvals are explicit: D-22.B3-01.SCOPE,02.PLACEMENT,03.GEOMETRY,04.COST,05.RECAST; D-04.B3-06.TRIGGER_A,07.KING; D-05.B3-08.SOURCE_LIFETIME; D-06.B3-09.REMOVAL; D-04.B3-10.SHIELD; D-12.B3-11.BOMB; D-05.B3-12.OVERLAP. No inferred gameplay approval or unresolved necessary B3 decision.

Only separate selected Sanctuary-only Guardian, no Holy Shield combination/Holy Aura/Divine Shield/full Guardian. Any one valid cell, occupied/King center allowed, unlimited distance/no caster. Public fixed3x3 clipped square; no wrap/following piece. Fixed5 AP, one skill slot, normal mandatory main move. One active region/source, recast replaces only that source/resetN3/new center; opposite sources may overlap. Source player/guardian/guardian.sanctuary/null/null is stable through recast and all generated Stuns.

Region removal only natural expiry, same-source recast and terminal. Generated empty-payload StunN1 uses existing exact-source refresh/independent cross-source matching; only independent expiry/bearer death/terminal removal. No cleanse/dispel/source-invalidated/parent cleanup or reward. RegionN3 and StunN1 use original source-end with no creation-boundary tick. Region expiry/replacement never executes an effect removal operation.

## Stable pins and cell/region contracts

| Artifact | Pin |
|---|---|
| Variant/skill | guardian / guardian.sanctuary |
| Factory/profile | createSanctuaryExperimentalRuleset({white,black}); guardian.sanctuary-only.experimental v1.0.0 |
| Ruleset | experimental-guardian-sanctuary-v1-w{0\|1}-b{0\|1}, v1.0.0 |
| Region | region.guardian.sanctuary v1.0.0; sanctuary-region-v1 |
| Intent/internal cast | cell-target-v1; sanctuary_cast schema1.0.0 |
| Capture context | ordinary-committed-capture-v1 |
| Stun producer/definition | guardian.sanctuary.stun v1.0.0 / effect.stun v1.0.0, N1 |
| Execution/storage | Sanctuary engine0.7.0 / state1.1.0; historical factories engine0.6.0 / state1.1.0 |
| Cost artifact | composed SKILL_AP_COSTS_V2; canonical FNV1a64 diagnostic pin e268dfc077cf52ff |

Strict cell-target intent permits only kind/cell, with exactly two bounded integer coordinates. Root rejects extra client cost/source/IDs/duration/operations/effects/events. Existing piece-target planners keep their original semantics. Engine0.6 explicitly rejects cell-target-v1 as INVALID_COMMAND, preserving its original command boundary.

Each per-player variantState.guardian.sanctuary slot holds one strict public region record: versioned type/format, deterministic operation ID, exact source, fixed cell, visibility, source-end anchor/deadline. No new top-level state field; no piece effect/hidden trap. Root/encode/decode validate source-player slot, selected profile, ID namespace/counter, geometry, versions, public visibility, valid source ordinal and deadline=anchor+3; malformed/duplicate/stale records reject. Query results are frozen copies and never freeze caller input. Recast gets a fresh root operation ID and emits old removed/replaced then new created; no stale record/registry is retained. Board movement and piece-effect relocation cannot move the region.

## Concrete committed capture and FIFO integration

TriggerA is evaluated only after ordinary root Move capture actually commits, with authoritative pre-death victim/controller/coordinate and pre-commit attacker controller. Frozen context contains root transaction, operation, cause and actual capture event IDs, attacker/player, victim/controller, capture destination, terminal status and eligible original region snapshot/source. It is separate from Bomb's private retired-attachment death transport. No synthetic-v1 callback or arbitrary concrete capture registration API is introduced.

Eligibility requires opposite capturing player, victim controller=region source, committed destination inside region. Starting cell/owner never substitute. Victim provenance is unrestricted by these approvals; King victim is eligible for protection, but actual King capture terminates before reaction registration. Attacker must still be alive/ordinary-original/non-King at application; a legitimately dead/ineligible attacker produces an explicit attacker-unavailable fact. Missing registration/runtime or programming errors reject, not silent skips.

Existing defense/base commit/King terminal/AP/move/death facts and Bomb ticket insertion order are preserved. Sanctuary tickets append after the existing committed-death tickets; root FIFO expansion is unchanged. A Bomb ticket emits its blast and appends destruction behind already queued Sanctuary work: the attacker can receive Stun before the later blast destroys it and normal bearer-death cleanup removes it. Earlier queued committed destruction instead retires it before Sanctuary, producing the explicit skip. The reaction ticket converts directly to the existing effect-application path so liveness validation/application have no intervening queue gap. All generated effect facts remain root-atomic.

Capture-canceled Shield produces CAPTURE_DEFENDED/no committed fact/AP/slot/Stun. Bomb/derived/system destruction never enters TriggerA. Bomb sources/chain FIFO and owner loss rewards remain unchanged. King terminal suppresses all queued Sanctuary/Bomb reactions; region/effects clean up after committed capture facts. B3 engine0.7 also cleans region/generated effects when ActionReady produces a threefold terminal, without running reactions; the old0.6 execution branch is retained unchanged.

Relevant capture attempts with active Sanctuary plus arbitrary interceptors or declared mandatory trap/portal/terrain/entry consumers fail UNSUPPORTED_SANCTUARY_INTERACTION. No general entry/attack/priority framework is enabled. Undeclared arbitrary plugin code is not sandboxed; trusted ruleset review remains required.

## Overlap, Stun independence and deterministic state

TriggerA fixes source as both opposite(capturing player) and victim controller. Two players plus one region/source imply at most one eligible region/capture even when both3x3 regions overlap. Tests prove both capturing colors, one fact/effect and one eligible region in the context. Internal ticket dedup is per actual committed capture event/region; client/event injection cannot schedule concrete tickets.

Two real opposing captures produce coexisting White-source and Black-source Stuns with independent expiry. Technical, explicitly labeled effect-transport fixtures additionally verify stable-ID same-source refresh and same-bearer cross-source coexistence; they are not positive producer acceptance or fabricated captures. A Stunned ordinary bearer cannot make another ordinary capture before its restriction expires; no unrestricted stacking mechanism was added to simulate an unreachable double capture.

Recast leaves existing Stun records/source/deadlines byte-identical. A capture late in region life can make region and Stun expire at the same source boundary, each with its own expired fact and no parent reference. Under normal alternating TriggerA/N1 clocks, a naturally expiring region cannot leave a longer-lived newly generated Stun; tests verify independent schedulers/removal reasons rather than inventing a longer duration.

Semantic projection retains active region definition/source/center/visibility/remaining duration and existing Stun semantics, dropping allocation IDs/absolute anchors. Coherent match/piece/operation renaming and board enumeration changes preserve semantic keys; center/source/remaining duration/Stun presence negative pairs differ. Full-state hashes retain identities. Snapshots clone independently, and each continuation/replay actually executes the authoritative root.

## Cost and historical compatibility

V1's five values and fingerprint2a56da8ff953d29b remain intact. In the same dedicated module, V2 composes V1 plus guardian.sanctuary5 and pins e268dfc077cf52ff. Both are copied/typed/runtime immutable; invalid numbers or edited values under a retained pin fail closed. Existing five factories continue reading V1 and keep their original hashes/profiles. Future balance changes retain these artifacts and add a new reviewed artifact plus new ruleset identity; no mutable latest/global override or client cost.

New execution uses explicit engine0.7.0 because region scheduling/cell command/concrete capture semantics extend the root. Existing factories remain on exact0.6.0; create/root/restore bind the engine and exact capability/profile. New archives cannot execute as old rulesets/engine. State1.1.0 is retained because public region is a strictly versioned record in an existing plugin-owned JSON namespace, not a changed top-level field or old field meaning; old0.6 keeps that namespace opaque/codec-only and cannot execute the new region capability. Replay/effect envelopes stay v1, RNG unchanged. No automatic migration of old snapshots/replays.

Four pre-B2 producer archives and one genuine pre-B3 Shockwave archive execute with their original0.6.0 snapshots, events, costs and hashes. The Shockwave archive was recorded before B3 code from accepted B2 using a labeled AP4 technical fixture; public Sanctuary acceptance never seeds AP. Existing Stun/Shield/Bomb consumers and five producer implementations are unchanged; the B2 forced-reposition helper only narrows piece-target intent after the new union was introduced.

## Public API acceptance and TDD

Reproduce: npm run test -- tests/sanctuary.acceptance.test.ts. The runner uses only package exports, a labeled TRUSTED_TEST_ONLY seven-piece board and normal AP0. Source Rook legally captures Queen for5 AP; opponent earns4 loss AP. After legal intervening main actions, real Sanctuary spends5. Opponent Rook arrives from H10 (Black-source mirror H6) and captures source Pawn at H8 inside region, generating exact-source empty StunN1. Only Pawn capture2/owner loss1 are awarded. Public main-action/capture-threat restrictions suppress the actual Stunned Rook, and a real I8 target becomes threatened after expiry. Main remains mandatory. Advance opponent/source boundaries, proving Stun expiry before independent region expiry.

Both source colors and coherent ID renaming pass. Every committed command runs independently on a restored branch; post-cast snapshot restore continues through capture/expiry, comparing complete results/state/events. RecordReplay/executeReplay independently run the full AP0 committed sequence and compare exact events/hashes/final state. No injected region or fake Stun in this positive path.

Focused B3 tests:108 cases/5 files (2 geometry/purity,49 authorization/config/codec/recast,39 capture/interactions,15 determinism/failure/versions,3 public acceptance). Red-to-green slices covered absent config extension, absent geometry query/factory, missing region expiry/capture reaction, missing concrete registration/invalid anchor, duplicate casts/cause identity, King fact/cleanup ordering, threefold cleanup, malformed internal operation and unsupported entry composition, missing public runner. Typechecks ran regularly. Earlier focused combined producer regression507/18 files PASS; final full suite/reviews follow below. No baseline tests rewritten/weakened. The first full959/46 pass was followed by a focused red/green compatibility regression: historical0.6 JSON in guardian.sanctuary must remain opaque, not be interpreted/rejected as a new region. Namespace interpretation and reserved writes are now gated to0.7; the historical opaque snapshot/replay passes. Final full verification was repeated because of this justified source change.

## Exact B3 incremental file manifest

| Group | Files |
|---|---|
| Shared | packages/shared-types/src/index.ts |
| Core | packages/game-core/src/index.ts; packages/game-core/src/state.ts; packages/game-core/src/transaction.ts; packages/game-core/src/forced-reposition.ts; packages/game-core/src/sanctuary-region.ts; packages/game-core/src/committed-capture.ts |
| Variant/config | packages/game-variants/src/index.ts; packages/game-variants/src/config/skill-costs.ts; packages/game-variants/src/sanctuary.ts |
| Tests/support | packages/game-core/tests/sanctuary-region.test.ts; packages/game-variants/tests/sanctuary.fixture.ts; packages/game-variants/tests/sanctuary.test.ts; packages/game-variants/tests/sanctuary.integration.test.ts; packages/game-variants/tests/sanctuary.determinism.test.ts; packages/game-variants/tests/fixtures/pre-b3-shockwave-replay.json; tests/sanctuary.acceptance.ts; tests/sanctuary.acceptance.test.ts |
| Docs | docs/rebuild/OPEN_DECISIONS.md; docs/rebuild/GAMEPLAY_SPEC.md; docs/rebuild/EFFECT_SYSTEM_SPEC.md; docs/rebuild/PRODUCER_READINESS_MATRIX.md; docs/rebuild/VARIANT_SKILL_INVENTORY.md; docs/rebuild/VARIANT_CAPABILITY_MATRIX.md; docs/rebuild/PHASE_02B_BATCH_ROADMAP.md; docs/rebuild/PHASE_02B_IMPLEMENTATION_PLAN.md; docs/rebuild/PHASE_02B_B3_SANCTUARY_REPORT.md |

27 B3 paths:10 production,8 tests/support,9 docs. Combined B2+B3 manifest is the union of these27 and the accepted [B2 report's27](PHASE_02B_B2_SHOCKWAVE_REPORT.md#exact-changed-files):40 distinct paths. No dependencies/scripts/CI/apps/legacy changes, secret material or generated build output in deliverables. Intentional archive JSON is regression data. Index remains empty.

Initial temporary B2 backup did not persist across isolated command sandboxes. For incremental review, a normalized B2 source baseline was reconstructed from ee85b71, the27-path accepted report, exact B2 hunks read in this conversation and unchanged B2 files, under ignored packages/game-core/dist/b3-review-b2-baseline. This is explicitly not an original-start byte-hash attestation. Reviews compare both that reconstructed incremental diff and the complete git diff ee85b71 plus every untracked file. B2 report/tests/old producer source remain untouched; actual archive and behavioral regressions independently verify preservation.

## Verification and independent reviews

All required commands actually ran on the final source. No executable/test change followed the final full960/46 pass; final edits record documentation acceptance only.

| Required check | Actual result |
|---|---|
| npm run lint | PASS exit0; ESLint, boundaries, formatting; repeated after final compatibility fix |
| npm run typecheck | PASS exit0; packages/tooling/all workspaces; repeated after final compatibility fix |
| npm run test | Final PASS exit0;960 tests/46 files =852 retained B2 +108 B3; repeated because of the documented post-review source correction |
| npm run build | PASS exit0; all packages/backend/frontend on final source |
| npm run smoke:exports | PASS exit0; four packages ESM/CJS exports, internal paths blocked |
| npm run smoke:runtime | PASS exit0 through environment-approved localhost escalation; backend /health HTTP200/exact JSON, frontend HTTP200/starter content |
| npm run check:boundaries | PASS exit0; six workspaces |
| npm run check:hygiene | PASS exit0; tracked artifacts/env, secret-pattern/single-lockfile checks |
| git diff --check | PASS exit0, repeated after final documentation; untracked UTF-8/EOF/trailing whitespace checked separately |

Runtime smoke used the exact unchanged script with approved localhost access outside the restricted sandbox. No environment-blocked/unexecuted check is counted as PASS. Public producer acceptance is server/network independent.

**Independent Standards/security/architecture:**0 actionable findings; no material Fowler smell. Reviewed accumulated B2+B3 diff, all untracked deliverables and reconstructed normalized B3 incremental diff. Confirmed pure planners/root-only atomic writes, strict records/source isolation, immutable capture context distinct from Bomb, FIFO/terminal guards, snapshot/repetition, cost artifacts and explicit version boundaries. Post-review legacy namespace correction independently re-reviewed:0 findings.

**Independent gameplay/specification:**0 actionable findings. Reviewed12 owner approvals, TriggerA actual cell/current controller, N3/N1 independence, recast/overlap/source refresh, King/Shield/Bomb semantics, AP0 real acceptance, historical archive/config compatibility and both diff scopes. Post-review historical opaque namespace correction independently re-reviewed:0 findings. Both reviewers were read-only and ran no tests/builds/staging/commit/push.

Final documentation/manifest checks validate10 accumulated documents and their local links/anchors,116 inventory records (6 APPROVED/22 PARTIALLY_APPROVED/80 PROPOSED/8 UNKNOWN), exact27 B3 incremental/40 combined paths, UTF-8/single final newline/tracked and untracked whitespace. B2 report/tests/old producer files remain untouched. No dependency/scripts/CI/apps/legacy or secret/generated deliverables. HEAD/origin/main remain ee85b7121d6a97fb1c876baea95273d75d31c95b; index empty. The temporary-backup/reconstructed-comparison limitation is disclosed above; it is not presented as an original-byte attestation.

## Unsupported cases and combined checkpoint handoff

No Holy Aura/Divine Shield/full/mixed Guardian, arbitrary aura/region DSL, derived attack, new capture priority, hidden trap, portal/terrain, unapproved entry consumers, new King/AP rules, unrelated producers, networking/frontend/3D/Phase03. No automatic next batch.

After B3 acceptance, wait for a separate explicit combined B2+B3 checkpoint instruction. That audit must start from actual HEAD/index/worktree, stage only its accepted union manifest after verification, compare staged blobs/tree and stop without commit/push unless separately authorized. No B2-only commit/checkpoint or staging occurs in this milestone. Stop after this B3 report.
