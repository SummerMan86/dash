# Monorepo Target Layout

Canonical reference для целевой структуры репозитория, маппинга текущих зон в target packages, правил зависимостей и миграционной политики.

Topology decision frozen: single-deployable monorepo, no immediate multi-app split.
Этот документ описывает **куда** всё едет и **как** переезжает, но **не начинает** физических перемещений.

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
│   ├── db/                          # DB connection, pooling, schema scripts, seeds
│   ├── emis-contracts/              # EMIS entity DTOs, Zod schemas
│   ├── emis-server/                 # EMIS domain backend (modules, infra, queries, repos)
│   ├── emis-ui/                     # EMIS features + widgets (map, drawer, status-bar, manual-entry)
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

| Current path | Target package | Что содержит |
|---|---|---|
| `src/lib/shared/utils/*` | `packages/platform-core/` | Generic utilities |
| `src/lib/shared/lib/*` | `packages/platform-core/` | Shared helpers |
| `src/lib/shared/ui/*` | `packages/platform-ui/` | UI primitives: button, card, badge, input, select, sidebar, skeleton, data-table, chart wrappers |
| `src/lib/shared/styles/*` | `packages/platform-ui/` | Design tokens, style utils |
| `src/lib/entities/dataset/*` | `packages/platform-datasets/` | DatasetQuery, DatasetResponse, DatasetIr, provider contracts |
| `src/lib/shared/api/fetchDataset.ts` | `packages/platform-datasets/` | Client-side dataset facade |
| `src/lib/server/datasets/*` | `packages/platform-datasets/` | compileDataset, dataset definitions, registry |
| `src/lib/server/providers/*` | `packages/platform-datasets/` | postgresProvider, mockProvider, provider routing |
| `src/lib/entities/filter/*` | `packages/platform-filters/` | Filter contracts, store, createFilterStore, planner |
| `src/lib/widgets/filters/*` | `packages/platform-filters/` | Filter UI widgets |
| `src/lib/server/db/*` | `packages/db/` | DB connection, pooling, helpers |

### EMIS packages

| Current path | Target package | Что содержит |
|---|---|---|
| `src/lib/entities/emis-*` | `packages/emis-contracts/` | emis-object, emis-news, emis-link, emis-dictionary, emis-geo, emis-map, emis-ship-route |
| `src/lib/server/emis/*` | `packages/emis-server/` | modules/*, infra/*, queries/*, repositories/*, services/*, sql/* |
| `src/lib/features/emis-*` | `packages/emis-ui/` | emis-manual-entry и будущие bounded EMIS interactions |
| `src/lib/widgets/emis-*` | `packages/emis-ui/` | emis-map, emis-drawer, emis-status-bar |

### Stays in apps/web/

| Current path | Почему остаётся в app |
|---|---|
| `src/routes/*` (все route trees) | Routes — app-level composition, не package code |
| `src/lib/shared/config/*` | App-specific configuration |
| `src/lib/shared/fixtures/*` | Dev/mock data для app runtime |
| `src/lib/features/dashboard-edit/*` | BI editor glue; выносить в package только при доказанном reuse |
| `src/lib/server/alerts/*` | Выносить в `packages/bi-alerts/` только при доказанном reuse |
| `src/lib/server/strategy/*` | Thin strategy helpers, app-specific |
| `src/lib/entities/charts/*` | Chart entity, app-level |
| `src/lib/widgets/stock-alerts/*` | Alert UI, stays with alerts |

### Legacy / placeholders (не переезжают)

| Current path | Статус |
|---|---|
| `src/lib/entities/dashboard/` | Placeholder, не активный код |
| `src/lib/entities/widget/` | Placeholder, не активный код |
| `src/lib/features/dashboard-builder/` | Legacy placeholder |
| `src/lib/widgets/chart/` | Placeholder |
| `src/lib/widgets/dashboard-container/` | Placeholder |
| `src/lib/widgets/kpi/` | Placeholder |
| `src/lib/widgets/table/` | Placeholder |

Эти зоны не учитываются в migration plan. Если в них появится живой код, placement решается отдельно.

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
  │ platform-filters     │  ← depends on platform-core, platform-ui
  └──────────────────────┘
```

Ключевое:
- `emis-ui` и `emis-server` — **peer nodes без edge между ними**. Оба зависят от `emis-contracts` и `platform-*`, но не друг от друга.
- `platform-core` — leaf foundation (utils, helpers); `platform-ui` зависит от `platform-core`, но не наоборот.

### Explicit rules

| Package | Can import from | Cannot import from |
|---|---|---|
| `platform-core` | — (leaf foundation) | everything else |
| `platform-ui` | `platform-core` | emis-*, bi-*, apps/*, datasets, filters, db |
| `platform-datasets` | `platform-core`, `db` | emis-*, bi-*, apps/*, platform-ui |
| `platform-filters` | `platform-core`, `platform-ui`; `platform-datasets` if `getFilterSnapshot` coupling survives | emis-*, bi-*, apps/* |
| `db` | — (leaf foundation) | everything else |
| `emis-contracts` | `platform-core` (types only) | emis-server, emis-ui, bi-*, apps/*, platform-ui |
| `emis-server` | `emis-contracts`, `platform-core`, `platform-datasets`, `db` | emis-ui, bi-*, apps/* |
| `emis-ui` | `emis-contracts`, `platform-core`, `platform-ui`, `platform-filters` | emis-server, bi-*, apps/* |
| `bi-alerts` | `platform-core`, `platform-datasets`, `db` | emis-*, apps/* |
| `bi-dashboards` | `platform-core`, `platform-ui`, `platform-datasets`, `platform-filters` | emis-*, apps/* |
| `apps/web` | всё (leaf consumer) | — |

### Non-negotiable boundaries

1. **platform-* не импортирует из emis-* или bi-*.** Platform — фундамент, не знает о доменах.
2. **emis-* не импортирует из bi-*.** EMIS operational path не зависит от BI abstractions.
3. **bi-* не импортирует из emis-*.** BI потребляет EMIS данные только через published views/read-models в БД, не через direct code import.
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

### Current aliases (svelte.config.js)

```js
$lib     → src/lib
$shared  → src/lib/shared
$entities → src/lib/entities
$features → src/lib/features
$widgets  → src/lib/widgets
```

### Rules during migration

1. **Aliases сохраняются** до завершения extraction целевого package.
2. Код, уже перемещённый в package, **не использует aliases**. Он импортирует через package name (e.g., `@project/platform-ui`).
3. Код в `apps/web/`, который ещё не перемещён, **продолжает использовать aliases**.
4. **Нельзя** создавать новые aliases для промежуточных состояний.
5. После полного extraction зоны соответствующий alias **удаляется** из `svelte.config.js`.

### Removal timeline

| Alias | Удаляется после extraction |
|---|---|
| `$shared` | `packages/platform-core/` + `packages/platform-ui/` полностью извлечены |
| `$entities` | `packages/emis-contracts/` + `packages/platform-datasets/` + `packages/platform-filters/` извлечены |
| `$features` | `packages/emis-ui/` извлечён (или features остались только в app) |
| `$widgets` | `packages/emis-ui/` + `packages/platform-filters/` извлечены |
| `$lib` | Последний, удаляется когда `apps/web/src/lib/` содержит только app-local код |

## 5. Migration Policy

### Core principles

1. **No big-bang move.** Каждый structural slice — один package extraction за PR.
2. **Preserve runtime behavior.** Smoke checks (`pnpm check`, `pnpm build`) должны проходить до и после каждого slice.
3. **Migrate by bounded slices.** Границы slice совпадают с границами target package.
4. **Docs travel with code.** Если boundary перемещается, docs/runtime contract обновляются в том же slice.
5. **Compatibility re-exports temporary only.** Каждый shim помечен и имеет срок удаления.

### Baseline blocker — resolved

**`src/lib/shared/ui/select/Select.svelte`** — parse error resolved в ST-4.
`pnpm check` проходит: 0 errors, 0 warnings.

### Script locations before and after migration

| Script group | Before ST-5 (current) | After ST-5 | After ST-6 |
|---|---|---|---|
| App scripts (dev, build, check, lint, format) | root `package.json` | `apps/web/package.json` | `apps/web/package.json` |
| EMIS smoke/ops (emis:smoke, map:*) | root `package.json` + `scripts/` | `apps/web/package.json` + `apps/web/scripts/` | `apps/web/` |
| DB scripts (db:up/down/reset/seed/snapshot) | root `package.json` + `scripts/db.mjs` | root (unchanged) | `packages/db/` or root |
| Strategy/intake scripts | root `package.json` + `scripts/` | root (unchanged) | root or archive |
| Boundary lint (`lint:boundaries`) | root `package.json` + `scripts/lint-boundaries.mjs` | root (workspace-level check) | root (workspace-level check) |

`pnpm lint:boundaries` — canonical boundary-only verification command. Запускает ESLint и фильтрует только `no-restricted-imports` violations, без legacy lint noise.

### Boundary verification

Canonical commands для проверки architecture boundaries:

```bash
pnpm lint:boundaries    # boundary-only: only no-restricted-imports violations
pnpm check              # type/parse verification (svelte-check)
```

`pnpm lint` (full lint) не является boundary verification — содержит legacy formatting drift и не используется как gate.

### Slice execution order

```
ST-5: apps/web extraction (current app → apps/web/)
  ↓
ST-6: platform packages (shared, datasets, filters, db)
  ↓
ST-7: EMIS packages (contracts, server, ui)
  ↓
ST-8: BI packages (alerts, dashboards — only if reuse pressure)
```

Каждый slice:
- создаётся в отдельной worker branch
- мержится в integration branch
- проходит Review Gate на интегрированном diff

### What NOT to do during migration

- Не рефакторить domain logic под видом structural move
- Не менять API contracts одновременно с перемещением файлов
- Не создавать "god package" (`packages/shared-everything`)
- Не удалять legacy placeholders как часть migration — это отдельный cleanup slice (ST-10)
- Не начинать зависимый slice до merge предыдущего в integration branch

## 6. Reading Order

1. `emis_session_bootstrap.md` — entry point и текущее состояние
2. `emis_architecture_baseline.md` — текущая архитектура и placement rules
3. этот документ — target layout и migration rules
4. `emis_working_contract.md` — operational working rules

## 7. Relationship to Other Docs

- **`emis_architecture_baseline.md`** описывает *текущую* архитектуру. Этот документ описывает *целевую*.
- **`emis_working_contract.md`** описывает *как работать сейчас*. Migration policy здесь описывает *как переезжать*.
- **`current-project-analysis.md`** описывает *что переиспользуемо*. Zone mapping здесь конкретизирует *куда это едет*.
