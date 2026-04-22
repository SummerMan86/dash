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
2. `docs/architecture.md` (canonical repo-wide foundation doc)
3. `docs/architecture_dashboard_bi.md` (BI vertical: dataset IR, providers, filters, DWH)
4. локальный `AGENTS.md` в нужной папке
5. `docs/archive/platform/current-project-analysis.md`, если нужен historical context до package-era
6. локальный `CLAUDE.md`, если рядом нет `AGENTS.md`

Основные активные зоны:

- `apps/web/src/lib/api/*`
- `apps/web/src/lib/fixtures/*`
- `apps/web/src/lib/styles/*`
- `apps/web/src/lib/server/*`
- `apps/web/src/lib/dashboard-edit/*`
- `packages/platform-filters/*`
- `apps/web/src/routes/dashboard/wildberries/stock-alerts/*`
- `apps/web/src/routes/dashboard/wildberries/*`
- `apps/web/src/routes/api/datasets/[id]/+server.ts`
- `apps/web/src/routes/api/wb/prices/+server.ts`

### EMIS

Стартовая дорожка:

1. `docs/architecture.md` (canonical repo-wide foundation doc)
2. `docs/emis/README.md` (EMIS entry point + doc map)
3. `docs/emis/architecture.md` (operational/BI paths, storage, contracts, fixed defaults)
4. `docs/emis/change_policy.md` (decision path, review triggers, DoD)
5. `docs/AGENTS.md` - полный каталог EMIS docs, ownership и reading order
6. локальный `AGENTS.md` в `apps/web/src/lib/server/emis/`, `apps/web/src/routes/api/emis/`, `apps/web/src/routes/emis/` и соседних active зонах

### Agent workflow (работа в команде агентов)

Если задача выполняется через agent workflow stack:

1. [docs/QUICKSTART.md](./docs/QUICKSTART.md) — **для пользователя: промпты и сценарии**
2. [docs/agents/workflow.md](./docs/agents/workflow.md) — core process, lifecycle, review model, governance, DoD, memory protocol
3. [docs/agents/execution-profiles.md](./docs/agents/execution-profiles.md) — runtime/model binding per profile
4. [docs/codex-integration.md](./docs/codex-integration.md) — Codex CLI integration, plugin commands, proof tuples
5. [docs/agents/autonomous-mode.md](./docs/agents/autonomous-mode.md) — autonomous execution delta
6. [docs/agents/templates.md](./docs/agents/templates.md) — all templates (plan, task, handoff, report, governance)
7. [docs/agents/invariants.md](./docs/agents/invariants.md) — project guardrails
8. [docs/agents/git-protocol.md](./docs/agents/git-protocol.md) — branches, worktrees, checkpoints
9. [docs/agents/recovery.md](./docs/agents/recovery.md) — failure-path protocols
10. `docs/agents/{role}/instructions.md` — role-specific instructions
11. `docs/agents/lead-strategic/memory.md` и `docs/agents/orchestrator/memory.md` — durable memory (see workflow.md §8)

EMIS-активный контур сейчас находится здесь:

- `packages/emis-contracts/` — entity types, Zod schemas (canonical)
- `packages/emis-server/` — server infra + modules (canonical)
- `packages/emis-ui/` — map widgets, status bar (canonical)
- `apps/web/src/lib/server/emis/*` — app-local server layer (infra, modules, queries, repositories)
- `apps/web/src/routes/dashboard/emis/vessel-positions/EmisDrawer.svelte` — route-local detail panel
- `apps/web/src/lib/emis-manual-entry/` — app-local (depends on `$app/forms`)
- `apps/web/src/routes/api/emis/*` — thin HTTP transport (stays in app)
- `apps/web/src/routes/emis/*` — UI/workspace (stays in app)
- `apps/web/src/routes/dashboard/emis*`
- `db/schema_catalog.md`
- `db/current_schema.sql`
- `db/pending_changes.sql`

## 3. Кто за что отвечает в навигации

- `README.md` - что это за приложение, стек, быстрый старт, env и маршруты
- `docs/architecture.md` - canonical repo-wide foundation architecture doc
- `docs/architecture_dashboard_bi.md` - BI vertical architecture (dataset IR, providers, filters, DWH)
- `docs/emis/` - EMIS documentation set (README, architecture, product_scope, access_model, change_policy, operations, structural_migration)
- `AGENTS.md` в корне - выбрать контур, увидеть reading path и конвенцию навигационных файлов
- `docs/AGENTS.md` - единственный полный каталог документации и reading order
- локальные `AGENTS.md` / `CLAUDE.md` - правила и карта конкретной подсистемы

## 4. Конвенция `AGENTS.md` vs `CLAUDE.md`

- Для новых и обновляемых навигационных документов по умолчанию использовать `AGENTS.md`.
- Если в одной папке есть и `AGENTS.md`, и `CLAUDE.md`, canonical считать `AGENTS.md`.
- `CLAUDE.md` в таких местах оставлять как compatibility-layer для Claude-based агентов.
- Если в папке пока есть только `CLAUDE.md`, читать его как legacy-local note до миграции в `AGENTS.md`.

## 5. Deleted placeholders

The following empty directories were deleted:

- `entities/` — полностью; содержимое мигрировало в `packages/*`
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

→ [docs/architecture.md](./docs/architecture.md) (canonical repo-wide foundation)
→ [docs/architecture_dashboard_bi.md](./docs/architecture_dashboard_bi.md) (BI vertical)
→ [docs/emis/architecture.md](./docs/emis/architecture.md) (EMIS vertical)

### Target layout и migration rules

Canonical target layout для monorepo-style separation:

→ [docs/emis/structural_migration.md](./docs/emis/structural_migration.md)

Описывает: target directory structure (`apps/web` + `packages/*`), маппинг текущих зон, import direction rules, alias policy и migration policy.

## 7. Архитектурные правила

Подробный repo-wide contract:

→ [docs/architecture.md](./docs/architecture.md) (canonical repo-wide foundation)
→ [docs/architecture_dashboard_bi.md](./docs/architecture_dashboard_bi.md) (BI vertical)
→ [docs/emis/architecture.md](./docs/emis/architecture.md) (EMIS vertical)

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

Для EMIS действуют repo-wide package/app boundaries (see `docs/architecture.md`), два канонических execution path (`docs/architecture_dashboard_bi.md`, `docs/emis/architecture.md`) и current EMIS package/app placement:

- `packages/emis-contracts/` - контракты, DTO, базовые доменные типы, Zod schemas
- `packages/emis-server/src/infra/*` - server infrastructure
- `packages/emis-server/src/modules/*` - семантические backend-модули
- `packages/emis-ui/` - map widgets, status bar
- `apps/web/src/routes/api/emis/*` - тонкий HTTP transport (stays in app)
- `apps/web/src/routes/emis/*` - UI/workspace слой (stays in app)

Что это означает на практике:

- Reusable бизнес-логика, контракты и server-side код живут в `packages/*`. App-local composition живёт в плоских peer-модулях `src/lib/*` (`api`, `fixtures`, `styles`, `<module>`) и route-local файлах, а не в FSD buckets. `entities/` удалён.
- Server write/query logic не нужно насильно раскладывать по app-local UI peer-модулям.
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

## 8. Agent Docs Map

> This section is orientation-only. Canonical definitions live in `docs/agents/*`.

```
Пользователь
    │
    └─ ставит задачу Claude Opus (orchestrator)
           │
           ├─ поднимает Codex / GPT-5.4 (lead-strategic) для плана, acceptance и governance
           ├─ dispatches isolated workers для code-writing slices
           ├─ запускает review / собирает report
           └─ возвращает пользователю plan approval, product escalations и merge decision
```

Canonical docs:

- [workflow.md](./docs/agents/workflow.md) — lifecycle, review model, governance, DoD, memory protocol
- [execution-profiles.md](./docs/agents/execution-profiles.md) — runtime/model binding per profile
- [codex-integration.md](./docs/codex-integration.md) — Codex CLI integration, plugin commands, proof tuples
- [autonomous-mode.md](./docs/agents/autonomous-mode.md) — autonomous execution delta
- [templates.md](./docs/agents/templates.md) — all templates
- [invariants.md](./docs/agents/invariants.md) — project guardrails
- [git-protocol.md](./docs/agents/git-protocol.md) — branches, worktrees, integration
- [recovery.md](./docs/agents/recovery.md) — failure-path protocols

## 9. Git Checkpoints

Canonical branch/worktree/checkpoint protocol: [docs/agents/git-protocol.md](./docs/agents/git-protocol.md)

Для EMIS сохраняем минимальный ритм checkpoint-коммитов:

- после каждого законченного смыслового этапа делать локальный git commit;
- минимальный ритм checkpoint-коммитов:
  - docs / architecture alignment
  - DB foundation
  - server write/query slice
  - первый рабочий `/emis` workspace
  - интеграция с BI/read-models
