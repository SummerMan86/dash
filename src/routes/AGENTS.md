# Routes Navigation

`src/routes/` - это пользовательские страницы и HTTP endpoints SvelteKit.

## Как воспринимать эту папку

Здесь смешаны:

- demo/scaffold root pages;
- рабочие dashboard pages;
- API endpoints.

Поэтому важно не читать ее слева направо как единый продуктовый поток.

## Основные зоны

### Root routes

- `+layout.svelte`
- `+page.svelte`
- `Header.svelte`

Это верхняя оболочка приложения. Сейчас она все еще partly demo/scaffold по характеру.

### `dashboard/`

Основной пользовательский UI-контур проекта на текущий момент.

Содержит:

- editor route
- demo pages
- Wildberries analytics pages

### `api/`

Серверные endpoints:

- `api/datasets/[id]/+server.ts`
- `api/emis/*`
- `api/wb/prices/+server.ts`

Это ключевые входы в server-side сценарии.

## Порядок чтения

Если нужен UI:

1. `dashboard/+page.svelte`
2. `dashboard/demo/+page.svelte`
3. `dashboard/wildberries/AGENTS.md`

Если нужен API:

1. `api/datasets/[id]/+server.ts`
2. `api/emis/AGENTS.md`
3. `api/wb/prices/+server.ts`

## Что здесь активнее всего

Наиболее полезный прикладной код в routes сейчас находится в:

- `dashboard/wildberries/office-day/`
- `dashboard/wildberries/product-analytics/`
- `dashboard/wildberries/stock-alerts/`

Именно эти маршруты лучше всего показывают реальный production-ish сценарий проекта.
