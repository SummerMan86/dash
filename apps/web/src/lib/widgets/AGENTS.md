# Widgets Navigation

`src/lib/widgets/` - transitional bucket for app-local composite UI.
Это не canonical layer между `shared/ui` и routes: `shared/ui` уже вынесен в `@dashboard-builder/platform-ui`, а filter widgets - в `@dashboard-builder/platform-filters/widgets`.

## Purpose

- держать несколько оставшихся app-local composite blocks
- не размазывать route-specific UI glue по unrelated страницам

Для новой non-EMIS разработки лучше либо держать composition route-local (`components/`, `_shared/`), либо использовать более семантичное имя вроде `composites/`, если действительно нужен cross-route app-local home.

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
