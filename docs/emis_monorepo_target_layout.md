# EMIS Monorepo Target Layout

Canonical reference для target-state структуры репозитория, маппинга текущих зон в target packages, import rules и migration policy.

Topology decision frozen: single-deployable monorepo, no immediate multi-app split.

Этот документ:

- не является current-state ownership map;
- не заменяет `architecture.md` и `emis_working_contract.md`;
- нужен только когда задача реально про structural migration.

## 1. Target Layout

```
dashboard-builder/
├── apps/
│   └── web/                          # Current SvelteKit app (single deployable)
│       ├── src/
│       │   ├── routes/               # All route trees stay here
│       │   ├── lib/                  # App-local code (glue, config, fixtures)
│       │   └── ...
│       ├── static/
│       ├── svelte.config.js
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   ├── platform-core/               # Generic utilities, helpers, shared non-UI code
│   ├── platform-ui/                 # UI primitives, styles, design tokens
│   ├── platform-datasets/           # Dataset contracts, IR, compilation, providers, fetchDataset
│   ├── platform-filters/            # Filter contracts, store, planner, filter widgets
│   ├── db/                          # DB connection pool factory (getPgPool)
│   ├── emis-contracts/              # EMIS entity DTOs, Zod schemas
│   ├── emis-server/                 # EMIS domain backend (infra + semantic modules)
│   ├── emis-ui/                     # Reusable EMIS UI package (map, status bar; app-local drawer/manual-entry stay in apps/web)
│   ├── bi-alerts/                   # Alert scheduler, channels, services (if reuse pressure justifies)
│   └── bi-dashboards/              # Dashboard editor (if reuse pressure justifies)
│
├── db/                              # Root-level DB scripts (schema snapshots, applied_changes, seeds)
├── pnpm-workspace.yaml
└── package.json                     # Workspace root orchestrator
```

Пометка `if reuse pressure justifies` означает: пакет создаётся только если реальный reuse подтверждён. Иначе код остаётся в `apps/web/`.

## 2. Current Zones → Target Home

### Platform packages

| Current path                                  | Target package                | Что содержит                                                                                     |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/web/src/lib/shared/utils/*`             | `packages/platform-core/`     | Generic utilities                                                                                |
| `apps/web/src/lib/shared/lib/*`               | `packages/platform-core/`     | Shared helpers                                                                                   |
| `apps/web/src/lib/shared/ui/*`                | `packages/platform-ui/`       | UI primitives: button, card, badge, input, select, sidebar, skeleton, data-table, chart wrappers |
| `apps/web/src/lib/shared/styles/*`            | `packages/platform-ui/`       | Design tokens, style utils                                                                       |
| `apps/web/src/lib/entities/dataset/*`         | `packages/platform-datasets/` | DatasetQuery, DatasetResponse, DatasetIr, provider contracts                                     |
| `apps/web/src/lib/shared/api/fetchDataset.ts` | `packages/platform-datasets/` | Client-side dataset facade                                                                       |
| `apps/web/src/lib/server/datasets/*`          | `packages/platform-datasets/` | compileDataset, dataset definitions, registry                                                    |
| `apps/web/src/lib/server/providers/*`         | `packages/platform-datasets/` | postgresProvider, mockProvider, provider routing                                                 |
| `apps/web/src/lib/entities/filter/*`          | `packages/platform-filters/`  | Filter contracts, store, createFilterStore, planner                                              |
| `apps/web/src/lib/widgets/filters/*`          | `packages/platform-filters/`  | Filter UI widgets                                                                                |
| `apps/web/src/lib/server/db/*`                | `packages/db/`                | DB connection pool factory (`getPgPool`)                                                         |

### EMIS packages

| Current path                                             | Target package             | Что содержит                                                                                                                                  |
| -------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/entities/emis-*`                       | `packages/emis-contracts/` | emis-object, emis-news, emis-link, emis-dictionary, emis-geo, emis-map, emis-ship-route                                                       |
| `apps/web/src/lib/server/emis/*`                         | `packages/emis-server/`    | `src/infra/*` и `src/modules/*` с module-local `queries.ts` / `repository.ts` / `service.ts`; app-owned `infra/http.ts` остается в `apps/web` |
| `apps/web/src/lib/widgets/emis-map/`, `emis-status-bar/` | `packages/emis-ui/`        | EmisMap, EmisStatusBar (extracted in ST-7)                                                                                                    |
| `apps/web/src/lib/features/emis-manual-entry/`           | stays in `apps/web`        | depends on `$app/forms` (ST-8 verdict)                                                                                                        |
| `apps/web/src/lib/widgets/emis-drawer/`                  | stays in `apps/web`        | depends on `$widgets/filters` (ST-8 verdict)                                                                                                  |

### Stays in apps/web/

| Current path                                 | Почему остаётся в app                                          |
| -------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/routes/*` (все route trees)    | Routes — app-level composition, не package code                |
| ~~`apps/web/src/lib/shared/config/*`~~       | Deleted in ST-8 (was empty)                                    |
| `apps/web/src/lib/shared/fixtures/*`         | Dev/mock data для app runtime                                  |
| `apps/web/src/lib/features/dashboard-edit/*` | BI editor glue; выносить в package только при доказанном reuse |
| `apps/web/src/lib/server/alerts/*`           | Выносить в `packages/bi-alerts/` только при доказанном reuse   |
| `apps/web/src/lib/server/strategy/*`         | Thin strategy helpers, app-specific                            |
| `apps/web/src/lib/entities/charts/*`         | Chart entity, app-level                                        |
| `apps/web/src/lib/widgets/stock-alerts/*`    | Alert UI, stays with alerts                                    |

### Deleted placeholders (ST-8)

The following empty placeholder directories were deleted in ST-8 and no longer exist:

- `entities/dashboard/`, `entities/widget/`
- `features/dashboard-builder/`
- `widgets/chart/`, `widgets/dashboard-container/`, `widgets/kpi/`, `widgets/table/`
- `shared/config/`

## 3. Import Direction Rules

### Dependency graph

```
                       ┌──────────────┐
                       │  apps/web    │  (leaf — никто не импортирует из app)
                       └──────┬───────┘
                              │ imports from
        ┌──────────┬──────────┼──────────┬─────────────┐
        │          │          │          │             │
        ▼          ▼          ▼          ▼             ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │ emis-ui  │ │emis-     │ │bi-alerts │ │bi-       │ │              │
  │          │ │server    │ │          │ │dashboards│ │ platform-*   │
  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │ db           │
       │            │            │            │       └──────────────┘
       │     ╳ no edge          │            │             ▲
       │            │            └────────────┴─────────────┘
       ▼            ▼
  ┌──────────────┐  │
  │emis-contracts│  │
  └──────┬───────┘  │
         │          │
         ▼          ▼
  ┌──────────────────────┐
  │ platform-core, db    │  ← leaf foundation, no domain knowledge
  ├──────────────────────┤
  │ platform-ui          │  ← depends on platform-core
  │ platform-datasets    │  ← depends on platform-core, db
  │ platform-filters     │  ← depends on platform-core, platform-ui, platform-datasets
  └──────────────────────┘
```

Ключевое:

- `emis-ui` и `emis-server` — **peer nodes без edge между ними**. Оба зависят от `emis-contracts` и `platform-*`, но не друг от друга.
- `platform-core` — leaf foundation (utils, helpers); `platform-ui` зависит от `platform-core`, но не наоборот.

### Explicit rules

| Package             | Can import from                                                                              | Cannot import from                              |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `platform-core`     | — (leaf foundation)                                                                          | everything else                                 |
| `platform-ui`       | `platform-core`                                                                              | emis-_, bi-_, apps/\*, datasets, filters, db    |
| `platform-datasets` | `platform-core`, `db`                                                                        | emis-_, bi-_, apps/\*, platform-ui              |
| `platform-filters`  | `platform-core`, `platform-ui`, `platform-datasets`                                          | emis-_, bi-_, apps/\*                           |
| `db`                | — (leaf foundation)                                                                          | everything else                                 |
| `emis-contracts`    | `platform-core` (types only)                                                                 | emis-server, emis-ui, bi-_, apps/_, platform-ui |
| `emis-server`       | `emis-contracts`, `platform-core`, `platform-datasets`, `db`                                 | emis-ui, bi-_, apps/_                           |
| `emis-ui`           | `emis-contracts`, `platform-core`, `platform-ui`, `platform-filters`                         | emis-server, bi-_, apps/_                       |
| `bi-alerts`         | `platform-core`, `platform-datasets`, `db`                                                   | emis-_, apps/_                                  |
| `bi-dashboards`     | `platform-core`, `platform-ui`, `platform-datasets`, `platform-filters`                      | emis-_, apps/_                                  |
| `apps/web`          | всё (leaf consumer)                                                                          | —                                               |

### Non-negotiable boundaries

1. **platform-_ не импортирует из emis-_ или bi-\*.** Platform — фундамент, не знает о доменах.
2. **emis-_ не импортирует из bi-_.** EMIS operational path не зависит от BI abstractions.
3. **bi-_ не импортирует из emis-_.** BI потребляет EMIS данные только через published views/read-models в БД, не через direct code import.
4. **emis-server не импортирует из emis-ui.** Server не знает о UI.
5. **Никто не импортирует из apps/web.** App — конечный consumer, не library.
6. **emis-contracts — shared foundation для EMIS domain.** И server, и UI зависят от него, не друг от друга.

### Temporary compatibility exceptions

Во время migration допускается:

- re-export из старого пути к новому (compatibility shim)
- двойная регистрация dataset definitions (old + new path)

Каждый compatibility shim должен быть:

- помечен `// MIGRATION: remove after <package> extraction`
- удалён в том slice, который завершает extraction целевого package

## 4. Alias Policy

### Current aliases (apps/web/svelte.config.js)

```js
$lib     → apps/web/src/lib       (resolved relative to svelte.config.js)
$shared  → apps/web/src/lib/shared
$entities → apps/web/src/lib/entities
$features → apps/web/src/lib/features
$widgets  → apps/web/src/lib/widgets
```

### Rules during migration

1. **Aliases сохраняются** до завершения extraction целевого package.
2. Код, уже перемещённый в package, **не использует aliases**. Он импортирует через package name (e.g., `@dashboard-builder/platform-ui`).
3. Код в `apps/web/`, который ещё не перемещён, **продолжает использовать aliases**.
4. **Нельзя** создавать новые aliases для промежуточных состояний.
5. После полного extraction зоны соответствующий alias **удаляется** из `svelte.config.js`.

### Removal timeline

| Alias       | Удаляется после extraction                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `$shared`   | `packages/platform-core/` + `packages/platform-ui/` полностью извлечены                             |
| `$entities` | `packages/emis-contracts/` + `packages/platform-datasets/` + `packages/platform-filters/` извлечены |
| `$features` | `packages/emis-ui/` извлечён (или features остались только в app)                                   |
| `$widgets`  | `packages/emis-ui/` + `packages/platform-filters/` извлечены                                        |
| `$lib`      | Последний, удаляется когда `apps/web/src/lib/` содержит только app-local код                        |

## 5. Migration Policy

### Core principles

1. **No big-bang move.** Каждый structural slice — один package extraction за PR.
2. **Preserve runtime behavior.** Smoke checks (`pnpm check`, `pnpm build`) должны проходить до и после каждого slice.
3. **Migrate by bounded slices.** Границы slice совпадают с границами target package.
4. **Docs travel with code.** Если boundary перемещается, docs/runtime contract обновляются в том же slice.
5. **Compatibility re-exports temporary only.** Каждый shim помечен и имеет срок удаления.

### Boundary verification

Canonical commands для structural slices:

```bash
pnpm lint:boundaries    # boundary-only: only no-restricted-imports violations
pnpm check              # type/parse verification (svelte-check)
pnpm build              # run when slice changes package wiring, exports or app/runtime composition
```

`pnpm lint` (full lint) не является boundary verification — содержит legacy formatting drift и не используется как gate.

Historical rollout order и завершённые migration waves вынесены в:

- `archive/emis/emis_implementation_reference_v1.md`

### What NOT to do during migration

- Не рефакторить domain logic под видом structural move
- Не менять API contracts одновременно с перемещением файлов
- Не создавать "god package" (`packages/shared-everything`)
- Не удалять legacy placeholders без отдельного cleanup decision
- Не смешивать structural extraction и backlog hardening в одном PR

## 6. Read This With

1. `emis_session_bootstrap.md` — entry point и текущее состояние
2. `architecture.md` — current ownership, boundaries и placement rules
3. `emis_working_contract.md` — active decision discipline
4. этот документ — target layout и migration rules

## 7. Relationship to Other Docs

- **`architecture.md`** описывает _текущую_ architecture and placement baseline. Этот документ описывает _целевую_.
- **`emis_working_contract.md`** описывает _как работать сейчас_. Migration policy здесь описывает _как переезжать_.
- **`archive/emis/emis_implementation_reference_v1.md`** нужен только как historical rationale, не как target-state contract.
- **`current-project-analysis.md`** описывает _что переиспользуемо_. Zone mapping здесь конкретизирует _куда это едет_.
