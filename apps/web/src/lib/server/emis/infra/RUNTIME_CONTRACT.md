# EMIS Runtime Contract

Canonical runtime conventions for all EMIS operational endpoints and for dataset-backed EMIS BI reads.

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
- All resolve audit context from `x-emis-actor-id` / `x-actor-id` headers

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

## Infrastructure helpers (`infra/http.ts`)

| Helper                     | Purpose                               |
| -------------------------- | ------------------------------------- |
| `parseListParams()`        | Parse & validate `limit`/`offset`     |
| `parseStrictIntParam()`    | Strict integer with bounds            |
| `parseOptionalStrictInt()` | Optional integer, strict when present |
| `requireUuid()`            | UUID validation                       |
| `parseJsonBody()`          | JSON + Zod body parsing               |
| `normalizeDateTimeParam()` | ISO 8601 normalization                |
| `jsonEmisList()`           | Standard `{rows, meta}` response      |
| `jsonEmisError()`          | Standard `{error, code}` response     |
| `handleEmisRoute()`        | Error boundary wrapper                |
| `buildEmisListMeta()`      | Build meta object standalone          |
