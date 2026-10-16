# Semantic source repetition — independent 02B-5B gate

## Current status — accepted 02B-5C/5D bounded producer

The approved experimental Guardian Holy Shield-only producer is IMPLEMENTED / READY / ENABLED exclusively for explicitly selected players through the pinned `createHolyShieldExperimentalRuleset` factory. Full Guardian and every other producer remain NOT_READY/disabled. The accepted runtime is engine0.6.0/state1.1.0; [5C acceptance](PHASE_02B_5C_REPORT.md) records the actor/target/cost/removal implementation and [5D harness](PHASE_02B_5D_REPORT.md) verifies real exported-API casting, capture defense, expiry, snapshot/repetition/replay. No gameplay approval or capability is added by this checkpoint correction.

Source normalization remains bounded to the approved player/guardian/guardian.holy_shield/null/null profile. Non-null caster, incarnation and linked-source normalization remain unsupported for producer enablement; existing synthetic reference fixtures do not certify them. No universal canonical graph capability, source identity rewrite or broader normalization algorithm was added. The 5B evidence below is historical and retains its original versions, test counts and then-disabled producer status.

## Historical 02B-5B implementation overlay

Owner has approved the Holy Shield-only player-originated source: required player/guardian/guardian.holy_shield/null/null, N2/source-end, fixed4 without Holy Aura; ordinary controlled cast target including King, either-controller eligible ordinary relocation, expiry/death/terminal cleanup only. No source/cost/target implementation for an actual producer is enabled. Historical conditional 5A options below are superseded only for this exact profile.

Implementation adds only optional **`sourceAttribution.profile: {kind: player-originated-v1, sourceVariant, sourceSkill}`** to definition metadata, plus pure scoped validation. Registry rejects unknown version/kind; `planEffectApplication` validates the declared source before family-ignore, and `validateEffectInstance` checks apply/encode/decode/clone. Records for opted profiles require explicit null incarnation; omitted optional application refs canonicalize to stored null. Wrong declared Variant/skill or any caster/incarnation cannot use the bounded declaration. No source lookup, semantic label rewrite, context extension or graph solver. Existing projector/repetition/source-key/clock structures are unchanged.

**Boundary:** this is a source-contract guard, not a new producer registry. Definitions without the optional declaration retain earlier synthetic behavior and receive no enablement approval from5B. Real Holy Shield registration remains absent;5C must require the signed exact declaration/profile before enabling its own planner. Live/dead/incarnation/linked-source modes have no reviewed normalization kind. Explicit source references without reviewed link bindings still reject at existing runtime checks; permanent Bomb incarnation parameters retain their old rejection. Codec validation of plain records is not a certification of unsupported linked gameplay.

| Criterion | Historical bounded 02B-5B implementation evidence |
|---|---|
| SG-1 | PASS focused: exact player enum, declaration-pinned Variant/skill/null refs and N2 fixture; six owner fields recorded before code. Actual skill/target/cost permissions deferred5C |
| SG-2 | PASS focused EQ-1/EQ-5: coherent match/piece/effect/operation allocation spelling and relative ordinal shifts produce equal keys/full hashes may differ. EQ-2/3/4 remain UNSUPPORTED, not passed |
| SG-3 | PASS focused: different semantic source player/Variant/skill, target/remaining time, synthetic family/category/listener order retained; present caster/incarnation rejects rather than collapsing to null |
| SG-4 | PASS consumer boundary: paired source refresh/stable IDs, later N2 anchor reset, cross-source independence, expiry and capture-defense/legal action outcomes. Actual Holy Shield casting unavailable and not claimed |
| SG-5 | PASS focused: original tuples/source keys/IDs/deadlines preserved after transfer/bearer movement/control fixture, clone and replay; no source-piece movement case exists in null-caster profile |
| SG-6 | PASS focused: declaration/record/profile/version/missing runtime binding/cross-match data/unsupported refs reject; registry/context frozen and no mutable cache |
| SG-7 | PASS focused: ActionReady keys, source-relative timing, exact restore/replay/events/hashes and candidate RNG/ID/slot/effect rollback |
| SG-8 | PASS scoped compatibility proof: prior null-source key/effect records unchanged; engine0.5.0/state1.0.0/recordv1/replayv1 retained; distinct fixture ruleset hashes, mismatched/older incompatible archives reject |
| SG-9 | PASS — related focused203/6 files; root492/28 files with all447 baseline tests retained; all required final checks passed in [5B report](PHASE_02B_5B_REPORT.md) |

No producer enabled. Remaining document sections are the broader historical technical plan; this implemented bounded proof does not certify their unsupported graph cases.

Historical5A planning baseline, 2026-10-15: proposed technical plan, no code/key/source/snapshot/version change in5A. The historical5B overlay records its separately authorized null-source implementation; at that milestone, broader graph work and5C producer enablement were unapproved. The current5C/5D status is recorded above; broader graph work remains unsupported. Other gameplay unknowns stay in [producer matrix](FIRST_PRODUCER_APPROVAL_MATRIX.md); canonical graph labeling itself is an engineering choice under P00-10, not a new owner gameplay vote.

## 1. Historical 5A/5B boundary and evidence

| File / symbol | Observed capability or limitation |
|---|---|
| `packages/game-core/tests/batch-a-fixture.ts::batchDefinitions` | Test-only projector emits raw `sourcePiece`, raw `sourceIncarnation ?? null`, plus semantic player/variant/skill; target and remaining lifetime already come from normalized context |
| `packages/game-core/tests/batch-a.integration.test.ts`, test `exposes the raw caster/incarnation projection gate without dropping identity from repetition` | Equal normalized piece boards with coherently renamed source refs have unequal effect projections. This diagnoses an enablement blocker, not a desired negative gameplay pair |
| `packages/game-core/src/effects.ts::EffectRepetitionContext` / `EffectRepetitionProjector` | Definition-owned callback receives instance and normalized target/group/remaining lifetime, no whole source-reference context |
| `packages/game-core/src/effect-runtime.ts::runtimeRepetitionProjection` | Normalizes piece target by position and deadlines relatively; includes family/category and meaningful listener/stack order. Builds effect entries from definition projectors; custom bundle `effects` alone does not override unlinked entries |
| `packages/game-core/src/effect-parameters.ts::effectSourceKey`, `captureEffectSource`, `sourceOf` | Captured tuple is match-scoped and exact. Optional source refs canonicalize to null. Incarnation without caster rejected; no mutable caster lookup in matching |
| `packages/game-core/src/effect-parameters.ts::resolveEffectLifetime` | Timed profile can validate supported incarnation refs; non-producer-rounds/permanent policies currently reject non-null incarnation. Projection must not bypass this validator |
| `packages/shared-types/src/index.ts::PieceSchema`, `GameStateSchema` | No native caster-incarnation/lineage producer or committed graveyard model. Historical equality of source strings exists, but full incarnation semantics are not established by a string schema |
| `packages/game-core/src/repetition.ts::repetitionKey` | Board projection excludes allocation piece IDs, keeps position/type/originalSide/owner/controller. Threefold includes semantic AP/effects/variant state and side; full replay hash is separate |

At the historical5A/5B boundary, no complete production definition/projector was enabled. The raw behavior is in explicitly synthetic fixtures (`synthetic.alpha`, `synthetic.beta`, `synthetic.other` timed profiles; caster-bearing Bomb fixtures). Current Holy Shield-only enablement does not certify normalization of these caster/incarnation relationships.

## 2. Stable meaning versus allocation spelling

| Reference / datum | Required treatment |
|---|---|
| Source player | Semantic White/Black source/clock owner. Never replace with bearer owner/controller, root actor, capturer or anonymous player label |
| Source Variant/skill, definition ID/version | Stable semantic names and policy identity; retain. Renaming a semantic skill ID is not alpha-renaming an allocation ID |
| Caster piece | The relation to a particular live/historical piece can affect future allowed casts, matching/refresh, source-invalidated cleanup or permissions. The generated spelling of its ID may be incidental; the relation/equality partition is not |
| Caster incarnation | Same incarnation versus another, membership in a caster/lineage and any declared current-versus-retired relation may affect future matching. The token spelling is incidental only after its producer semantics are pinned; no fake epoch/generation inferred from an operation counter |
| Null/missing refs | Canonical null means absent ref. It is distinct from a present caster/incarnation node; empty strings/sentinels/concatenated identifiers cannot collapse these cases |
| Match/group/effect allocation IDs | Namespace and reference relations remain validated in runtime/codec; arbitrary allocation prefixes/counters do not belong in semantic repetition. Group topology/order is retained when meaningful |
| Source player clock / remaining lifetime | Keep source side and boundary with relative logical remaining duration; exclude absolute ordinals and cast-operation IDs. Preserve any other producer parameter only if its signed future behavior uses it |
| Bomb family/category/original source and listener order | Retain approved semantic family/category/source, plus meaningful reaction/listener/stack ordering. Do not add irrelevant cross-target Bomb apply order back into the key |

Stable matching identity is immutable for an instance. A canonical source *label used in one projected position* need not stay constant after the board changes: a live caster may move, and the board/source relationship changes in the semantic graph. That is not a source replacement. Projection never writes the canonical label into `EffectInstance`, event attribution, root queue or `effectSourceKey`.

## 3. When references affect future gameplay

1. **Player-originated profile:** owner explicitly approves no board caster/incarnation. Null refs are real producer semantics, not a workaround chosen to pass repetition. Exact player/Variant/skill remains; later same-source recast matches that tuple.
2. **Live piece caster:** an approved planner may select this actor again, require its controller/type/status, or compare it with a target. Preserve source→live-piece and source→target relations. Normalize against the same board vertices used for piece projection, not a separately indexed list sorted by raw IDs.
3. **Dead/missing caster:** attachments can retain valid historical refs after source death. Absence does not permit dropping identity or converting it to null. Retain equality/sharing partitions across remaining source refs and any declared death/lineage/removal references. Reuse of the caster, revival, or exact historical selection is blocked unless the relevant producer/lifecycle contract exists.
4. **Incarnation-bearing producer:** the same piece in a new incarnation may intentionally be a different matching source. Preserve current/retired incarnation membership and same-versus-distinct generation relations. If the profile cannot establish these facts from validated state, it is BLOCKED_ENGINE; unequal raw strings alone do not prove semantic inequality or equivalence.
5. **Sanctuary-generated Stun:** region origin and cross-zone source-sharing must follow owner answers. Preserve the original producer tuple and any approved parent dependency; do not turn region IDs/attacker IDs into invented caster IDs. A parent reference is not automatically a linked group.
6. **Dynamic Holy Aura/other stateful producer:** if approved quote/eligibility depends on a death inventory or other Variant state, that state also needs a semantic projection. A source-only normalization pass cannot conceal a missing future-relevant AP/cost predicate.

The future profile declares what it can observe. Do not infer a permanent generation count, caster liveness restriction, source-invalidated removal or parent cleanup merely because a reference exists. Conversely, do not omit a relationship that an enabled producer or remover can distinguish.

## 4. Proposed definition-owned contract (no implementation)

Each complete definition/producer profile should pin a versioned source-projection declaration alongside its existing repetition projector:

- Semantic source fields and canonical null handling; exact profile scope and required references.
- Observable relations: player/Variant/skill, optional caster vertex, incarnation vertex/lineage, source-sharing across instances, target/self relation and any approved historical/parent dependency.
- What makes a historical ref valid after death; which profile cannot be projected without additional validated lineage/death data.
- The normalized source context required by that definition; pure output plus conformance/negative test fixtures. No function or derived graph cache enters GameState.

**Recommended engineering direction:** a pure, explicitly bound source-normalization stage inside the ruleset's repetition composition builds one frozen reference context from the validated semantic position. Definitions own their dependency declarations and project normalized source relations using that context. Extend the existing context minimally for the selected profile; do not create a universal gameplay graph language. Definition projectors must not capture mutable match state or perform live lookup through module-level closures.

The shared stage supplies consistent labels for all refs to the same semantic node; definitions determine which approved relations their gameplay observes. Live source/target references use a common vertex map. Dead-source/incarnation nodes require canonical structural labels independent of raw-ID order; equal-looking but distinct nodes must not accidentally merge. A canonicalizer may need component-level labeling for symmetric graphs; this plan does not implement or require an unrestricted graph solver. If the selected profile needs an unsupported relation or unresolved symmetry, keep it disabled until the bounded exact algorithm is justified. Never use lexical raw-ID order as a purported normalization tie-breaker.

Keep generic family/category/listener-order/relative-lifetime composition intact. A definition cannot use this seam to erase a known meaningful source distinction. Source normalization must be idempotent/deterministic and read-only. The engineer can choose a compatible context extension or another verified composition seam; the acceptance properties below, not a speculative interface hierarchy, are the gate.

**Minimum 5B scope:** if the owner selects null-caster/null-incarnation Holy Shield, prove its complete player/Variant/skill projection and all relevant existing runtime distinctions. Do not build dead-source/lineage canonicalization merely for an unsupported future profile. Caster-bearing profiles remain explicitly blocked until their own conformance gate passes; a passing null-only profile never certifies arbitrary source graphs.

## 5. Equivalence pairs and independent negative pairs

Build complete valid states/ordered inputs at public root/codec/replay seams. Use manually specified relationship diagrams/tables as oracles; do not calculate expected labels with the implementation being tested. Correlated renaming must update every declared reference, including supported Variant/death/parent state. Supported observations must correspond under that renaming.

| Pair | Expected / reason |
|---|---|
| EQ-1: same null-ref approved profile/board/AP/side with different match/effect/operation allocation names | Equal key; scope/identity remains separately valid in each state |
| EQ-2: live caster and all refs consistently alpha-renamed, same positions/types/owner/controller and caster→target relations | Equal key for a profile declaring live-caster normalization; raw matching keys stay intact in each state |
| EQ-3: dead caster names consistently renamed; same source-sharing/incidence with effect targets and approved historical data | Equal key only for a profile with complete supported historical-source semantics; otherwise BLOCKED, not silently collapsed |
| EQ-4: incarnation token names renamed consistently with the same caster/current-retired/lineage relationships | Equal key only after real incarnation semantics/producer validation supported; current opaque-string fixtures are diagnostic, not the oracle |
| EQ-5: all absolute clocks shifted equally, same source/boundary/remaining duration and future state | Equal key; snapshots/full hashes may differ |
| EQ-6: different allocation/apply order for independent Bombs on distinct targets, same source-family semantic graph | Equal key; actual deaths still determine FIFO blasts |
| NEG-1: identical board but different source player or semantic Variant/skill | Different key where future refresh/attribution/clock can distinguish; do not anonymize these semantic IDs |
| NEG-2: source points to live piece at A1 versus a distinct live piece at B1, otherwise same board | Different key for a caster-sensitive producer; changing spelling alone is not this case |
| NEG-3: two effects share one caster versus use two distinct historical casters, same visible board | Different when declared same-source matching/dependency can distinguish; preserve sharing partitions, not raw tokens |
| NEG-4: current source incarnation versus another validated incarnation, otherwise corresponding state | Different for supported incarnation-sensitive matching. A lone unclassified raw token change is not a sufficient negative oracle |
| NEG-5: absent caster versus present valid caster; absent incarnation versus present supported incarnation | Distinct when approved source profile permits both and subsequent matching differs; invalid combinations reject rather than produce a key |
| NEG-6: different remaining duration/boundary/source clock, family/category or meaningful listener/stack order | Different key under existing semantics; normalize only allocation noise |
| NEG-7: caster→bearer self relation versus caster→other piece, or changed approved parent/lineage dependency | Different for profiles whose future matching/permissions observe that relation |
| NEG-8: changed AP, owner/controller, enabled producer state or Holy Aura count affecting next legal quote | Different semantic position; unchanged source tuple alone cannot equate the states |

Do not globally demand equal keys for White/Black mirrors: player labels/side-to-act are semantic. Mirror tests instead prove the same normalization/legality properties per side. Do not require unequal keys for every raw caster/incarnation spelling change; that would preserve the diagnosed defect.

## 6. Testable 02B-5B acceptance gate

| Criterion | Evidence required before a profile passes |
|---|---|
| SG-1 Profile completeness | Required/optional source refs and observable dependencies pinned; no outstanding gameplay field is replaced with an engineering default |
| SG-2 Equivalence | All applicable EQ pairs produce equal semantic keys, including approved null handling; unsupported historical/incarnation pairs explicitly blocked |
| SG-3 Distinction | Applicable NEG pairs remain distinct; source classes, caster/incarnation aliasing, families, clocks and meaningful order preserved |
| SG-4 Future behavior | Equal projected states yield corresponding approved next-action validity, cost, matching/refresh/coexistence and source-dependent results under coherent input renaming; test at least recast and relevant removal/event cases |
| SG-5 Source integrity | Exact serialized tuples, root source attribution, `effectSourceKey` behavior and stable IDs unchanged before/after read-only projection, control, caster movement/death and swap; no fake incarnation |
| SG-6 Validation/immutability | Missing graph binding, invalid/cross-match refs or unsupported profile fail closed at the appropriate declared boundary; no shallow alias or callback/global cache; repeated calls deterministic and side-effect free |
| SG-7 Root/determinism | ActionReady threefold counting, source-relative timing, root rollback, clone/codec and exact same-version replay/events/hashes pass; fixture null-only success cannot greenlight real caster/incarnation producers |
| SG-8 Compatibility | Engineer reviews executable repetition meaning, profile/projector/ruleset pin and engine/archive compatibility; reject incompatible histories rather than silently migrate. No chosen version number in this document |
| SG-9 Regression | Existing Phase01B/02A/02B tests and required implementation verification pass; no all-effect switch/whitelist or unapproved trigger/permission added |

02B-5A does **not** execute these tests. Baseline447/27 is historical acceptance from 02B-4, not a new verification run.

## 7. Gate outcome and handoff

**Current: BLOCKED_ENGINE for non-null caster/incarnation/linked-source normalization.** The approved null-source Holy Shield producer is READY / ENABLED only in its pinned experimental factory after5C/5D acceptance. Producer/actor/target/cost/removal implementation for this exact profile is complete; full Guardian and all other producers remain NOT_READY/disabled. Source matching/category/timing approvals are unchanged; no universal canonical graph capability is claimed.

Historical suggested handoff: owner signs the first source/producer profile → separately authorize5B's applicable SG criteria → separately authorize5C's planner/producer and acceptance. Those steps are now complete only for experimental Holy Shield;5D added the public-API acceptance harness. Passing5B alone enabled no skill. Landmine/hidden projection, full lineage/revive and unapproved priority matrices remain deferred. No subsequent milestone is authorized by this checkpoint preparation.
