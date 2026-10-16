# Phase 02B-6 — bounded Live Charge producer acceptance

2026-10-16. **PASS — Live Charge functional acceptance and final runtime verification complete.** Baseline checkpoint `de00b07`: engine0.6.0/state1.1.0,553 tests/30 files. Accepted root611 tests/33 files PASS (+58), all required engine verification PASS. The initial restricted-sandbox runtime smoke failed with loopback EACCES; the owner-authorized final run outside that sandbox passed both backend and frontend HTTP checks, resolving the remaining condition. Documentation-first approvals and both independent reviews complete. No commit/push, dependency/app/transport changes or next milestone.

## Approvals and files

Six owner answers recorded before implementation: `D-22.FIRST_PRODUCER.SCOPE / Dynamite`; `D-22.DYNAMITE.LIVE_CHARGE.PROFILE / targets`, `/ cost`, `/ duplicate cast`; `D-05.FIRST_PRODUCER.SOURCE_PROFILE / Live Charge`; `D-06.FIRST_PRODUCER.REMOVAL_PROFILE / Live Charge`. These are producer-specific subsets; previous Guardian answers and unresolved parent branches are preserved. Gameplay APPROVED is separate from implementation/enablement acceptance.

Exact12 changed/new files:

- `packages/game-variants/src/live-charge.ts`: complete Charge registration, pure trusted planner, immutable bounded factory/profile.
- `packages/game-variants/src/index.ts`: export factory/profile; existing Holy Shield export unchanged.
- `packages/game-variants/tests/live-charge.test.ts`:29 real-producer authorization/target/AP/slot/profile/codec/isolation tests.
- `packages/game-variants/tests/live-charge.integration.test.ts`:26 producer-to-consumer/family/relocation/source/death/rollback/replay tests.
- `tests/live-charge.acceptance.ts`: exported-package developer runner; no synthetic producer/effect injection in its positive path.
- `tests/live-charge.acceptance.test.ts`:3 mirrored public-workflow/allocation-equivalence cases.
- `docs/rebuild/OPEN_DECISIONS.md`: six scoped approvals and acceptance status.
- `docs/rebuild/EFFECT_SYSTEM_SPEC.md`: current Live Charge contract overlay.
- `docs/rebuild/FIRST_PRODUCER_APPROVAL_MATRIX.md`: approved per-field overlay, historical5A evidence retained.
- `docs/rebuild/PHASE_02B_BATCH_A_APPROVED_MANIFEST.md`: approval/implementation/enablement separation.
- `docs/rebuild/PHASE_02B_IMPLEMENTATION_PLAN.md`: bounded work order and completion/handoff.
- `docs/rebuild/PHASE_02B_6_LIVE_CHARGE_REPORT.md`: this report.

No Game Core/shared-types/old Holy Shield implementation, package scripts, dependencies or backend/frontend source changed. The new planner uses the existing authoritative root pipeline; no framework or transaction refactor was needed.

## Real factory and execution

Public `createLiveChargeExperimentalRuleset({ white, black })` accepts explicit trusted boolean selections. It pins exported `LIVE_CHARGE_EXPERIMENTAL_PROFILE` = `dynamite.live-charge-only.experimental` v1.0.0 and ruleset hash `experimental-dynamite-live-charge-v1-w{0|1}-b{0|1}`. Selections are copied/frozen, persisted in GameState by existing APIs, validated on every root/restore, and included in repetition. Each factory owns a fresh immutable registry/runtime; no global Variant/state or mutable counters. Only `dynamite.live_charge` is registered; only `effect.bomb.charge` is in its registry. **IMPLEMENTED / READY / ENABLED exclusively for selected players in this factory.** No initial Bomb/AP bonus. Unselected players reject; Holy Shield-only and Dynamite-only factories cannot invoke each other's skill. This milestone adds no combined/multiple-profile selection system.

Package-internal pure `planLiveCharge(context, registry)` checks current player, exact profile/skill, unused slot, AP>=3, piece-target-v1 intent, live controlled target, authoritative ordinary-original provenance, non-King type and absence of any declared Bomb family. It returns cost3 and exactly one typed effect_apply. Root's existing normal-skill execution alone debits AP/slot and validates/applies the effect. Main move remains mandatory; before/after-main ordering and auto-end are unchanged. Strict command validation rejects forged source/cost/duration/operations. Generic validation still runs after planning; rejected application rolls everything back.

Already-Bombed target returns `TARGET_ALREADY_BOMBED`, with no AP/slot/effect/ID/RNG/history/events mutation. Test-only Mine and cross-source fixtures exercise the family check using the same real planner. Generic family application still ignores duplicates without an Applied fact or new effect instance; no consumer semantics changed. Root operation IDs remain distinct from effect-instance allocation.

## Consumer, source, death and cross-effects

Registration reuses `BOMB_CONSUMER_CONTRACTS.charge`, `BOMB_PAYLOAD_SCHEMA`, `BOMB_DEATH_REACTION_BINDINGS` and its existing `planBombBlast` route: BUFF/public/piece/unlinked/permanent/family bomb. Versioned player-originated-v1 guard requires original player/dynamite/dynamite.live_charge/null/null. Empty immutable payload; no duration parameter/deadline. Only target_destroyed/match_terminal cleanup permissions; explicit cleanse/dispel/source invalidation/consume/replace/link removal remain forbidden.

Cast allegiance is checked once. Continuing eligibility requires ordinary-original non-King, independent of current controller. Swap/relocation preserves ID/source/payload/permanent data; invalid King/provenance destinations reject atomically. No Turtle/control skill is enabled; those operations use explicitly labeled trusted test-only transport.

Real charged bearers trigger the existing committed capture/destruction death snapshot and FIFO source-bearing reaction. Blast uses actual death coordinate/current occupants, both teams/capturer, never King. Tests move bearer D1→D4 before capture; literal blast victim order is C4 ally, D4 capturer, E5 enemy. Two real source players' Bombs chain independently; sourceB destroys a victim outside sourceA's blast with sourceB attribution. Overlapping deaths/accounting occur once. Owner loss AP only for destruction, capture reward only for committed capture; no refund/passive. Shield-blocked capture yields CAPTURE_DEFENDED with exact rollback/no explosion, while destruction still reacts. Terminal King capture cleans attachments without explosion or King AP. Existing unsupported causes/interactions retain fail-closed guards.

Fault tests cover post-plan generic eligibility rejection, late candidate failure after AP/slot/effect/RNG/history work, operation-budget exhaustion and mid-chain failure. All return events=[] and preserve the exact original full snapshot; cloned retry equals uninterrupted execution. Probe rulesets are test-only and are not production factory outputs.

## Public acceptance and deterministic compatibility

Reproduce from repository root with installed pinned dependencies:

```powershell
npm run test -- tests/live-charge.acceptance.test.ts --reporter=verbose
```

Runner imports only package exports: variants factory; core createBoard/createGame/coordinateFromAlgebraic/resolveCommand/decodeEffectRecords/encodeSnapshot/decodeSnapshot/cloneSnapshot/fullStateHash/recordReplay/executeReplay; shared PieceIdSchema/types. Reduced seven-piece ordinary board is explicitly TRUSTED_TEST_ONLY, not a standard60-piece setup. AP starts0; the Rook legally captures an opponent Knight to earn3, and its owner receives2 loss AP. After legal turns, real Live Charge costs exactly3, consumes only the skill slot, then the bearer moves and is captured. No grant, fake executor or positive-path attachment injection.

| Outcome | Literal expected / actual focused PASS |
|---|---|
| Funding | Source3/opponent2 AP |
| Cast | Source0/opponent2; one permanent Charge, exact original null-caster source; events skill_used/ap_changed/effect_applied |
| Bearer moves | D3→D4 (mirrored D13→D12); main+skill completes turn |
| Capture/blast | Bearer captured, nearby ally/capturer/enemy destroyed, both Kings survive |
| Final AP | Source5/opponent11; owner loss rewards counted once, no destruction capture/passive reward |
| Commands |7 for White source,9 for Black source (White-first legal prelude) |
| Restore/replay | Exact canonical snapshot/clone, restored continuation, all committed events and final hashes equal |

Allocation-renamed runs preserve semantic ActionReady keys while full hashes differ. Literal projection retains normalized target, family/category, permanent lifetime and player/variant/skill/null/null. Source-player negative pairs remain distinct; projector producer-identity negatives remain distinct and foreign producer impersonation rejects on decode. No raw caster graph or graph normalizer is added.

**Version decision:** retain engine0.6.0/state1.1.0/effect-record v1/replay v1. No existing executable core contract or serialized meaning changes; this is an opt-in new plugin definition/profile under a new pinned ruleset identity. Existing Holy Shield factory/hash/behavior are untouched. Snapshot/replay pins reject changed ruleset/profile/version and incompatible old engine/schema; no silent migration. Existing archives still require their exact original ruleset, never the new Dynamite factory.

## Verification and reviews

TDD red evidence: missing factory, then missing acceptance module, then independent restored-branch regression. Focused green:58 new tests/3 files; workspace typecheck, tooling typecheck and changed-source ESLint PASS. Initial harness geometry/code-literal/TypeScript/lint errors were test-authoring issues corrected against existing contracts; no production regression found or Game Core fix needed. Full repository verification ran once after the last source/test change.

| Required command | Actual final result |
|---|---|
| npm run lint | PASS, exit0 (ESLint/boundaries/format) |
| npm run typecheck | PASS, exit0 (all workspaces/tooling) |
| npm run test | PASS, exit0;611 tests/33 files, all553 baseline cases retained |
| npm run build | PASS, exit0 (packages/backend/frontend); no app source edits |
| npm run smoke:exports | PASS, exit0; four packages ESM/CJS, internal paths blocked |
| npm run smoke:runtime | Final verification PASS, exit0, outside restricted sandbox with owner-authorized local execution permissions: backend127.0.0.1:4301/health and frontend127.0.0.1:4300/ both HTTP200. Initial sandbox run was ENVIRONMENT_BLOCKED, exit1/EACCES; frontend was not reached in that earlier run |
| npm run check:boundaries | PASS, exit0; six workspaces |
| npm run check:hygiene | PASS, exit0 |
| git diff --check | PASS, exit0; repeated after final docs |

The initial verification used no aliases, script changes or escalation. Final verification reran the unchanged `npm run smoke:runtime` with explicitly authorized execution outside the restricted sandbox; no script or application fix was needed. Producer public-API acceptance itself requires no server/network and passed for both players.

### Final verification — condition resolved (2026-10-16)

Exact command from `D:\restart`: `npm run smoke:runtime`, executed with approved local permissions outside the restricted sandbox. Exit0. Independent endpoint assertions in the existing script both passed:

- Backend `http://127.0.0.1:4301/health`: HTTP200 and exact expected JSON `{ status: 'ok', service: 'variant-chess-backend', protocolVersion: '0.1.0' }`.
- Frontend `http://127.0.0.1:4300/`: HTTP200 and starter HTML containing both `Variant Chess` and `PHASE 01A`.

The previous EACCES was an environmental loopback restriction; this rerun found no application defect or runtime regression. SHA256 comparison before/after smoke confirmed all12 checkpoint candidate files byte-identical. `git status --short` retained the same existing12 candidate paths; `git diff --check` passed before and after the report update. Only this report was edited during final verification; source/tests/scripts/versions and the prior611-test acceptance remain unchanged. Full suites were not rerun in this runtime-only follow-up. No stage/commit/push.

**Phase02B-6 is promoted to PASS.** This final result supersedes the earlier runtime-condition status; other milestone documents were intentionally left unchanged per the final-verification scope.

**Standards:** independent read-only review found1 actionable P2 verification defect: the acceptance runner reassigned the restored branch to the uninterrupted state after the first step. Added a reference-independence assertion, observed all3 acceptance cases fail red, then retained continuation.state and reran focused58 tests green. This keeps the entire restored continuation independently executed through the blast. No production defect or heuristic refactor finding.

**Spec:** independent read-only review found0 actionable findings. Exact signed profile, target/King/provenance, duplicate-ignore distinction, source/death/AP/turn and disabled-producer boundaries were checked separately from Standards. No unapproved gameplay decision was needed.

## Remaining gates and next safe step

Only existing Holy Shield in its own selected factory and this accepted bounded Live Charge profile are enabled for explicitly selected players. No Mine/Landmine, Detonation/refund/passive/setup Bomb, full Dynamite/Guardian, Sanctuary/Divine Shield/Holy Aura, non-null caster/incarnation, new cleanup/priority/hidden state or other producer is enabled. Parent decisions remain open outside approved subsets.

Next toward local3D playable: separately approve a bounded local presentation slice consuming these exported root intents/state/events and trusted experimental match selections, with explicit two-profile match-composition requirements if desired. Its UI/input/animation and any transport/Phase03 work require their own authorization; this milestone implements none of them. Stop after this report.
