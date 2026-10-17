# Phase 02B B1 — Judgment Chains and Holy Seal

2026-10-16. **PASS — both limited Stun producers IMPLEMENTED / READY / ENABLED only for selected players in their separate pinned factories.** Required verification and both independent reviews complete.747 tests/36 files PASS (+136). Starting HEAD `9261007d5221365fdbb238279485366ca0a94bc1`, engine0.6.0/state1.1.0; accepted611 tests/33 files. Five planning02B-7 documents were already untracked at entry and are preserved; the planning report itself is unchanged. This is one bounded implementation milestone containing both producers, with no commit/push or next batch.

## Owner approval and pins

Recorded before production/tests in [OPEN_DECISIONS](OPEN_DECISIONS.md#phase-02b-b1--two-bounded-stun-producer-approvals-2026-10-16), with six groups: D-22.B1.SCOPE; D-22.NEPHALEM.JUDGMENT_CHAINS.TARGETS / D-22.ANGEL.HOLY_SEAL.TARGETS; matching .COST and .DURATION IDs; D-05.B1.JUDGMENT_CHAINS.SOURCE / D-05.B1.HOLY_SEAL.SOURCE; D-06.B1.JUDGMENT_CHAINS.REMOVAL / D-06.B1.HOLY_SEAL.REMOVAL. ChainsN3 preserves O-9; Holy Seal non-King preserves O-6. Parent D-04/05/06/08/12/22 remain open outside these subsets. Approval and implementation/enablement are separate statuses.

| Pin | Judgment Chains | Holy Seal |
|---|---|---|
| Public factory | createJudgmentChainsExperimentalRuleset | createHolySealExperimentalRuleset |
| Stable new skill ID | nephalem.judgment_chains | angel.holy_seal |
| Experimental profile v1.0.0 | nephalem.judgment-chains-only.experimental | angel.holy-seal-only.experimental |
| Producer v1.0.0 | nephalem.judgment-chains | angel.holy-seal |
| Ruleset v1.0.0 hash | experimental-nephalem-judgment-chains-v1-w{0\|1}-b{0\|1} | experimental-angel-holy-seal-v1-w{0\|1}-b{0\|1} |
| Cost / source | 5; player/nephalem/skill/null/null | 6; player/angel/skill/null/null |

Both independently register canonical effect.stun v1.0.0. No duplicate definition or broad source guard: each registry has exactly one source pair. Private construction shares the identical approved shape for two fixed internal configurations; public factories cannot select/mix arbitrary profiles. Trusted White/Black boolean selections are copied/frozen, pinned into state and ruleset identity; only selected players can invoke the skill.

## Implementation and behavior

Pure planners check current actor, exact profile/skill, unused skill slot, AP threshold and piece-target-v1 intent. The live target must currently be enemy-controlled ordinary-original and non-King. Owner/original side do not override current controller. Distance and blockers impose no cast restriction. Source is the invoking player and pinned pair with explicit null/null. One trusted effect_apply plan returns fixed cost and N3. Existing strict client schemas reject forged source, cost, AP, N, payload and operations. Root alone debits AP/slot, allocates IDs, queues/validates/applies the effect and commits events. The generic validator still checks source/N/payload/bindings/eligibility after planning.

Reuse existing public/unlinked/debuff/source-player Stun definition contract, empty immutable payload and main-action/capture-threat restriction bindings. N3 source-end skips cast boundary. Same exact source/target refresh preserves ID/applied sequence/source/payload and resets anchor/deadline; different sources have independent clocks. Stunned bearers cannot ordinary Move/Capture and contribute no occupied capture threats. Other pieces remain legal; forced End uses the same legal set. Stun neither supplies a board caster nor prohibits player-originated skills, skill targeting or forced-reposition at the restriction boundary. No forced movement operation is added.

Relocation to ordinary-original non-King destinations of either controller preserves full metadata; invalid final assignment rejects the whole transaction. Cast allegiance is checked once. Trusted controller/owner fixture changes keep the attachment/source/deadline. Expiry, committed bearer death and terminal cleanup are permitted; explicit cleanse/dispel/consume/replace/source invalidation/link removal reject. No new reward/removal reaction, King immunity or destruction immunity. Test-only Stun/Shield/Bomb composition confirms atomic Shield capture defense and Bomb explosion after committed destruction. Existing real Holy Shield/Live Charge code is untouched.

## Tests, determinism and public acceptance

New focused136 tests/3 files PASS before independent reviews:72 authorization/target/AP/planner/isolation tests,58 lifecycle/consumer/codec/source/rollback/composition tests,6 exported-API acceptance cases. TDD observed missing Chains factory red → real cast green; missing Seal factory red → real cast green; missing public acceptance module red → funded workflow green. Fixture errors corrected to existing INVALID_MOVE code/public ActionReady history interface; no consumer/core behavior changed to accommodate tests.

Failure checks compare the exact canonical initial snapshot including AP/slots/effects/RNG/IDs/history and empty events. Fault after application and RNG processing, post-plan eligibility/binding rejection and operation-budget failure remain atomic; deterministic retry matches restored execution. Snapshot/clone/restore preserve records, reject foreign source/ref/N/version tampering and wrong engine/state/profile/ruleset archives. Semantic ActionReady keys survive coherent match/piece/operation renaming; full hashes differ. Source player negative pairs and Variant/skill projector contrasts remain distinct. Explicit test-only composition aliases the two exact definitions under separate test IDs for coexistence without weakening source matching or exporting a mixed factory.

Reproduce both mirrored public workflows from repository root:

```powershell
npm run test -- tests/stun-producers.acceptance.test.ts --reporter=verbose
```

Harness imports only public package exports. TRUSTED_TEST_ONLY reduced6/7-piece ordinary board; no AP setup or injected Stun. Chains starts0 and captures Queen to earn5; Seal starts0 and captures two Knights to earn3+3. Opponent receives approved loss4 in either workflow. Legal moves/Ends fund and reach the cast turn. Real cast costs exactly5/6, source AP becomes0, only skill slot spent. N3 exact source/deadline is asserted; mandatory main remains. Bearer has valid Rook geometry but Move/Capture reject and capture threat/legal-main omit it. Opponent boundaries retain Stun, source ends+1/+2 retain it and source end+3 expires it. Ordinary movement/threat return, a move commits. Mid-Stun snapshot continues independently through every later input, with exact events/state/hash equality. Committed-command replay independently re-executes from AP0 and compares full events/final hashes and semantic projections. No invented gameplay rewards or test-only AP funding.

Compatibility: retain engine0.6.0/state1.1.0/effect-instance-v1/replay-v1. Only new opt-in registrations/profile/ruleset identities; no existing core executable or serialized semantics changed. Old incompatible pins reject; no migration or reinterpretation. Existing accepted factories retain their exact identities and behavior.

## Exact B1 files

- packages/game-variants/src/stun-producers.ts — two pinned factories, definitions and planners.
- packages/game-variants/src/index.ts — public factory/profile exports.
- packages/game-variants/tests/stun-producers.fixture.ts — signed profile literals and root rollback helper.
- packages/game-variants/tests/stun-producers.test.ts — authorization/targets/AP/slots/purity/isolation/versions.
- packages/game-variants/tests/stun-producers.integration.test.ts — real consumer/lifecycle/relocation/cleanup/source/codec/rollback/replay and labeled trusted composition.
- tests/stun-producers.acceptance.ts — reproducible public-API runners.
- tests/stun-producers.acceptance.test.ts — mirrored funding/expiry/restore/replay and alpha-equivalence.
- docs/rebuild/OPEN_DECISIONS.md — six owner groups and technical pins.
- docs/rebuild/EFFECT_SYSTEM_SPEC.md — bounded approved Stun profiles and status.
- docs/rebuild/PRODUCER_READINESS_MATRIX.md — signed profile readiness/status.
- docs/rebuild/VARIANT_SKILL_INVENTORY.md — scoped IDs/approval/implementation counts.
- docs/rebuild/VARIANT_CAPABILITY_MATRIX.md — resolved B1 approval blockers only.
- docs/rebuild/PHASE_02B_BATCH_ROADMAP.md — B1 authorization/completion, preserved B2/B3 gates.
- docs/rebuild/PHASE_02B_BATCH_A_APPROVED_MANIFEST.md — producer-specific acceptance overlay.
- docs/rebuild/PHASE_02B_IMPLEMENTATION_PLAN.md — bounded work/acceptance overlay.
- docs/rebuild/PHASE_02B_B1_STUN_PRODUCERS_REPORT.md — this report.

No source in Game Core/shared-types/testkit/apps/reference/legacy docs or dependencies/scripts changed. Generated ignored build artifacts are not deliverables. No stage/commit/push.

## Verification and independent reviews

All commands below were actually run from D:/restart with the existing pinned dependencies/scripts. No dependency upgrade or script/application change.

| Required check | Actual result |
|---|---|
| npm run lint | PASS exit0; ESLint, boundaries and format |
| npm run typecheck | PASS exit0; packages, tooling and every workspace |
| npm run test | PASS exit0;747 tests/36 files, all611 baseline cases retained |
| npm run build | PASS exit0; all packages/backend/frontend |
| npm run smoke:exports | PASS exit0; four packages ESM/CJS, internal paths blocked |
| npm run smoke:runtime | Final PASS exit0 outside restricted sandbox through environment-approved escalation; backend health HTTP200/exact JSON and frontend HTTP200/starter content |
| npm run check:boundaries | PASS exit0; six workspaces |
| npm run check:hygiene | PASS exit0; artifact/env/secret-pattern/single-lockfile checks |
| git diff --check | PASS exit0; also repeated after final docs |

Initial runtime attempt was ENVIRONMENT_BLOCKED exit1: localhost fetch EACCES despite successful Nest startup; frontend was not reached. The exact unchanged script passed on approved local rerun. No blocked check is counted as a pass. Functional producer acceptance requires no server/network and passed independently for both sides/profiles. Focused variants/tooling typecheck and changed-source ESLint also PASS. Final metadata/link/whitespace validation follows the code checks; no executable changes after the passing full suite.

Final documentation validation PASS:230 local links/anchors across9 B1 documents resolve, no invalid UTF-8 replacement characters;116 inventory rows reconcile to4 APPROVED /23 PARTIALLY_APPROVED /81 PROPOSED /8 UNKNOWN. Four enabled abilities are exactly Holy Shield, Live Charge, Judgment Chains and Holy Seal, each in its own selected factory; zero full Variants/passives enabled. Final changed-source formatting and tracked/untracked whitespace checks PASS. HEAD remains9261007; no staged changes, commit or push.

**Standards/architecture/security review:** independent read-only reviewer,0 actionable findings. Pure planner/root ownership, exact source authorization, immutable factory isolation, deterministic codecs and scope comply. Reviewer explicitly checked that the snapshot branch calls resolveCommand independently on every successful subsequent input, compares complete results and advances its own returned state. Rejected-command checks run on the original branch and verify exact rollback; this is not a blocker.

**Spec/gameplay approvals review:** independent read-only reviewer,0 actionable findings. Checked owner brief and signed subsets against production profiles, authorization/target/AP/source/N3/lifecycle/relocation/removal, consumer behavior, test coverage and AP0 public workflow. No new gameplay decision or scope expansion was required. Review fixed point is HEAD9261007 plus all new B1 files; no commits exist. Both reviewers made no edits and ran no tests.

## Remaining gates and next recommendation

Only Chains-only/Seal-only subsets are approved here; no full Nephalem/Angel, passive, Berserk Curse, Divine Silence, Blessing or Divine Judgment. Source caster graphs, special/summoned targets, cleanse/dispel skills, Aegis/Mark/Silence/Berserk, forced movement, hidden state, network/storage/UI/Phase03 remain outside scope. Existing Holy Shield/Live Charge remain independently enabled only in their own factories.

Next safe step: owner decision gate for B2 Shockwave/forced-reposition, signing center/affected allegiance/provenance/radius/AP/King/collision/order/entry-cause policy before any implementation. B3 Sanctuary still needs placement/geometry/category/overlap/capture-context/source/removal approval despite confirmed3/1. Do not start either batch automatically. Stop after this acceptance report.
