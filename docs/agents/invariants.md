# Agent Invariants

Canonical project invariants для всех агентных ролей.

Нарушение инварианта считается `CRITICAL` и блокирует acceptance до исправления или явного governance decision.

For domain-specific invariants, see the relevant overlay: `invariants-emis.md`, etc.

## 1. Архитектура (layers and boundaries)

- `entities` не импортируют из `features`, `widgets`, `routes`
- `features` не импортируют из `widgets`, `routes`
- `shared` не импортирует из `entities`, `features`, `widgets`, `routes`
- `$lib/server/*` не импортируется из client-side кода
- path aliases (`$lib`, `$shared`, `$entities`, `$features`, `$widgets`) используются последовательно

`shared/entities/features/widgets` здесь означает app-local layering discipline, а не имя всей repo-wide архитектуры.

## 2. Placement (package homes and route discipline)

- SQL не в route handlers — SQL живёт в packages (`platform-datasets`, `emis-server`) или `src/lib/server/*`
- новый код в правильном package home: reusable contracts/logic в `packages/*`, page composition в routes
- новые reusable контракты в canonical package home per domain overlay (e.g. `packages/emis-contracts/*` для EMIS types)
- route handler — thin transport: parse, validate, derive context, delegate, map errors; бизнес-логика не в route

## 3. Data invariants

- `isSafeIdent()` в postgres provider не обходится

## 4. Schema and contract changes

- structural schema changes отражаются в `db/current_schema.sql` и `db/applied_changes.md`
- runtime/API changes обновляют `RUNTIME_CONTRACT.md`, если это active contract
- новые active slices получают локальный `AGENTS.md`, если без него navigation становится неочевидной

## 5. Complexity guardrails

- `500-700` строк — warning, обсудить декомпозицию
- `700-900` строк — обязательная review-дискуссия и явное объяснение, если файл продолжает расти
- `900+` строк — декомпозиция по умолчанию; временный waiver возможен только через `architecture pass`

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

- TypeScript strict
- SvelteKit 2

## 8. Architecture-Docs-First

Архитектурные решения согласуются и документируются **до merge**. Ни одно архитектурное решение не мержится "задним числом".

Три точки выявления архитектурных решений:

| Этап | Кто выявляет | Протокол |
| --- | --- | --- |
| Планирование | `lead-strategic` | Фиксирует в architecture doc как часть плана (шаг 5 `lead-strategic/instructions.md`) |
| Перед реализацией | `architecture-reviewer` (audit mode) | Readiness verdict; `DOCS FIRST` → docs update до реализации (`review-gate.md` §3.3) |
| После реализации (review) | `architecture-reviewer` (diff mode) | `needs design decision` → блокирует merge → согласование → docs update → re-review (`review-gate.md` §1.2) |

Правила:

- решение фиксируется в соответствующем architecture doc (`architecture_dashboard_bi.md`, `architecture_emis.md`, `architecture.md`)
- если решение создаёт enforceable rule — добавляется инвариант в этот документ
- если решение создаёт migration debt — добавляется entry в debt register соответствующего architecture doc
- Architecture Readiness Check (`workflow.md` §2.3.1) — обязательный шаг перед реализацией фичи с architectural surface
- Pre-Implementation Architecture Audit (`review-gate.md` §3.3) — governance pass для full audit, когда bounded check недостаточен
- `needs design decision` verdict в diff review блокирует merge до согласования и документирования решения

## 9. BI Vertical Invariants

Canonical reference: `docs/architecture_dashboard_bi.md` §8 (BI Code Quality Guardrails) and §9 (Migration Debt Register).

### Data contract

- новые datasets **не используют** `looseParams` (`z.record(z.unknown())`); обязательна явная Zod-схема с конкретными полями
- custom compile получает `DatasetQuery`, но **не обходит** `paramsSchema` — валидация параметров обязана выполняться до compile
- `SelectIr` — read-model only; `groupBy`, `call()`, агрегации **запрещены** в IR; аналитика — в backend views или future `AnalyticalIr`

### Page composition

- новые BI-страницы **используют `useFlatParams: true`** в `fetchDataset()`; legacy filter merge через `getFilterSnapshot()` запрещён для нового кода
- **операционные workflow** (управление ценами, CRUD, внешние API-вызовы) **не смешиваются** с аналитическими дашбордами в одном компоненте
- дорогие вычисления внутри `{#each}` **пре-вычисляются** в `$derived` или `Map`; повторный вызов pure-функций per-row на каждый render — performance bug
- агрегация и view-model логика живёт в `.ts`-модулях (`aggregation.ts`, `view-model.ts`), **не inline** в `<script>` блоке `.svelte`

### Provider contract

- server-side caching использует shared `providerCache` helper; провайдер-специфичные кеш-реализации запрещены
- `isSafeIdent()` в postgres provider **не обходится**
- новые провайдеры реализуют `Provider.execute(ir, entry, ctx)` и уважают `entry.cache` и `entry.execution`

### Extension discipline

- новые датасеты добавляются через `DatasetRegistryEntry` в registry; прямой SQL в route handlers запрещён
- расширение через добавление регистраций, **не через модификацию** центральных роутеров или switch-конструкций
- статическая регистрация; runtime plugin discovery / dynamic import запрещены

## 10. ESLint Rule-Introduction Policy

Правила для введения новых ESLint rules в `eslint.config.js`:

### Prerequisites

- правило должно быть **low-noise**: не создавать mass false positives на существующем коде
- правило **не вводится repo-wide как blocking** (`error`), пока baseline по нему uncontrolled (десятки+ нарушений)
- для red baseline допускается **`touched-files only` enforcement** (rule = `warn` repo-wide; slice policy = "не ухудшать touched files")
- architectural guardrails (boundaries, safety, contracts) **приоритетнее** stylistic rules
- новый blocking rule **сопровождается** remediation plan или bounded scope

### Process

1. **Docs-first decision**: новое правило описывается и обосновывается в PR/plan **до добавления** в config
2. Предпочтение правилам, которые защищают:
   - **boundaries** (import restrictions, layer discipline)
   - **contracts** (type safety, param validation)
   - **unsafe runtime patterns** (SQL injection, unvalidated input)
   - **accidental complexity** (unused code, dead exports)
3. Stylistic checks **не должны маскировать** архитектурные сигналы в lint output
4. Если правило создаёт `>20` новых нарушений repo-wide, оно вводится как `warn` с remediation plan, а не как `error`

### Severity assignment

| Condition | Severity |
|---|---|
| Rule protects boundaries, safety, or contracts; baseline controllable | `error` |
| Rule is best practice; baseline too large for immediate fix | `warn` |
| Rule is purely stylistic or cosmetic | Do not add; rely on Prettier or code review |

### Reference

Canonical lint governance policy: `docs/architecture.md` §8.1.
