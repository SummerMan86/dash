# Library Layer Navigation

`src/lib/` - это основное внутреннее пространство приложения. Здесь лежат reusable и server-side модули.

## Как мыслить эту папку

- `shared/` - platform shared layer
- `entities/` - контракты и базовые domain primitives
- `features/` - крупные пользовательские функции
- `widgets/` - composite UI widgets
- `server/` - server-only логика, BFF и инфраструктура

## Что читать в первую очередь

1. `shared/AGENTS.md`
2. `entities/AGENTS.md`
3. `server/AGENTS.md`
4. `features/AGENTS.md`
5. `widgets/AGENTS.md`

## Где сейчас центр тяжести

Наиболее зрелые и реально используемые части:

- `shared/`
- `entities/dataset/`
- `entities/filter/`
- `server/`
- `features/dashboard-edit/`
- `widgets/filters/`
- `widgets/stock-alerts/`

## Package layer vs app layer (ST-8 rationalization)

After ST-6/ST-7 extraction, most reusable foundation lives in `packages/`:

- `@dashboard-builder/platform-core` — format, useDebouncedLoader
- `@dashboard-builder/platform-ui` — UI components, chart presets, design tokens
- `@dashboard-builder/platform-datasets` — DatasetQuery/Response/Ir, compile, postgresProvider
- `@dashboard-builder/platform-filters` — filter store/planner/widgets
- `@dashboard-builder/db` — pg pool
- `@dashboard-builder/emis-contracts` — EMIS entity types
- `@dashboard-builder/emis-server` — EMIS server modules
- `@dashboard-builder/emis-ui` — EmisMap, EmisStatusBar

What remains in `lib/` is **app-level composition and glue**:

- `entities/` — MIGRATION re-exports from packages (temporary compatibility)
- `features/dashboard-edit/` — dashboard editor (app feature, no second consumer)
- `features/emis-manual-entry/` — EMIS CMS forms (app feature, depends on $app/forms)
- `server/datasets/definitions/` — app-specific dataset IR definitions
- `server/alerts/` — alert scheduler + Telegram (app lifecycle, hooks.server.ts)
- `server/providers/` — mockProvider only (fixture/demo provider)
- `server/emis/` — MIGRATION re-exports from emis-server package
- `shared/api/fetchDataset.ts` — BI data access facade (filter composition)
- `shared/` — MIGRATION re-exports from platform packages
- `widgets/filters/` — MIGRATION re-export from platform-filters/widgets
- `widgets/emis-*/` — MIGRATION re-exports / app-specific EMIS UI glue
- `widgets/stock-alerts/` — Wildberries-specific alert widgets

Server-only consumers should now import these canonical packages directly:

- `@dashboard-builder/platform-datasets/server` — `compileDataset`, `postgresProvider`
- `@dashboard-builder/db` — pg pool

## EMIS vs BI boundary

- BI routes (strategy, wildberries, analytics) must NOT import EMIS operational packages
- EMIS read-side dashboards (routes/dashboard/emis/) access data through dataset/IR layer
- Both domains share platform-* packages but do not cross-import
