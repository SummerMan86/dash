# Project Navigation Guide

Этот `AGENTS.md` - корневая точка входа по репозиторию.
Он отвечает за развилку "какой контур читать дальше", за архитектурные правила и за конвенцию `AGENTS.md` vs `CLAUDE.md`.

## 1. Что это за проект

`dashboard-builder` уже не demo-конструктор в узком смысле, а единое SvelteKit-приложение, в котором живут:

- platform/shared слой с UI, styles, utils и API facade;
- BI/read-side data layer для датасетов;
- filter runtime и reusable filter widgets;
- dashboard editor;
- прикладные аналитические страницы;
- server-side alerts;
- EMIS как отдельный доменный контур внутри того же приложения.

## 2. Сначала выбери контур

### Dashboard-builder / platform / BI

Стартовая дорожка:

1. `README.md`
2. `docs/architecture.md`
3. локальный `AGENTS.md` в нужной папке
4. `docs/current-project-analysis.md`, если нужен historical context до package-era
5. локальный `CLAUDE.md`, если рядом нет `AGENTS.md`

Основные активные зоны:

- `apps/web/src/lib/shared/*`
- `apps/web/src/lib/entities/dataset/*`
- `apps/web/src/lib/entities/filter/*`
- `apps/web/src/lib/server/*`
- `apps/web/src/lib/features/dashboard-edit/*`
- `apps/web/src/lib/widgets/filters/*`
- `apps/web/src/lib/widgets/stock-alerts/*`
- `apps/web/src/routes/dashboard/wildberries/*`
- `apps/web/src/routes/api/datasets/[id]/+server.ts`
- `apps/web/src/routes/api/wb/prices/+server.ts`

### EMIS

Стартовая дорожка:

1. `docs/architecture.md`
2. `docs/emis_session_bootstrap.md`
3. `docs/emis_working_contract.md`
4. `docs/AGENTS.md` - полный каталог EMIS docs, ownership и reading order
5. локальный `AGENTS.md` в `apps/web/src/lib/server/emis/`, `apps/web/src/routes/api/emis/`, `apps/web/src/routes/emis/` и соседних active зонах

### Agent workflow (работа в команде агентов)

Если задача выполняется через GPT-5.4 lead + Claude workers:

1. [docs/agents/user-guide.md](./docs/agents/user-guide.md) — **для пользователя: промпты и сценарии**
2. [docs/agents/workflow.md](./docs/agents/workflow.md) — процесс, инварианты, коммуникация
3. [docs/agents/roles.md](./docs/agents/roles.md) — роли и ответственности
4. [docs/agents/templates.md](./docs/agents/templates.md) — шаблоны
5. `docs/agents/{role}/instructions.md` — вводные для конкретной роли
6. `docs/agents/{role}/memory.md` — память роли между сессиями

EMIS-активный контур сейчас находится здесь:

- `packages/emis-contracts/` — entity types, Zod schemas (canonical)
- `packages/emis-server/` — server infra + modules (canonical)
- `packages/emis-ui/` — map widgets, status bar (canonical)
- `apps/web/src/lib/entities/emis-*` — compatibility shims → `packages/emis-contracts`
- `apps/web/src/lib/server/emis/*` — compatibility shims → `packages/emis-server`
- `apps/web/src/lib/widgets/emis-map/*` — compatibility shim → `packages/emis-ui`
- `apps/web/src/lib/widgets/emis-drawer/` — app-local (depends on `$widgets/filters`)
- `apps/web/src/lib/features/emis-manual-entry/` — app-local (depends on `$app/forms`)
- `apps/web/src/routes/api/emis/*` — thin HTTP transport (stays in app)
- `apps/web/src/routes/emis/*` — UI/workspace (stays in app)
- `apps/web/src/routes/dashboard/emis*`
- `db/schema_catalog.md`
- `db/current_schema.sql`
- `db/pending_changes.sql`

## 3. Кто за что отвечает в навигации

- `README.md` - что это за приложение, стек, быстрый старт, env и маршруты
- `docs/architecture.md` - canonical repo-wide architecture contract
- `AGENTS.md` в корне - выбрать контур, увидеть reading path и конвенцию навигационных файлов
- `docs/AGENTS.md` - единственный полный каталог документации и reading order
- локальные `AGENTS.md` / `CLAUDE.md` - правила и карта конкретной подсистемы

## 4. Конвенция `AGENTS.md` vs `CLAUDE.md`

- Для новых и обновляемых навигационных документов по умолчанию использовать `AGENTS.md`.
- Если в одной папке есть и `AGENTS.md`, и `CLAUDE.md`, canonical считать `AGENTS.md`.
- `CLAUDE.md` в таких местах оставлять как compatibility-layer для Claude-based агентов.
- Если в папке пока есть только `CLAUDE.md`, читать его как legacy-local note до миграции в `AGENTS.md`.

## 5. Deleted placeholders (ST-8)

The following empty placeholder directories were deleted in ST-8:

- `entities/dashboard/`, `entities/widget/`
- `features/dashboard-builder/`
- `widgets/chart/`, `widgets/dashboard-container/`, `widgets/kpi/`, `widgets/table/`
- `shared/config/`

These paths no longer exist. Do not recreate them without explicit architectural decision.

## 6. Важный контекст по развитию

Сейчас проект остается одним SvelteKit-приложением. Для EMIS стратегия такая:

- единое приложение сейчас;
- monorepo-ready границы в коде;
- возможный физический split позже.

Практически это значит, что полезно держать в голове три разных слоя:

- platform/shared слой;
- текущий BI/analytics контур;
- EMIS operational и BI-contour поверх него.

Repo-wide architecture contract для этого состояния зафиксирован в:

→ [docs/architecture.md](./docs/architecture.md)

### Target layout и migration rules

Canonical target layout для monorepo-style separation:

→ [docs/emis_monorepo_target_layout.md](./docs/emis_monorepo_target_layout.md)

Описывает: target directory structure (`apps/web` + `packages/*`), маппинг текущих зон, import direction rules, alias policy и migration policy. Physical moves начинаются только после ST-4.

## 7. Архитектурные правила

Подробный repo-wide contract:

→ [docs/architecture.md](./docs/architecture.md)

### Non-EMIS BI read-side

- canonical path:
  `fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`
- `DatasetQuery`, `DatasetResponse`, `DatasetIr`, `Provider` считаются platform contract для этого слоя
- правило не распространяется на `routes/api/emis/*`, `server/emis/*`, `server/alerts/*`, `/api/wb/*` и другие operational paths

### EMIS operational side

- default path:
  `routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
- simple Postgres-first implementation считается нормой
- если нужен BI/read-model поверх EMIS, сначала публикуем documented views/read models и только потом подключаем dataset layer

### EMIS architecture rules

Для EMIS действуют repo-wide package/app boundaries, два канонических execution path и current EMIS package/app placement из `docs/architecture.md`:

- `packages/emis-contracts/` - контракты, DTO, базовые доменные типы, Zod schemas
- `packages/emis-server/src/infra/*` - server infrastructure
- `packages/emis-server/src/modules/*` - семантические backend-модули
- `packages/emis-ui/` - map widgets, status bar
- `apps/web/src/routes/api/emis/*` - тонкий HTTP transport (stays in app)
- `apps/web/src/routes/emis/*` - UI/workspace слой (stays in app)

Compatibility shims at old app paths (`apps/web/src/lib/entities/emis-*`, `apps/web/src/lib/server/emis/*`, `apps/web/src/lib/widgets/emis-*`) re-export from packages and are marked `// MIGRATION`. New code goes directly into packages.

Что это означает на практике:

- app-local naming `shared/entities/features/widgets` остается как внутренняя организация app-кода, но не как название всей архитектуры.
- Server write/query logic не нужно насильно раскладывать по `features/` и `widgets/`.
- `server/emis` считается нормальным server-only слоем в текущем modular monolith.

Правила разработки:

- не писать SQL в `routes/api/emis/*`
- не писать HTTP-логику в `services/*`
- не класть Zod-схемы EMIS в random route files, если это reusable contract
- не смешивать CRUD и BI/dataset layer без причины
- для аналитических read-models использовать отдельные queries или dataset layer
- текущую структуру EMIS читать по `db/current_schema.sql`, а не по длинной цепочке migrations
- schema change фиксировать обновлением `db/current_schema.sql` и `db/applied_changes.md`
- если живой БД нужен промежуточный delta-патч до следующего snapshot, использовать `db/pending_changes.sql`

Обязательный EMIS contract для следующих реализаций:

- canonical identity rules должны быть продублированы DB constraints / partial unique indexes
- soft delete semantics должны быть едиными для API, views и recreate/restore сценариев
- audit trail, actor attribution и provenance входят в target contract
- FK behavior и vocabulary boundaries должны фиксироваться явно

## 8. Agent Workflow и Review Gate

Полная модель работы агентов: [docs/agents/workflow.md](./docs/agents/workflow.md)

### Модель

```
GPT-5.4 (lead-strategic) → план → Claude Opus (lead-tactical) → workers → review → report → GPT-5.4
```

- GPT-5.4 планирует и принимает результаты
- Claude Opus управляет исполнением
- Claude Workers реализуют подзадачи
- Ревьюеры (субагенты) проверяют diff

### Роли и instructions

- [docs/agents/roles.md](./docs/agents/roles.md) — таблица ролей
- `docs/agents/{role}/instructions.md` — вводные для каждой роли
- `docs/agents/{role}/memory.md` — персистентная память между сессиями
- `strategic-reviewer` — optional GPT sidecar для bounded second opinion по `plan/report/diff`; не заменяет финальную приёмку `lead-strategic`

### Review Gate

После реализации lead-tactical запускает субагентов-ревьюеров параллельно.
Определения субагентов: `.claude/agents/*.md`
Детальные instructions: `docs/agents/{name}/instructions.md`

| Ревьюер                 | Модель | Проверяет                                             |
| ----------------------- | ------ | ----------------------------------------------------- |
| `security-reviewer`     | Sonnet | SQL injection, XSS, secrets, SSRF                     |
| `architecture-reviewer` | Sonnet | layer/import boundaries, server isolation, complexity |
| `docs-reviewer`         | Sonnet | Docs, DB truth, runtime contracts sync                |
| `code-reviewer`         | Sonnet | Naming, conventions, maintainability                  |
| `ui-reviewer`           | Sonnet | Smoke test (только при frontend changes)              |
| `ui-reviewer-deep`      | Opus   | Deep UX/a11y audit (по запросу)                       |

### Когда НЕ запускать Review Gate

- Задача была только чтение/анализ
- Пользователь явно попросил пропустить
- Изменения только в markdown (запустить только docs-reviewer)

### Шаблоны

Все шаблоны коммуникации: [docs/agents/templates.md](./docs/agents/templates.md)

## 9. Git Checkpoints

Для EMIS сохраняем рабочее правило:

- после каждого законченного смыслового этапа делать локальный git commit;
- минимальный ритм checkpoint-коммитов:
  - docs / architecture alignment
  - DB foundation
  - server write/query slice
  - первый рабочий `/emis` workspace
  - интеграция с BI/read-models
