# Dashboard Routes Navigation

`src/routes/dashboard/` - основной прикладной UI-контур аналитики.

Здесь живут и demo-маршруты, и реальные аналитические страницы.

## Основные зоны

### `strategy/`

Текущий workspace для strategy/BSC dashboards поверх `strategy.*` datasets и
`mart_strategy.slobi_*` published views.

Есть локальный документ:

- `strategy/AGENTS.md`

### `wildberries/`

Самый зрелый reference по прикладным BI-экранам.

Есть локальный документ:

- `wildberries/AGENTS.md`

### `emis/`

BI/read-side экраны поверх EMIS mart/read-models.

### `analytics/`, `demo/`, `test/`, `edit-dnd-demo/`

Demo/example routes for analytics showcase and dashboard editor.

## EMIS/BI boundary (ST-8)

- BI routes (strategy, wildberries, analytics) must NOT import EMIS operational packages
- EMIS dashboards under `emis/` access data through the dataset/IR layer, not through `emis-server` directly
- All dashboard routes remain in `apps/web/src/routes/` (SvelteKit constraint)
- No `bi-dashboards` package — routes are app composition, not reusable library code

## Canonical BI data access pattern

All BI pages follow this pattern:

```svelte
import { fetchDataset } from '$shared/api/fetchDataset';
import { useDebouncedLoader } from '@dashboard-builder/platform-core';
import { useFilterWorkspace } from '$entities/filter';
import { FilterPanel } from '$widgets/filters';
```

`fetchDataset` is the canonical BI data facade in `$shared/api/`.

## Как читать dashboard routes

Если нужен общий прикладной UI-контур:

1. если задача про strategy/BSC — `strategy/AGENTS.md`
2. если задача про mature BI reference — `wildberries/AGENTS.md`
3. конкретный `+page.svelte` нужного маршрута
