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

## Как читать dashboard routes

Если нужен общий прикладной UI-контур:

1. если задача про strategy/BSC - `strategy/AGENTS.md`
2. если задача про mature BI reference - `wildberries/AGENTS.md`
3. конкретный `+page.svelte` нужного маршрута
