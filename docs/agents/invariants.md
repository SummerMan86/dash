# Agent Invariants

Canonical project invariants для всех агентных ролей.

Нарушение инварианта считается `CRITICAL` и блокирует acceptance до исправления или явного governance decision.

For domain-specific invariants, see the relevant overlay: `invariants-emis.md`, etc.

## 1. Архитектура (layers and boundaries)

> `shared/features/widgets` здесь означает app-local layer discipline внутри `apps/web/src/lib/`, а не название всей архитектуры. Reusable бизнес-логика, контракты и server-side код живут в `packages/*`. App layers — это UI composition и app-local orchestration. `entities/` удалён; его содержимое мигрировало в `packages/*`.

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Reusable бизнес-логика, контракты и server-side код живут в `packages/*`; app layers — app-local composition | `review-only` | Расширить path-ownership lint правила по package/app seams |
| `shared` не импортирует из `features`, `widgets` и server-only модулей | `automated` | `eslint.config.js`: `no-restricted-imports` для `apps/web/src/lib/shared/**` |
| `features` не импортируют из `widgets` и server-only модулей | `automated` | `eslint.config.js`: `no-restricted-imports` для `apps/web/src/lib/features/**` |
| client-side код не импортирует `$lib/server/*` и server-only workspace modules | `automated` | `eslint.config.js`: `serverImportPatterns` для client routes/layers |
| `features`, `shared` не импортируют из `routes` | `review-only` | Добавить route-boundary patterns в `no-restricted-imports` для app-local layers |
| path aliases (`$lib`, `$shared`, `$features`, `$widgets`) используются последовательно | `review-only` | Добавить lint rule, которая банит cross-tree relative climbs там, где есть alias |

## 2. Placement (package homes and route discipline)

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| SQL не живёт в route handlers | `review-only` | Добавить AST-based lint для `+server.ts` / `+page.server.ts`, запрещающий raw SQL/query builders в transport-layer |
| Новый reusable код живёт в правильном package home, а page composition остаётся в routes | `review-only` | Расширить path-ownership lint правила по доменам и package/app seams |
| Новые reusable контракты живут в canonical package home домена (e.g. `packages/emis-contracts/*`) | `review-only` | Добавить rule, которая запрещает новые reusable contract definitions в legacy shim paths |
| Route handler остаётся thin transport: parse, validate, derive context, delegate, map errors | `manual` | Добавить route-complexity/import-budget checks и banned-call patterns для business logic в routes |

## 3. Data invariants

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| `isSafeIdent()` в postgres provider не обходится | `review-only` | Добавить targeted lint/contract test, который ловит raw identifier interpolation в postgres provider code |

## 4. Schema, contract and navigation doc changes

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Structural schema changes отражаются в `db/current_schema.sql` и `db/applied_changes.md` | `review-only` | Добавить changed-files CI check, который связывает schema/object edits с обновлением snapshot/log docs |
| Runtime/API changes обновляют `RUNTIME_CONTRACT.md`, если это active contract | `review-only` | Добавить touched-files check для route/contract changes с обязательным contract-doc companion diff |
| Новая meaningful multi-file директория получает локальный `AGENTS.md` | `review-only` | Добавить repo script, который флагует новые qualifying directories без `AGENTS.md` |
| Существующий `AGENTS.md` обновляется при изменении structure, exports, dependencies или placement rules | `review-only` | Добавить changed-dir ownership manifest и checker для directory-shape diffs |
| Локальный `AGENTS.md` следует шаблону: purpose, placement rules, structure, dependencies/boundaries, reading order | `manual` | Добавить lightweight doc validator на обязательные секции |

## 5. Complexity guardrails

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| `500-700` строк — warning band, обсуждается декомпозиция | `review-only` | Добавить touched-files line-count reporter в CI/commentary tooling |
| `700-900` строк — обязательная review-дискуссия и явное объяснение дальнейшего роста | `review-only` | Добавить max-lines policy script с required rationale marker в handoff/report |
| `900+` строк — декомпозиция по умолчанию; waiver только через `architecture pass` | `review-only` | Добавить max-lines gate с waiver registry check |

## 6. Stabilization state model

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| `Red`: baseline not closed; разрешены только baseline repair, docs sync, guardrails и bounded refactor | `review-only` | Добавить plan/report linter, который сверяет тип slice с последним baseline verdict |
| `Yellow`: baseline под контролем, но есть managed exceptions; разрешены только low-risk bounded slices без расширения architectural surface | `review-only` | Добавить wave-policy checker, который требует explicit rationale для slices в `Yellow` |
| `Green`: baseline closed; открыт обычный feature workflow | `review-only` | Добавить merge-time check, который требует актуальный baseline artifact перед `Green` rollout |
| Переход между состояниями требует явного `baseline pass` verdict или эквивалентного strategic accept | `review-only` | Добавить status artifact schema и validation в wave-close tooling |

## 7. Technologies

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| TypeScript strict | `automated` | Проверяется `tsconfig` + `pnpm check` |
| SvelteKit 2 | `manual` | Добавить CI guard на allowed major version в `package.json` / lockfile |

## 8. Architecture-Docs-First

Архитектурные решения согласуются и документируются **до merge**. Ни одно архитектурное решение не мержится "задним числом".

Три точки выявления архитектурных решений:

| Этап | Кто выявляет | Протокол |
| --- | --- | --- |
| Планирование | `lead-strategic` | Фиксирует в architecture doc как часть плана (шаг 5 `lead-strategic/instructions.md`) |
| Перед реализацией | `architecture-reviewer` (audit mode) | Readiness verdict; `DOCS FIRST` → docs update до реализации (`workflow.md` §2.3.1) |
| После реализации (review) | `architecture-reviewer` (diff mode) | `needs design decision` → блокирует merge → согласование → docs update → re-review (`workflow.md` §3.3) |

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Архитектурное решение фиксируется в соответствующем architecture doc (`architecture_dashboard_bi.md`, `architecture_emis.md`, `architecture.md`) | `review-only` | Добавить architecture-pass artifact schema с обязательным target-doc field |
| Решение, создающее enforceable rule, добавляет соответствующий инвариант | `review-only` | Добавить governance checklist linter, который требует invariant follow-up для flagged rules |
| Решение, создающее migration debt, добавляет entry в debt register соответствующего architecture doc | `review-only` | Добавить docs diff check для debt-register update, когда review pass помечает debt impact |
| Architecture Readiness Check обязателен для фичи с architectural surface | `manual` | Добавить pre-execution checklist validator в orchestration artifacts |
| Pre-Implementation Architecture Audit подключается, когда bounded readiness check недостаточен | `review-only` | Добавить explicit readiness status field в plan/report artifacts |
| `needs design decision` блокирует merge до согласования, doc updates и re-review | `review-only` | Добавить merge-readiness validator, который не пропускает open design-decision verdicts |

## 9. BI Vertical Invariants

Canonical reference: `docs/architecture_dashboard_bi.md` §8 (BI Code Quality Guardrails) and §9 (Migration Debt Register).

### Data contract

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Новые datasets не используют `looseParams` (`z.record(z.unknown())`) | `review-only` | Добавить AST lint rule для dataset definitions, которая запрещает `looseParams` |
| Custom compile не обходит `paramsSchema`; валидация параметров выполняется до compile | `review-only` | Добавить contract test/lint на dataset definition pipeline |
| `SelectIr` остаётся read-model only; `groupBy`, `call()`, агрегации запрещены в IR | `review-only` | Зафиксировать API surface тестами и запретить forbidden IR builders в type-level contract tests |

### Page composition

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Новые BI-страницы используют `useFlatParams: true` в `fetchDataset()` | `review-only` | Добавить lint rule для `fetchDataset()` calls внутри BI routes |
| Операционные workflow не смешиваются с аналитическими дашбордами в одном компоненте | `manual` | Добавить route/component ownership conventions и structure check для BI pages |
| Дорогие вычисления внутри `{#each}` пре-вычисляются, а не крутятся per-row на каждый render | `manual` | Добавить Svelte performance lint/heuristics для touched files |
| Агрегация и view-model логика живёт в `.ts`-модулях, не inline в `.svelte` | `review-only` | Добавить Svelte AST rule на heavy inline aggregation/view-model patterns |

### Provider contract

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Server-side caching использует shared `providerCache` helper; provider-local caches запрещены | `review-only` | Добавить lint rule, которая банит provider-local cache maps/helpers |
| `isSafeIdent()` в postgres provider не обходится | `review-only` | Добавить provider-specific safety tests и lint для unsafe identifier interpolation |
| Новые провайдеры реализуют `Provider.execute(ir, entry, ctx)` и уважают `entry.cache` и `entry.execution` | `review-only` | Добавить provider contract tests на required interface behavior |

### Extension discipline

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Новые датасеты добавляются через `DatasetRegistryEntry`; прямой SQL в route handlers запрещён | `review-only` | Добавить route lint + registry coverage tests для новых dataset ids |
| Расширение идёт через добавление регистраций, не через модификацию центральных роутеров или switch-конструкций | `review-only` | Добавить AST rule, которая флагует router/switch growth в dataset dispatch |
| Статическая регистрация; runtime plugin discovery / dynamic import запрещены | `review-only` | Добавить lint rule, которая запрещает `import()` в dataset registration/runtime loading |

## 10. ESLint Rule-Introduction Policy

Правила для введения новых ESLint rules в `eslint.config.js`:

| Инвариант | Enforcement | Current enforcement / path to automation |
| --- | --- | --- |
| Новое правило должно быть low-noise и не создавать mass false positives | `manual` | Добавить baseline-diff report для новых ESLint rules в CI |
| Repo-wide blocking (`error`) rule не вводится, пока baseline uncontrolled; сначала `warn` или touched-files-only policy | `manual` | Добавить lint-governance script, которая сравнивает violation counts до/после rule change |
| Architectural guardrails приоритетнее stylistic rules | `manual` | Зафиксировать PR template/checklist для `eslint.config.js` changes |
| Новый blocking rule сопровождается remediation plan или bounded scope | `manual` | Добавить CI check на companion docs/plan update при изменении `eslint.config.js` |
| Docs-first decision обязателен до добавления нового правила | `manual` | Добавить required doc reference field в change template для lint-governance edits |
| Если правило создаёт `>20` новых нарушений repo-wide, оно вводится как `warn` с remediation plan, а не как `error` | `manual` | Автоматизировать violation-threshold check в CI |

### Severity assignment

| Condition | Severity |
|---|---|
| Rule protects boundaries, safety, or contracts; baseline controllable | `error` |
| Rule is best practice; baseline too large for immediate fix | `warn` |
| Rule is purely stylistic or cosmetic | Do not add; rely on Prettier or code review |

### Reference

Canonical lint governance policy: `docs/architecture.md` §8.1.
