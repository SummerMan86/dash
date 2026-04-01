# Filter System

`src/lib/entities/filter/` - declarative filter specs, workspace-aware runtime state, URL sync и target-aware planning.

## Purpose

- описывать filter specs как данные
- хранить runtime state для `shared / workspace / owner`
- синхронизировать filter state с URL
- планировать, что идёт в dataset layer, а что в operational EMIS targets

## Key files

| File                        | Role                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| `model/types.ts`            | `FilterSpec`, `ResolvedFilterSpec`, scopes, bindings, option sources |
| `model/registry.ts`         | legacy registry и runtime resolution                                 |
| `model/store.svelte.ts`     | legacy stores и runtime state                                        |
| `model/workspace.svelte.ts` | `useFilterWorkspace(...)`, snapshots, URL sync                       |
| `model/planner.ts`          | `planFiltersForTarget()` и dataset compatibility wrapper             |
| `model/serialization.ts`    | URL namespace codec и typed serialization                            |
| `index.ts`                  | public re-exports                                                    |

## Current data flow

```text
Page creates runtime   -> useFilterWorkspace({ workspaceId, ownerId, specs })
User changes filter    -> runtime.setFilter(filterId, value)
fetchDataset called    -> filterRuntime.getSnapshot()
                       -> planFiltersForDataset(datasetId, snapshot, context)
                           -> serverParams
                           -> clientFilterFn
```

`useFilterWorkspace(...)` владеет registration и cleanup.
Новый код не должен вызывать top-level `registerFilters(...)` прямо из route scope.

## Filter identities

У каждого фильтра теперь три разные identity:

- `id` - локальный authoring id
- `sharedKey?` - bridge для app-shared subset
- `urlKey?` - URL serialization key

Runtime isolation делается через:

- `registrationKey = ${workspaceId}:${ownerId}:${filterId}`

## FilterSpec shape

```ts
{
  id: 'dateRange',
  sharedKey: 'dateRange',
  urlKey: 'dateRange',
  type: 'dateRange',
  label: 'Период',
  scope: 'shared',
  apply: 'server',
  bindings: {
    'wildberries.fact_product_office_day': {
      field: 'dt',
      rangeParams: { from: 'dateFrom', to: 'dateTo' }
    },
    'emis.search.news': {
      rangeParams: { from: 'dateFrom', to: 'dateTo' }
    }
  }
}
```

## Scopes

- `shared` - app-shared subset across workspaces
- `workspace` - shared inside one workspace
- `owner` - local to one page/widget owner

Legacy aliases still accepted temporarily:

- `global` -> `shared`
- `page` -> `owner`

## Planner rules

- `planFiltersForTarget(targetId, snapshot, context)` - primary planner
- `planFiltersForDataset(...)` - compatibility wrapper
- server param names come from `binding.param ?? binding.field`
- date ranges emitted only when binding declares `rangeParams`

Это особенно важно для EMIS: один и тот же `dateRange` может применяться к news targets и игнорироваться object targets без UI-ветвлений "по месту".

## URL sync

Runtime namespace:

- shared: `sf.<sharedKey>`
- workspace: `wf.<workspaceId>._workspace.<urlKey>`
- owner: `wf.<workspaceId>.<ownerId>.<urlKey>`

Typed serialization lives in `model/serialization.ts`:

- date ranges use `.from` / `.to`
- arrays use repeated params

## Runtime usage

```ts
const filterRuntime = useFilterWorkspace({
	workspaceId: 'dashboard-wildberries',
	ownerId: 'office-day',
	specs: pageFilters
});
```

Typical page wiring:

- render `<FilterPanel runtime={filterRuntime} />`
- pass `filterRuntime.getSnapshot()` into `fetchDataset(..., { filterContext })`
- use `filterRuntime.getPlan(targetId)` or `getServerParams(targetId)` for non-dataset callers

## Options for select filters

`FilterSpec` supports:

- `options` - static list
- `valuesSource` - legacy dataset-driven source
- `optionsSource` - endpoint-backed source returning `{ rows }`

Most EMIS select filters use `optionsSource` against `/api/emis/dictionaries/*`.
Operational option lists may point to other EMIS endpoints too, for example `/api/emis/ship-routes/vessels`.

## Important guards

- `setFilter()` and runtime setters are no-ops for equal values
- `sanitizeValue()` normalizes empty string/array/object to `null`
- `useFilterWorkspace(...)` unregisters resolved specs on `onDestroy`
- `getEffectiveFilters()` prefers active runtime snapshot before legacy fallback

## Legacy API

Still present for backward compatibility:

- `registerFilters()`
- `filterStore`, `filterStoreV2`, `getFilterSnapshot()`
- legacy `global/page` scope naming

Новый код должен предпочитать `useFilterWorkspace(...)` и explicit `filterContext`.
