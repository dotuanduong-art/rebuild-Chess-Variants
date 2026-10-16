# Phase 02B-3 — Bomb consumer, committed death & FIFO chains

2026-10-15. **PASS — Bomb consumer-foundation milestone.** All concrete producers remain **ENABLED=false / NOT_READY**. No Dynamite/Live Charge/Landmine skill, hidden cell behavior, other death causes, backend/frontend source or dependency changes. No commit/push; no 02B-4/Phase03.

## 1. Authority and files changed

Explicit owner authorization recorded before implementation in OPEN_DECISIONS and EFFECT_SYSTEM_SPEC §11. Existing Batch A Bomb rules are the oracle; D-04/05/06/08 and unrelated producer questions remain OPEN/PARTIALLY_APPROVED. Manifest/plan separate APPROVED rules from IMPLEMENTED capabilities and ENABLED producers.

| Files changed this milestone | Purpose |
|---|---|
| `docs/rebuild/OPEN_DECISIONS.md`, `EFFECT_SYSTEM_SPEC.md` | Scope/authority and bounded concrete-mode contract |
| `docs/rebuild/PHASE_02B_BATCH_A_APPROVED_MANIFEST.md`, `PHASE_02B_IMPLEMENTATION_PLAN.md`, `PHASE_02B_3_REPORT.md` | Current status, remaining gates and this report |
| `packages/shared-types/src/index.ts` | Family/death-reaction declarations, typed internal source events, engine pin |
| `packages/game-core/src/bomb-consumer.ts` (new) | Disabled leaf descriptors, empty schema, pure planner and concrete definition authorization |
| `packages/game-core/src/committed-death.ts` (new) | Immutable death transport, binding contracts/validation and bounded reaction planning |
| `packages/game-core/src/effects.ts` | Family uniqueness during codec/import/final assignment; registry policy validation |
| `packages/game-core/src/effect-runtime.ts`, `effect-triggers.ts` | Frozen concrete bindings, explicit capability, validated family ignore and repetition metadata |
| `packages/game-core/src/transaction.ts`, `index.ts` | Root-private death/reaction/destruction envelopes and public contracts |
| `packages/game-core/tests/bomb-foundation.test.ts` (new) | 42 focused tests |
| `packages/game-core/tests/stun-foundation.test.ts`, `shield-foundation.test.ts`, `delayed-actions.test.ts` | Current engine literal updated; prior-version rejection coverage retained |

Earlier staged/untracked Phase 02A/02B work is preserved, not newly attributed here.

## 2. Committed death contract and concrete authorization

Public types: `CommittedDeathContext`, `CommittedDeathReactionContext`, `CommittedDeathReactionBinding`. Death context contains victim ID/type/current owner/controller/actual position, exact capture/destruction reason, optional attacker, root actor, transaction/operation/cause references, incoming destruction source and retired attachments with their captured sources. Root creates/deep-freezes this data only after successful base death/AP accounting, using the validated pre-operation board/attachments so cleanup cannot lose the victim's facts. It does not look up a removed victim or use application origin.

The context travels only inside the root queue; it is not a state record, event payload or mutable cache. New optional `deathReaction` declaration and `EffectRuntimeBindings.deathReactions` require capability `react:committed-death-v1` and exact **bomb-blast-v1** mode. Concrete authorization is bounded in the Bomb consumer module to the two approved leaf IDs/categories and permanent/public/unlinked/source-player contracts. No impersonation of synthetic-v1; unknown/missing bindings, extra unsupported behavior, invalid modes or forged private reaction operations reject.

Bindings receive deep-frozen cloned context and return typed target IDs. The core verifies the result equals the approved pure planner's exact ordered set; bindings cannot add/omit/reorder victims, mutate state or provide replacement source data. Public exports also include `BOMB_CONSUMER_CONTRACTS`, `BOMB_PAYLOAD_SCHEMA`, `BOMB_DEATH_REACTION_BINDINGS`, `planBombBlast`. Descriptors deliberately lack producer eligibility/removal/ref approval and cannot register as complete definitions.

## 3. Family policy and blast planning

Optional generic data declaration `family: { id, policy: 'unique-target-ignore' }` requires explicit type-target/ignore stacking. Stun/Shield definitions receive no family policy. Instance collection validation rejects duplicate family+target regardless of definition/source; snapshot encode/decode and relocation/whole-set final assignment reuse this validator.

Application validates envelope/version/payload/source/lifetime and runtime binding support before duplicate detection. A matching family returns the original records with no Applied/refreshed/replaced fact or new effect instance. Incoming gameplay target/King eligibility is not reapplied to replace the approved ignore outcome. Original source/category/ID/payload/deadline remain intact. **ID distinction:** an attempted application still has the existing causal operation ID allocated by the root; no additional effect ID/instance is allocated for ignore. No global ID scheme or transaction history was redesigned.

`planBombBlast` reads current occupants when the reaction resolves, selects the clipped 3×3 around the snapshotted death coordinate, excludes King, includes non-Kings of both controllers/owners and returns frozen IDs in rank/file order. Base mutation remains in root destruction operations. No travel time/delayed scheduler, source-allegiance filter or application-time occupancy cache.

## 4. FIFO, attribution, accounting and cross-effect boundaries

After emitting a committed death fact, root enqueues each eligible retired-instance reaction once using a death-event/instance key. Existing declared synthetic observers retain their queue order; no new concrete priority matrix is approved. The concrete reaction resolves against the current board and enqueues row-major destructions through the same FIFO. Subsequent deaths capture their own retired Bomb and source. Root death dedup skips already committed victims; overlapping blasts cannot duplicate loss AP or reactions. Budget/callback/plan/fault failure discards the entire candidate, events, AP, RNG, IDs, history and effects.

Each queued destruction envelope carries the triggering Bomb's captured `EffectSourceIdentity` and origin effect ID. Core supplies this attribution, not the binding or current target/caster lookup. Internal `bomb_exploded` records effect/definition/center/source/targets; sourced `piece_destroyed` adds original source/originEffectId/rootActor. Thus root initiator, dead bearer, Bomb source and derived victim remain distinct; the next Bomb in a chain supplies its own source. Destruction awards **no capture AP**; existing loss AP is added once to each victim's current owner. No passive reward is introduced.

Shield rejects capture before any committed death/reaction and does not block non-King destruction. Stun prevents bearer main capture as before. King is never a blast target; a committed King capture closes terminal before any remaining reaction/observer cascade. Cleanse/dispel/replacement cleanup, permanent-Bomb boundary passage, relocation/swap and invalid/canceled deaths do not explode. Natural expiry is unavailable for permanent Bomb; forged expiry requests reject rather than inventing a new operation. Exile/despawn/sacrifice are not implemented or converted into death causes. Existing arbitrary Shield/interceptor gates and unknown concrete reaction modes remain fail closed.

All facts remain schema-enforced **internal** events. Retired hidden payloads, full death context and RNG seed are not copied into Bomb event payloads. This is not a live-client projection implementation or authorization to publish internal logs.

## 5. Snapshot, repetition, replay and versions

Engine **0.4.0 → 0.5.0** pins changed execution, family interpretation and event contracts. State schema **1.0.0**, effect-instance-v1 and replay v1 remain structurally sufficient: concrete declarations/bindings live in the pinned ruleset, private reaction queue is drained or discarded before commit, stored Bomb data uses existing permanent effect records. Old-engine snapshots/replays reject; no silent migration. Ruleset owners must pin changed definitions/policies/bindings under correct identity/hash; no automatic code hashing is introduced.

Family/category/definition and projector-supplied original source/normalized target are represented in repetition; permanent anchor/allocation IDs are omitted. Application order between Bombs on different targets is irrelevant with one family instance per target: actual execution follows committed-death FIFO and board order, so this order noise is excluded. Existing meaningful synthetic listener/stack ordering remains unchanged. Exact snapshot restore and replay events/hashes are tested.

Inherited enablement limit: a full producer projector must normalize semantic caster/incarnation relations; test fixtures retain raw source refs and do not establish arbitrary source-ID renaming invariance. Existing permanent-lifetime validation does not enable incarnation-bearing producer parameters; no fake incarnation is generated. A producer requiring that support must first declare/validate its contract. These are separate producer gates, not implied approvals.

## 6. Tests, review and actual verification

TDD red → green covered missing family metadata, concrete consumer/reaction capability, engine pin, and two validation regressions found during implementation: duplicate ignore bypassing a missing binding, and irrelevant Bomb application order contaminating repetition. Tests now validate incoming data/runtime support before ignore and keep equivalent Bomb positions equal. An unsupported forced-expiry fixture was corrected to test permanent lifetime/rejection; validators and TypeScript settings were not weakened.

42 focused scenarios cover independent clipping literals, committed capture/destruction/movement/final redirect center, frozen death context/retired cleanup, both sides/capturer/King, overlapping two-source chains, FIFO/dedup/owner AP, terminal stop, budget/mid-chain fault rollback, four duplicate combinations, import/final relocation uniqueness, simultaneous whole-set swap, Shield/Stun, cleanup/no expiry blast, source isolation, immutable empty payloads, malformed/missing bindings, hidden retired payload exclusion, current occupancy, repetition and exact replay/tamper/version rejection. Test-only definitions explicitly declare synthetic eligibility/removal/refs; they do not approve Dynamite/Guardian/Landmine producers. No validation mocks.

| Check actually run | Result |
|---|---|
| Focused Bomb tests | PASS — 42 tests |
| Related focused regression slice | PASS — 206 tests / 8 files |
| Core workspace typecheck / changed-source ESLint | PASS |
| `npm run lint` | PASS — ESLint, boundaries and formatting |
| `npm run typecheck` | PASS — tooling and all workspaces |
| `npm run test` | PASS — 415 tests / 26 files; previous 373-test baseline retained, +42 tests / +1 file |
| `npm run build` | PASS — packages, backend and frontend production build |
| `npm run smoke:exports` | PASS — 4 package ESM/CJS public entrypoints resolve; internal paths blocked |
| `npm run check:boundaries` | PASS — 6 workspaces |
| `npm run check:hygiene` | PASS — artifact/env, secret-pattern and single-lockfile checks |
| `git diff --check` | PASS |

Implement-skill review: **Spec — 0 actionable findings; Standards — 0 actionable findings.** Both reviews read-only and scoped to Bomb changes. No unresolved review finding; implementation-stage validation/repetition fixes are described above.

## 7. Remaining gates and handoff

Bomb charge/mine consumer foundation IMPLEMENTED; all concrete producers remain **disabled / NOT_READY**. Missing producer target/King/special-unit eligibility, required refs, removal permissions, costs/setup, complete fixtures/projectors and any required incarnation support must be approved/verified before enablement. Hidden cell entry/consume/reveal, Aegis/Blessing, Fate/Phoenix and other death causes remain deferred/unsupported; no approval of full D-04/05/06/08.

Next separately authorized isolated Batch A integration can reuse death transport, family validation, pure planner and source-bearing root queue with the Stun/Shield seams, while preserving producer gates. No automatic 02B-4/Phase03. Stop after report; no commit/push.
