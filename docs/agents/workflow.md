# Agent Workflow

Единый документ по процессу работы агентной команды.

## 1. Модель работы

```
Пользователь
    │
    ├─ ставит задачу
    ▼
GPT-5.4 (lead-strategic)
    │
    ├─ уточняет требования
    ├─ декомпозирует задачу
    ├─ пишет план в docs/agents/lead-strategic/current_plan.md
    ├─ если change cross-layer / waiver-sensitive, сверяется с architecture-steward
    ├─ при stabilization wave сверяется с baseline-governor
    │
    ▼
Пользователь: "выполняй план" (одна команда)
    │
    ▼
Claude Opus (lead-tactical, tmux #0)
    │
    ├─ читает current_plan.md
    ├─ раздаёт задачи workers
    ├──▶ Claude Worker (tmux #1) — задача A
    ├──▶ Claude Worker (tmux #2) — задача B (если нужно)
    │
    ├─ принимает результаты workers
    ├─ запускает Review Gate (субагенты-ревьюеры)
    ├─ пишет report в docs/agents/lead-tactical/last_report.md
    │
    ▼
Пользователь: передаёт report → GPT-5.4
    │
    ▼
GPT-5.4: ревью, принимает/отклоняет, ставит следующую задачу
```

### Ключевые принципы

- **GPT-5.4 — стратег.** Планирует, декомпозирует, принимает результаты. Не пишет код.
- **Strategic-reviewer — не второй lead.** Это optional sidecar для bounded second opinion; final verdict всё равно остаётся за `lead-strategic`.
- **Architecture-steward — не второй strategic lead.** Это governance/design role для canonical architecture docs, placement decisions и architecture waivers/exceptions. Чаще всего его исполняет тот же GPT-5.4 оператор, что и `lead-strategic`, но в узком bounded pass.
- **Baseline-governor — не ещё один lead.** Это governance-role для stabilization waves: держит `baseline closed | not closed`, known exceptions и merge/block policy.
- **Claude Opus — тактик.** Управляет исполнением по плану. Не принимает архитектурных решений самостоятельно — эскалирует к GPT-5.4 / `architecture-steward` через пользователя.
- **Claude Workers — исполнители.** Одна задача = один worker. Фокус на качество, не на скорость.
- **Качество > параллелизм.** На первом этапе один worker за раз. Параллелизм — позже.
- **Пользователь — relay.** Передаёт plan и report между GPT-5.4 и Claude. Минимум два действия на цикл задачи.

### Гибридная модель: teammates + subagents

Проект использует две технологии Claude Code параллельно:

| Роль          | Технология                                     | Почему                                                                           |
| ------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| **Workers**   | **Agent Teams** (teammates в tmux)             | Полный контекст проекта, видят CLAUDE.md/AGENTS.md, персистентны в рамках сессии |
| **Reviewers** | **Subagents** (Agent tool, session-persistent) | Дешёвые (Sonnet), получают только diff, reuse через SendMessage                  |

**Workers как teammates:**

- Каждый worker — полноценный Claude Code инстанс в своём tmux-pane
- Видит весь проект: CLAUDE.md, AGENTS.md, локальные docs модулей
- Общается с lead-tactical через SendMessage
- Пользователь может зайти в pane worker'а напрямую
- Переживает несколько задач в рамках сессии (не надо пересоздавать)

**Reviewers как subagents (session-persistent):**

- Спавнятся lead-tactical через Agent tool при первом review в сессии
- Получают diff + список файлов — больше им не нужно
- **Живут всю сессию** — переиспользуются через SendMessage для последующих задач
- Первый spawn ~30 сек (загрузка контекста), последующие review ~5 сек (только diff)
- Дёшево: Sonnet с минимальным контекстом
- При новой сессии — spawn заново

## 2. Цикл задачи

### 2.1. Планирование (GPT-5.4)

1. Получает задачу от пользователя
2. Читает `docs/agents/lead-strategic/memory.md` для контекста
3. Уточняет требования, если нужно
4. Если change затрагивает package/app ownership, operational vs BI split, новый exception или waiver, сначала получает bounded verdict у `architecture-steward`
5. Создаёт план: `docs/agents/lead-strategic/current_plan.md`
6. План включает: цель, подзадачи, scope, ограничения, ожидаемый результат

### 2.2. Исполнение (Claude Opus + Workers)

1. Lead-tactical читает `current_plan.md`
2. Для каждой подзадачи: либо выполняет сам, либо ставит worker'у
3. Worker выполняет задачу, прогоняет self-checks, сдаёт результат lead-tactical
4. Lead-tactical проверяет результат, запускает Review Gate
5. Исправляет non-critical findings
6. Формирует report: `docs/agents/lead-tactical/last_report.md`

### 2.3. Приёмка (GPT-5.4)

1. Пользователь передаёт report GPT-5.4
2. GPT-5.4 ревьюит: соответствие плану, архитектура, качество
3. При необходимости GPT-5.4 запускает `strategic-reviewer` на узком контексте:
   - `docs/agents/lead-strategic/current_plan.md`
   - `docs/agents/lead-tactical/last_report.md`
   - интегрированный diff
   - 2-4 релевантных canonical docs
4. Результат: принято / замечания / переделка
5. Если slice принят, GPT-5.4 быстро перепроверяет следующий planned slice и при необходимости уточняет `current_plan.md`
6. Если принято — пользователь подтверждает merge

### 2.4. Architecture governance loop (`architecture-steward`)

Используется, когда change затрагивает active architecture contract, placement rules, cross-layer boundaries, exceptions или waivers.

1. Читает:
   - `docs/agents/lead-strategic/current_plan.md`
   - релевантные canonical architecture docs
   - `docs/emis_known_exceptions.md`, если change касается exceptions/waivers
   - diff / touch points / short handoff, если change уже реализован
2. Проверяет:
   - packages ли остаются canonical reusable homes
   - остаётся ли `apps/web` app leaf / transport-orchestration layer
   - не смешиваются ли `EMIS operational` и `EMIS BI/read-side`
   - не расширяется ли существующий exception/waiver молча
3. Выносит bounded decision:
   - `approve placement`
   - `approve with exception`
   - `request reshape`
   - `needs strategic escalation`
4. Если выдан exception/waiver, требует owner + expiry + removal condition и отражение в `docs/emis_known_exceptions.md`
5. Возвращает decision `lead-strategic` / `lead-tactical`; product planning и final slice acceptance остаются не у него.

### 2.5. Stabilization governance loop (`baseline-governor`)

Используется только когда активная wave помечена как stabilization / baseline-control.

1. Читает:
   - `docs/agents/lead-strategic/current_plan.md`
   - `docs/agents/lead-strategic/memory.md`
   - `docs/emis_known_exceptions.md`, если файл уже существует
   - последний tactical report, если есть
2. Фиксирует baseline status:
   - `Red` — baseline not closed, разрешены только stabilization slices
   - `Yellow` — baseline partially controlled, разрешены только bounded low-risk slices
   - `Green` — baseline closed, обычная разработка открыта
3. Проверяет:
   - green ли canonical checks
   - нет ли doc/code contradiction по active boundaries
   - у каждого live exception есть ли owner, expiry и явный governance owner
   - использован ли для EMIS post-freeze wave один и тот же canonical baseline routine
     - `pnpm check`
     - `pnpm build`
     - `pnpm lint:boundaries`
     - `pnpm emis:smoke`
     - `pnpm emis:offline-smoke`
     - `pnpm emis:write-smoke` when write-side relevant
   - если какой-то check в текущем slice не прогоняли, verdict должен сказать `not run`, а не молча наследовать старый green
4. Выносит verdict:
   - `baseline not closed`
   - `baseline conditionally open`
   - `baseline closed`
5. Если verdict не green-level, новые large feature slices не должны стартовать.

Для текущей EMIS post-freeze phase 2 truthful default is now green:

- `EXC-ARCH-002` is closed in `P3.2`; `pnpm lint:boundaries` is no longer red because of `fetchDataset.ts`
- `EXC-ARCH-004` is closed in `P3.4`
- `P3.5` closed the dataset/runtime blocker
- the full canonical routine was rerun on `2026-04-04`:
  - `pnpm check` — green
  - `pnpm build` — green
  - `pnpm lint:boundaries` — green
  - `pnpm emis:offline-smoke` — green
  - `pnpm emis:write-smoke` — green
  - `pnpm emis:smoke` — green
- baseline is therefore green and closed

## 3. Коммуникация между агентами

### Файловый протокол

Агенты общаются через файлы в `docs/agents/`:

| Файл                             | Кто пишет                                                 | Кто читает                      |
| -------------------------------- | --------------------------------------------------------- | ------------------------------- |
| `lead-strategic/current_plan.md` | GPT-5.4                                                   | Claude lead-tactical            |
| `lead-tactical/last_report.md`   | Claude lead-tactical                                      | GPT-5.4 (через пользователя)    |
| `emis_known_exceptions.md`       | architecture-steward / baseline-governor / lead-strategic | все роли по необходимости       |
| `{role}/memory.md`               | Каждый агент — свою                                       | Тот же агент в следующей сессии |

### Tmux-сессии (Agent Teams)

```
┌──────────────────────────────────────────────────┐
│ tmux                                             │
│                                                  │
│ pane #0: Claude Opus (lead-tactical)             │
│   ├─ читает plan, управляет workers              │
│   ├─ spawn subagents для review (дешёво)         │
│   └─ SendMessage к teammates-workers             │
│                                                  │
│ pane #1: Claude Worker A (teammate)              │
│   └─ полный контекст, видит CLAUDE.md, docs/     │
│                                                  │
│ pane #2: Claude Worker B (teammate, если нужен)  │
│   └─ тоже полный контекст                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

Навигация между panes: `Shift+Down` / `Shift+Up`.

Workers-teammates общаются с lead-tactical через `SendMessage` (Claude Code native).
Пользователь может зайти в любой pane и общаться с worker'ом напрямую.

## 4. Review Gate

После завершения реализации lead-tactical запускает ревьюеров:

```
git diff main..feature/branch
    │
    ├─► architecture-reviewer  (Sonnet)  — package/app boundaries, contour split, complexity
    ├─► security-reviewer      (Sonnet)  — SQL injection, XSS, secrets
    ├─► docs-reviewer          (Sonnet)  — docs sync, contracts, schema
    └─► code-reviewer          (Sonnet)    — naming, conventions, quality
    │
    ├─► ui-reviewer (если фронтенд) — smoke test через Chrome
    │
    ▼
Агрегация findings → fix non-critical → report
```

### Severity

- `CRITICAL` — блокирует merge. Исправить обязательно.
- `WARNING` — исправить до merge, если lead не обосновал исключение.
- `INFO` — заметка, не блокер.

### Когда НЕ запускать Review Gate

- Задача была только чтение/анализ
- Пользователь явно попросил пропустить
- Изменения только в markdown (запустить только docs-reviewer)

Если docs-only change меняет active architecture contract, adds/removes exception или оформляет complexity waiver, нужен хотя бы bounded pass от `architecture-steward`, даже если полный Review Gate не запускается.

## 4a. Optional Strategic Sidecar Review

Это не часть обязательного Review Gate.
`strategic-reviewer` используется `lead-strategic`, когда нужен второй проход без раздувания основного контекста.

Когда использовать:

- большой `last_report.md`, который нужно быстро проверить на scope drift
- спорный diff, где нужно отдельно проверить plan-vs-implementation fit
- новая сессия, где нужно быстро восстановить strategic verdict по уже сделанной работе

Чего не делает:

- не пишет код
- не общается с `lead-tactical` напрямую
- не заменяет финальную приёмку `lead-strategic`

Минимальный вход:

- `current_plan.md`
- `last_report.md`
- diff или список changed files
- только релевантные canonical docs

### Reframe policy after acceptance

После каждого принятого slice `lead-strategic` делает короткий reframe следующего slice:

- сверяет plan vs новое состояние репозитория
- правит локальные формулировки/acceptance/tactical assumptions прямо в `current_plan.md`, если этого достаточно
- подключает `strategic-reviewer` только для спорных переходов или тонких architectural dependencies
- не открывает новый чат только ради routine next-slice clarification, пока идёт та же wave

## 4b. Architecture Governance

### Когда подключать `architecture-steward`

- появляется новый package vs `apps/web` placement question
- change пересекает `platform/shared`, `EMIS operational` и `EMIS BI/read-side`
- нужен новый architecture exception или complexity waiver
- docs-only change переписывает active ownership / boundary rules

### Что проверяет `architecture-steward`

- packages как canonical reusable homes
- `apps/web` как app leaf / transport-orchestration layer
- separation `EMIS operational` vs `EMIS BI/read-side`
- owner + expiry + removal condition для новых exceptions/waivers

### Чего он не делает

- не пишет product plan вместо `lead-strategic`
- не заменяет diff-level review `architecture-reviewer`
- не выносит baseline status вместо `baseline-governor`
- не становится вторым `lead-tactical`

### Полномочия в active architecture mode

- может approve/reject placement до реализации или по итогам diff review
- может требовать doc updates и явный exception id перед merge
- может разрешить временный complexity waiver только с owner + expiry
- не должен переоткрывать frozen topology decisions без нового runtime/ops pressure

## 4c. Baseline Governance

### Когда подключать `baseline-governor`

- активная wave называется stabilization / baseline-control
- baseline checks не все green
- есть известные exceptions, которые нужно удерживать под контролем
- команда спорит, можно ли уже пускать large feature work

### Что проверяет `baseline-governor`

- baseline status (`Red | Yellow | Green`)
- набор canonical checks и их truthful status
- consistency между docs, ownership rules и реальным active code
- registry known exceptions
- соблюдение merge policy в stabilization mode

### Чего он не делает

- не декомпозирует product work вместо `lead-strategic`
- не пишет код
- не заменяет Review Gate
- не становится вторым `lead-tactical`

### Полномочия в stabilization mode

- может пометить baseline как `not closed`
- может блокировать запуск новых large feature slices
- может требовать owner + expiry для exception перед продолжением work
- не должен переоткрывать frozen topology decisions без нового runtime/ops pressure

## 5. Эскалация

### Lead-tactical эскалирует к пользователю когда:

- Ревьюер нашёл `CRITICAL`
- Задача требует изменения scope или приоритета
- Новый контракт, схема БД или cross-module изменение
- Нужен новый exception / waiver или спорный package home
- Ревьюеры расходятся во мнениях
- Решение не покрыто документацией
- baseline status спорный, а команда хочет открыть новую feature wave

### Формат эскалации

```
## Эскалация
Причина: <почему нужно решение>
Контекст: <что произошло>
Варианты:
1. <вариант A> — <последствия>
2. <вариант B> — <последствия>
Рекомендация: вариант <N>, потому что <причина>
```

## 6. Инварианты проекта

Эти правила обязательны для всех агентов. Нарушение = CRITICAL.

### Архитектура (layers and boundaries)

- `entities` НЕ импортируют из `features`, `widgets`, `routes`
- `features` НЕ импортируют из `widgets`, `routes`
- `shared` НЕ импортирует из `entities`, `features`, `widgets`, `routes`
- `$lib/server/*` НЕ импортируется из client-side кода
- Используем path aliases: `$lib`, `$shared`, `$entities`, `$features`, `$widgets`

`shared/entities/features/widgets` здесь — app-local layering discipline, а не название repo-wide architecture.

### EMIS boundaries

- packages — canonical reusable homes:
  - `packages/emis-contracts/*` — reusable contracts, DTO, Zod schemas
  - `packages/emis-server/src/*` — reusable server infra, queries, services, repositories
  - `packages/emis-ui/*` — reusable map/status UI
- `apps/web` — app leaf:
  - `apps/web/src/routes/api/emis/*` — thin HTTP transport, без SQL и бизнес-логики
  - `apps/web/src/routes/emis/*` — workspace/UI orchestration
  - `apps/web/src/routes/dashboard/emis/*` — BI/read-side routes
  - `apps/web/src/lib/server/emis/infra/http.ts`, `apps/web/src/lib/features/emis-manual-entry/*`, `apps/web/src/lib/widgets/emis-drawer/*` — app-local composition
- compatibility shims under `apps/web/src/lib/entities/emis-*`, `apps/web/src/lib/server/emis/*`, `apps/web/src/lib/widgets/emis-*` не считаются новым canonical home
- `packages/emis-server/src/modules/*/service.ts` — без HTTP-логики (Request/Response)
- SQL живёт в `packages/emis-server/*`, не в route files
- operational flows не пушим в dataset/IR abstraction
- BI/read-side идёт через published read-model + dataset path; `/dashboard/emis/*` не становится backdoor в operational SQL

### Data invariants

- Identity выражена в DB constraints / partial unique indexes
- Soft delete единообразен: `deleted_at IS NULL` в базовых queries
- Audit trail + actor attribution — обязательны для write-side
- FK behavior и vocabularies — задокументированы явно
- `isSafeIdent()` в postgresProvider — не обходить

### Schema changes

- Обновлять `db/current_schema.sql` + `db/applied_changes.md`
- Runtime changes → обновлять `RUNTIME_CONTRACT.md`
- Новые active slices → добавлять local `AGENTS.md`

### Complexity guardrails

- 500-700 строк: warning, обсудить декомпозицию
- 700-900 строк: обязательная дискуссия в review и явное объяснение, если файл продолжает расти
- 900+ строк: декомпозиция по умолчанию; временный waiver возможен только через `architecture-steward`
- long-lived waiver должен быть отражён в report и в `docs/emis_known_exceptions.md`

### Stabilization state model

- `Red`
  - baseline not closed
  - разрешены только baseline repair, docs sync, guardrails, bounded refactor
- `Yellow`
  - основной baseline уже под контролем, но ещё есть managed exceptions
  - разрешены только low-risk bounded slices без расширения architectural surface
- `Green`
  - baseline closed
  - открыт обычный feature workflow

Для перехода между состояниями нужен явный verdict `baseline-governor` или эквивалентный strategic accept.

### Технологии

- Svelte 5 runes для нового EMIS UI
- TypeScript strict
- PostgreSQL + PostGIS
- SvelteKit 2

## 7. Git-правила

### Ветки

В проекте два типа feature-веток с разным назначением:

- `main` — integration baseline
- `feature/<topic>` — **integration branch** (владелец: lead-tactical). Сюда мержатся результаты workers. Review Gate запускается на `git diff main..feature/<topic>`.
- `agent/worker/<task-slug>` — **worker branch** (владелец: конкретный worker). Worker коммитит сюда, потом lead-tactical мержит в integration branch.

Если worker один и задача простая — можно работать напрямую в integration branch без отдельной worker branch.

### Коммиты

- Checkpoint после каждого законченного этапа
- Осмысленные commit messages на английском
- Не коммитить `.env`, credentials, scratch files

### Worktrees

- Один worktree = один agent
- Не переиспользовать чужой worktree
- Не смешивать две задачи в одной ветке
- Основной checkout — workspace lead-tactical, не worker'а

### Branch integration и Review Gate

Порядок интеграции worker-веток перед review:

```
1. Worker реализует в worker branch: agent/worker/<slug>
2. Worker коммитит, сдаёт handoff lead-tactical
3. Lead-tactical мержит worker branch в integration branch:
   git merge agent/worker/<slug> --no-ff
4. Если несколько workers — мерж каждого в integration branch
5. ТОЛЬКО ПОСЛЕ интеграции: Review Gate на git diff main..feature/<topic>
```

**Правило:** Review Gate всегда запускается на integration branch (`git diff main..feature/<topic>`), не на worker branch. Это гарантирует, что ревьюеры видят полный интегрированный diff.

Если worker один и задача простая — может работать напрямую в integration branch без отдельной worker branch.

### Merge policy during stabilization waves

- не смешивать structural cleanup и product feature в одном slice
- новый exception нельзя вводить без owner и expiry
- новый architecture exception или long-lived complexity waiver требует decision от `architecture-steward` и записи в registry до merge
- рост oversized files требует extraction или явного waiver в report
- baseline-governor может заблокировать merge large feature slice, если baseline status остаётся `Red`

## 8. Memory-протокол

### Когда писать в memory.md

Каждый агент обновляет свой `docs/agents/{role}/memory.md`:

- **После каждого завершённого этапа** (подзадача, review gate, merge)
- **Перед завершением сессии**
- **Превентивно** — если контекст разговора растёт и auto-compact может случиться

Не жди конца сессии — пиши memory инкрементально. Auto-compact может произойти в любой момент.

### Что писать

- Текущий статус: что сделано, что в процессе, что осталось
- Активная ветка и base branch
- Принятые решения (которых нет в git log)
- Проблемы и workarounds
- Что важно для следующего шага

### Формат

Свободный markdown, но кратко и по делу. Не дублировать то, что видно из `git log`.

### Восстановление после auto-compact

После auto-compact Claude теряет детальный контекст, но CLAUDE.md перечитывается автоматически. В нём есть секция "Восстановление после auto-compact", которая направляет агента:

1. Определить свою роль из сжатого контекста
2. Прочитать `memory.md` — персистентная память
3. Прочитать `instructions.md` — вводные роли
4. Прочитать `current_plan.md` — текущий план
5. Продолжить работу

Поэтому **критически важно** держать `memory.md` актуальным — это единственный мост через auto-compact.
