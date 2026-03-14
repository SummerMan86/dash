# Shared Layer Navigation

`src/lib/shared/` - это текущий platform shared слой проекта.

## Что здесь находится

- `api/` - client-side facade для загрузки данных
- `lib/` - маленькие reusable composables
- `styles/` - tokens, design system docs, style helpers
- `ui/` - базовые UI primitives
- `fixtures/` - mock datasets
- `utils/` - formatters и мелкие функции

Есть локальный документ:

- `CLAUDE.md`

## Самые важные точки входа

### `api/fetchDataset.ts`

Главный entry point для UI-загрузки датасетов.

Это важный модуль, потому что он:

- объединяет filters;
- строит request payload;
- делает dedup/cache;
- прячет transport details от страниц.

### `lib/useDebouncedLoader.svelte.ts`

Главный helper для реактивной загрузки без request storms.

### `styles/`

Содержит:

- `DESIGN_SYSTEM_GUIDE.md`
- `DS_CHEATSHEET.md`
- tokens
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
- sidebar

Это не бизнес-виджеты, а нижний слой интерфейса.

## Когда идти сюда

- если меняешь визуальную основу приложения;
- если ищешь reusable компонент, а не page-specific UI;
- если хочешь понять, как страницы грузят данные;
- если выносишь что-то в platform layer для будущего EMIS.
