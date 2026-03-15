# Dashboard Builder / BI Platform

Текущий репозиторий содержит SvelteKit-приложение, которое уже вышло за рамки простого "builder demo". По факту это заготовка BI/аналитической платформы с общими UI-компонентами, BFF-слоем для датасетов, системой фильтров, редактором дашбордов и несколькими прикладными аналитическими модулями.

## Что уже есть

- `shared/ui` и `shared/styles` - базовый design system на Svelte 5 + Tailwind 4
- `entities/dataset` + `server/*` - BFF-паттерн `DatasetQuery -> IR -> Provider`
- `entities/filter` + `widgets/filters` - декларативные фильтры и их привязка к датасетам
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
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm check
pnpm lint
pnpm build
```

## Важные переменные окружения

- `DATABASE_URL` - PostgreSQL для `wildberries.*` датасетов и scheduler alerts
- `EMIS_MAP_MODE` - режим basemap для EMIS (`auto`, `online` или `offline`)
- `EMIS_MAP_ONLINE_STYLE_URL` - явный online style URL для EMIS
- `EMIS_MAP_STYLE_URL` - legacy alias для online style URL
- `EMIS_MAPTILER_KEY` - API key для MapTiler style runtime
- `EMIS_MAPTILER_STYLE_ID` - style id для MapTiler, по умолчанию `streets-v2`
- `EMIS_MAP_INITIAL_CENTER` - стартовый центр карты в формате `lon,lat`
- `EMIS_MAP_INITIAL_ZOOM` - стартовый zoom EMIS-карты
- `ENABLE_ALERT_SCHEDULER` - выключение фонового scheduler (`false`)
- `ALERT_SCHEDULE` - cron для alerts
- `ALERT_TIMEZONE` - timezone для alerts
- `WB_API_TOKEN` - токен для прокси `/api/wb/prices`

## Основные маршруты

- `/emis` - стартовая точка EMIS foundation
- `/dashboard` - редактор дашборда
- `/dashboard/demo` - демо аналитического UI
- `/dashboard/analytics` - статическая demo-аналитика
- `/dashboard/wildberries/office-day` - таблица офисных остатков
- `/dashboard/wildberries/product-analytics` - аналитика товара
- `/dashboard/wildberries/stock-alerts` - анализ рисков по складам

## Документация

- `AGENTS.md` - быстрый навигатор по проекту и иерархии модулей
- [Текущий анализ проекта](docs/current-project-analysis.md)
- [EMIS Session Bootstrap](docs/emis_session_bootstrap.md)
- [EMIS Freeze Note](docs/emis_freeze_note.md)
- [Обновленное ТЗ EMIS v2](docs/emis_mve_tz_v_2.md)
- [Implementation Spec EMIS v1](docs/emis_implementation_spec_v1.md)
- [Offline Maps Ops Guide](docs/emis_offline_maps_ops.md)
- `CLAUDE.md` - обзор архитектуры и ссылки на модульные docs
- `src/lib/**/CLAUDE.md` - локальные инструкции по отдельным подсистемам

## Замечание по структуре

Сейчас это один SvelteKit-пакет, а не полноценное монорепо. При этом внутренняя архитектура уже достаточно модульная, чтобы использовать репозиторий как базу для EMIS и позже, при необходимости, разнести код на `apps/*` и `packages/*` без полного переписывания.

## Локальные git-checkpoints

Для EMIS принят рабочий ритм: после каждого завершенного этапа сохранять локальный git commit, даже если задача еще не дошла до финального релиза. Это помогает не терять устойчивые промежуточные состояния.
