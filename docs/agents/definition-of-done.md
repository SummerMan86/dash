# Definition of Done

Canonical checklists для определения завершённости работы на трёх уровнях.

Принцип: **composable** — каждый уровень включает предыдущий, но не дублирует его пункты. Wave DoD не повторяет Slice DoD, а проверяет "все slices passed" + inter-slice concerns.

Правило `N/A`: если пункт не применим к конкретному slice/wave/feature, исполнитель отмечает его `N/A` с одной строкой причины. Молчаливый пропуск запрещён.

## 0. Micro-Task Exemption

Применяется, если change одновременно:

- укладывается в `<= 20` изменённых строк;
- затрагивает не более двух файлов;
- не имеет architectural surface;
- не меняет schema или runtime contract.

Порог micro-task exemption шире, чем у `direct-fix` (`<= 10` строк, 1 файл), потому что exemption упрощает только DoD checklist, а independent review остаётся обязательным.

Тогда required only:

- [ ] Acceptance criteria выполнены
- [ ] Scope не нарушен
- [ ] Checks green

Все остальные пункты Slice DoD можно отметить `N/A` по умолчанию.

Важно:

- это упрощает DoD-отчётность, но не разрешает scope drift;
- independent review для worker-owned product-code changes остаётся обязательным;
- skip review допустим только если change пошёл через `direct-fix` protocol из `review-gate.md`.

## 1. Slice DoD (Level 1)

**Владелец:** worker.
**Проверяет:** orchestrator при приёмке handoff.

Если применим §0, он имеет приоритет над полным перечислением Level 1.

### Implementation

- [ ] Acceptance criteria из handoff выполнены
- [ ] Scope не нарушен (только assigned files)
- [ ] Инварианты из `invariants.md` не нарушены
- [ ] Checks green: `pnpm check`, `pnpm build`, `pnpm lint:boundaries`
- [ ] Baseline tests не уменьшились

### Documentation

- [ ] Новые директории → `AGENTS.md` создан
- [ ] Изменённые директории → `AGENTS.md` обновлён (structure/exports/deps/placement)
- [ ] Новый архитектурный паттерн/решение → описан в соответствующем architecture doc
- [ ] Изменение публичного API/контракта → `RUNTIME_CONTRACT.md` обновлён (если active contract)
- [ ] Schema change → `db/current_schema.sql` + `db/applied_changes.md` обновлены
- [ ] Новый feature/capability → user-facing описание добавлено (если указано в handoff)

### Quality

- [ ] Нет hardcoded secrets и очевидных security regressions
- [ ] Нет лишних абстракций "на будущее"
- [ ] Сложность файлов в пределах (< 700 строк, или waiver через `architecture pass`)
- [ ] Для любого code-writing slice соблюдён minimum independent review floor (`code-reviewer` как минимум)
- [ ] Security-relevant changes → `security-reviewer` запущен

### Evidence

- [ ] Каждый check: `fresh` или `not run + reason`
- [ ] Handoff truthful — change manifest точный
- [ ] Review disposition записана
- [ ] Fabricated / contradictory evidence отсутствует

## 2. Wave DoD (Level 2)

**Владелец:** orchestrator.
**Проверяет:** lead-strategic при wave acceptance.

Prerequisite: все slices волны прошли Slice DoD (Level 1).

### Completeness

- [ ] Все slices волны — `ACCEPT` verdict
- [ ] Plan change requests — resolved или rejected
- [ ] Integration review green (если 3+ файлов или cross-module impact)

### Governance

- [ ] Architecture pass выполнен — если были placement/boundary decisions
- [ ] Baseline pass — статус (`Red` / `Yellow` / `Green`) зафиксирован
- [ ] Migration debt register — resolved entries помечены (если применимо)

### Documentation sync

- [ ] Architecture docs отражают все решения волны
- [ ] `invariants.md` обновлён — если появились новые правила
- [ ] `current_plan.md` — slices помечены done, baseline обновлён
- [ ] Exceptions/waivers — зарегистрированы с owner + expiry

### State

- [ ] Operating mode — валиден для следующей волны (или переключён с rationale)
- [ ] `orchestrator/memory.md` — обновлён: decisions, cross-slice patterns, pending items
- [ ] `lead-strategic/memory.md` — обновлён: wave summary, mode changes, reframes
- [ ] Test baseline — новое число зафиксировано для следующей волны

## 3. Feature/Initiative DoD (Level 3)

**Владелец:** lead-strategic.
**Проверяет:** user (standard mode) или decision-log (autonomous mode).

Prerequisite: все волны feature прошли Wave DoD (Level 2).

### Functional

- [ ] Expected Result из плана достигнут (все пункты)
- [ ] Все волны closed (Wave DoD passed)
- [ ] Acceptance criteria последней волны включает end-to-end проверку

### Documentation

- [ ] Architecture docs — target-state обновлён (as-is стал reality)
- [ ] `docs/AGENTS.md` — обновлён, если появились новые canonical docs
- [ ] `AGENTS.md` в затронутых пакетах/модулях — отражают финальную структуру
- [ ] Новый feature → user-facing описание (README / changelog / feature doc по соглашению проекта)

### Quality closure

- [ ] Все CRITICAL findings закрыты
- [ ] Все WARNING findings — justified или закрыты
- [ ] ESLint debt — не ухудшен (или remediation plan обновлён)
- [ ] Tech debt register — новые записи добавлены, если появились

### Operational

- [ ] Migration instructions — если schema changes (SQL, env vars, config)
- [ ] Environment variables — задокументированы, если новые
- [ ] Final test baseline зафиксирован

## 4. Матрица ответственности

| Checklist item | Создаёт | Проверяет | Финально принимает |
|---|---|---|---|
| Code implementation | worker | code-reviewer | orchestrator |
| Security | worker | security-reviewer | orchestrator |
| Architecture boundaries | worker | architecture-reviewer | lead-strategic (arch pass) |
| AGENTS.md created/updated | worker (self-check) | docs-reviewer | orchestrator |
| Architecture docs updated | worker (simple) / orchestrator (cross-slice) | docs-reviewer | lead-strategic |
| Schema docs | worker | docs-reviewer | orchestrator |
| Runtime contract docs | worker | docs-reviewer | orchestrator |
| Wave governance passes | orchestrator (triggers) | governance modes | lead-strategic |
| Memory.md updates | each role for own | — | self |
| Feature-level docs | orchestrator (coordinates) | docs-reviewer | lead-strategic |
| Test baseline tracking | worker (maintains) | orchestrator (aggregates) | lead-strategic (wave close) |
| Feature description | worker (if in handoff) | docs-reviewer | lead-strategic |

## 5. Severity escalation для documentation gaps

Правила escalation и полная таблица severity по уровням: `docs/agents/review-gate.md` §1.7.

Ключевой принцип: неразрешённый docs `WARNING` на slice level автоматически поднимается до `CRITICAL` при wave closure.

## 6. Ссылки

- Worker self-check: `docs/agents/worker/guide.md` → "Slice DoD"
- Orchestrator cycle: `docs/agents/orchestrator/instructions.md`
- Strategic acceptance: `docs/agents/lead-strategic/instructions.md` → "Что проверять при приёмке report"
- Review Gate: `docs/agents/review-gate.md`
- Docs severity escalation: `docs/agents/review-gate.md` §1.7
- Invariants: `docs/agents/invariants.md`
- Templates: `docs/agents/templates.md`
- Memory protocol: `docs/agents/memory-protocol.md`
