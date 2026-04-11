# @dashboard-builder/platform-datasets

Canonical dataset runtime for the app: registry-driven compile → provider execute pipeline, providers (Postgres, Oracle), and shared cache infrastructure.

This package is intentionally framework-agnostic: no SvelteKit imports, no route handlers, no UI.

## Structure

```
src/
  model/        — dataset contract types (DatasetId, DatasetQuery, DatasetIr, DatasetResponse, registry types)
  server/
    compile.ts           — legacy compiler routing (deprecated, use executeDatasetQuery)
    genericCompile.ts    — declarative compiler (registry-owned, no custom compile needed)
    executeDatasetQuery.ts — canonical entry point: registry lookup → compile → provider execute
    getDatasetSchema.ts  — schema introspection (non-executing)
    providerCache.ts     — shared bounded LRU cache helper (internal, not exported from ./server)
    definitions/         — domain dataset definitions (IR builders)
    providers/
      postgresProvider.ts — Postgres executor
      oracleProvider.ts   — Oracle executor (Thin mode, LRU cache, multi-pool)
    registry/
      index.ts           — canonical registry assembly & lookup
```

## Canonical files

- Entry point: `src/server/executeDatasetQuery.ts`
- Generic compiler: `src/server/genericCompile.ts`
- Legacy compiler routing: `src/server/compile.ts` (deprecated)
- Schema introspection: `src/server/getDatasetSchema.ts`
- Shared provider cache: `src/server/providerCache.ts` (internal)
- Domain definitions:
  - `src/server/definitions/emisMart.ts`
  - `src/server/definitions/iftsMart.ts`
  - `src/server/definitions/strategyMart.ts`
  - `src/server/definitions/wildberriesOfficeDay.ts`
  - `src/server/definitions/wildberriesProductPeriod.ts`
  - `src/server/definitions/paymentAnalytics.ts`
- Postgres provider: `src/server/providers/postgresProvider.ts`
- Oracle provider: `src/server/providers/oracleProvider.ts`
- Registry assembly: `src/server/registry/index.ts`

## Public exports

| Entrypoint | What | Consumers |
|---|---|---|
| `.` (`src/index.ts`) | Contract types, IR types, client helpers | App routes, UI components |
| `./server` (`src/server/index.ts`) | executeDatasetQuery, providers, registry, getDatasetSchema | App server routes, API handlers |

`providerCache.ts` is intentionally NOT exported from `./server` — it is internal to the provider layer.

## Rules

- Definitions must stay "IR-only": no SQL execution, only select/filter/order/limit description.
- Provider owns SQL execution + mapping to physical relations (`schema.table`) + column typing.
- If a published view changes columns, provider mapping must be updated in the same change set.
- Cache helper is provider-internal — do not import it from routes or UI.
- `isSafeIdent()` validates SQL identifiers in providers — do not bypass.

## Migration note

App-level paths in `apps/web/src/lib/server/datasets/*` and `apps/web/src/lib/server/providers/*` contain `// MIGRATION` shims and/or legacy copies.
New/active dataset work should land in this package.
