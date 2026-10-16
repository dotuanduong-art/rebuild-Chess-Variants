# Phase 02B-5C — experimental Guardian Holy Shield acceptance

2026-10-16. **PASS — experimental Guardian Holy Shield IMPLEMENTED / READY / ENABLED only for selected players in its explicit pinned factory.** Root549 tests/29 files and all required checks passed. Full Guardian and all other concrete producers remain disabled. No new gameplay approval, dependency/backend/frontend source change, commit/push or subsequent milestone.

## 1. Authority and exact files changed

Recorded the owner's implementation authorization in [OPEN_DECISIONS](OPEN_DECISIONS.md) before source/tests. The six Holy Shield-only gameplay answers from5B are unchanged. Parent D-04/05/06/08/22 and unrelated producer fields are not closed.

| File(s) | Change in5C |
|---|---|
| `packages/shared-types/src/index.ts` | Persistent per-player profile schema; optional authoritative piece origin; versioned single-piece skill intent; opt-in effect origin/removal permissions; engine/state pins |
| `packages/game-core/src/state.ts` | Initialize profiles from trusted ruleset and validate exact match/config agreement |
| `packages/game-core/src/board.ts` | Mark initial ordinary-original pieces explicitly |
| `packages/game-core/src/transaction.ts` | One skill dispatch path for existing static plans and profile-authorized pure target planners |
| `packages/game-core/src/index.ts` | Export `SkillPlan`, `SkillDefinition`, `SkillPlanningContext` types |
| `packages/game-core/src/snapshot.ts` | Enforce profile agreement with trusted ruleset at restore |
| `packages/game-core/src/repetition.ts` | Preserve profile selection and provenance distinctions in semantic keys |
| `packages/game-core/src/effects.ts` | Validate declared bearer origin during record/codec handling |
| `packages/game-core/src/effect-runtime.ts` | Check opt-in explicit removal permissions; older synthetic definitions unchanged |
| `packages/game-variants/src/holy-shield.ts` | Complete approved registration, pure planner, frozen experimental profile/ruleset factory |
| `packages/game-variants/src/index.ts` | Export bounded factory and profile identity |
| `packages/game-variants/tests/holy-shield.fixture.ts` | Authoritative ordinary-board fixtures and public root-command helpers |
| `packages/game-variants/tests/holy-shield.test.ts` | 57 real-producer/security/turn/lifecycle/codec/replay/rollback tests |
| `packages/game-core/tests/effect-dispatch.test.ts`, `effect-relocation.test.ts` | Narrow static fixture skill types after introducing the planner union; expectations unchanged |
| `packages/game-core/tests/holy-shield-source.test.ts`, `snapshot.test.ts` | Update exact current engine/state pins; retain projection/effect and incompatible-version assertions |
| `packages/game-core/tests/delayed-actions.test.ts`, `stun-foundation.test.ts`, `shield-foundation.test.ts`, `bomb-foundation.test.ts` | Update four exact current-engine expectations to0.6; retain previous-engine rejection fixtures |
| `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md`, `FIRST_PRODUCER_APPROVAL_MATRIX.md`, `PHASE_02B_BATCH_A_APPROVED_MANIFEST.md`, `PHASE_02B_IMPLEMENTATION_PLAN.md` | Authorization/contracts/current implementation and enablement status |
| `docs/rebuild/PHASE_02B_5C_REPORT.md` | This acceptance report |

Earlier dirty/staged work is preserved. Independent reviews use the accepted pre5C worktree, not all changes against HEAD; no milestone commit exists.

## 2. Actor binding and command/planner boundary

`createHolyShieldExperimentalRuleset({white:boolean, black:boolean})` is trusted match composition. Only true selections receive `{id:'guardian.holy-shield-only.experimental', version:'1.0.0'}`. The copied/frozen selection is encoded in the ruleset hash `experimental-guardian-holy-shield-v1-w{0|1}-b{0|1}`. `createGame` captures it in required `playerProfiles`. `resolveCommand` and `decodeSnapshot` compare these profiles with the trusted config; wrong profile IDs/versions or changed selection reject even if a caller incorrectly reuses the hash. No mutable global current Variant, draft, unlock or matchmaking system.

The existing skill command gains optional `intent:{kind:'piece-target-v1',pieceId}`. The closed kind is the intent version; exactly one piece ID and no extra fields. Authority remains a trusted adapter input, never client DTO authority. Root checks current player; strict schemas reject client source/Variant/N/cost/payload/application/operations. Missing intent rejects the real skill. Existing static synthetic skills keep targetless commands and reject supplied target intents. No generalized targeting DSL or other ability is registered.

`SkillDefinition` is either the existing static `SkillPlan` or a required-profile pure `plan(SkillPlanningContext)` callback. Root verifies the profile and passes a deeply frozen cloned state/command. `planHolyShield` independently verifies turn/profile/skill/slot/AP and the live controlled target. It returns one trusted `effect_apply`, cost4; it never debits AP or mutates state. Root calls existing `commitNormalSkillUsage` once and queues the effect under its own IDs/FIFO/events.

## 3. Target provenance and complete Shield registration

Piece `origin` is an optional authoritative tag: `ordinary-original`, `special`, `summoned`. Missing means unknown, with no ordinary default. Only trusted initial setup creates the ordinary tag; client skill commands cannot supply it. Core initial layout supplies it. Special/summoned and unclassified custom pieces remain usable by pre-existing base contracts but cannot receive this producer's Shield or be its relocation destination. All six supported ordinary types, including King, remain governed by the closed piece-type schema. Owner/original side do not replace the cast controller check.

The actual `effect.shield` v1 registration reuses `SHIELD_PAYLOAD_SCHEMA` and `shield.capture.v1`. It declares BUFF/piece/public/source-player, allowed King, ordinary-origin eligibility, no link bindings/triggers, exact `player-originated-v1` guardian/guardian.holy_shield/null/null source, and producer `guardian.holy-shield` v1 with allowedRounds[2], source-end and no incarnation. Empty immutable payload, exact source-aware matching, preserve source/payload/stable ID and reset deadline on refresh. No manually injected effects in the production skill path.

Cast allegiance is checked in the producer planner, not continuing instance eligibility. Eligibility shared by apply/relocation permits ordinary destinations of either controller, including King; codec validates the declared origin too. Existing source/ID/payload/deadline are preserved on relocation. Test-only transport of generic swap operations demonstrates this; no Turtle/control skill is enabled. Missing graph/interception bindings still fail closed under existing `UNSUPPORTED_RUNTIME` guards.

`removal` describes cleanup consequences separately from `removalPermissions`, which permits only natural expiry, bearer death and terminal cleanup. Explicit cleanse/dispel/consume/replace/source-invalidated/link-broken removal rejects atomically. Existing operation schema already excludes explicit expiry; natural expiry uses the root scheduler. No removal reward, new cleanup operation or full defensive priority matrix.

## 4. AP, slots, lifecycle and independent oracles

Real casts accept AP4 and reject AP3; successful events are `skill_used(actualCost:4)`, `ap_changed`, `effect_applied` (or refreshed). No double debit, main slot consumption or cost discount. Skill→Move and Move→Skill auto-end follow P00-07; main move stays mandatory while legal. Existing legal-main/forced-End pipeline is unchanged.

Literal lifetime oracle: White cast at ordinal1 gives source-end deadline3; cast end1 preserves Shield. Recast ordinal2 keeps ID/appliedSequence and resets deadline4. Independent White/Black sources expire on their own boundaries. Controller/owner fixture changes do not re-source or remove attachments. Atomic capture rejection is repeatable, non-consuming and preserves a shielded King without terminal/death/AP facts. Approved destruction commits and gives only owner loss AP. Rook example after cost4: White16 → destruction/loss19; after eventual legal Black capture, White19/Black24. Terminal King capture cleans remaining Shields without capture/loss reward.

Root-committed ActionReady equivalence uses actual casts with coherently renamed matches/pieces and operation allocations: `left:operation:2` versus `right:operation:39`. Keys equal while full hashes differ. Literal projection preserves White/guardian/guardian.holy_shield/null/null, target A1 and remaining2; profile/provenance changes remain distinct. Source matching/projector and source-end clock algorithms are reused from5B.

Fault tests cover missing effect bindings, operation budget exhaustion, final candidate failure and test-only RNG work after a real cast. Rejection leaves the original full snapshot (board/AP/slots/RNG/IDs/history/profiles/effects), returns events=[] and permits deterministic retry. Synthetic probes only transport otherwise unavailable removal/relocation/fault operations; no probe is in the production factory or presented as an enabled ability.

## 5. Compatibility decision

**Engine0.6.0; state schema1.1.0.** Targeted executable skills, profile authorization and repetition meaning change; state now requires persisted profiles and carries optional provenance with gameplay meaning. This is an explicit compatibility boundary, not progress-only versioning. Old engine0.5/state1.0 archives reject; no silent migration/history reinterpretation. The old pinned runtime is required to replay old archives.

Effect record v1 and replay envelope v1 remain structurally sufficient; their full-state/header engine/schema pins enforce compatibility. Current targetless commands retain their shape, but historical archives do not execute under the new engine. Transport protocol/DTO versions are unchanged because this milestone adds no transport endpoint. Exact snapshot encode/decode/clone/full hashes, per-step restored continuation, actual source-end expiry and replay events/hashes are tested.

## Standards

Independent read-only review: **0 actionable findings**. Frozen planner/config boundaries, source validation, root ownership, deterministic state/profile projection and strict old-archive rejection conform to repository standards. No heuristic smell warrants refactoring in this bounded milestone.

## Spec

Independent read-only review: **0 actionable findings**. Exact authorized experimental profile, ordinary/King eligibility, source/N2/cost4, permissions, existing Shield behavior, synthetic compatibility and no other producer enablement verified. Reviewers did not run tests; actual commands/results below are from this implementation session.

## 6. Verification actually run

| Check | Actual result |
|---|---|
| New real-producer focused tests | PASS57/1 file |
| Producer +5B source + snapshot + Batch A + relocation + dispatch slice | PASS191/6 files |
| Targeted package builds / core+variants typecheck / changed-source lint | PASS |
| `npm run lint` | PASS; subsequent four version-literal edits also pass targeted ESLint/Prettier |
| `npm run typecheck` | PASS |
| `npm run test` | PASS549 tests/29 files (+57 tests/+1 file, baseline492 retained). First run found four stale current-engine literals; all corrected and rerun green |
| `npm run build` | PASS — packages/backend/frontend root build; no app source changes |
| `npm run smoke:exports` | PASS — four packages ESM/CJS resolve, internal paths blocked |
| `npm run check:boundaries` | PASS — six workspaces |
| `npm run check:hygiene` | PASS |
| `git diff --check` | PASS |
| Changed-doc local links / UTF-8 integrity | PASS — six documents /110 local links |

TDD reds identified the missing real factory/planner, missing removal permission enforcement, and absent codec provenance validation. Each received the scoped production change before focused green. Fixture fixes (correct swap operation fields, omitted versus explicit undefined intent, existing rejection-code spelling) changed no gameplay oracle. Baseline tests retain assertions; only exact current version literals and static fixture type narrowing changed.

## 7. Remaining gates and next safe milestone

Actual enablement is confined to this explicit experimental factory and selected players after acceptance. No automatic registration in base ruleset, full Guardian or every ruleset. Generic disabled consumer descriptor remains incomplete for other Shield producers; it does not override the complete separate Holy Shield registration.

Holy Aura, Sanctuary, Divine Shield, Dynamite/Live Charge/Landmine and all other producers remain disabled. Non-null caster/incarnation/linked source normalization, special/summoned producer eligibility, hidden cell projection and unapproved defensive interactions remain unsupported. No new removal permissions or Variant setup/lifecycle inferred. Backend authentication/transport/UI are future gates; the pure trusted-root input remains the engine seam.

Next safe work requires a separate owner-authorized milestone, such as an acceptance harness using this bounded factory. Any full Guardian/other producer requires its own complete approved profile and compatibility gate. Stop after this report; no automatic03/04 or commit/push.
