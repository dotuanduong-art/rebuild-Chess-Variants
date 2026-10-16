# Phase 02B-2 — Shield Foundation & atomic capture defense

2026-10-15. **PASS — isolated Shield consumer-foundation milestone. Concrete Shield remains disabled / NOT_READY for producer enablement.** No Bomb, Guardian/Variant skill, backend/frontend source, dependency or turn-economy changes; no commit/push.

## 1. Authorization and files changed

Recorded explicit owner authorization in OPEN_DECISIONS and EFFECT_SYSTEM_SPEC §10 before implementation. Existing D-04.SHIELD/D-05.BATCH-A.SHIELD/D-06.SHIELD rules remain unchanged. Parent decisions remain OPEN/PARTIALLY_APPROVED; no Shield N, King eligibility or removal permissions were invented.

| Files changed this milestone | Purpose |
|---|---|
| `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md` | Authorized bounded scope and unsupported interaction gate |
| `docs/rebuild/PHASE_02B_BATCH_A_APPROVED_MANIFEST.md`, `PHASE_02B_IMPLEMENTATION_PLAN.md` | Separate APPROVED / IMPLEMENTED / ENABLED statuses |
| `docs/rebuild/PHASE_02B_2_REPORT.md` | This report |
| `packages/shared-types/src/index.ts` | Optional named atomic-reject defense metadata; engine pin |
| `packages/game-core/src/capture-defense.ts` (new) | Pure shared decision and private root guard; frozen context |
| `packages/game-core/src/shield-consumer.ts` (new) | Disabled descriptor, empty immutable schema, named Shield binding |
| `packages/game-core/src/effect-runtime.ts` | Immutable defense bindings and supported-contract validation |
| `packages/game-core/src/action-legality.ts`, `transaction.ts`, `index.ts` | Query/root integration and public exports |
| `packages/game-core/tests/shield-foundation.test.ts` (new) | 31 focused scenarios |
| `packages/game-core/tests/stun-foundation.test.ts`, `delayed-actions.test.ts` | Update current-engine expected literal; keep older-version rejection tests |

Prior staged/untracked Phase 02A/02B-0/02B-1 work is preserved, not attributed as new implementation here.

## 2. Public contracts and integration

- `EffectDefinitionMetadataSchema.captureDefense?: { kind: 'atomic-reject'; policyId: string }` is opt-in; no effect-name switch or default defense.
- `EffectRuntimeBindings.captureDefense` maps policy IDs to exported `CaptureDefense` callbacks. Exported `CaptureDefenseContext` contains immutable state, attacker, victim and active instance. Runtime copies/freezes binding maps; missing/non-function bindings or non-piece defense declarations reject `UNSUPPORTED_RUNTIME`. Unknown declaration modes fail schema validation.
- `SHIELD_CONSUMER_CONTRACT`, `SHIELD_PAYLOAD_SCHEMA`, `SHIELD_CAPTURE_DEFENSE_BINDINGS` describe the approved BUFF/piece/public/unlinked/source-player consumer and empty data. A bound active instance denies capture; no charge count or mutation operation exists.
- Existing eligibility/King adapters are reused with explicit fixture policies. No separate permission framework or complete real producer definition is introduced.

`resolveCommand` remains the sole authority. Its existing move/pre-death seam checks the original victim before capture processing and checks each redirected final victim before revalidation/commit. No additional interceptor competes with the existing root pipeline; no trusted derived move/capture bypass is introduced. Defense callbacks receive deep-frozen cloned data and return only a permission decision.

## 3. Atomic rejection and legality

Isolated protected capture returns `CAPTURE_DEFENDED`, empty committed events, unchanged input state. Candidate counters are discarded with the root. Tests compare full state before/after repeated attempts, including board, AP, main/skill slots, RNG, IDs, deadlines, effects, history and repetition. There is no committed capture/death, capture AP, owner loss AP, synthetic death reaction or King terminal. No Shield instance/deadline is consumed, refreshed or decremented by blocking.

`queryLegalMainActions` uses the same pure defense decision to omit unexecutable captures; forced End therefore sees the same legal set. Quiet moves and Shield bearer's own actions remain possible unless an independent approved restriction applies. Base movement geometry is unchanged. `queryCaptureThreats` retains its documented geometric scope and Stun exclusion; this milestone does not approve Shield as a general threat modifier.

Any defense-bearing victim combined with arbitrary existing capture interceptors is **explicitly unsupported**: the query omits that capture, root rejects `UNSUPPORTED_RUNTIME`, without choosing callback registration priority. Redirect from an unprotected victim to a Shielded destination also rejects at that gate; it cannot bypass Shield. Unprotected generic redirects retain prior support. This is a conservative technical boundary, not Shield/Fate/Phoenix priority approval.

Non-King destruction still commits and awards existing owner loss AP with normal cleanup. No AoE/sacrifice root operation was added to test unavailable mechanics; Shield binding is capture-only and is not consulted for destruction. Existing King non-capture protection remains a separate baseline rule.

## 4. Source matching and lifetime

Reused 02B-1 contracts unchanged: captured player/variant/skill/optional caster/incarnation tuple; canonical absent refs; explicit `type-source-identity-target` matching; trusted versioned `producer-rounds` constraints. Same-source refresh preserves instance ID/application sequence and resets validated N at the current source-end anchor. Different sources retain independent IDs/clocks. Expiring/removing one instance leaves remaining protection; all expired restores otherwise legal capture. Cast boundary does not tick the new deadline.

Relocation preserves ID/source/payload/deadline; explicit invalid destination rejects the whole candidate including earlier RNG/allocations. Owner/controller fixture changes and caster destruction do not rewrite captured source. Synthetic test N1/N3, target/King permissions and cleanse permissions are **test-only**, not Shield producer approval. No Guardian D2/D5 or other Shield N is adopted.

## 5. Snapshot, repetition, replay and versioning

Engine **0.3.0 → 0.4.0** pins new executable capture-defense/query/forced-End meaning. State schema `1.0.0`, effect-instance-v1, replay v1 and existing source/duration data are unchanged; declaration/binding code lives in the ruleset, not GameState. Previous-engine snapshots/replays reject; no silent archive migration. Existing 0.2.0 rejection coverage remains; new tests reject 0.3.0.

Snapshot/clone round-trip validates stored definitions/source/duration and preserves immutable isolated payload data; root additionally requires supported runtime bindings. Replay executes exact refresh/events/hashes, and existing replay recorder rejects a sequence containing a blocked command rather than recording it as a committed fact. Relative-duration equivalence is tested across shifted source counters. Ruleset owners must pin changed definitions/bindings under the correct bundle identity/hash; no automatic executable-code hash was added.

Inherited limit: producer repetition projectors must normalize meaningful source references before real enablement. Synthetic projectors preserve raw caster/incarnation refs; relative-clock tests do not establish general source-ID renaming invariance or universal graph canonicalization.

## 6. Tests and verification

Red → green slices observed: new capture-defense metadata was initially rejected, disabled consumer API initially absent, and version test initially observed 0.3.0. Focused tests then passed with real registry/runtime/root validation. A test fixture was corrected during typecheck (`cell.position`); no production validator or TypeScript setting was relaxed.

31 new tests cover normal/King capture rejection, repeated blocking, no AP/slot/state/deadline changes, independent sources/refresh/expiry/removal, destruction/AP/cleanup, synthetic committed-death observer isolation, base geometry vs executable query/forced End, relocation/invalid relocation, source preservation, unknown interceptor pairing/redirect bypass, invalid N/King/target/policy, immutable callbacks/payload, both-player owner/controller isolation, snapshot tampering/clone, relative repetition, exact replay, derived-move rejection, Stun regression composition and engine compatibility. Expected outcomes use approved rules and explicit literals; no validation mocks.

| Check actually run | Result |
|---|---|
| Focused Shield file | PASS — 31 tests |
| Related focused regression slice | PASS — 164 tests / 7 files |
| Core workspace typecheck / changed-source ESLint | PASS |
| `npm run lint` | PASS — ESLint, boundaries and format |
| `npm run typecheck` | PASS — tooling and all workspaces |
| `npm run test` | PASS — 373 tests / 25 files; baseline 342 / 24 retained, +31 tests / +1 file |
| `npm run build` | PASS — packages, backend and frontend production build |
| `npm run smoke:exports` | PASS — 4 package ESM/CJS public entrypoints resolve; internal paths blocked |
| `npm run check:boundaries` | PASS — 6 workspace dependency boundaries |
| `npm run check:hygiene` | PASS — tracked artifacts/env, secret patterns and single lockfile |
| `git diff --check` | PASS |

Implement-skill review: specification axis **0 actionable findings**; standards axis **0 actionable findings**. Reviews were read-only, scoped to this milestone; no repeated legacy/Variant audit.

## 7. Remaining blockers and handoff to 02B-3

**Shield ENABLED=false / NOT_READY for actual producers.** Consumer descriptor is intentionally incomplete and cannot register as a complete EffectDefinition. Required: approved producer N/refs/target/King/special-unit/removal profile, any gameplay-bearing refresh payload semantics, complete producer-specific fixtures and semantic source projector. No global King immunity or blanket cleanse permission is introduced. Stun producers also remain disabled.

Unknown defense/interceptor pairs and all unrelated unsupported capabilities retain fail-closed gates. No Bomb consumer/death adapter, Guardian Divine Shield, other Variant skills, new destruction causes, frontend/backend gameplay or dependency changes. Phase 02B-3 requires a separate owner authorization and its own gates; reusable source/duration/defense infrastructure is the handoff. Stop after this report; no commit/push.
