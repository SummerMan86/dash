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
