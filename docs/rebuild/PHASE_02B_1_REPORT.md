# Phase 02B-1 — Stun Foundation & source-aware contracts

2026-10-15. **PASS — infrastructure/consumer-foundation milestone. Concrete Stun remains disabled / NOT_READY for producer enablement.** Scope excludes Shield/Bomb adapters, concrete Variant producers, backend/frontend changes, dependencies and commit/push. Final verification results below.

## 1. Approved decisions recorded before implementation

Updated OPEN_DECISIONS, EFFECT_SYSTEM_SPEC, approved manifest and implementation plan before source changes; catalog overlay synchronized. Recorded **D-05.BATCH-A.SOURCE_IDENTITY**, **D-06.STUN.CATEGORY** and **D-06.SHIELD.CATEGORY** from explicit owner approval. Stun DEBUFF / Shield BUFF map to existing lowercase schema literals; Bomb categories unchanged. Parent D-04/05/06/08 remain OPEN/PARTIALLY_APPROVED; producer-specific UNKNOWN fields remain unknown.

## 2. Files changed in this milestone

| Files | Change |
|---|---|
| `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md` | Supplemental approvals, authorized foundation boundaries |
| `docs/rebuild/PHASE_02B_BATCH_A_APPROVED_MANIFEST.md`, `PHASE_02B_IMPLEMENTATION_PLAN.md`, `CONCRETE_EFFECT_CATALOG.md` | Current approval/implementation/enablement overlays and remaining gates |
| `docs/rebuild/PHASE_02B_1_REPORT.md` | This report |
| `packages/shared-types/src/index.ts` | Source identity, producer policy/parameters, opt-in matching and action declarations; engine pin |
| `packages/game-core/src/effect-parameters.ts` (new) | Pure canonical source and declared producer-duration validation |
| `packages/game-core/src/action-legality.ts` (new) | Shared legal-action and capture-threat queries; immutable restriction contexts |
| `packages/game-core/src/stun-consumer.ts` (new) | Disabled consumer descriptor, empty payload schema, restriction bindings |
| `packages/game-core/src/effects.ts`, `effect-runtime.ts` | Registry/codec validation, structured matching, variable lifetime/refresh, restriction bindings |
| `packages/game-core/src/base-game.ts`, `transaction.ts`, `index.ts` | Shared End/root legality and public exports |
| `packages/game-core/tests/stun-foundation.test.ts` (new) | 32 focused behavioral/invariant scenarios |
| `packages/game-core/tests/delayed-actions.test.ts` | Existing expected engine pin updated to 0.3.0 |

Earlier staged Phase 02A changes and historical 02B-0/rules-freeze deliverables are not new work attributed to this milestone.

## 3. Public contracts / source representation

- Shared schemas/types: `EffectSourceIdentitySchema` / `EffectSourceIdentity`, `EffectDurationParametersSchema` / `EffectDurationParameters`; definition lifetime accepts explicit `producer-rounds`, stacking accepts opt-in `type-source-identity-target`, optional `actionRestrictions` name trusted runtime policies.
- Core: `captureEffectSource`, `effectSourceKey`, `queryLegalMainActions`, `queryCaptureThreats`, `effectAllowsAction`; restriction types `ActionRestriction`, `ActionRestrictionContext`, `EffectActionKind`, `RulesetLegalityPolicy`; Stun descriptor/schema/bindings.
- `RulesetBundle.legalityPolicies` and `EffectRuntimeBindings.restrictions` are trusted ruleset code, never state/client functions. Missing declared bindings fail closed with `UNSUPPORTED_RUNTIME`.

Source identity captures player/variant/skill/caster piece/supported incarnation as immutable JSON; missing optional refs normalize to null. Key is canonical encoding of match namespace + structured tuple, without delimiter ambiguity. Actor resolves once at application. Target owner/controller, active caster position and later lookup are not identity inputs. Control transfer, caster movement/death and relocation preserve captured refs. Incarnation requires a caster and a producer profile declaring support; no incarnation generator or fake identity introduced. Existing `type-source-target` retains its previous player-based semantics unless a definition opts in.

## 4. Producer-duration contract

`producer-rounds` policy version `1.0.0` declares boundary and immutable profiles: ID/version, variant/skill, allowed positive safe-integer rounds, caster requirement and incarnation support. Instance/application `duration` stores parameters version, producer ID/version and N; resolved instance lifetime remains the existing `rounds` data. Apply, refresh and decode validate exact profile/source/version/allowed N. Fixed lifetimes reject incompatible new parameters.

Trusted producer definitions or approved planners supply parameters through derived operations; RootCommand has no arbitrary effect application/N input. N1/N3 fixtures use prior O-8/O-9 numeric evidence, **not** Sanctuary/Judgment Chains approval. Source-end scheduling reuses existing clock, excludes cast boundary, resets new approved N/new anchor on refresh while retaining instance ID/application sequence. Different sources retain independent clocks. Snapshot/clone/replay reject tampered or incompatible stored parameters.

## 5. Legal actions, forced End and capture threats

`queryLegalMainActions` combines base geometry, occupancy and controller allegiance with frozen declared ruleset/effect restrictions. Root Move/Capture and redirected capture validation use the same internal candidate query. `endBaseTurn` receives the same availability predicate from root; standalone base-board behavior is unchanged. The private candidate query skips only the committed-history assertion while the root candidate is incomplete; legality and runtime validation remain shared.

Stun bindings deny main-action and capture-threat only. All controlled main-action pieces Stunned permits explicit forced End; one movable un-Stunned controlled piece rejects early End. A trusted synthetic skill can remove Stun before moving, making forced End invalid again. Rejected moves do not create stale committed state. No automatic End is added because a skill is unavailable; turn-slot rules remain intact.

`queryCaptureThreats` returns current enemy-occupied capture candidates using base capture geometry/controller allegiance, independently of main turn/AP/slot usage, with Stunned bearers excluded. It is **not an empty-square attack map**, check/checkmate system, skill threat engine or unknown future consumer approval. King remains an ordinary capturable piece; no global attachment immunity is added. `effectAllowsAction` tests forced-reposition/skill-target restriction boundaries only; it does not implement or authorize a forced move, teleport or skill.

## 6. Concrete Stun status

**IMPLEMENTED consumer foundation; ENABLED=false / NOT_READY for real producers.** `STUN_CONSUMER_CONTRACT` is deliberately an incomplete descriptor, not a full registered EffectDefinition. It records piece/public/unlinked/source-player, debuff, source-end/structured matching and named restrictions. `STUN_PAYLOAD_SCHEMA` accepts only empty immutable plain JSON data, adding no gameplay-bearing refresh flags. No default/live registry registers Stun and no producer skill is enabled.

Missing: complete approved producer profile (N constraints plus target/King/special-unit eligibility and removal permissions), any gameplay-bearing payload policy, and full producer-specific acceptance. Test-only synthetic profiles explicitly declare their own eligibility/permissions; they are not gameplay approval. Existing eligible relocation preserves source/ID/payload/deadline; invalid destinations reject the whole root candidate. Unknown cleanup permissions are not invented.

## 7. Serialization, repetition and replay compatibility

Engine **0.2.0 → 0.3.0** pins new executable source matching, lifetime parameters and legality meaning. State schema `1.0.0`, effect-record envelope `effect-instance-v1` and replay envelope v1 remain structurally sufficient; producer parameter schema starts at `1.0.0`. Existing literal engine validation rejects previous-engine snapshots/archives; **no silent migration**. Historical archives need the matching old engine.

Ruleset identity remains an explicit immutable bundle hash/version supplied by its owner; no automatic executable-code hashing was introduced. Production bundles must pin changed profiles/policies/projectors under their identity. Base enabled ruleset still has no concrete Stun producer.

Relative logical remaining duration is projected through the existing per-definition repetition contract. Tests cover shifted boundary counters with equivalent remaining duration and exact deterministic replay/snapshot equality. **Limitation:** synthetic projector carries raw caster/incarnation refs; these tests do not prove arbitrary caster-reference renaming invariance. Complete producer projectors must normalize semantic source relations under ENGINE_ARCHITECTURE §6 / TEST_STRATEGY §3 before enablement. No universal source graph canonicalizer is claimed.

## 8. Tests and verification

TDD focused work preceded full checks. New 32-test file covers canonical missing refs/namespace separation, same-source stable refresh, distinct skill/caster/incarnation sources, legacy opt-in compatibility, invalid/unauthorized N/profile versions, both-player N1/N3 timing, refresh anchor/independent deadlines, all six piece kinds/King synthetic eligibility, query/root/End/threat agreement, remaining-source restriction, control/owner isolation, caster death/relocation, frozen callbacks/profiles/payload, snapshot tampering, relative repetition, exact replay, and full rejection rollback of state/AP/slots/RNG/IDs/history/events. Redirect and declared ruleset-policy tests exercise the shared legality seam. Unsupported forced movement is tested only at the restriction boundary.

| Command / check | Actual result |
|---|---|
| Focused `stun-foundation.test.ts` | PASS — 32 tests |
| Earlier combined focused run (8 related files) | PASS — 148 tests before the last 5 Stun scenarios were added |
| Core workspace typecheck and changed-source ESLint | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS — 342 tests / 24 files (baseline 310 / 23; +32 tests / +1 file) |
| `npm run build` | PASS — packages, backend and frontend production build |
| `npm run smoke:exports` | PASS — all 4 package ESM/CJS public entrypoints resolve; internal paths blocked |
| `npm run check:boundaries` | PASS — 6 workspace dependency boundaries |
| `npm run check:hygiene` | PASS — tracked artifacts/env, secrets patterns and single lockfile |
| `git diff --check` | PASS |

Implement skill reviews: specification and standards axes found no actionable findings. Review identified the source-reference repetition test limitation above; no extra gameplay assumptions were introduced to close it.

## 9. Limits and handoff

Foundation completion does not open producer enablement. Keep unsupported runtime modes, unknown definitions/versions/policies and missing bindings fail closed. Existing Phase 02A synthetic triggers/delayed/relocation retain their declared scope; there is no Shield defense, Bomb blast/death adapter, Variant/Sanctuary/Chains implementation, generalized movement modifier system, forced movement root command or new cleanse permission here.

Next owner-authorized milestone can reuse source/duration/restriction seams, after reviewing its own producer/consumer gates. Shield/Bomb and Phase 02B-2 require separate authorization. Stop after this report.
