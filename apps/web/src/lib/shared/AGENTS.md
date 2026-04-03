# Shared Layer Navigation

`src/lib/shared/` - текущий platform shared слой проекта.

## Structure

```text
shared/
├── api/
│   └── fetchDataset.ts
├── lib/
│   └── useDebouncedLoader.svelte.ts
├── ui/
├── styles/
│   ├── tokens/
│   ├── utils/
│   └── DESIGN_SYSTEM_GUIDE.md
├── fixtures/
└── utils/
```

## Что здесь находится

- `api/` - client-side facade для dataset-backed BI/read-side загрузки
- `lib/` - маленькие reusable composables
- `styles/` - tokens, design system docs, style helpers
- `ui/` - базовые UI primitives
- `fixtures/` - mock datasets
- `utils/` - formatters и мелкие helpers

## Самые важные точки входа

### `api/fetchDataset.ts`

Главный entry point для UI-загрузки датасетов.

Он:

- объединяет filters
- строит request payload
- делает dedup/cache
- прячет transport details от страниц
- применяет client-side post-filter, если planner его вернул

Operational EMIS routes могут ходить напрямую в `/api/emis/*`, не через dataset layer.

### `lib/useDebouncedLoader.svelte.ts`

Главный helper для реактивной загрузки без request storms.

Он:

- debounces reloads
- не допускает parallel load storm
- игнорирует stale responses

### `styles/`

Содержит:

- `DESIGN_SYSTEM_GUIDE.md` — единый справочник по дизайн-системе
- design tokens
- `cn()` helper

Если нужно менять UI системно, начинать стоит отсюда.

### `ui/`

Базовые примитивы, на которых строятся страницы:

- button
- input
- select
- card
- chart
- stat-card
- badge
- data-table
- sidebar
- skeleton
- metric/progress primitives

Это не бизнес-виджеты, а нижний слой интерфейса.

## Canonical usage

```ts
import { fetchDataset } from '$shared/api';

const data = await fetchDataset({
	id: 'wildberries.fact_product_office_day',
	params: { nmId: 123, limit: 100 },
	cache: { ttlMs: 60_000 }
});
```

## When to go here

- если меняешь визуальную основу приложения
- если ищешь reusable component, а не page-specific UI
- если хочешь понять, как страницы грузят данные
- если выносишь что-то в platform layer для EMIS или других доменов
