# EMIS Runtime Contract

Canonical runtime conventions for all EMIS operational endpoints and for dataset-backed EMIS BI reads.

## API design conventions (one page)

This section is the FE/BE agreement on how EMIS APIs are designed.

### Transport style

- EMIS operational APIs are **REST over HTTP** (`/api/emis/*`).
- We do not introduce GraphQL for EMIS unless there is a concrete multi-resource query pressure that REST + published read-models cannot solve.
- For BI/read-side, the canonical integration is **dataset-backed reads** via `/api/datasets/:id`, not ad-hoc operational fetches from BI routes.

### Versioning policy

- Current EMIS API is implicitly **v1** (no `/v1` prefix).
- Default policy is **additive-only** evolution: new fields/endpoints, same shapes.
- If a breaking change is unavoidable, introduce a new endpoint namespace (e.g. `/api/emis/v2/*`) and keep the old contract until consumers migrate.
- Dataset API already has explicit `contractVersion` (see dataset route codes below); do not fork dataset semantics without bumping `contractVersion`.

### Naming & casing

- **Operational JSON** uses `camelCase` (including query params like `dateFrom`, `objectType`, `shipHbkId`).
- **Dataset JSON** intentionally mirrors published SQL contracts, so row fields are typically `snake_case` (same as view columns). `meta.sort.field` also echoes IR column names (often `snake_case`).
- URL path segments are **kebab-case** (`ship-routes`, `map-config`).

### Pagination & sorting

- List endpoints use offset pagination: `limit` + `offset` with strict parsing and safe bounds.
- Response meta echoes the applied paging/sort: `{ rows, meta: { count, limit, offset, sort[] } }`.
- Sorting is **server-defined by endpoint** unless a specific allowlist is introduced. If/when client-sort is added, it must be allowlisted and documented (never raw SQL fragments).
- Dataset v1 is snapshot-style and does not expose offset pagination (no `meta.offset`).

### Filtering

- Filters are expressed as query params (operational) or dataset query payload (BI).
- Validation is schema-driven (Zod). Invalid values must return `400` with stable `{ error, code }`.

### Dates and timezones

- All API datetime params must be ISO 8601 **with timezone offset** (e.g. `2026-04-04T12:34:56+03:00`).

### Errors & logging

- All errors are `{ error, code }` (see “Error shape” below).
- Error logging/correlation rules live in `docs/emis_observability_contract.md`.
- `handleEmisRoute()` provides request correlation (`x-request-id`) and structured error logging (see below).

### Request correlation

All EMIS operational routes wrapped with `handleEmisRoute()`:

- Accept `x-request-id` from incoming request headers
- Generate a UUID if the header is missing
- Return `x-request-id` in response headers (on both success and error)

### Structured error logging

On any error (4xx/5xx), `handleEmisRoute()` emits a JSON structured log:

- `service: 'emis'`, `level`, `requestId`, `method`, `path`, `status`, `code`, `durationMs`
- `actorId` included when present (tracing only, not auth)
- `message` included when available
- Request bodies, PII, and large GeoJSON payloads are NOT logged

## List endpoints

All list/catalog endpoints return:

```json
{
	"rows": [],
	"meta": {
		"count": 5,
		"limit": 50,
		"offset": 0,
		"sort": [{ "field": "name", "dir": "asc" }]
	}
}
```

### Defaults & limits

| Endpoint group                         | Default limit | Max limit | Max offset |
| -------------------------------------- | ------------- | --------- | ---------- |
| Objects, news, search/\*               | 50            | 200       | 10 000     |
| Map (objects, news)                    | 200           | 500       | —          |
| Ship-route vessels                     | 250           | 500       | 10 000     |
| Ship-route geometry (points, segments) | 5 000         | 5 000     | 10 000     |

### Sort defaults

| Endpoint                 | Sort                                    |
| ------------------------ | --------------------------------------- |
| Objects / search/objects | `name asc, id asc`                      |
| News / search/news       | `publishedAt desc, id desc`             |
| Ship-route vessels       | `lastFetchedAt desc, shipHbkId asc`     |
| Ship-route points        | `fetchedAt asc, pointSeqShip asc`       |
| Ship-route segments      | `fromFetchedAt asc, segmentSeqShip asc` |

### Query parameter parsing

- `limit`, `offset` — strict integer parsing via `parseListParams()`. Non-integer or out-of-range values → `400`.
- Optional integer params (e.g. `shipHbkId`) — strict parsing via `parseOptionalStrictInt()`. Garbage → `400`.
- API date params (`dateFrom`, `dateTo`) must already be ISO 8601 with timezone offset. Catalog page loads may pre-normalize via `normalizeDateTimeParam()`.
- UUIDs — validated via `requireUuid()`.

## Error shape

All errors return:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

This applies to both EMIS operational endpoints and the dataset BI route (`/api/datasets/:id`).

### Common codes

| Code                               | Status | When                                   |
| ---------------------------------- | ------ | -------------------------------------- |
| `INVALID_ID`                       | 400    | UUID validation failure                |
| `INVALID_JSON`                     | 400    | Request body is not valid JSON         |
| `VALIDATION_ERROR`                 | 400    | Zod schema validation failure          |
| `INVALID_QUERY_PARAM`              | 400    | Generic query param validation failure |
| `*_NOT_FOUND`                      | 404    | Entity not found                       |
| `EMIS_DATABASE_URL_MISSING`        | 500    | `DATABASE_URL` not set                 |
| `EMIS_SCHEMA_UNAVAILABLE`          | 503    | `emis` schema not initialized          |
| `EMIS_SHIP_ROUTE_MART_UNAVAILABLE` | 503    | `mart_emis` not initialized            |
| `EMIS_INTERNAL_ERROR`              | 500    | Unhandled error                        |

### Dataset route codes

| Code                                   | Status | When                       |
| -------------------------------------- | ------ | -------------------------- |
| `DATASET_ID_MISSING`                   | 400    | No `:id` route param       |
| `DATASET_INVALID_JSON`                 | 400    | Body not valid JSON        |
| `DATASET_INVALID_QUERY`                | 400    | Body not an object         |
| `DATASET_UNSUPPORTED_CONTRACT_VERSION` | 400    | Wrong `contractVersion`    |
| `DATASET_NOT_FOUND`                    | 404    | Unknown dataset ID         |
| `DATASET_COMPILE_FAILED`               | 500    | IR compilation failure     |
| `DATASET_DATABASE_URL_MISSING`         | 500    | `DATABASE_URL` not set     |
| `DATASET_EXECUTION_FAILED`             | 500    | Provider execution failure |

## Dataset-backed BI reads

`/api/datasets/emis.*` keeps the platform `DatasetResponse` shape, but the applied read conventions are now explicit in `meta`:

```json
{
	"meta": {
		"limit": 200,
		"sort": [{ "field": "published_at", "dir": "desc" }]
	}
}
```

- `meta.limit` echoes the applied `IR.limit`.
- `meta.sort` echoes the applied `IR.orderBy`.
- `meta.offset` is intentionally absent for dataset v1, because the current dataset/IR contract still models snapshot reads without offset pagination.
- `/api/datasets/:id` now follows the same stable `{ error, code }` payload rule as EMIS operational routes.

## Map endpoints

Map endpoints return raw GeoJSON (`FeatureCollection`), not the `{rows, meta}` wrapper.
This is by design — GeoJSON consumers expect standard format.
Limit is applied but not exposed in response meta.

## Detail endpoints

Single-entity GETs return the entity directly (no wrapper).
404 with `{ error, code }` if not found.

## Write endpoints

- POST → `201` with created entity
- PATCH → `200` with updated entity
- DELETE → `200` with `{ ok: true }`
- All validate body via Zod schemas (`parseJsonBody`)
- All resolve write context via `assertWriteContext()` from `$lib/server/emis/infra/writePolicy` (write-policy enforcement + audit)

## Write-policy contract

**Status:** implemented in NW-2 (2026-04-04). Design frozen in NW-1.

All EMIS write entry points (API routes and form actions) call `assertWriteContext()` before performing any mutation. This is the single enforcement point for write authorization in MVE.

### Helper

| Helper                                | Canonical location                                                                     | Purpose                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `assertWriteContext(request, source)` | `apps/web/src/lib/server/emis/infra/writePolicy.ts` (approved by architecture-steward) | Validate write context, enforce actor requirement, return `EmisWriteContext` |

### Behavior

`assertWriteContext()` wraps `resolveEmisWriteContext()` (audit utility) with policy enforcement:

- **strict mode** (`EMIS_WRITE_POLICY=strict` or production): requires explicit actor header (`x-emis-actor-id` or `x-actor-id`). Missing actor → `403 WRITE_NOT_ALLOWED`.
- **permissive mode** (`EMIS_WRITE_POLICY=permissive` or dev/local default): falls back to source-based default actor (`api-client`, `local-manual-ui`, `server-process`). Backward-compatible with current dev workflow.

### Error code

| Code                | Status | When                                  |
| ------------------- | ------ | ------------------------------------- |
| `WRITE_NOT_ALLOWED` | 403    | Strict mode, no actor header provided |

### Integration rule

Every route handler or form action that performs a write must replace direct `resolveEmisWriteContext()` calls with `assertWriteContext()`:

```typescript
// Canonical pattern for all write entry points:
const ctx = assertWriteContext(request, 'api'); // API routes
const ctx = assertWriteContext(request, 'manual-ui'); // form actions
```

Return type is `EmisWriteContext` (same as before). Downstream service/repository signatures do not change.

### Canonical reference

Full write-policy contract, role semantics and operating model: `docs/emis_access_model.md`.

## Audit contract

All write operations (POST/PATCH/DELETE) produce an append-only `emis.audit_log` row within the same transaction.

### Actor resolution

`resolveEmisWriteContext(request, source)` resolves `actorId` in priority order:

1. `x-emis-actor-id` header
2. `x-actor-id` header (fallback)
3. Auto-default based on source:
   - `source='api'` → `'api-client'`
   - `source='manual-ui'` → `'local-manual-ui'`
   - `source='server'` → `'server-process'`

`actorId` is `TEXT NULL` — any non-empty string, not necessarily UUID.

### Sources in use

| Source      | Where                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `api`       | All `/api/emis/*` write routes                                                                                   |
| `manual-ui` | SvelteKit form actions: `/emis/objects/new`, `/emis/objects/[id]/edit`, `/emis/news/new`, `/emis/news/[id]/edit` |
| `server`    | Declared in type, not yet used                                                                                   |

### Entity types and actions

| entity_type        | Actions                      |
| ------------------ | ---------------------------- |
| `object`           | `create`, `update`, `delete` |
| `news_item`        | `create`, `update`, `delete` |
| `news_object_link` | `attach`, `update`, `detach` |

**Dictionary writes are exempt from audit_log.** Dictionary tables (`countries`, `object_types`, `sources`) are reference data managed via admin CRUD. Their write endpoints call `assertWriteContext()` for authorization enforcement (role check), but the returned `EmisWriteContext` is not passed to dictionary services and no `audit_log` rows are produced. Rationale: the `audit_log` CHECK constraint limits `entity_type` to `object`, `news_item`, `news_object_link`; dictionary changes are low-frequency reference data updates, not operational domain events. If dictionary audit becomes required, extend the CHECK constraint and add `EmisWriteContext` to dictionary service signatures.

### audit_log schema

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
entity_type  TEXT NOT NULL  -- CHECK IN ('object','news_item','news_object_link')
entity_id    UUID NOT NULL
action       TEXT NOT NULL
actor_id     TEXT NULL
occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
payload      JSONB NOT NULL DEFAULT '{}'
```

Table is append-only: UPDATE/DELETE blocked by trigger.
`payload` always contains `source` field plus operation-specific data.

### Verification

`pnpm emis:write-smoke` verifies full audit contract: each write operation produces exactly one audit_log row with correct `entity_type`, `action`, and `actor_id` matching the smoke run.

## Dictionary endpoints

Return `{ rows: [...] }` without meta (no pagination, no sort; full snapshot payloads).

## Health and readiness endpoints

### `GET /api/emis/health`

Snapshot/repo readiness. No DB. Checks file presence (`db/current_schema.sql`, seeds, etc.).
Returns `{ service: 'emis', status: 'snapshot-ready', db: {...}, docs: {...} }`.

### `GET /api/emis/readyz`

**Status:** implemented (NW-4).

DB-backed runtime readiness. Checks:

1. `DATABASE_URL` is set
2. PostgreSQL connectivity
3. Required schemas: `emis`, `stg_emis`, `mart_emis`, `mart`
4. Published views: `mart.emis_news_flat`, `mart.emis_objects_dim`, `mart.emis_object_news_facts`, `mart.emis_ship_route_vessels`, `mart_emis.ship_route_points`, `mart_emis.ship_route_segments`

Returns:

- `200 { status: 'ready', checks: {...}, durationMs }` when all pass
- `503 { status: 'not_ready', checks: {...}, failures: [...], durationMs }` when any fail

Route file: `apps/web/src/routes/api/emis/readyz/+server.ts`.

## Infrastructure helpers

### Package-level (framework-agnostic) — `packages/emis-server/src/infra/http.ts`

| Helper                     | Purpose                               |
| -------------------------- | ------------------------------------- |
| `parseListParams()`        | Parse & validate `limit`/`offset`     |
| `parseStrictIntParam()`    | Strict integer with bounds            |
| `parseOptionalStrictInt()` | Optional integer, strict when present |
| `requireUuid()`            | UUID validation                       |
| `parseJsonBody()`          | JSON + Zod body parsing               |
| `normalizeDateTimeParam()` | ISO 8601 normalization                |
| `buildEmisListMeta()`      | Build meta object standalone          |
| `clampPageSize()`          | Clamp list page size to safe range    |
| `clampMapLimit()`          | Clamp map limit to safe range         |

### App-layer transport (SvelteKit) — `apps/web/src/lib/server/emis/infra/http.ts`

| Helper              | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `jsonEmisList()`    | Standard `{rows, meta}` response                                |
| `jsonEmisError()`   | Standard `{error, code}` response                               |
| `handleEmisRoute()` | Error boundary + request correlation + structured error logging |

### App-layer write policy — `apps/web/src/lib/server/emis/infra/writePolicy.ts`

| Helper                 | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `assertWriteContext()` | Write-policy checkpoint (see "Write-policy contract" section) |

Routes import transport helpers from `$lib/server/emis/infra/http` and write-policy helper from `$lib/server/emis/infra/writePolicy`.
