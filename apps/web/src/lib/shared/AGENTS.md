# Shared Layer Navigation

`src/lib/shared/` - transitional app-local bucket, not the canonical platform/shared layer.
Canonical reusable platform code now lives in packages such as `@dashboard-builder/platform-ui`, `@dashboard-builder/platform-core`, `@dashboard-builder/platform-datasets`, and `@dashboard-builder/platform-filters`.

## Structure

```text
shared/
├── api/
│   └── fetchDataset.ts
├── styles/
│   ├── tokens/
│   │   └── tokens.css
│   └── DESIGN_SYSTEM_GUIDE.md
└── fixtures/
```

Note: `lib/`, `ui/`, `utils/`, and `styles/utils/` MIGRATION re-export shims were removed in TD-2.
Consumers now import directly from packages:

- `@dashboard-builder/platform-ui` (UI components, `cn()`, tokens, chart presets)
- `@dashboard-builder/platform-core` (`useDebouncedLoader`, formatters)

## Что здесь находится

- `api/` - client-side facade для dataset-backed BI/read-side загрузки
- `styles/` - CSS tokens, design system docs
- `fixtures/` - mock datasets

Это не удачный долгосрочный umbrella-name для новых модулей.
Если код отсюда двигается или создается заново, ориентир такой:

- `api/` -> `data-access/`
- `styles/` -> `design/`
- `fixtures/` -> `mocks/` или route-local fixtures

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

### `styles/`

Содержит:

- `DESIGN_SYSTEM_GUIDE.md` — единый справочник по дизайн-системе
- `tokens/tokens.css` — CSS custom properties (imported by `app.css`)

UI components, `cn()`, tokens (TS), formatters, `useDebouncedLoader` now live in packages:

- `@dashboard-builder/platform-ui`
- `@dashboard-builder/platform-core`

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
- если хочешь понять, как страницы грузят данные
- если выносишь что-то в platform layer для EMIS или других доменов
