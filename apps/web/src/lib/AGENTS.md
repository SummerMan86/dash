# Library Layer Navigation

`src/lib/` contains app-local code: server-side infrastructure, thin API facades, and a few remaining app-specific modules.
It is not a canonical layer map for the repository.

## Placement rules for new code

> **Default target for new code is NOT here.** New reusable logic, contracts, and data execution go into `packages/*`. New page/workspace composition goes into `src/routes/...`. This folder holds only app-local glue that is neither page-scoped nor package-worthy.

## Current structure

| Folder | Status | Contains |
|--------|--------|----------|
| `server/` | **Active** | BFF transport, legacy dataset-definition copies, providers, alerts scheduler, EMIS route infra |
| `api/` | **Active** | App-local BI data facade such as `fetchDataset.ts` |
| `fixtures/` | **Active** | Mock/demo/test datasets |
| `styles/` | **Active** | App-level token CSS and design-system docs |
| `features/dashboard-edit/` | **Active (transitional home)** | Dashboard layout editor (GridStack). Single app-local consumer |
| `features/emis-manual-entry/` | **Active** | EMIS CMS forms. Depends on `$app/forms` |
| `widgets/stock-alerts/` | **Active (transitional home)** | Wildberries-specific alert widgets |
| `widgets/emis-drawer/` | **Active** | EMIS map detail panel |
| `entities/` | **Deleted** | All re-export shims removed in TD-2. Do not recreate |

## Target non-EMIS shape

For future rename/migration, the intended app-local shape is flat by module:

```text
src/lib/
  server/
  api/
  fixtures/
  styles/
  dashboard-edit/
  <module>/
```

Meaning:

- `server/` remains the server-only boundary
- `api/` holds client facades such as `fetchDataset`
- `fixtures/` holds mock/demo/test data
- `styles/` holds tokens, global CSS, and style docs
- every app-local feature/editor/composite becomes a first-level peer module instead of living under `features/` or `widgets/`

## Package layer vs app layer

Most reusable foundation lives in `packages/`:

- `@dashboard-builder/platform-core` — format, useDebouncedLoader
- `@dashboard-builder/platform-ui` — UI components, chart presets, design tokens
- `@dashboard-builder/platform-datasets` — DatasetQuery/Response/Ir, compile, postgresProvider
- `@dashboard-builder/platform-filters` — filter store/planner/widgets
- `@dashboard-builder/db` — pg pool
- `@dashboard-builder/emis-contracts` — EMIS entity types
- `@dashboard-builder/emis-server` — EMIS server modules
- `@dashboard-builder/emis-ui` — EmisMap, EmisStatusBar

What remains in `lib/` is **app-level composition and glue**:

- `server/datasets/definitions/` — legacy migration copies/reference only; canonical runtime definitions live in `packages/platform-datasets/src/server/definitions/*`
- `server/alerts/` — alert scheduler + Telegram (app lifecycle, hooks.server.ts)
- `server/providers/` — mockProvider only (fixture/demo provider)
- `server/emis/` — EMIS route infra (re-exports from emis-server package)
- `api/fetchDataset.ts` — BI data access facade (filter composition)
- `styles/` — CSS tokens, design system guide
- `fixtures/` — mock datasets
- `features/dashboard-edit/` — dashboard editor (app feature, no second consumer)
- `features/emis-manual-entry/` — EMIS CMS forms (app feature, depends on $app/forms)
- `widgets/stock-alerts/` — Wildberries-specific alert widgets
- `widgets/emis-drawer/` — EMIS map detail panel

Server-only consumers should import canonical packages directly:

- `@dashboard-builder/platform-datasets/server` — `compileDataset`, `postgresProvider`
- `@dashboard-builder/db` — pg pool

## Rules for new non-EMIS app-local code

- Do not create new `shared/`, `entities/`, `features/`, or `widgets/` buckets
- Reusable across domains/projects -> `packages/*`
- Single page/workspace only -> route-local files under `src/routes/...`
- Multi-route but app-specific -> `src/lib/<module>/`
- Thin client transport facade -> `src/lib/api/`
- Server-only -> `src/lib/server/`
- App-local peer modules should not import each other; if two modules need shared code, move that code into `packages/*` or a narrower route-local shared home
- Long-term alias policy is `$lib/*`; transitional `$shared/$features/$widgets` should disappear during rename migration

## Module lifecycle

1. Route-local: keep code next to the page/workspace while one route owns it.
2. App-local module: move it to `src/lib/<module>/` when 2+ routes use it and it is still app-specific.
3. Package: extract to `packages/<name>/` when the module gains broader contracts, related submodules, or clear reuse beyond one app-local module.

This repository scales primarily through `packages/*`, not by adding more grouping buckets under `src/lib/`.
If `src/lib/` starts asking for sub-groups-of-groups, that is usually the signal to extract a package instead.

## EMIS vs BI boundary

- BI routes (strategy, wildberries, analytics) must NOT import EMIS operational packages
- EMIS analytics dashboards (routes/dashboard/emis/) access data through dataset/IR layer
- Both domains share platform-* packages but do not cross-import

## What to read next

1. `server/AGENTS.md` — server-side infrastructure
2. `api/fetchDataset.ts` and `styles/DESIGN_SYSTEM_GUIDE.md` — app-local BI facade and style docs
3. `features/dashboard-edit/AGENTS.md` — layout editor details
