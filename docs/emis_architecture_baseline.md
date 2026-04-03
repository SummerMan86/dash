# EMIS Architecture Baseline

Этот документ фиксирует текущую архитектурную рамку EMIS внутри `dashboard-builder`.
Цель: чтобы новые большие задачи по EMIS шли от одного canonical текста, а не от разрозненных заметок.

## 1. Verdict

На 3 апреля 2026 EMIS **уже отделился архитектурно от "dashboard builder demo"**, но **не отделился физически в отдельное приложение**.

Текущий правильный framing:

- один deployable `SvelteKit` app;
- architectural style: `modular monolith`;
- EMIS = отдельный доменный контур внутри этого приложения;
- BI/platform код остается общим foundation, но не владельцем EMIS operational flows.

Иными словами: **мы не раскалываем repo**, но **перестаем мыслить EMIS как "еще одну страницу dashboard-builder"**.

## 2. Три контура

### Platform / shared

Здесь живут общие технические и UI-контракты:

- `apps/web/src/lib/shared/*`
- `apps/web/src/lib/entities/dataset/*`
- `apps/web/src/lib/entities/filter/*`
- `apps/web/src/lib/server/datasets/*`
- `apps/web/src/lib/server/providers/*`

Этот слой можно использовать из EMIS, но он не должен забирать к себе EMIS-specific business logic.

### EMIS operational

Здесь живут CRUD, search, map, ship-routes, dictionaries, audit и runtime conventions:

- `apps/web/src/lib/entities/emis-*`
- `apps/web/src/lib/features/emis-*`
- `apps/web/src/lib/widgets/emis-*`
- `apps/web/src/lib/server/emis/*`
- `apps/web/src/routes/api/emis/*`
- `apps/web/src/routes/emis/*`

Canonical path:

`routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`

### EMIS BI / read-side

Здесь живут стабильные аналитические read-models поверх published views/datasets:

- `apps/web/src/routes/dashboard/emis/*`
- `apps/web/src/lib/server/datasets/definitions/emisMart.ts`
- `/api/datasets/:id` для `emis.*`
- `mart.emis_*` и `mart_emis.*` contracts в БД

Canonical path:

`fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

## 3. Главная граница

Ключевое архитектурное решение для новых работ:

- operational EMIS не тащим в dataset/IR слой "на вырост";
- dataset layer используем только там, где реально нужен BI/read-model contract;
- `/dashboard/emis/*` не должен становиться backdoor в operational SQL;
- `/emis` не должен становиться местом для server business logic.

Практическое правило:

- нужна карта, поиск, карточка, create/edit, link management, ship-route runtime:
  это `server/emis/*` + `routes/api/emis/*` + `routes/emis/*`
- нужен устойчивый dashboard / KPI / chart / tabular mart slice:
  это `mart*` + dataset definition + `routes/dashboard/emis/*`

## 4. Placement Rules

### Куда класть новый код

- новые DTO, Zod schemas, reusable entity contracts: `apps/web/src/lib/entities/emis-*`
- новые EMIS forms и bounded UI interactions: `apps/web/src/lib/features/emis-*`
- reusable EMIS widgets: `apps/web/src/lib/widgets/emis-*`
- server-only infra/helpers: `apps/web/src/lib/server/emis/infra/*`
- domain backend logic: `apps/web/src/lib/server/emis/modules/*`
- HTTP transport: `apps/web/src/routes/api/emis/*`
- workspace/orchestration UI: `apps/web/src/routes/emis/*`
- BI pages: `apps/web/src/routes/dashboard/emis/*`

### Чего не делать

- не писать SQL в `apps/web/src/routes/api/emis/*`
- не писать HTTP-логику в `apps/web/src/lib/server/emis/modules/*/service.ts`
- не добавлять EMIS CRUD/query logic в dataset compiler без published read-model причины
- не смешивать `/emis` workspace и `/dashboard/emis` BI ownership
- не складывать reusable EMIS contracts в route files

## 5. Что уже подтверждено кодом

Текущая кодовая база уже соответствует этой схеме:

- `apps/web/src/routes/api/emis/*` действительно тонко вызывают `server/emis/modules/*`
- operational SQL сидит в `apps/web/src/lib/server/emis/modules/*`
- `/emis` использует shared filter runtime и EMIS widgets как workspace layer
- `/dashboard/emis/*` использует dataset path для `emis.*`
- DB source of truth для EMIS ведется snapshot-first через `db/current_schema.sql`

Поэтому базовый ответ на вопрос "разошлись ли мы с dashboard-builder?" такой:

- **да, на уровне домена и ownership EMIS уже отдельный контур;**
- **нет, на уровне deploy/runtime это все еще единое приложение.**

## 6. Current Pressure Points

Архитектура в целом согласована, но есть несколько важных operational ограничений:

- `apps/web/src/routes/emis/+page.svelte` уже oversized и должен расти только через extraction;
- map-heavy логика по-прежнему требует строгого контроля границы route vs widget;
- общий repo baseline сейчас не полностью green:
  `pnpm check` и `pnpm emis:smoke` падают из-за parse error в `apps/web/src/lib/shared/ui/select/Select.svelte`, то есть проблема не в EMIS-слоях, а в shared UI baseline;
- значит, перед следующей большой EMIS wave полезно сначала вернуть общий app runtime в green state.

## 7. Working Rule For Next EMIS Tasks

Для следующих больших задач считать canonical следующее:

1. EMIS развивается как отдельный домен внутри одного SvelteKit app.
2. Все новые operational slices идут через `server/emis/*` и `routes/api/emis/*`.
3. Все новые BI slices идут через published views/read-models и dataset layer.
4. Shared abstractions добавляются только при доказанном reuse pressure.
5. DB truth читается по `db/current_schema.sql`, а не по историческим migration chain.

## 8. Target Layout

Canonical target layout для monorepo-style separation зафиксирован в отдельном документе:

→ [`emis_monorepo_target_layout.md`](./emis_monorepo_target_layout.md)

Там описаны:
- target directory structure (`apps/web` + `packages/*`)
- маппинг текущих active zones → target packages
- import direction rules и dependency graph
- alias policy (какие aliases остаются, когда удаляются)
- migration policy (bounded slices, no big-bang, baseline blocker)

Текущий документ описывает *существующую* архитектуру и placement rules.
Target layout описывает *куда* код переедет и *как*.

## 9. Reading Order

1. `emis_session_bootstrap.md`
2. этот документ
3. `emis_monorepo_target_layout.md`
4. `emis_working_contract.md`
5. `emis_implementation_spec_v1.md`
6. `emis_freeze_note.md`
7. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
