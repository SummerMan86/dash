# Widgets Navigation

`src/lib/widgets/` - это слой composite widgets. Они стоят выше `shared/ui`, но ниже page-level маршрутов.

Есть локальный документ:

- `CLAUDE.md`

## Что здесь реально используется

### `filters/`

Главный reusable widget-модуль в проекте:

- `FilterPanel.svelte`
- `FilterField.svelte`
- конкретные filter components

Это UI-обертка над `entities/filter`.

### `stock-alerts/`

Небольшой прикладной widget-модуль для сценария складских алертов:

- `ScenarioParams.svelte`
- `StatusBadge.svelte`

## Что здесь пока неактивно

Папки:

- `chart/`
- `dashboard-container/`
- `kpi/`
- `table/`

сейчас не содержат рабочего кода и не являются ключевыми модулями.

## Как читать widgets

1. `CLAUDE.md`
2. `filters/*`
3. `stock-alerts/*`

Если нужно понять общую фильтрацию страниц, читай widgets вместе с:

- `../entities/filter/AGENTS.md`
- `../shared/AGENTS.md`
