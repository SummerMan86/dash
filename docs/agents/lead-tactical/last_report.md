# NW-5: MVE Acceptance Audit and Sign-Off — Completion Report

**Package:** NW-5 (MVE closeout wave, final acceptance)
**Date:** 2026-04-05
**Branch:** `main`
**Backlog mapping:** M4.1, M4.2, M4.3
**Depends on:** NW-1 (completed), NW-2 (completed), NW-3 (completed), NW-4 (completed)

## Status: DONE

MVE verdict: **accepted with explicit deferrals**.

All acceptance criteria from `docs/emis_mve_product_contract.md` section 7 are met.
Explicit deferrals are documented and none are blocking.

## M4.1: Acceptance Audit Against Product Contract

Audited every criterion from section 7 of `docs/emis_mve_product_contract.md` against actual code and runtime state.

### Data / Platform

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Snapshot-first DB truth for active EMIS schemas | **done** | `db/current_schema.sql` covers `emis`, `stg_emis`, `mart_emis`, `mart`; `db/schema_catalog.md` and `db/applied_changes.md` present |
| Reference seed data loads repeatably | **done** | `db/seeds/001_countries.sql`, `002_object_types.sql`, `003_sources.sql` |
| PostGIS and required indexes present | **done** | `CREATE EXTENSION IF NOT EXISTS postgis`; GiST indexes on `emis.objects.geom` and `emis.news_items.geom`; FTS GIN index on news; btree indexes on all key lookup columns |
| Published read-models for BI | **done** | 4 mart views: `mart.emis_news_flat`, `mart.emis_objects_dim`, `mart.emis_object_news_facts`, `mart.emis_ship_route_vessels`; 2 mart_emis views for ship routes |
| App launches locally via Docker Compose | **done** | `docker-compose.yml` with `postgis/postgis:16-3.4` image + healthcheck |
| Health/readiness contract documented and verifiable | **done** | `/api/emis/health` (repo/snapshot), `/api/emis/readyz` (DB-backed runtime); documented in `RUNTIME_CONTRACT.md` and `emis_observability_contract.md`; smoke-verified |

### Objects / News / Links

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Create, edit, soft-delete object | **done** | API: `POST /api/emis/objects`, `PATCH /api/emis/objects/:id`, `DELETE /api/emis/objects/:id`; UI: `/emis/objects/new`, `/emis/objects/:id/edit`; smoke: `emis:write-smoke` object-flow (create + update + delete + audit) |
| Create and edit news | **done** | API: `POST /api/emis/news`, `PATCH /api/emis/news/:id`, `DELETE /api/emis/news/:id`; UI: `/emis/news/new`, `/emis/news/:id/edit`; smoke: `emis:write-smoke` news-flow |
| Manage news-object links | **done** | API: `POST /api/emis/news/:id/objects`, `PATCH /api/emis/news/:id/objects/:oid`, `DELETE /api/emis/news/:id/objects/:oid`; smoke: `emis:write-smoke` link-flow (attach + update + detach + audit) |
| Object detail shows related news | **done** | `/emis/objects/:id` detail page with server-loaded related news |
| News detail shows related objects | **done** | `/emis/news/:id` detail page with server-loaded related objects |

### Workspace / Map

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Map shows objects | **done** | `/api/emis/map/objects` endpoint with GeoJSON response; bbox filtering |
| Map shows news with coordinates | **done** | `/api/emis/map/news` endpoint with GeoJSON response; bbox filtering |
| Filters synchronize list and map | **done** | `/emis` workspace with `filters.ts`; search endpoints for objects/news; map endpoints with bbox |
| Map endpoints use bbox/viewport filter | **done** | All 3 map endpoints (`objects`, `news`, `vessels`) require/support bbox parameter; contract error for missing bbox verified by smoke |
| Workspace is a real working scenario | **done** | `/emis` page: map + search results panel + ship route panel; 767-line main page + 5 extracted helpers/panels; smoke returns 200 with "Workspace" marker |

### BI Integration

| Criterion | Status | Evidence |
|-----------|--------|----------|
| At least one EMIS dataset connected to BI/BFF and used in UI | **done** | 4 datasets: `emis.news_flat`, `emis.object_news_facts`, `emis.objects_dim`, `emis.ship_route_vessels`; all return 200 in smoke; 4 BI route pages: `/dashboard/emis`, `/dashboard/emis/ship-routes`, `/dashboard/emis/provenance`, `/dashboard/emis/vessel-positions` |
| EMIS published read-models documented | **done** | `docs/emis_read_models_contract.md` with full dataset-to-view mapping and evolution policy |
| EMIS coexists with BI without namespace/contract conflicts | **done** | EMIS uses `emis.*` dataset namespace; operational path and BI path are separate; `lint:boundaries` enforces no cross-contamination; BI routes do not import operational modules |

### Explicit Deferrals (accepted, not blocking)

| Item | Status | Reason |
|------|--------|--------|
| Full auth / sessions / RBAC | **explicitly deferred** | Trusted internal network model; documented in `emis_access_model.md` |
| Admin CRUD for dictionaries | **explicitly deferred** | Seed-managed for MVE; decision frozen in NW-3 |
| Admin role enforcement | **explicitly deferred** | No admin-only operations exist |
| News soft-delete via UI button | **partial** | API supports DELETE; UI delete button not wired on news detail page (objects have it) |

## M4.2: Bootstrap and Backlog Alignment

Updated:
- `docs/emis_session_bootstrap.md` — section 6 now reflects MVE accepted status, explicit deferrals, and post-MVE priorities
- `docs/emis_session_bootstrap.md` — section 4 now shows last verification date and results
- `docs/emis_next_tasks_2026_03_22.md` — M3 and M4 marked completed; active order starts from P1

## M4.3: Final Verification Pass

All 6 canonical checks green on `2026-04-05`:

| Check | Result |
|-------|--------|
| `pnpm check` | 0 errors, 0 warnings |
| `pnpm build` | success (15.13s) |
| `pnpm lint:boundaries` | no violations |
| `pnpm emis:smoke` | 31/31 checks pass (pages, APIs, contracts, datasets) |
| `pnpm emis:offline-smoke` | all checks pass (bundle ready, spike page, Range support) |
| `pnpm emis:write-smoke` | all flows pass (object, news, link, write-policy, cleanup) |

## Acceptance Checklist (NW-5)

| Criterion | Status |
|-----------|--------|
| MVE acceptance is audited against one explicit document set | PASS |
| Bootstrap/backlog no longer overstate or understate implementation | PASS |
| Team has truthful verdict | PASS: **accepted with explicit deferrals** |

## Files Changed

- `docs/emis_session_bootstrap.md` — sections 4 and 6 updated
- `docs/emis_next_tasks_2026_03_22.md` — M3/M4 marked completed, active order updated
- `docs/agents/lead-tactical/last_report.md` — this report
- `docs/agents/lead-tactical/memory.md` — NW-5 context added
- `docs/agents/lead-strategic/current_plan.md` — NW-5 status updated
