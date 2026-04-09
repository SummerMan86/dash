# Architecture: EMIS Vertical

EMIS-specific architecture. Current-state only.
For repo-wide foundation see architecture.md.

## Scope
- Covers: EMIS operational paths, emis-server/emis-contracts/emis-ui, PostGIS, ingestion, auth
- Does not cover: BI dashboard paths (see architecture_dashboard_bi.md), repo-wide rules (see architecture.md)

## 1. EMIS Operational Path

```
/emis/* (page) or /api/emis/* (API)
  -> SvelteKit route handler                [thin HTTP transport, apps/web/src/routes/api/emis/]
  -> emis-server service/repository         [packages/emis-server/src/modules/*]
  -> parameterized SQL via pg               [queries.ts / repository.ts]
  -> PostgreSQL / PostGIS                   [schemas: emis, stg_emis]
```

SQL never appears in route handlers. Route handlers are thin HTTP transport calling into `emis-server` modules. SvelteKit-specific HTTP glue (`handleEmisRoute`, `jsonEmisList`) lives in `apps/web/src/lib/server/emis/infra/http.ts`.

Operational API namespaces: `/api/emis/objects`, `/api/emis/news`, `/api/emis/map`, `/api/emis/search`, `/api/emis/ship-routes`, `/api/emis/dictionaries`, `/api/emis/health`, `/api/emis/readyz`, `/api/emis/auth`, `/api/emis/admin`, `/api/emis/ingestion`, `/api/emis/map-config`.

## 2. Data / Storage Ownership (EMIS-relevant)

### App-owned schemas

| Schema | Purpose | Key objects |
|---|---|---|
| `emis` | Write-side operational tables | `objects`, `news_items`, `news_object_links`, `audit_log`, `countries`, `object_types`, `sources`, `users`, `sessions`, `object_source_refs` |
| `stg_emis` | Ingestion staging | `vsl_load_batch`, `vsl_position_raw`, `vsl_position_latest`, `vsl_ships_hbk`, `obj_import_run`, `obj_import_candidate`, `obj_candidate_match` |
| `mart_emis` | Derived ship-route read models | `vsl_route_point_hist`, `vsl_route_segment_hist` |

Snapshot-first management: `db/current_schema.sql` is the active DDL truth; changes tracked in `db/applied_changes.md`; live deltas in `db/pending_changes.sql`.

## 3. Client/Server Contract Surfaces (EMIS-relevant)

| Contract | Location | Direction | Purpose |
|---|---|---|---|
| EMIS Zod schemas | `emis-contracts/src/emis-*/` | Shared validation | Request/response validation for all EMIS API endpoints |
| EMIS RUNTIME_CONTRACT | `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | Server | API conventions: error shape, list meta, audit, request correlation |
| Route/BFF boundary | `apps/web/src/routes/api/emis/` | HTTP | Routes are thin transport. Business logic lives in packages |

## 4. Extension Points (EMIS-specific)

### Ingestion adapters

`emis-server/modules/ingestion/adapters/` provides a registry pattern for external data source adapters (currently: OSM, GEM). New source: implement adapter interface, register in adapter registry.

### Auth

EMIS auth is session-based (since AUTH-7, hardened in Phase 5). Canonical contract: `docs/emis_access_model.md`. Key runtime: `apps/web/src/lib/server/emis/infra/auth.ts`, `writePolicy.ts`. RBAC roles: `admin`, `editor`, `viewer`. Session storage: server-side via `emis.sessions` table.

## Read Next

- [architecture.md](./architecture.md) — repo-wide foundation, package map, import rules
- [architecture_dashboard_bi.md](./architecture_dashboard_bi.md) — BI/dashboard vertical
- [emis_access_model.md](./emis_access_model.md) — EMIS auth and access contract
- For adding a new domain overlay, see the extension pattern in architecture.md
