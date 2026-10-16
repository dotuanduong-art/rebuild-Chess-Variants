# Phase 02B-5B — bounded Holy Shield semantic source normalization

Completed 2026-10-16. **PASS — bounded null-caster source foundation; all required verification passed.** Holy Shield gameplay profile APPROVED, actual producer **NOT_READY / ENABLED=false**. No target planner, skill payload, actor→Variant authorization, cost debit, producer registration or5C. No Sanctuary/Live Charge/Landmine, Holy Aura/ledger/incarnation producer, backend/frontend/dependency changes or commit/push.

## 1. Owner decisions recorded before source changes

Updated OPEN_DECISIONS, EFFECT_SYSTEM_SPEC, FIRST_PRODUCER_APPROVAL_MATRIX, approved manifest and implementation plan before implementation. Exact six Holy Shield-only approvals:

| Decision | Recorded answer |
|---|---|
| D-22.FIRST_PRODUCER.SCOPE | Experimental Holy Shield-only Guardian, not full Variant; Sanctuary/Divine Shield/Holy Aura/other passives unavailable |
| D-22.GUARDIAN.HOLY_SHIELD.TARGETS | Exactly one invoking-player-controlled supported ordinary piece including King; no special/summoned units. Eligible ordinary either-controller relocation including King preserves all data; original cast allegiance not continuous validity |
| D-22.GUARDIAN.HOLY_SHIELD.DURATION | N2/source-end/no cast tick; same-source reset2/stable ID, independent cross-source Shields |
| D-22.GUARDIAN.HOLY_SHIELD.COST_PROFILE | Fixed4 only; no discount, threshold, inventory or alternate cost |
| D-05.FIRST_PRODUCER.SOURCE_PROFILE | Required player/guardian/guardian.holy_shield with canonical null caster/incarnation; no caster/liveness/lineage |
| D-06.FIRST_PRODUCER.REMOVAL_PROFILE | Expiry, bearer-death and terminal cleanup only; no cleanse/dispel/source-invalidated/custom removal |

Shared source/removal/scope answers remain OPEN for other producers; parent D-* decisions are not CLOSED. Actual target/cost/removal enforcement belongs to separately authorized5C, not to this source validator or its test-only operations.

## 2. Files changed in this milestone

| File | Purpose |
|---|---|
| `packages/shared-types/src/index.ts` | Optional closed versioned source-attribution profile metadata |
| `packages/game-core/src/effect-parameters.ts` | Pure `assertEffectSourceProfile` helper used internally by validation paths |
| `packages/game-core/src/effects.ts` | Scoped instance/source validation and explicit stored-null requirement through existing codec |
| `packages/game-core/src/effect-runtime.ts` | Guard before duplicate-ignore; canonical optional application refs for opted-in profiles |
| `packages/game-core/tests/holy-shield-source.fixture.ts` | Labeled SYNTHETIC_TEST_ONLY source/consumer fixture, no playable Holy Shield alias or target planner |
| `packages/game-core/tests/holy-shield-source.test.ts` | 45 new validation/equivalence/future-behavior/integrity/replay regression cases |
| `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md`, `FIRST_PRODUCER_APPROVAL_MATRIX.md`, `PHASE_02B_BATCH_A_APPROVED_MANIFEST.md`, `PHASE_02B_IMPLEMENTATION_PLAN.md` | Exact approvals and separate implementation/enablement status |
| `docs/rebuild/SOURCE_REPETITION_NORMALIZATION_PLAN.md`, `PHASE_02B_5B_REPORT.md` | Implemented SG-1…9 status, remaining gates and this report |

Older staged/untracked phases preserved. Review fixed point is the accepted pre5B working tree, not HEAD; four production/six documentation copies were pinned in ignored `node_modules/.cache/variant-chess-phase02b5b-baseline` before edits. No commits created.

## 3. Architecture and rejection boundary

New public data contract, through existing exported `EffectDefinitionMetadataSchema`/`EffectDefinition` types:

`sourceAttribution.profile = { kind: 'player-originated-v1', sourceVariant, sourceSkill }`.

Variant/skill are required non-null identifiers supplied by each reviewed definition; the generic core contains no Guardian/Holy Shield literal or effect-name whitelist. Version is in the closed kind discriminator. Unknown versions, source-graph kinds or custom/unreviewed binding modes fail strict registry construction. No new normalization callbacks/binding registry or context extension is needed.

`assertEffectSourceProfile` requires source IDs equal the declaration and both refs null. Player is already schema-validated. `planEffectApplication` invokes this before a family duplicate can ignore the application; `validateEffectInstance` invokes it for data handling, including encode/decode/clone. Opted-in records require explicit stored null incarnation even outside structured-source stacking; omitted optional application incarnation canonicalizes to null, preserving existing application semantics. No malformed present refs are converted to null. Failure remains root-atomic with no committed events.

This is a **profile-scoped source contract**, not a producer-enable API. A definition omitting it retains previous synthetic behavior, which is not certified/approved for production by5B. Existing raw-caster diagnostic fixtures remain unchanged.5C must compose the exact approved declaration and enforce the signed producer profile before live registration. Existing unsupported graph/reference binding checks remain; codec validation alone does not approve linked gameplay. Permanent Bomb incarnation input still rejects `UNSUPPORTED_EFFECT_PARAMETERS`.

Existing `EffectRepetitionContext`, definition projectors, `runtimeRepetitionProjection`, `repetitionKey`, `effectSourceKey`, snapshot/replay and root transaction implementations are unchanged. The null tuple is already a complete semantic source for this profile. Projection keeps player/Variant/skill plus explicit absent refs, normalized target and relative source-end lifetime; existing generic family/category/meaningful-order composition remains. No raw source tuple, event attribution, ID or deadline is rewritten.

## 4. SG evidence and independent oracles

| Gate | Actual evidence / exact limit |
|---|---|
| SG-1 | Exact declared guardian/guardian.holy_shield/null/null + enum player and N2; malformed refs/producer or definition versions reject. No gameplay default substituted |
| SG-2 | EQ-1 literal effect IDs `left:operation:2` versus `right:operation:14`, coherently renamed bearer/attacker/match/cause refs, equal semantic key but distinct full hashes. EQ-5 source anchor/deadline shifted1 logical round with same remaining2 yields equal key |
| SG-3 | Different source player, semantic Variant/skill, normalized target and remaining duration produce different keys; invalid present refs reject. Independent synthetic contrast definitions prove generic family/category/listener ordering survives without approving alternate Holy Shield behavior |
| SG-4 | Paired valid consumer states retain stable refreshed IDs; later source ordinal2 resets deadline4; independent source expiry leaves one Shield and capture defended, all expire then legal capture commits with literal White21/Black22 AP. Actual skill casting deferred5C |
| SG-5 | Transfer then bearer movement/controller+owner fixture conversion retain complete source, exact matching key, ID/deadline; clone and replay preserve metadata. There is no source-piece movement case in the approved null-caster profile |
| SG-6 | Registry kinds/versions, wrong/missing source IDs, live/dead/fake-null casters, incarnation combos, stored missing-null, cross-match effect/group IDs, missing runtime bindings and undeclared source refs reject. Definition input copy, registry/profile/instance/context freezing and repeat-call isolation tested |
| SG-7 | ActionReady repetition via root End; source-relative expiry; canonical snapshot/clone/full hash; restored continuation exact events/hashes and replay; faults after RNG/effect work roll back IDs/slots/board/AP/RNG/history/effects/events |
| SG-8 | Guarded profile versus identical prior null projector produces identical semantic key/effect records. New declarations pinned under distinct synthetic ruleset identities. Engine0.5.0 retained; ruleset mismatch/engine0.4.0 snapshot rejection; no migration |
| SG-9 | Focused regression slice PASS203/6 files; root PASS492/28 files, retaining all447 baseline tests. All required final checks passed below |

Oracles include a full literal projected effect (source White/guardian/guardian.holy_shield/null/null, target A15, source-end remaining2), exact IDs/deadlines, literal source expiration order/capture/AP facts and explicit rejection outcomes. Equality is not calculated by a second copy of the normalizer. White/Black source identities are tested as different, not falsely mirrored equal. Identity/semantic-ID contrast fixtures are separately named and are not approved producers.

Test-only static aliases are `synthetic.setup/recast/transfer`, with zero synthetic cost. They exercise trusted consumer operations, including effects from different sources, not actual Holy Shield actor/target/cost validation. No `guardian.holy_shield` root skill exists; submitting it rejects `NOT_AVAILABLE`. These tests do not claim fixed4 AP or real producer eligibility is implemented.

## 5. TDD findings and compatibility decision

Red→green: registry initially rejected the missing profile declaration; after adding the schema, a real-looking board caster was incorrectly accepted by the new null-only claim until scoped instance validation was added. A subsequent independent synthetic-family test demonstrated duplicate-ignore could skip the new guard; validation now precedes that branch. Optional application refs and stored canonical null are separately covered. Fixture-only undefined-property construction was corrected without weakening codec serialization rules. Typecheck/ESLint and source validators/settings remain strict.

**Retain engine0.5.0, state1.0.0, effect-instance-v1, replay-v1.** There is no new repetition meaning or serialized instance representation, no changed old definition/matching/lifecycle behavior, and no enabled producer. The optional definition declaration is new opt-in versioned ruleset data; previously accepted rulesets do not acquire it automatically. Existing null-source semantics are independently proved unchanged. Ruleset owners must pin new declarations/bindings under new correct hashes/versions; callers cannot reuse an old hash to silently change its contract. No automatic code hashing or old-archive migration is introduced.5C must review versioning again if its executable command/producer behavior changes.

## Standards

Independent read-only review completed: **0 actionable findings**. Scope is the four-file production diff and the two new test files plus current docs, not earlier uncommitted phases. No hidden mutable callback/cache, hard-standard breach or unnecessary graph abstraction found.

## Spec

Independent read-only review completed: **0 actionable findings**. Reviewer confirms scoped opt-in guard, unchanged existing projector/matching paths and six approvals confined to Holy Shield. Older Holy Shield UNKNOWN table text identified for synchronization was corrected before final review. Not a gameplay or production-code defect.

## 6. Verification actually run

| Check | Result |
|---|---|
| New source tests | PASS — 45 tests |
| Source + Batch A + effect records + Stun/Shield/Bomb focused slice | PASS — 203 tests / 6 files |
| Shared-types targeted build after schema addition | PASS |
| Core workspace typecheck / changed-source and test ESLint | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS — 492 tests / 28 files; +45 tests / +1 file over baseline |
| `npm run build` | PASS — root package/backend/frontend build |
| `npm run smoke:exports` | PASS — four packages resolve ESM/CJS; internal paths blocked |
| `npm run check:boundaries` | PASS — six workspaces |
| `npm run check:hygiene` | PASS |
| `git diff --check` | PASS |
| Changed documentation local links / UTF-8 integrity | PASS — seven documents / 106 links |

## 7. Remaining unsupported profiles and exact5C handoff

**Still blocked:** non-null live/historical caster source normalization, incarnation/lineage-sensitive refs, arbitrary linked source graphs and unknown source-projection modes/bindings. No universal source graph canonicalizer implemented. Existing synthetic raw-reference fixtures remain diagnostic, not a way to bypass the null-only declaration. Permanent Bomb incarnation support is not enabled. Sanctuary/Live Charge/Landmine fields and non-HolyShield removal/source permissions remain OPEN.

**5C prerequisites:** explicit owner authorization; compose only the approved experimental Holy Shield-only profile, verified null declaration/projector, N2/source-end and pinned definitions/ruleset. Implement minimal authoritative per-player Variant authorization + target intent/planner, approved one-controlled-ordinary-piece/King policy (excluding special/summoned), fixed4 AP/one-skill/root rollback, eligibility for either-controller ordinary relocation, and expiry/death/terminal-only permissions. Preserve cast-versus-continuing eligibility distinction, source independence and Shield defense. Add actual producer normal/mirror/illegal-target/insufficient-AP/removal/relocation/snapshot/replay/fault tests and all completion checks, then explicit enablement acceptance. No Holy Aura ledger/incarnation dependency or extra gameplay answer is needed for this signed limited profile.

Stop after this5B report. Holy Shield remains **NOT_READY / ENABLED=false**; no5C, other skill or commit/push.
