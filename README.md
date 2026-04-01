# Dashboard Builder / BI Platform

Текущий репозиторий содержит SvelteKit-приложение, которое уже вышло за рамки простого "builder demo". По факту это заготовка BI/аналитической платформы с общими UI-компонентами, BFF-слоем для датасетов, системой фильтров, редактором дашбордов и несколькими прикладными аналитическими модулями.

## Что уже есть

- `shared/ui` и `shared/styles` - базовый design system на Svelte 5 + Tailwind 4
- `entities/dataset` + `server/*` - BFF-паттерн `DatasetQuery -> IR -> Provider` для BI/read-side
- `entities/filter` + `widgets/filters` - декларативные фильтры, workspace runtime, URL sync и target-aware planner
- `server/emis/*` + `routes/api/emis/*` - Postgres-first operational/server modules для EMIS без лишней generic IR-обвязки
- `features/dashboard-edit` - редактор дашбордов на GridStack
- `routes/dashboard/wildberries/*` - прикладные аналитические страницы поверх PostgreSQL
- `server/alerts` - серверный scheduler и уведомления

## Стек

- Svelte 5
- SvelteKit 2
- TypeScript
- Tailwind CSS 4
- ECharts
- GridStack
- PostgreSQL

## Быстрый старт

```bash
pnpm install
pnpm dev
```

Dev-сервер поднимается на `http://localhost:5173`.

Для страниц с PostgreSQL-датасетами нужен `.env` с `DATABASE_URL`.
Для EMIS-команд `db:*` нужна PostgreSQL-инстанция с доступным расширением `PostGIS`.

DB-контур репозитория теперь ведется в snapshot-first режиме:

- текущую структуру читаем по `db/current_schema.sql`;
- краткую карту модели держим в `db/schema_catalog.md`;
- короткий журнал DDL-изменений - в `db/applied_changes.md`;
- `db/seeds/` теперь держит только reference dictionaries;
- demo objects/news/links вынесены в optional `db/demo-fixtures/` и грузятся отдельно;
- историческая migration-лента удалена из рабочего дерева, чтобы не перегружать контекст; если когда-то понадобится расследование старого SQL, ориентируемся на `git history`.

### Локальный PostGIS в Docker

В репозитории есть `docker-compose.yml` для dev-PostgreSQL с PostGIS.
По умолчанию контейнер публикуется на `localhost:5435`, чтобы не конфликтовать с уже занятым `5432`.

```bash
pnpm db:init
```

Реквизиты подключения лежат в `.env` и продублированы в `.env.example`.
Для ручного управления контейнером есть `pnpm db:up`, `pnpm db:down` и `pnpm db:logs`.

## Основные команды

```bash
pnpm dev
pnpm map:assets:status
pnpm map:assets:install -- --source /abs/path/to/offline-bundle
pnpm db:up
pnpm db:init
pnpm db:down
pnpm db:status
pnpm db:apply
pnpm db:snapshot:export
pnpm db:snapshot:verify
pnpm db:seed
pnpm db:demo
pnpm db:reset
pnpm check
pnpm lint
pnpm build
```

`pnpm db:reset` поднимает snapshot baseline и reference dictionaries.
Если нужен демонстрационный EMIS-контент, дополнительно выполнить `pnpm db:demo`.

## Важные переменные окружения

- `DATABASE_URL` - PostgreSQL для `wildberries.*` датасетов и scheduler alerts
- `EMIS_MAP_MODE` - режим basemap для EMIS (`auto`, `online` или `offline`)
- `EMIS_MAP_ONLINE_STYLE_URL` - явный online style URL для EMIS
- `EMIS_MAP_STYLE_URL` - legacy alias для online style URL
- `EMIS_MAPTILER_KEY` - API key для MapTiler style runtime
- `EMIS_MAPTILER_STYLE_ID` - style id для MapTiler, по умолчанию `streets-v2`
- `EMIS_MAP_INITIAL_CENTER` - стартовый центр карты в формате `lon,lat`
- `EMIS_MAP_INITIAL_ZOOM` - стартовый zoom EMIS-карты
- `STRATEGY_DOCUMENT_BASE_URL` - base URL для открытия source documents из KPI provenance panel
- `ENABLE_ALERT_SCHEDULER` - выключение фонового scheduler (`false`)
- `ALERT_SCHEDULE` - cron для alerts
- `ALERT_TIMEZONE` - timezone для alerts
- `WB_API_TOKEN` - токен для прокси `/api/wb/prices`

## Основные маршруты

- `/emis` - EMIS workspace: карта, shared filters и search list
- `/dashboard` - редактор дашборда
- `/dashboard/demo` - демо аналитического UI
- `/dashboard/analytics` - статическая demo-аналитика
- `/dashboard/strategy-drive` - стратегия, BSC, planning cascade и gap analysis
- `/dashboard/wildberries/office-day` - таблица офисных остатков
- `/dashboard/wildberries/product-analytics` - аналитика товара
- `/dashboard/wildberries/stock-alerts` - анализ рисков по складам

## Фильтрация

Текущий рабочий паттерн для новых страниц:

- страница объявляет `FilterSpec[]`
- страница создает runtime через `useFilterWorkspace({ workspaceId, ownerId, specs })`
- `FilterPanel` рендерится с `runtime={...}`
- `fetchDataset(...)` получает явный `filterContext.snapshot`

Система поддерживает три scope:

- `shared` - app-shared subset между workspace
- `workspace` - общее состояние внутри workspace
- `owner` - локальное состояние страницы/виджета

Для cross-page и cross-domain маршрутов используется URL namespace:

- `sf.<sharedKey>`
- `wf.<workspaceId>._workspace.<urlKey>`
- `wf.<workspaceId>.<ownerId>.<urlKey>`

## Документация

- `AGENTS.md` - корневая точка входа по репозиторию, контурам и архитектурным правилам
- `docs/AGENTS.md` - единственный полный каталог документации и reading order
- `db/schema_catalog.md` + `db/current_schema.sql` - snapshot-first source of truth по активной структуре БД
- `CLAUDE.md` - compatibility redirect на `AGENTS.md`
- локальные `AGENTS.md` / `CLAUDE.md` в подпапках - точечные правила по подсистемам

## Замечание по структуре

Сейчас это один SvelteKit-пакет, а не полноценное монорепо. При этом внутренняя архитектура уже достаточно модульная, чтобы использовать репозиторий как базу для EMIS и позже, при необходимости, разнести код на `apps/*` и `packages/*` без полного переписывания.

## Локальные git-checkpoints

Для EMIS принят рабочий ритм: после каждого завершенного этапа сохранять локальный git commit, даже если задача еще не дошла до финального релиза. Это помогает не терять устойчивые промежуточные состояния.
