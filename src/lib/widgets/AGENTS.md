# Widgets Navigation

`src/lib/widgets/` - слой composite widgets.
Он стоит выше `shared/ui`, но ниже page-level routes.

## Purpose

- собирать shared/ui primitives в готовые reusable widgets
- держать UI composition без утаскивания raw business logic в pages

Widgets могут использовать `entities` и `shared`, но не должны тянуть `features`, чтобы не плодить circular deps.

## Что здесь реально используется

### `filters/`

Главный reusable widget-модуль:

- `FilterPanel.svelte`
- `FilterField.svelte`
- `DateRangeFilter.svelte`
- `SelectFilter.svelte`
- `MultiSelectFilter.svelte`
- `TextFilter.svelte`

Это UI-обертка над `entities/filter`.
Новый код должен передавать runtime явно.

Typical usage:

```svelte
<script>
	import { useFilterWorkspace } from '$entities/filter';
	import { FilterPanel } from '$widgets/filters';
	import { pageFilters } from './filters';

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-wildberries',
		ownerId: 'office-day',
		specs: pageFilters
	});
</script>

<FilterPanel runtime={filterRuntime} />
```

### `stock-alerts/`

Прикладной widget-модуль для складских алертов:

- `ScenarioParams.svelte`
- `StatusBadge.svelte`

### `emis-map/`

Новый EMIS widget-модуль для geospatial runtime:

- `EmisMap.svelte`
- layer config
- popup renderers
- online/offline basemap mode
- controlled fallback при отсутствии локального bundle

## Conventions

- Widgets должны экспортировать Svelte components, а не raw TS business logic
- props должны быть typed
- use design-system tokens instead of raw ad-hoc colors

## Что здесь пока неактивно

- `chart/`
- `dashboard-container/`
- `kpi/`
- `table/`

Сейчас это не ключевые рабочие модули.

## Как читать widgets

1. этот `AGENTS.md`
2. `filters/*`
3. `stock-alerts/*`
4. `emis-map/*`

Если нужно понять общую фильтрацию страниц, читать widgets вместе с:

- `../entities/filter/AGENTS.md`
- `../shared/AGENTS.md`
