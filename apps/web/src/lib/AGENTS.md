# Library Layer Navigation

`src/lib/` contains app-local code: server-side infrastructure, thin API facades, and a few remaining app-specific modules.

## Placement rules for new code

> **Default target for new code is NOT here.** New reusable logic, contracts, and data execution go into `packages/*`. New page/workspace composition goes into `src/routes/...`. This folder holds only app-local glue that is neither page-scoped nor package-worthy.

## Current structure

| Folder | Status | Contains |
|--------|--------|----------|
| `server/` | **Active** | BFF transport, legacy dataset-definition copies, providers, alerts scheduler, EMIS route infra |
| `shared/` | **Active (thin)** | `fetchDataset.ts` (BI data facade), CSS tokens, fixtures |
| `features/dashboard-edit/` | **Active** | Dashboard layout editor (GridStack). Single app-local consumer |
| `features/emis-manual-entry/` | **Active** | EMIS CMS forms. Depends on `$app/forms` |
| `widgets/stock-alerts/` | **Active** | Wildberries-specific alert widgets |
| `widgets/emis-drawer/` | **Active** | EMIS map detail panel |
| `entities/` | **Empty** | All re-export shims removed in TD-2. Direct package imports only |

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
- `shared/api/fetchDataset.ts` — BI data access facade (filter composition)
- `shared/styles/` — CSS tokens, design system guide
- `shared/fixtures/` — mock datasets
- `features/dashboard-edit/` — dashboard editor (app feature, no second consumer)
- `features/emis-manual-entry/` — EMIS CMS forms (app feature, depends on $app/forms)
- `widgets/stock-alerts/` — Wildberries-specific alert widgets
- `widgets/emis-drawer/` — EMIS map detail panel

Server-only consumers should import canonical packages directly:

- `@dashboard-builder/platform-datasets/server` — `compileDataset`, `postgresProvider`
- `@dashboard-builder/db` — pg pool

## EMIS vs BI boundary

- BI routes (strategy, wildberries, analytics) must NOT import EMIS operational packages
- EMIS analytics dashboards (routes/dashboard/emis/) access data through dataset/IR layer
- Both domains share platform-* packages but do not cross-import

## What to read next

1. `server/AGENTS.md` — server-side infrastructure
2. `shared/AGENTS.md` — fetchDataset and styles
3. `features/dashboard-edit/AGENTS.md` — layout editor details
