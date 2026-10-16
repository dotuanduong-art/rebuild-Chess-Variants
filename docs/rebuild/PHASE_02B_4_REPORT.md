# Phase 02B-4 — Isolated Batch A integration

2026-10-15. **READY_WITH_CONDITIONS — isolated Batch A consumer foundation.** All concrete producers remain **ENABLED=false / NOT_READY**. Scope is the owner's isolated integration request; no producer skills, new gameplay rules, application/dependency changes or commit/push.

## 1. Files changed in this milestone

| File | Change |
|---|---|
| `packages/game-core/tests/batch-a-fixture.ts` | New separately identified SYNTHETIC_TEST_ONLY ruleset, real consumer schemas/bindings, explicit synthetic producer/eligibility/removal contracts |
| `packages/game-core/tests/batch-a.integration.test.ts` | 32 new integration cases through public root/query/registry/codec/replay seams |
| `docs/rebuild/PHASE_02B_BATCH_A_APPROVED_MANIFEST.md` | Current integration authorization/status and exact remaining gates; historical stop points distinguished |
| `docs/rebuild/PHASE_02B_IMPLEMENTATION_PLAN.md` | G5 delivery/status and next authorization boundary |
| `docs/rebuild/PHASE_02B_4_REPORT.md`, `PHASE_02B_BATCH_A_REPORT.md` | Milestone evidence and bounded Batch A acceptance |

Production source is unchanged from the Phase 02B-3 baseline. Earlier staged/untracked work is preserved and excluded from this milestone's change attribution. No new unresolved gameplay decision is invented or closed; decision registry/spec need no rule changes.

## 2. Fixture authority and interaction matrix

The fixture registers the four actual IDs/categories and actual consumer bindings in its own immutable registry/runtime. Timed profiles `synthetic.alpha`, `synthetic.beta`, `synthetic.other` explicitly allow N=1/3, optional caster and supported incarnation. King attachment allowance, destination exclusion, source refs and cleanup permissions are **SYNTHETIC_TEST_ONLY**, not gameplay approvals. Static skills cost 1 AP. No test fixture enters production exports/default rulesets.

| Interaction | Integration evidence / approved outcome |
|---|---|
| Stun × Shield × Bomb | Mirrored White/Black root attempts: Stunned attacker rejected; un-Stunned quiet moves remain; Shield blocks capture without mutation; forced End rejects when a legal move remains |
| Forced End / skill | All actor moves restricted permits End; test-only cleanse restores legality, retains Shield/Bomb and makes premature End invalid; no automatic End after cleanse |
| Shield × Bomb | Rejected capture emits no events/reaction; committed destruction bypasses Shield and produces one death/reaction/loss reward |
| Stun × Bomb | Stunned bearers die in blasts; source-end expiry does not explode; survivor's Stun and threat suppression persist after chain/caster death |
| Adjacent boundaries / refresh | Shield and Stun expire separately on original source clocks; same-source N reset retains ID/application sequence; other source deadline and permanent Bomb unchanged |
| Two-source overlapping chain | Row-major FIFO victims `v,w,overlap,outer`, Charge then Mine; original sources Black then White; each death/reward once; King survives blast |
| Source lifecycle | Same player/different skill, Variant, caster, player and incarnation remain distinct; refresh collapses only exact tuple. Caster movement/death and explicit synthetic owner/controller conversion preserve captured source |
| Swap / relocation | Different-size, empty, same-clock/cross-clock mixed sets preserve IDs/source/payload/deadline; no Applied/refreshed/removed/explosion facts. Later Charge explodes at new bearer D4 |
| Invalid assignment | Destination rejection and cross-definition family collision reject whole root after candidate AP/RNG work; both original sets retained |
| King | Shielded King capture rejected; after legitimate expiry, committed King capture terminates before its attached Bomb reaction, with adjacent Bomb bearer surviving |
| Unsupported pairs | Shield + arbitrary interceptor rejects `UNSUPPORTED_RUNTIME`; attempted derived capture during Bomb reaction rejects and rolls back |

Exact AP oracles include chain White22/Black23 with owners distinct from controllers/sources; swap/death White21/Black20; fault-free comparison chain White20/Black24. These literal expectations derive from the approved piece-loss rewards and one synthetic skill cost; Bomb destruction never earns capture AP.

## 3. Atomicity, FIFO and internal facts

Fault injection after the second bearer dies enqueues RNG then failure. Queue-budget exhaustion separately rejects the composite state. Both return `events: []` and retain exact canonical full-state bytes, covering board/AP/slots/RNG/IDs/history/effects. Removing the fault yields the independent death/source/AP oracle. No committed death or reaction is synthesized for canceled captures, cleanup or swaps.

Full *King capture while a Bomb cascade is already pending* is not reachable through the supported command surface: derived main Move/Capture is forbidden in `transaction.ts::enqueue`. The test asserts that boundary rather than adding a capture operation/priority. Supported main King capture with retired Bomb is verified separately. Existing terminal guard remains unchanged; no claim that an unsupported mid-cascade capture scenario passed gameplay resolution.

## 4. Snapshot, source projection and replay

Multi-digit operation IDs exposed an incorrect initial raw-array clone oracle. `ENGINE_ARCHITECTURE.md` §6 and `snapshot.ts::encodeSnapshot` intentionally sort collections lexically. Independent reviews agree this is expected canonicalization, not a runtime defect. The corrected test pins literal lexical IDs, compares every full instance by ID, exact canonical bytes/full hash and restored continuation events/hash. No production change or validator weakening.

Stored N, producer/schema/definition versions, source profile, canonical incarnation presence, caster/incarnation consistency, duplicate family import and engine0.4.0 tampering reject through real decode validation. Family collision updates both envelope/instance consistently and asserts `EFFECT_FAMILY_DUPLICATE`. Clones/decoded payloads are isolated and frozen; two match/registry profiles do not share IDs, duration policy state or lookup identity. Wrong ruleset hash rejects.

The mixed-set checkpoint continues through two-source chain and expiry with exact events/hash equality against uninterrupted execution. Recorded replay reproduces all events/hashes; altered explosion attribution rejects `REPLAY_DIVERGENCE`. Relative-clock shifts preserve repetition; family/category/source changes differ, while allocation noise and irrelevant cross-target application order do not. Explicit test-only listeners retain meaningful application/listener order in both events and repetition/replay.

**BLOCKED_ENGINE — precise normalization gate:** `batchDefinitions`' raw-source projector emits `sourcePiece`/`sourceIncarnation`. All three timed synthetic profiles with non-null caster/incarnation, and Bomb profiles with non-null caster refs, therefore remain unsuitable as enabled production profiles until a complete semantic source-graph projection is supplied/verified. A renamed but equivalent board yields equal piece projection and unequal raw-source effect projection. Identity refs are preserved; this diagnostic is not approval of false repetition differences. Null-ref profiles pass relative-time/allocation equivalence. `EffectDefinition.repetitionProjector` currently receives normalized target/group/remaining lifetime, not a source graph context. Permanent Bomb incarnation-bearing parameters are separately unsupported by current lifetime validation.

Engine remains **0.5.0**, state schema **1.0.0**, effect-instance-v1, replay-v1: this milestone changes tests/docs only. Prior-engine snapshots reject; no silent archive migration or arbitrary version bump. Ruleset fixture identity explicitly includes SYNTHETIC_TEST_ONLY and 02b4.

## 5. Review findings and verification

- Standards review: 0 actionable findings / 0 heuristic smells; documentation check found 0 actionable contradictions. Read-only reviewer inspected relevant runtime contracts but could not access the temporary baseline copy for an independent production diff.
- Spec review: 0 actionable findings, including the fixture, 32 integration cases and final document boundaries. Conditional acceptance recommendation is now supported by the completed root checks.
- Production regressions found/fixed: none. Test-only corrections: canonical collection oracle, literal duration typing and discriminated event narrowing; validators/settings unchanged.

| Check actually run | Result |
|---|---|
| Integration focused | PASS — 32 tests / 1 file |
| Related focused: integration + Stun/Shield/Bomb + dispatch | PASS — 149 tests / 5 files |
| Core workspace typecheck; changed-test ESLint | PASS after test-helper literal typing/event narrowing correction |
| `npm run lint` | PASS — ESLint, boundaries, formatting |
| `npm run typecheck` | PASS — packages, tooling and all workspaces |
| `npm run test` | PASS — 447 tests / 27 files; baseline415 retained, +32 / +1 test file |
| `npm run build` | PASS — packages, backend and frontend production build |
| `npm run smoke:exports` | PASS — four packages ESM/CJS; internal paths blocked |
| `npm run check:boundaries` | PASS — six workspaces |
| `npm run check:hygiene` | PASS — artifacts/env, secret patterns and single lockfile |
| `git diff --check` | PASS |

## 6. Remaining gates / stop point

**BLOCKED_RULES:** complete producer profiles still need N where not approved, target/King/special-unit eligibility, mandatory refs/incarnation support, removal/source-invalidated permissions, costs/setup and any gameplay-bearing payload refresh policy. Sanctuary N1/Judgment Chains N3 are numeric evidence only. No re-approval requested for existing source identity/categories/lifecycle/family rules.

**Unsupported/deferred:** Shield redirect/Fate/Phoenix/other interception matrix; hidden Landmine placement/entry/reveal; Aegis/Blessing/category interactions; forced/derived capture, other death causes and full Variant skills. Synthetic observer/cleanse/control seams do not authorize these mechanics.

Handoff: obtain exact producer-field approvals, then separately authorize complete profile/projector/fixture verification before any enablement. Four consumers remain live-disabled. **READY_WITH_CONDITIONS** covers the tested consumer foundation; source-reference normalization and unsupported interaction boundaries remain explicit conditions, not producer readiness. Stop after these reports; no 02B-5/03/04.
