# Phase 01B — Deterministic Base Core

2026-10-14 (Asia/Saigon). **READY_WITH_CONDITIONS** để đề xuất Phase02; Phase02 chưa bắt đầu. Toàn bộ 01B-1…5 đã có implementation và verification theo scope đã duyệt. Không commit/push trong phiên 01B-3/4/5; HEAD vẫn `7c06af7`.

## Deliverables và nguồn

- [01B-1](PHASE_01B_1_REPORT.md): board/pieces/coordinates/movement.
- [01B-2](PHASE_01B_2_REPORT.md): AP/turn/King terminal/Queen promotion.
- [01B-3](PHASE_01B_3_REPORT.md): full state/root transaction/RNG/IDs/events.
- [01B-4](PHASE_01B_4_REPORT.md): strict snapshots/serialization/repetition/history/replay.
- [01B-5](PHASE_01B_5_REPORT.md): advanced tests/review/fixes/final commands.

Luật từ [GAMEPLAY_SPEC](GAMEPLAY_SPEC.md), P00/B1/B2 trong [OPEN_DECISIONS](OPEN_DECISIONS.md). Kiến trúc/test oracle từ [ENGINE_ARCHITECTURE](ENGINE_ARCHITECTURE.md), [TEST_STRATEGY](TEST_STRATEGY.md), các phần lifecycle/isolation cần thiết của [effects](EFFECT_SYSTEM_SPEC.md)/[plugins](VARIANT_PLUGIN_SPEC.md). Không đổi luật hoặc import/copy implementation legacy.

## Modules và public API

| Module | Public seam / behavior |
| --- | --- |
| Board/coordinates | createBoard/createInitialBoard/getPiece/getPieceAt; bounds và index/algebraic conversion;225 cells,60 initial pieces, stable IDs |
| Movement | generateMovementGeometry/generateBaseMoves; sáu types, Bishop ngang1; Pawn controller direction/start rank/capture allegiance; modifier interface only |
| AP | createAPState/debitAP/settleDeathAP/awardPromotionAP/getPieceAPValue; exact approved table; positive Piece Loss AP Reward owner; capture/promotion controller; King0 |
| BasePosition | Immutable pure domain primitives cho normal main move, synthetic skill usage, End/destruction; valid APIs01B-2 giữ nguyên |
| State | createGame/assertGameState/allocateGameId; strict match+versions, board/AP/turn/terminal, RNG/counters, per-player namespaces, opaque rule data và history |
| Transaction | resolveCommand; trusted authority/schema, independent candidate, FIFO operations/reactions, budget, death dedup, final invariants, all-or-nothing output |
| Ruleset | RulesetBundle/DerivedOperation/EventHandler/CaptureInterceptor/TransactionOptions; reviewed synthetic contracts ngoài state, không concrete Variant |
| RNG | createRng/nextRandom/chooseCanonical, RNG_VERSION=xorshift32-v1; version/seed/cursor, canonical pool/rejection sampling |
| Events | Shared strict discriminated DomainEventSchema; deterministic ID/cause/transaction/sequence và per-kind typed payloads, internal visibility |
| Snapshots | canonicalEncode/encodeSnapshot/decodeSnapshot/cloneSnapshot; schema/ruleset/engine/RNG compatibility và deep runtime isolation |
| Fingerprints | fullStateHash (tagged FNV64 diagnostic checksum); repetitionKey (canonical semantic equality string); separate RoleSafeViewHash contract only |
| Repetition/history | P00-10 initial/actionReady after queue drain; third occurrence draw; relativeDeadline và definition-owned projection; bounded position snapshots |
| Replay | recordReplay/executeReplay; pinned initial snapshot/seed/versions/hash + accepted ordered inputs, expected state fingerprints/exact events và validation hook |

Public exports thực tế tại [core index](../../packages/game-core/src/index.ts) và [shared contracts](../../packages/shared-types/src/index.ts). Không đổi package exports/private-subpath boundary.

## API integration / migration

Board/Piece/Movement contracts01B-1 giữ nguyên; không hasMoved, self-check, castling hoặc en passant. AP và valid BasePosition calls01B-2 vẫn tương thích.

Full GameState chỉ chuyển qua `resolveCommand`. Bốn BasePosition mutation helpers bổ sung `USE_ROOT_TRANSACTION` nếu nhận full state; chúng là domain primitives/compatibility seams, không có metadata/repetition/RNG commit riêng cạnh tranh. Backend mới phải tạo trusted actor/system input; tuyệt đối không bind client directly vào destruction hoặc AP accounting helpers. AP helpers nhận committed facts một lần do root death dedup bảo đảm; không dùng MovementCandidate làm death fact.

Không breaking removal/rename APIs cũ. Thêm strict schemas và APIs engine mới; primitive misuse rejection là additive. GameState không chứa functions/runtime handles, callbacks nằm trong reviewed pinned bundle.

## Evidence

Final suite **18 files /198 tests PASS**, tăng42 so với156 cuối01B-2. Sáu suites mới: random, transaction, snapshot, repetition, replay, integration; giữ các suites cũ. 01B-5 report ghi từng command thực tế, transient failures/fixes và independent reviews.

- Determinism: seed1 golden RNG, canonical pool order, repeated same seed/input outcomes, stable handler ties/causes/IDs, seeded stream replay equality.
- Atomicity: derived failure sau random/death, queue overflow, invariant failure và invalid roots giữ input Board/AP/Turn/history/RNG/counters; failed transactions trả events=[] và không partial state.
- Death: controller capture/promotion, owner positive loss reward, committed-only/cancel/redirect/dedup, protected destruction King và capture King terminal priority được regression.
- Serialization: strict incompatible versions/unknown fields reject, canonical UTF-8 fingerprint, nested clone/freeze/mutation probes, history ID/counter consistency.
- Repetition/replay: initial count, exact turnStart after drain, no intermediate counts, relative synthetic deadlines, noisy IDs/RNG excluded from semantic equality, unknown opaque semantics fail closed; checkpoint replay và header/hash/event tampering tests.
- Independent perft depth1–3 =3/9/54 cho reviewed corner-Kings fixture; seeded1/7/199 invariant streams và invalid-input fuzz. Không dùng legacy/chess8×8 counts làm oracle.

Lint/typecheck/test/build/exports/boundaries/hygiene/diff checks đều pass. Reference/legacy, apps, dependency versions/lockfile, CI/tooling không thay đổi. No generated artifacts được stage/commit; không thêm runtime dependencies.

## Bugs fixed và known limits

Final review sửa typed-event contract, history counter reuse, initial projector mismatch, canonical malformed arrays, clone exception escape; parent regression khóa mutable semantic projector; production build sửa missing platform globals bằng portable pure code. Regression + re-review pass; không còn critical correctness findings đã biết.

Opaque effects/delayed state serialize được nhưng resolver reject thực thi khi không rỗng. Repetition cho opaque state cần approved definition-owned semantic projection; synthetic numeric/deadline tests chưa chứng minh linked graph/hidden concrete effects. Không bật global generic scheduler hoặc fake Variant implementation.

FNV64 là diagnostic fingerprint, không cryptographic authenticity proof. Repetition dùng full canonical key thay vì hash collision-prone equality. Full state/hash/replay là internal; role-safe projector/sync hash implementation thuộc Phase03. Runtime bundles phải được archive immutable theo version/hash bên ngoài core; core không chứng minh string hash tương ứng callback source, không sandbox untrusted code.

Default history128/max4096 là technical retention config, không chốt Time lookback. Chưa Time gameplay rewind, live clocks/timeouts, disconnect, persistent commit, receipts/idempotency cross-root, auth, sockets, frontend3D hoặc replay UI. Negative AP/Pirate debt và special removal rewards vẫn pending. Không performance/security/public-release claim.

## Open decisions và Phase02 prerequisites

1. Cần yêu cầu bắt đầu Phase02 riêng; không chuyển phase tự động.
2. D-04 priority/capture interception cho definitions bật; không tự gán Shield/Fate/Phoenix order hoặc Phoenix exception.
3. D-05 stacking/refresh/source attribution, D-06 removal/constraints và D-08 threat/path semantics cần approval theo definition được enable.
4. Mỗi definition mới khai báo payload/version, source/owner/controller, King eligibility, lifetime/boundary, linked references/relocation và semantic repetition projection; thêm normal/mirror/rollback/replay cases trước enable.
5. Mở rộng versioned placeholder contracts và root stages để chạy effects/delayed actions thực; không bỏ fail-closed guards trước khi acceptance tương ứng pass.
6. Future Time, summon/revive/despawn/exile, multiple control, debt và từng Variant giữ group gates trong registry; không cần đóng toàn catalog để xây generic infrastructure.

**Kết luận: Phase01B hoàn tất — READY_WITH_CONDITIONS cho Phase02. Đã dừng trước Phase02, chưa commit/push.**
