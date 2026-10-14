# IMPLEMENTATION_ROADMAP — clean rebuild theo gate

Ngày spec gốc 2026-10-13; cập nhật implementation 2026-10-14: 01A và toàn 01B đã hoàn tất verification, kết luận [READY_WITH_CONDITIONS](PHASE_01B_REPORT.md) cho Phase 02. Phase 02 chưa được bắt đầu; các phase sau vẫn qua gate riêng. [Roadmap legacy](../audit/07-roadmap-final.md) cung cấp mapping requirements và gates; không migrate source hoặc kế thừa trạng thái HOÀN THÀNH. [OPEN_DECISIONS](OPEN_DECISIONS.md) ghi phê duyệt gameplay/phase.

## 1. Dependency path

Phase 00 spec/approval → Phase 01 contracts/base core → Phase 02 generic effects → Phase 03 authority/persistence → Phase 04 multiplayer 3D slice → Phase 05 high-risk groups → Phase 06 remaining variants → Phase 07 public release.

Game Core đi trước toàn bộ Variant. Frontend prototype bắt đầu sau contracts và approved slice events. Không đưa 27 Variant vào Phase 01; không thêm framework, distributed services hoặc agent workflows khi scope chưa cần.

## 2. Phase 00 — specification consolidation

- Scope: audit nguồn, phân nhãn, domain glossary, grill, architecture và roadmap.
- Dependencies: tài liệu/source chỉ đọc đã cung cấp.
- Deliverables: 9 tài liệu rebuild, root AGENTS và CONTEXT glossary.
- Acceptance: source precedence rõ; 27 active +2 deferred coverage; 9 Variant đặc biệt có contracts/questions; unknown có options/impact/gate; engine/network/frontend/testing đủ ranh giới.
- Validation: local links, UTF-8, cross-doc consistency, hash nguồn cũ không đổi, chỉ docs mới được tạo.
- DoD: giao tài liệu để chủ dự án review; không install/build/source tests/database/assets.

Docs hoàn tất khác với mọi luật Variant đã approved. Phase 01 entry: duyệt architecture/roadmap và explicit start. P00-01…12 đã chốt core semantics; pending nhóm Variant chặn enable nhóm tương ứng, không buộc duyệt cả 27 trước base core.

## 3. Phase 01 — workspace contracts và deterministic base core

| Mục | Nội dung |
|---|---|
| Scope | 01A monorepo 6 workspaces/shared schemas/version manifest; 01B board, movement, AP, turn, terminal, threefold, RNG/IDs, deep snapshots và root transaction framework |
| Dependencies | Phase 00 approved; P00-06…12; Q-06/07/14/17/18/32/33/35; architecture được duyệt |
| Deliverables | Pure core API, typed commands/events/views, versioned codec, minimal testkit, RNG/perft/base fixtures; chưa full variants/frontend |
| Acceptance | 60 quân/layout/geometry đúng; main move +optional skill window; server-verified forced skip; capture King terminal/destroy bảo vệ King; AP ownership; invalid action giữ state; deep round-trip; deterministic runs; threefold actionReady |
| Tests | Unit/table/AP/turn/terminal; derived failure và queue budget rollback; snapshot alias; seeded sequences; independent perft depth 1–3; ordered fake timeout input |
| DoD | Approved oracle IDs, checks pass, core không import Nest/Three/network/wall-clock, version/codec review, clean source build; prerequisites Phase 02 rõ |

01A review độc lập trước 01B. Synthetic skill/effect fixtures dùng để kiểm infra, không thay thế approval gameplay Variant. Repetition serializer có thể kiểm synthetic graph trước khi full effects được implement.

## 4. Phase 02 — generic effects, modifiers và delayed actions

| Mục | Nội dung |
|---|---|
| Scope | Definitions/instances, source-boundary timing, stacking/removal/relocation, query seams, groups, consumers, logical delayed actions/unit lifecycle ports |
| Dependencies | Phase 01; D-04/05/06/08 cho definitions được enable; P00-02/03/05/08/11 |
| Deliverables | Typed EffectDefinition; approved Stun/Shield/Aegis/Trap/Bomb subset; synthetic future-effect swap; stable listener order; group cleanup; pure planner API |
| Acceptance | N rounds/start/end/no cast tick; whole-set swap giữ source/expiry và reject atomic; no direct plugin writes; consumer độc lập; hard constraints sau add destinations; no before-death AP; delayed state round-trip |
| Tests | Mọi lifecycle reason/stack policy; future-type relocation; incompatible group rollback; approved Shield/Bomb/Fate priority; mirror và 100 create/dispose; forced move constraints; metadata/replay |
| DoD | Mỗi enabled effect có schema, visibility, stacking, removal và relocation policy cùng approved oracle; unresolved definitions disabled |

Không xây toàn Variant để kiểm effect engine. Synthetic plugins kiểm transaction/planner; playable rules thêm khi group approval có mặt.

## 5. Phase 03 — backend authority, persistence và reconnect

| Mục | Nội dung |
|---|---|
| Scope | Nest/Socket.IO gateway, principal/seat, serial match service, protocol/projector, dual clocks, external persistence, restore, idempotency, retention, reconnect |
| Dependencies | Phase 02; D-21/23/24/25/26 cho choices liên quan; auth/clock/disconnect Q/O đã chốt |
| Deliverables | Auth port +verified adapter, receipts/views schemas, transactional repository +selected datastore adapter, ordered clock inputs, full sync/resume, production-like socket harness |
| Acceptance | Payload không giả seat/AP/result; views không leak; ACK sau durable commit; retry một hiệu quả; chess15min/hard15s/firstWhite; grace60/budget180; infrastructure pause24h; restore across processes/version |
| Tests | Hai Socket.IO clients +attacker/spectator; fake deadline races; DB before/after commit; CAS hai writers; role allowlists/query policy; TTL24h/30d/90d; crash/replay hash |
| DoD | Authz/projection/persistence/timers pass; replay không credentials; restore runbook baseline; old-version synthetic dispatch; chưa public deploy |

Provider provisioning chỉ trong phase được duyệt và có account/config cần thiết; không dùng secrets từ reference. Bắt đầu một instance, giữ CAS/authority seam; không thêm Redis chỉ vì có Socket rooms.

## 6. Phase 04 — multiplayer 3D vertical slice

| Mục | Nội dung |
|---|---|
| Scope | New Next/R3F/Drei/Tailwind arena; board15×15/6 placeholder models/materials; camera/picking/highlights; event animation/cancel; Guardian+Dynamite được duyệt |
| Dependencies | Phase 03; D-04/05/06/12/20/22/23/25/27/28 cho slice; no legacy frontend reuse |
| Deliverables | Playable two-client slice, auth/room flow, Guardian buff/defense và Dynamite Bomb/trap/chain, AP/turn HTML, status VFX, reconnect/replay baseline |
| Acceptance | 60 initial models,225 cell mapping; server previews; Move/Skill/End; hidden trap/Bomb chain; no King destroy; mirror isolation; logical view tức thời/animation cancel; complete match và replay |
| Tests | Approved group/mirror/cross Shield-Bomb-trap oracles; real browser hai players +spectator; stale animation/resync; GPU camera/chain/seek; remount memory |
| DoD | Review được end-to-end demo; engine/network không chờ animation; group approvals đóng; core/network/GPU budgets đo; Phase 05 scope approved |

Procedural geometry đủ kiểm kiến trúc; chưa yêu cầu final models/cinematic VFX. Nếu D-20 đổi slice group, cập nhật requirements và matrix, không ngầm thêm cả 27 Variant.

## 7. Phase 05 — high-risk groups, mỗi nhóm có gate riêng

| Nhóm | Scope/deliverables | Dependencies | Acceptance/tests/DoD |
|---|---|---|---|
| 05A Thunder +Lightning | Shared trap consumer, normal Fang đứng yên, Wrath3×10, approved Terrain clock | Phase04+D-07/12/22 | Thunder không Lightning vẫn trap hoạt động; Aegis/King/entry matrix; Terrain clock replay; mirrors |
| 05B Turtle +Magician +Phantom | Whole-set swap, linked profile handling, Ghost/stealth/Possession | 05A+D-04/05/06/08/10/14/15 | Future effect không sửa core; type/value/promotion; Ghost obstacle/Bishop/terrain; hidden projection; mirror/replay |
| 05C Zombie +Puppet | Control/conversion/revive, strings/pairs/dynamic cost | 05B+D-13/16/17 | Pawn controller, loss owner, Infection round1–3, Puppet7=2+5, pair isolation/redirect, graveyard incarnation |
| 05D Time +Space | Alive-position rewind, two modes, Freeze/prediction, portals/Outworld | 05C+D-11/19 | Collision atomic, preserved state, King exit protection/path semantics, expiry/delayed/replay, rewind animation cancellation |

Mỗi nhóm duyệt passive +3 skills/modes trước code; normal/mirror/cross/serialization/replay/hidden tests và presentation fallback phải pass. Review sau từng nhóm; không mark complete từ registry smoke. Approval một nhóm không tự duyệt nhóm sau.

## 8. Phase 06 — remaining approved variants

| Nhóm | Scope | Dependencies | Deliverables/acceptance/tests/DoD |
|---|---|---|---|
| 06A | Nephalem/Requiem/Angel/Devil/Wizard | Phase05+D-04/06/08/22 | Approved death/reward/counter/curse/tax/mark rules; committed-death AP; Shield/Fate/Bomb chains; total actual cost; source windows; mirror/replay |
| 06B | Ruler/Kaze/Predator/Verdant/Cannibal | 06A+D-08/12/14/15/22 | Capture law/domain/path/stealth/evolution/AP siphon/profile layers; Predator Pawn range/Verdant Q-09; no hard constraint bypass; threat/perft/replay |
| 06C | Earth/Cherubim/DragonSentinel/Lord/Pirate/Phoenix | 06B+D-06/17/18/22 | Unit/summon/exile/multicast/channel/debt/rebirth; no overwrite/King destroy; approved death counters/expiry/return/clock policies; mirror/replay |

Tổng: Phase04 có2 Variant, Phase05 có9, Phase06 có16 =27 active. Joker/Colossus/AI deferred; chỉ mở khi user duyệt scope/spec riêng. Mỗi group đồng bộ catalog/contracts/state/version, render fallback và affected tests.

## 9. Phase 07 — public internet release

| Mục | Nội dung |
|---|---|
| Scope | Freeze public ruleset, licensed final assets/quality, security/ops/load/accessibility, deployment plan, public spectator và authorized postgame replay |
| Dependencies | Phase06 enabled-approved manifest; D-20/21/24/25/26/27/28; Q-31 release gates; explicit deployment approval |
| Deliverables | Immutable versioned bundle/golden corpus, production configuration plan, backup/restore/rollout/retention runbooks, performance/security evidence, rights manifest |
| Acceptance | Authz/no hidden leakage, external DB crash restore/TTL, two-client reconnect/spectator/replay, measured device budgets, bundled fonts, no secrets/generated tracked artifacts |
| Tests | Full enabled normal/mirror/cross matrix; pinned old replay; adversarial load/deadlines/disconnect; production-like Vercel/Render WS; backup restore; browser/device/accessibility |
| DoD | Dated evidence +user release approval; health/E2E after deploy; rollback/DB/timer monitoring; rollback giữ active match versions |

D-20 quyết all27 hay approved subset ở release đầu; disabled unapproved không được gọi hoàn chỉnh. Multiinstance chỉ khi scope/load yêu cầu; khi đó lease/fencing/adapter/failover E2E bắt buộc, sticky routing không thay authority.

## 10. Global DoD và risk register

Phase entry: prerequisites và approvals recorded, scope giới hạn, oracle IDs sẵn. Exit: deliverables reviewable, acceptance có evidence, required tests hoàn tất, nguồn cũ không đổi, gameplay chưa duyệt không được enable. Next phase không tự bắt đầu khi agent kết thúc lượt.

| Rủi ro | Mitigation và gate |
|---|---|
| Legacy bị nâng thành luật | P00-01/provenance/group approval; mọi phase |
| Partial state/AP/queue | Candidate +atomic persistence +fault rollback; Phase01/03 |
| Snapshot alias/version mismatch | Deep codec/RNG IDs/pinned bundle/restore; Phase01/03 |
| Mirror shared state/links | Player namespaces/source-filtered hooks/mirror matrix; Phase02+ |
| King/owner/clock drift | Approved reducer/quote/deadline matrix; Phase01+ |
| Hidden leak qua hints/events | Role allowlist/seed private/preview policy/quotas; Phase03/04 |
| Animation stale/GPU cost | Logical view tách tracks/cancel epoch/resource reuse/profiler; Phase04+ |
| Catalog/license thiếu | All27 checklists/rights manifest/fallbacks; Phase06/07 |
| Overengineering | Workspaces/one process/simple transaction, đo trước cache/ECS/services |

Không gán ngày hoặc effort như cam kết khi chưa chốt nhân lực/assets/provider. Sau mỗi deliverable đo lại cost; không bỏ gate vì deadline. [TEST_STRATEGY](TEST_STRATEGY.md), [engine](ENGINE_ARCHITECTURE.md), [network](NETWORK_ARCHITECTURE.md), [frontend](FRONTEND_3D_ARCHITECTURE.md) cung cấp yêu cầu chi tiết.
