# @dashboard-builder/platform-datasets

Canonical dataset runtime for the app: dataset compiler (`compileDataset`) and providers (Postgres executor + dataset-to-relation mapping).

This package is intentionally framework-agnostic: no SvelteKit imports, no route handlers, no UI.

## Structure

```
src/
  model/        — dataset contract types (DatasetId, DatasetQuery, DatasetIr, DatasetResponse)
  server/
    compile.ts    — compiler routing layer (datasetId -> IR definition)
    definitions/  — domain dataset definitions (IR builders)
    providers/    — executors (Postgres) + dataset-to-relation mapping
```

## Canonical files

- Dataset compiler routing: `src/server/compile.ts`
- Domain definitions:
  - `src/server/definitions/emisMart.ts`
  - `src/server/definitions/strategyMart.ts`
  - `src/server/definitions/wildberriesOfficeDay.ts`
  - `src/server/definitions/wildberriesProductPeriod.ts`
  - `src/server/definitions/paymentAnalytics.ts`
- Postgres provider (relation mapping + typing): `src/server/providers/postgresProvider.ts`

## Rules

- Definitions must stay "IR-only": no SQL execution, only select/filter/order/limit description.
- Provider owns SQL execution + mapping to physical relations (`schema.table`) + column typing.
- If a published view changes columns, provider mapping must be updated in the same change set.

## Migration note

App-level paths in `apps/web/src/lib/server/datasets/*` and `apps/web/src/lib/server/providers/*` contain `// MIGRATION` shims and/or legacy copies.
New/active dataset work should land in this package.
