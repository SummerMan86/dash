# Widgets Navigation

`src/lib/widgets/` - слой composite widgets.
Он стоит выше `shared/ui`, но ниже page-level routes.

## Purpose

- собирать shared/ui primitives в готовые reusable widgets
- держать UI composition без утаскивания raw business logic в pages

Widgets могут использовать `entities` и `shared`, но не должны тянуть `features`, чтобы не плодить circular deps.

## What lives here after TD-2

MIGRATION re-export shims (`filters/`, `emis-map/`, `emis-status-bar/`) were removed in TD-2.
Consumers now import directly from packages:
- `@dashboard-builder/platform-filters/widgets` (was `$widgets/filters`)
- `@dashboard-builder/emis-ui/emis-map` (was `$widgets/emis-map`)
- `@dashboard-builder/emis-ui/emis-status-bar` (was `$widgets/emis-status-bar`)

### `stock-alerts/`

App-level Wildberries stock alert widgets:

- `ScenarioParams.svelte`
- `StatusBadge.svelte`

Types, utils, and filter presets are co-located here (canonical). Route-layer files re-export from `$widgets/stock-alerts/*`.

### `emis-drawer/`

App-level EMIS glue — detail panel for EMIS map features.
Stays in app because it depends on `@dashboard-builder/platform-filters/widgets` cross-widget composition.

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
