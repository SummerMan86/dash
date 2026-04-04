# Widgets Navigation

`src/lib/widgets/` - слой composite widgets.
Он стоит выше `shared/ui`, но ниже page-level routes.

## Purpose

- собирать shared/ui primitives в готовые reusable widgets
- держать UI composition без утаскивания raw business logic в pages

Widgets могут использовать `entities` и `shared`, но не должны тянуть `features`, чтобы не плодить circular deps.

## What lives here after ST-8

### `filters/`

MIGRATION re-export from `@dashboard-builder/platform-filters/widgets`.
Canonical code lives in `packages/platform-filters`.

### `stock-alerts/`

App-level Wildberries stock alert widgets:

- `ScenarioParams.svelte`
- `StatusBadge.svelte`

Note: imports types from `routes/dashboard/wildberries/stock-alerts/` (pre-existing layer-boundary concern, not ST-8 scope).

### `emis-map/` and `emis-status-bar/`

MIGRATION re-exports from `@dashboard-builder/emis-ui`.
Canonical code lives in `packages/emis-ui`.

### `emis-drawer/`

App-level EMIS glue — detail panel for EMIS map features.
Stays in app because it depends on `$widgets/filters` cross-widget composition.

## Conventions

- Widgets должны экспортировать Svelte components, а не raw TS business logic
- props должны быть typed
- use design-system tokens instead of raw ad-hoc colors

## Как читать widgets

1. этот `AGENTS.md`
2. для filter UI — `packages/platform-filters/`
3. для EMIS map — `packages/emis-ui/`
4. `stock-alerts/*` — app-level WB widget
5. `emis-drawer/*` — app-level EMIS glue
