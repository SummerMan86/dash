# Architecture

Canonical repo-wide architecture contract.
Дата baseline: 4 апреля 2026.

## 1. Короткое имя

**Модульный монолит с адаптированной слоистой организацией.**

Полнее: single-deployable modular monolith with layered app structure and package boundaries.

Это **не** Feature-Sliced Design (FSD). Из FSD заимствованы именование слоёв (`shared`, `entities`, `features`, `widgets`) и принцип однонаправленных зависимостей. Всё остальное — собственная организация под SvelteKit, PostgreSQL/PostGIS и монорепо с workspace-пакетами.

FSD-inspired у нас только client/app-local layering внутри `apps/web`. Server-side architecture и repo-wide boundaries FSD не являются; там действуют SvelteKit server conventions, package ownership и execution paths.

### Что взято из FSD

- Именование четырёх app-local слоёв
- Правило: нижний слой не знает о верхнем (shared → entities → features → widgets → routes)
- Идея слайсов внутри слоя (например, `entities/dataset/`, `entities/filter/`)

### Что НЕ от FSD

- `server/` как отдельный BFF-слой — SvelteKit-специфика
- `packages/*` — монорепо-пакеты; FSD про это не говорит
- `routes/` вместо `pages/` — SvelteKit convention
- Нет слоёв `app/` и `processes/` из канонического FSD
- Доменное разделение на контуры (platform / BI / EMIS) ортогонально FSD
- Два execution path (operational и BI) — доменная архитектура, не FSD-концепт

## 2. Четыре оси архитектуры

### 2.1. Topology

Single-deployable SvelteKit-приложение (`apps/web`). Один runtime, один deploy, один build.

Код организован как pnpm workspace monorepo: `apps/web/` + 8 пакетов в `packages/`. Физический split на несколько deployables не планируется, пока не появится давление (разный release cadence, отдельная команда, отдельный deployment lifecycle).

### 2.2. Ownership: packages vs app

Reusable код живёт в `packages/*`. App-specific composition живёт в `apps/web/`.

**Platform packages** (foundation и cross-domain runtime):

| Package | Что содержит |
|---|---|
| `platform-core` | Утилиты, форматирование, хелперы. Leaf foundation |
| `platform-ui` | UI-примитивы, chart presets, design tokens, стили |
| `platform-datasets` | DatasetQuery/Response/Ir, compileDataset, postgresProvider, BI dataset definitions |
| `platform-filters` | Filter store, planner, filter widgets |
| `db` | PG pool, connection helpers. Leaf foundation |

`platform-core`, `platform-ui`, `platform-filters` и `db` не знают о доменных пакетах.
`platform-datasets` остаётся platform runtime для BI/read-side, но может содержать domain dataset definitions, которые компилируются в общий dataset contract.

**Domain packages** (EMIS):

| Package | Что содержит |
|---|---|
| `emis-contracts` | Entity types, DTO, Zod schemas |
| `emis-server` | Server infra + семантические backend-модули |
| `emis-ui` | Reusable map/status UI (EmisMap, EmisStatusBar) |

**App leaf** (`apps/web`):

Всё, что привязано к конкретному приложению: routes, app-local features, fixtures, glue-код, lifecycle (hooks.server.ts).

Правило: **никто не импортирует из `apps/web`**. App — конечный потребитель, не библиотека.

### 2.3. Execution paths

Два канонических пути прохождения данных:

**Operational path** — для CRUD, search, map, dictionaries, audit:

```
routes/api/emis/* → packages/emis-server/src/modules/* → queries/service/repository → PostgreSQL/PostGIS
```

- Простая Postgres-first реализация
- SQL живёт в `packages/emis-server/*`, не в route files
- Route handlers — тонкий HTTP transport

**BI / read-side path** — для dashboards, KPI, charts, tables:

```
fetchDataset(...) → /api/datasets/:id → compileDataset(...) → DatasetIr → Provider → DatasetResponse
```

- UI не знает о SQL и источнике данных
- Подключение EMIS-данных к BI — только через published views/read-models в БД
- `/dashboard/emis/*` не становится backdoor в operational SQL

Alerts, proxy endpoints и другие operational transport-ы не входят ни в один из этих двух path.

### 2.4. App-local organization (FSD-inspired layers)

Внутри `apps/web/src/lib/` код организован в слои с однонаправленными зависимостями:

```
client/UI rail:
shared → entities → features → widgets → routes

server rail:
routes/api/*, +page.server.ts, +layout.server.ts
        ↓
src/lib/server/*  (BFF, datasets, providers, alerts, app server glue)
```

| Слой | Путь | Alias | Что содержит |
|---|---|---|---|
| `shared` | `src/lib/shared/` | `$shared` | API facade, UI kit re-exports, утилиты, fixtures |
| `entities` | `src/lib/entities/` | `$entities` | Контракты, типы, re-exports из packages |
| `features` | `src/lib/features/` | `$features` | Крупные user-facing функции (dashboard-edit, emis-manual-entry) |
| `widgets` | `src/lib/widgets/` | `$widgets` | Композитные UI-блоки (filters, emis-drawer, stock-alerts) |
| `routes` | `src/routes/` | — | Страницы, API endpoints, layout. SvelteKit convention |
| `server` | `src/lib/server/` | — | BFF: datasets, providers, alerts, strategy. **Server-only**, не импортируется из client-кода |

**Однонаправленные зависимости между слоями:**

- `shared` НЕ импортирует из `entities`, `features`, `widgets`, `routes`
- `entities` НЕ импортируют из `features`, `widgets`, `routes`
- `features` НЕ импортируют из `widgets`, `routes`
- `server/*` НЕ импортируется из client-side кода

Эти правила — app-local дисциплина. Repo-wide import rules определяются package boundaries (секция 3).

**Текущее состояние слоёв:**

Большинство файлов в `entities/`, `shared/`, `widgets/` — MIGRATION re-exports из `packages/*`. Canonical код уже в пакетах. Compatibility shims будут удалены после завершения миграции всех потребителей.

## 3. Import rules (package boundaries)

### Граф зависимостей

```
                       ┌──────────────┐
                       │  apps/web    │  (leaf — никто не импортирует из app)
                       └──────┬───────┘
                              │ imports from
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
      ┌──────────┐      ┌──────────┐      ┌──────────────┐
      │ emis-ui  │      │emis-     │      │ platform-*   │
      │          │      │server    │      │ db           │
      └────┬─────┘      └────┬─────┘      └──────────────┘
           │                 │                    ▲
           │         ╳ no edge                    │
           ▼                 ▼                    │
      ┌──────────────┐      └─────────────────────┘
      │emis-contracts│
      └──────┬───────┘
             │
             ▼
      ┌──────────────────────┐
      │ platform-core, db    │  ← leaf foundation
      ├──────────────────────┤
      │ platform-ui          │  ← depends on platform-core
      │ platform-datasets    │  ← depends on platform-core, db
      │ platform-filters     │  ← depends on platform-core, platform-ui, platform-datasets
      └──────────────────────┘
```

### Explicit rules

| Package | Can import from | Cannot import from |
|---|---|---|
| `platform-core` | — (leaf foundation) | everything else |
| `platform-ui` | `platform-core` | emis-*, bi-*, apps/*, datasets, filters, db |
| `platform-datasets` | `platform-core`, `db` | emis-*, bi-*, apps/*, platform-ui |
| `platform-filters` | `platform-core`, `platform-ui`, `platform-datasets` | emis-*, apps/* |
| `db` | — (leaf foundation) | everything else |
| `emis-contracts` | `platform-core` (types only) | emis-server, emis-ui, apps/* |
| `emis-server` | `emis-contracts`, `platform-core`, `platform-datasets`, `db` | emis-ui, apps/* |
| `emis-ui` | `emis-contracts`, `platform-core`, `platform-ui`, `platform-filters` | emis-server, apps/* |
| `apps/web` | всё (leaf consumer) | — |

### Non-negotiable boundaries

1. **platform-\* не импортирует из emis-\*.** Platform-пакеты не зависят от доменных пакетов.
2. **BI routes и app-level analytics code не импортируют EMIS operational modules из `packages/emis-server/modules/*`.** BI потребляет EMIS данные только через published views/read-models в БД. Documented server-side infra carve-outs, such as `@dashboard-builder/emis-server/infra/mapConfig`, допускаются только как narrow helpers and must not become a backdoor for operational queries/services.
3. **EMIS operational code не использует BI route/modules как reusable source.** Operational path не зависит от app-level analytics abstractions.
4. **emis-server не импортирует из emis-ui.** Server не знает о UI.
5. **Никто не импортирует из apps/web.** App — конечный consumer.
6. **emis-contracts — shared foundation для EMIS domain.** И server, и UI зависят от него, не друг от друга.

### Verification

```bash
pnpm lint:boundaries    # boundary-only: только no-restricted-imports violations
pnpm check              # type/parse verification (svelte-check)
```

Если baseline ещё не полностью green, live exceptions и waivers фиксируются в `emis_known_exceptions.md`.

## 4. Domain contours

Три доменных контура внутри одного приложения:

### Platform / shared

Переиспользуемая основа: UI kit, design tokens, dataset/IR абстракция, filter runtime, DB helpers.

Не содержит бизнес-логики ни одного домена.

### BI / analytics

Аналитические страницы и дашборды: Wildberries, strategy/BSC, EMIS BI slices.

Работает через BI path (`fetchDataset → compileDataset → Provider`). Данные получает из PostgreSQL views/read-models.

### EMIS operational

Оперативный контур: реестр объектов, карта, справочники, новости, связи, маршруты судов.

Работает через operational path (packages/emis-server → PostgreSQL/PostGIS). Собственные entity contracts, серверные модули и UI-пакет.

### Граница между контурами

- BI routes не импортируют EMIS operational packages
- EMIS operational не тащит dataset/IR абстракцию
- Оба домена используют platform-* пакеты, но не cross-импортируют друг друга
- EMIS-данные попадают в BI только через published DB views (`mart.emis_*`, `mart_emis.*`)

### Current EMIS package/app placement

Текущий EMIS placement baseline живёт в этом документе.

**Reusable EMIS ownership**:

- `packages/emis-contracts/` — entity contracts, DTO, Zod schemas
- `packages/emis-server/src/infra/*` — server-only infra
- `packages/emis-server/src/modules/*` — domain backend modules
- `packages/emis-ui/` — reusable map/status UI

**App-owned EMIS composition**:

- `apps/web/src/routes/api/emis/*` — thin HTTP transport
- `apps/web/src/routes/emis/*` — workspace/orchestration UI
- `apps/web/src/routes/dashboard/emis/*` — BI route layer
- `apps/web/src/lib/server/emis/infra/http.ts` — app-owned HTTP glue
- `apps/web/src/lib/features/emis-manual-entry/` — app-local forms with `$app/forms` coupling
- `apps/web/src/lib/widgets/emis-drawer/` — app-local widget with `$widgets/filters` coupling

Compatibility shims at old app paths re-export from packages and are not ownership truth:

- `apps/web/src/lib/entities/emis-*`
- `apps/web/src/lib/server/emis/*`
- `apps/web/src/lib/widgets/emis-map/*`
- `apps/web/src/lib/widgets/emis-status-bar/*`

## 5. Alias policy

| Alias | Resolves to | Статус |
|---|---|---|
| `$lib` | `apps/web/src/lib` | Активен |
| `$shared` | `apps/web/src/lib/shared` | Активен, будет удалён после extraction |
| `$entities` | `apps/web/src/lib/entities` | Активен, будет удалён после extraction |
| `$features` | `apps/web/src/lib/features` | Активен |
| `$widgets` | `apps/web/src/lib/widgets` | Активен, будет удалён после extraction |

Код в `packages/*` использует package name (`@dashboard-builder/platform-ui`), не aliases.
Код в `apps/web/`, который ещё не перемещён, продолжает использовать aliases.

## 6. Relationship to other docs

### Current state

| Документ | Что описывает |
|---|---|
| **этот документ** | Repo-wide architecture contract: topology, ownership, paths, layers, import rules и current EMIS package/app placement |
| `emis_session_bootstrap.md` | Start-here summary, current focus и task-driven reading order |
| `emis_working_contract.md` | Короткие рабочие правила для EMIS development |
| `emis_known_exceptions.md` | Live architecture exceptions / waivers, если baseline ещё не закрыт |

### Target state

| Документ | Что описывает |
|---|---|
| `emis_monorepo_target_layout.md` | Future migration policy, remaining structural moves, alias removal timeline |

### Historical / analysis

| Документ | Что описывает |
|---|---|
| `current-project-analysis.md` | Анализ проекта (март 2026, до package-era). Полезен как historical context, но не source of truth по текущей архитектуре |

## 7. Reading order

1. **Этот документ** — общая картина и current EMIS placement
2. `emis_session_bootstrap.md` — start-here summary и routing по active docs
3. `emis_working_contract.md` — если начинаешь EMIS development
4. `emis_known_exceptions.md` — если нужен truthful baseline verdict
5. `emis_monorepo_target_layout.md` — если задача про structural migration
6. `current-project-analysis.md` — если нужен исторический контекст
