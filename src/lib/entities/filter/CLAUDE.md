# entities/filter — Filter system

## Purpose
Declarative filter specs, reactive store, and filter planner (server vs client routing).

## Key files
| File | Role |
|------|------|
| `model/types.ts` | `FilterSpec`, `FilterValue`, `FilterType`, `FilterScope`, `FilterApply` |
| `model/registry.ts` | Module-level singleton: `registerFilters()`, `getSpecsForDataset()` |
| `model/store.svelte.ts` | `filterStoreV2` singleton + public API (`setFilter`, `getEffectiveFilters`) |
| `model/planner.ts` | `planFiltersForDataset()` — routes filters to server params or client fn |
| `model/serialization.ts` | URL serialization helpers |
| `index.ts` | Public re-exports |

## Data flow
```
Page registers specs → registerFilters(specs)
User changes filter  → setFilter(id, value)       ← store.svelte.ts
fetchDataset called  → getEffectiveFilters()
                     → planFiltersForDataset(datasetId, effectiveFilters)
                          → serverParams (go into DatasetQuery.filters)
                          → clientFilterFn (applied after fetch)
```

## FilterSpec shape
```ts
{
  id: 'dateRange',
  type: 'dateRange',          // dateRange | select | multiSelect | text
  label: 'Период',
  scope: 'global',            // global (shared) | page (local to active page)
  apply: 'server',            // server (SQL WHERE) | client (JS) | hybrid
  bindings: {
    'wildberries.fact_product_office_day': { field: 'dt' }
  }
}
```

## Scopes
- `global` — survives page navigation, stored in `filterStoreV2.global`
- `page` — keyed by `activePageId`, cleared when switching pages

## dateRange convention
`planFiltersForDataset` maps dateRange to **`dateFrom`/`dateTo`** keys in serverParams.
Dataset compile functions read `query.filters?.dateFrom` and `query.filters?.dateTo`.

## Important guards
- `setFilter()` is a no-op if new value equals current value (prevents reactive storms)
- `sanitizeValue()` normalizes empty string/array/object → null
- `unregisterFilters()` should be called on page unmount (onDestroy) to avoid stale specs

## Legacy API (deprecated, do not use for new code)
- `FilterState`, `createFilterStore`, `filterStore`, `getFilterSnapshot`
- Still present for backward compat; `fetchDataset` merges legacy snapshot too
