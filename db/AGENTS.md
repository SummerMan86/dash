# DB Navigation

`db/` - это snapshot-first слой схемы PostgreSQL для активного DB-контура приложения.

Если задача затрагивает данные, таблицы, view или DWH-логику, начинать стоит отсюда.

## Основные зоны

### `current_schema.sql`

Технический source of truth по текущей структуре активных app schemas в этом репозитории.

### `schema_catalog.md`

Человекочитаемый вход в модель: какие схемы и объекты считаются рабочими.

### `applied_changes.md`

Короткий журнал только структурных изменений после baseline.

### `pending_changes.sql`

Опциональный delta-файл для случая, когда уже существующей live DB нужно применить изменение до следующего snapshot export.

### `seeds/`

Только reference dictionaries, нужные для baseline и write-side smoke.

### `demo-fixtures/`

Опциональные demo objects/news/links для локального showcase и ручного UI-прогона.

## Как читать DB слой

1. `schema_catalog.md`
2. `current_schema.sql`
3. `applied_changes.md`
4. при необходимости - `pending_changes.sql`

## Важные правила

- текущую структуру читать по `current_schema.sql`, а не по migration-цепочке;
- schema change обновляет `current_schema.sql` и `applied_changes.md`, при необходимости `schema_catalog.md`;
- если existing DB требует промежуточный delta до следующего snapshot export, использовать `pending_changes.sql`;
- `db:seed` должен оставаться минимальным reference baseline без демонстрационных сущностей;
- demo content, если он нужен, держать отдельно от reference seeds;
- если меняется `mart`-view, нужно проверить downstream потребителей (Power BI, любые read-side проверки);
- business logic предпочтительно держать в SQL/view, а не переносить в клиент или provider.

## Strategy / BSC boundary

Полный snapshot-first source of truth для strategy/BSC DWH живет во внешнем `agent_pack`.

Но локальный app runtime может зависеть от published live wrappers в `mart_strategy`,
если они нужны для `dashboard-builder` pages.

Рабочее правило здесь такое:

- full strategy DWH redesign не делаем в этом репозитории;
- app-facing live wrapper вроде `mart_strategy.slobi_*` можно публиковать через `db/pending_changes.sql`,
  если это нужно для уже существующей local DB;
- при таком изменении обязательно обновлять `db/applied_changes.md`;
- если wrapper меняет dataset/API behavior, одновременно обновлять app-side dataset/provider code.

## Historical Note

Историческая migration-лента намеренно убрана из рабочего дерева репозитория, чтобы не перегружать контекст.
Если понадобится расследование старого SQL, ориентироваться на `git history` и внешний `agent_pack`.
