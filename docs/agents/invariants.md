# Agent Invariants

Canonical project invariants для всех агентных ролей.

Нарушение инварианта считается `CRITICAL` и блокирует acceptance до исправления или явного governance decision.

## 1. Архитектура (layers and boundaries)

- `entities` не импортируют из `features`, `widgets`, `routes`
- `features` не импортируют из `widgets`, `routes`
- `shared` не импортирует из `entities`, `features`, `widgets`, `routes`
- `$lib/server/*` не импортируется из client-side кода
- path aliases (`$lib`, `$shared`, `$entities`, `$features`, `$widgets`) используются последовательно

`shared/entities/features/widgets` здесь означает app-local layering discipline, а не имя всей repo-wide архитектуры.

## 2. EMIS boundaries

### Canonical reusable homes

- `packages/emis-contracts/*` — reusable contracts, DTO, Zod schemas
- `packages/emis-server/src/*` — reusable server infra, queries, services, repositories
- `packages/emis-ui/*` — reusable map/status UI

### App leaf rules

- `apps/web/src/routes/api/emis/*` — thin HTTP transport, без SQL и бизнес-логики
- `apps/web/src/routes/emis/*` — workspace/UI orchestration
- `apps/web/src/routes/dashboard/emis/*` — BI/read-side routes
- `apps/web/src/lib/server/emis/infra/http.ts`, `features/emis-manual-entry/*`, `widgets/emis-drawer/*` — app-local composition

### Additional rules

- compatibility shims under old app paths не считаются новым canonical home
- `packages/emis-server/src/modules/*/service.ts` не содержит HTTP-логики
- SQL живёт в `packages/emis-server/*`, не в route files
- operational flows не проталкиваются в dataset/IR abstraction без documented read-model
- BI/read-side идёт через published read-model + dataset path, а не через backdoor в operational SQL

## 3. Data invariants

- identity выражена в DB constraints / partial unique indexes
- soft delete единообразен: `deleted_at IS NULL` в базовых queries
- audit trail и actor attribution обязательны для write-side
- FK behavior и vocabulary boundaries зафиксированы явно
- `isSafeIdent()` в postgres provider не обходится

## 4. Schema and contract changes

- structural schema changes отражаются в `db/current_schema.sql` и `db/applied_changes.md`
- runtime/API changes обновляют `RUNTIME_CONTRACT.md`, если это active contract
- новые active slices получают локальный `AGENTS.md`, если без него navigation становится неочевидной

## 5. Complexity guardrails

- `500-700` строк — warning, обсудить декомпозицию
- `700-900` строк — обязательная review-дискуссия и явное объяснение, если файл продолжает расти
- `900+` строк — декомпозиция по умолчанию; временный waiver возможен только через `architecture pass`
- long-lived waiver отражается в report и в `docs/emis_known_exceptions.md`

## 6. Stabilization state model

### `Red`

- baseline not closed
- разрешены только baseline repair, docs sync, guardrails и bounded refactor

### `Yellow`

- baseline под контролем, но есть managed exceptions
- разрешены только low-risk bounded slices без расширения architectural surface

### `Green`

- baseline closed
- открыт обычный feature workflow

Переход между состояниями требует явного `baseline pass` verdict или эквивалентного strategic accept.

## 7. Technologies

- Svelte 5 runes для нового EMIS UI
- TypeScript strict
- PostgreSQL + PostGIS
- SvelteKit 2
