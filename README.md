# Dashboard Builder / Platform + BI + EMIS

Текущий репозиторий содержит single-deployable `SvelteKit` modular monolith, в котором сейчас сосуществуют три контура: platform/shared foundation, BI/read-side и EMIS как отдельный доменный модуль. Это уже не "builder demo" и не "только BI-приложение": BI и EMIS живут в одном runtime, но описываются и развиваются как отдельные архитектурные поверхности.

## Что уже есть

Краткий обзор ключевых модулей:

- `packages/platform-ui` + `apps/web/src/lib/styles/` + `apps/web/src/app.css` — reusable UI primitives, app-owned token CSS/design-system guide, and app-shell wiring for the design system
- `packages/platform-datasets` + `apps/web/src/routes/api/datasets/[id]/+server.ts` — BI/read-side path `DatasetQuery -> compile -> Provider`
- `packages/platform-filters` + BI routes — декларативные фильтры, workspace runtime, URL sync и target-aware planner
- `apps/web/src/lib/api/fetchDataset.ts` — app-local BI data facade поверх dataset runtime
- `apps/web/src/lib/dashboard-edit` — редактор дашбордов на GridStack
- `apps/web/src/routes/dashboard/wildberries/*` и `apps/web/src/routes/dashboard/strategy/*` — прикладные аналитические страницы
- `apps/web/src/lib/server/alerts` — серверный scheduler и уведомления
- `apps/web/src/lib/server/emis/*` + `apps/web/src/routes/api/emis/*` — Postgres-first operational/server modules для EMIS без лишней generic IR-обвязки

App-local code теперь живёт в плоских peer-модулях `apps/web/src/lib/*` (`api`, `fixtures`, `styles`, `dashboard-edit`, `emis-manual-entry`) и route-local slices вроде `routes/dashboard/wildberries/stock-alerts/*` и `routes/dashboard/emis/vessel-positions/EmisDrawer.svelte`.

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
pnpm build
pnpm lint
pnpm lint:boundaries
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
- `/dashboard/strategy` - стратегия, BSC, planning cascade и gap analysis
- `/dashboard/wildberries/office-day` - таблица офисных остатков
- `/dashboard/wildberries/product-analytics` - аналитика товара
- `/dashboard/wildberries/stock-alerts` - анализ рисков по складам

## Фильтрация

Текущий рабочий паттерн для новых страниц:

- страница объявляет `FilterSpec[]`
- страница создает runtime через `useFilterWorkspace({ workspaceId, ownerId, specs })`
- страница при необходимости вызывает `planFiltersForTarget()` / `planFiltersForTargets()` и получает `plan.serverParams`
- страница явно мержит `plan.serverParams` с page-local params и вызывает `fetchDataset({ id, params })`
- `FilterPanel` рендерится с `runtime={...}`
- legacy `filterContext` остается только для немигрированных compatibility callers

Система поддерживает три scope:

- `shared` - app-shared subset между workspace
- `workspace` - общее состояние внутри workspace
- `owner` - локальное состояние страницы/виджета

Для cross-page и cross-domain маршрутов используется URL namespace:

- `sf.<sharedKey>`
- `wf.<workspaceId>._workspace.<urlKey>`
- `wf.<workspaceId>.<ownerId>.<urlKey>`

## Документация

- `docs/architecture.md` - canonical repo-wide foundation contract: system summary, foundation principles, topology, ownership, execution paths, import rules
- `docs/emis/README.md` - EMIS entry point; обычная EMIS-разработка начинается отсюда и не требует чтения BI vertical docs, если не затрагивается `/dashboard/emis/*` или shared dataset runtime
- `AGENTS.md` - корневая точка входа по репозиторию, контурам и архитектурным правилам
- `docs/AGENTS.md` - единственный полный каталог документации и reading order
- `docs/QUICKSTART.md` - operator runbook: как ставить задачи agent team (для человека, не для агентов)
- `db/schema_catalog.md` + `db/current_schema.sql` - snapshot-first source of truth по активной структуре БД
- `CLAUDE.md` - compatibility redirect на `AGENTS.md`
- локальные `AGENTS.md` / `CLAUDE.md` в подпапках - точечные правила по подсистемам

## Структура репозитория

Monorepo-style layout: единое SvelteKit-приложение в `apps/web/` + 8 workspace packages в `packages/`:

- `platform-core`, `platform-ui`, `platform-datasets`, `platform-filters` — shared foundation
- `db` — DB helpers и schema
- `emis-contracts`, `emis-server`, `emis-ui` — EMIS domain packages

Single-deployable: один runtime, но code ownership и import boundaries разделены по package границам. Подробнее — `docs/architecture.md` и `docs/emis/structural_migration.md`.

Важно: исторические `src/lib/shared|features|widgets` не стоит читать как FSD-layer contract. Для новой non-EMIS разработки canonical model — `routes/*` для page composition и `packages/*` для reusable logic.

## Локальные git-checkpoints

Для EMIS принят рабочий ритм: после каждого завершенного этапа сохранять локальный git commit, даже если задача еще не дошла до финального релиза. Это помогает не терять устойчивые промежуточные состояния.
