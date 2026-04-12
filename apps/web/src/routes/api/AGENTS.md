# API Routes Navigation

`src/routes/api/` — HTTP transport layer for all server-side endpoints. Thin shell: parse request, validate, delegate to packages, return response.

## Subsystems

| Folder | Domain | Transport target | AGENTS.md |
|--------|--------|-----------------|-----------|
| `datasets/[id]/` | BI read-side | `@dashboard-builder/platform-datasets/server` | — |
| `emis/` | EMIS operational | `@dashboard-builder/emis-server`, `@dashboard-builder/emis-contracts` | `emis/AGENTS.md` |
| `wb/prices/` | Wildberries pricing | direct Wildberries API proxy | — |

## Rules

- No SQL in route files — delegate to package modules or services.
- No business logic — only transport concerns (parse, validate, delegate, respond).
- No UI or view-model calculations.
- New endpoints should import from canonical packages directly, not from `$lib/server/` shims.

## datasets/[id]/+server.ts

BI dataset query transport adapter:

- Parses `DatasetQuery` from POST body
- Validates contract version
- Derives `ServerContext` (tenantId from header — MVP placeholder)
- Delegates to `executeDatasetQuery()` from `@dashboard-builder/platform-datasets/server`
- Maps `DatasetExecutionError` codes to HTTP status codes
- Registers app-owned `mockProvider` at module load time; `postgresProvider` is auto-registered by the package

## emis/

Full EMIS API surface: auth, admin, dictionaries, ingestion, map, news, objects, search, ship-routes, health/readyz.

See `emis/AGENTS.md` for detailed rules and import directions.

## wb/prices/

Wildberries price data proxy endpoint. Standalone, no cross-dependency with datasets or EMIS.

## What to read next

- `emis/AGENTS.md` — EMIS API transport rules and import directions
- `../../lib/server/AGENTS.md` — server layer overview
- `packages/platform-datasets/AGENTS.md` — dataset runtime package
