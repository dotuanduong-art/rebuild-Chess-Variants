# Phase 02B-5D — first real producer acceptance harness

2026-10-16. **PASS — functional public-API acceptance; root553 tests/30 files PASS.** Actual lint/typecheck/build/export smoke/boundaries/hygiene/diff checks passed. Requested generic `smoke`/`check` aliases are unavailable, recorded separately below rather than claimed PASS. Verification only: no production code, package scripts, versions, dependencies, backend/frontend gameplay or enablement changes. Engine0.6.0/state1.1.0 and the accepted experimental Holy Shield factory remain unchanged. No commit/push or subsequent phase.

## Files and reproduction

- [tests/holy-shield.acceptance.ts](../../tests/holy-shield.acceptance.ts): developer-only scenario runner using package exports, assertions and evidence; no imports from production internals or earlier synthetic fixtures.
- [tests/holy-shield.acceptance.test.ts](../../tests/holy-shield.acceptance.test.ts): four automated acceptance cases, included by existing root Vitest configuration.
- `docs/rebuild/PHASE_02B_5D_REPORT.md`: this report. Prior dirty/staged phases are preserved and excluded from the focused review.

From repository root, using already installed pinned dependencies:

```powershell
npm run test -- tests/holy-shield.acceptance.test.ts --reporter=verbose
```

This exact reproduction command was run: **4 tests/1 file PASS**. It builds workspace packages first, so the harness exercises the actual published package entrypoints. No server, UI, transport or new toolchain alias is required.

## Public APIs and setup boundary

The harness imports `createHolyShieldExperimentalRuleset` from `@variant-chess/game-variants`. It imports `createBoard`, `createGame`, `coordinateFromAlgebraic`, `resolveCommand`, `generateBaseMoves`, `decodeEffectRecords`, `encodeSnapshot`, `decodeSnapshot`, `cloneSnapshot`, `fullStateHash`, `recordReplay`, `executeReplay` from `@variant-chess/game-core`, and branded `PieceIdSchema`/types from `@variant-chess/shared-types`.

Each run explicitly enables only its source player's experimental profile, leaving the opponent unassigned. It checks the exact one-skill catalog and one-definition registry (`guardian.holy_shield`, `effect.shield`); sibling Guardian skills and Dynamite producer commands reject `NOT_AVAILABLE`.

**TRUSTED_TEST_ONLY setup:** a reduced five-piece ordinary-original board, not the approved60-piece initial layout or a new gameplay setup mode. Source Rook at A1, opponent funding Rook A4, opponent attacker A7, source King H1 and opponent King H15. Black-source runs reflect ranks and sides. `createGame` receives no AP override: both players start with approved AP0. There are no AP grants, manually attached effects, replacement planners, synthetic skill executors, callbacks or extra effect operations in the acceptance path.

The source earns4AP by a real clear-path Rook capture, while the victim owner receives3 loss AP. The source completes that turn, lets the opponent legally move/End, then casts on its next turn. White goes first, including in the Black-source scenario. Every subsequent positive transition is a committed root command. Only separate, explicitly marked negative provenance setup branches construct altered board copies; they do not mutate the positive state or enter its replay.

## Demonstrated workflow and literal outcomes

| Checkpoint | Expected | Actual focused result |
|---|---|---|
| Initialization | Source0AP/opponent0AP; only selected source authorized | PASS, both source colors |
| Funding capture | Source4AP/opponent3AP; funding Rook retired; no special reward | PASS via ordinary root capture |
| Real cast on source turn2 | Exactly4AP debit, source0AP/opponent3AP; skillUsed=true/mainMoveUsed=false | PASS; facts exactly skill_used(actualCost4), ap_changed, effect_applied |
| Source identity | Invoking player/guardian/guardian.holy_shield/null/null | PASS, no board caster invented |
| Attachment | One Shield; piece/public/empty payload/unlinked; N2 source-end | PASS; target actual bearer, anchor2/deadline4 |
| Cast turn end2 | Main move still required; no cast-boundary expiry | PASS; same complete instance retained |
| Opponent capture attempt | Valid base capture geometry/occupancy, but CAPTURE_DEFENDED | PASS, repeated rejection; events=[] and byte-identical full snapshot |
| Source end3 | Shield remains; opponent boundaries cannot expire it | PASS |
| Source end4 | Shield removed exactly once with reason expired | PASS; no protection on next opponent turn |
| Post-expiry capture | Capture commits; source receives loss3AP, opponent gets capture4AP in addition to prior loss3 | PASS; source3AP/opponent7AP |

White-source capture path: A1→A4 funding, Shield on A4, Black A7→A4 blocked until White end4. Black-source path: A15→A12 funding, Shield on A12, White A9→A12 blocked until Black end4. Waiting commands are legal King steps toward increasing files, followed by End where needed; there is no forced skip or repeated position used to bypass the mandatory move.

An unauthorized opposing player submits its own controlled piece target at the correct turn and rejects `UNAUTHORIZED_VARIANT`. A malformed array target rejects `INVALID_COMMAND`. These share the byte-identical rollback oracle. A branch from legitimately funded state casts on an ordinary King successfully, then demonstrates that the same chess type with special/summoned/missing provenance rejects `UNSUPPORTED_UNIT`. The provenance branches are test-only negative fixtures, not enabled summon/transform gameplay.

## Snapshot, semantic repetition and replay evidence

- Encode/decode/clone after the real cast preserve exact canonical bytes. Every later committed command is also resolved from the restored state and compared against exact state/events from the uninterrupted run.
- The root records the Shield position at opponent ActionReady after the source completes its cast turn. A literal projection retains normalized target A4 (A12 for Black), remaining2, original player/guardian/skill/null/null. Two complete White runs with coherently renamed match/piece IDs have equal semantic keys and different full final hashes; color identities are not incorrectly collapsed together.
- `recordReplay` begins from the AP0 test-board snapshot and includes every successful input, including the funding capture and legal waiting turns. Rejected probes are excluded because they commit neither state nor facts. `executeReplay` matches exact collected committed events, final state and full hash; final restored continuation equals that state too.
- No version bump or compatibility reinterpretation: no public API gap or production defect was found. Existing engine/state/ruleset pins and archive rejection behavior are preserved.

## Standards

Independent focused read-only review: **0 actionable findings**. Public entrypoints, literal independent oracles, immutable setup/rollback and root-owned execution follow AGENTS/TEST_STRATEGY. No substantive heuristic smell. Reviewer ran no tests or edits.

## Spec

Independent source/report review complete: **0 actionable findings**. Real factory, AP0 capture funding, both source paths, exact cost/clock, ordinary/King restrictions, snapshot/repetition/replay and producer restrictions verified. Reduced-board/provenance fixtures and unavailable-script limitations are documented accurately. Reviewer ran no tests or edits.

## Verification actually run

| Command | Actual result |
|---|---|
| Focused reproduction command above | PASS4 tests/1 file |
| `npm run typecheck:tooling` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS553 tests/30 files; all549 baseline tests retained, +4 tests/+1 file |
| `npm run build` | PASS — full root build, no app source changes |
| `npm run smoke` | UNAVAILABLE — exit1, Missing script: smoke |
| `npm run check` (listed twice in request) | UNAVAILABLE — exit1, Missing script: check; duplicate alias need not be retried |
| `npm run smoke:exports` | PASS — four packages ESM/CJS; internal paths blocked |
| `npm run check:boundaries` | PASS — six workspaces; run separately and within lint |
| `npm run check:hygiene` | PASS |
| `git diff --check` | PASS |

The generic smoke/check aliases do not exist in the repository. Their failures are not reported as PASS; use the real named scripts above. No package-script changes or server smoke are introduced merely to hide the naming mismatch. This is a verification command naming limitation, not an engine API defect. TDD first failed because the new acceptance module did not exist, then focused workflows passed against existing engine exports; an initial harness-only TypeScript narrowing issue was corrected without production changes. No engine defect or missing gameplay decision was discovered.

## Restrictions and next safe milestone

Only the approved selected experimental Holy Shield profile remains enabled. No Holy Aura, Sanctuary, Divine Shield, Stun/Bomb producer, Dynamite, hidden Landmine, full Guardian, source lineage normalization or new defensive/removal interaction becomes available. The harness checks the factory catalog/registry and unavailable sibling commands, rather than trusting a smoke-only registration claim.

Recommended next step: owner review of this reproducible artifact and separate authorization of the next bounded milestone. Do not infer permission for Phase03, another producer, full Guardian, network/UI or broader gameplay setup. Stop after5D report; no commit/push.
