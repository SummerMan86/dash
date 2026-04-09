# Agent Workflow

Core process для работы агентной команды.

`workflow.md` теперь держит только lifecycle и ownership процесса.
Поддерживающие протоколы вынесены в отдельные canonical docs:

- `review-gate.md` — review model, strategic acceptance/reframe loop, governance passes
- `recovery.md` — failure-path и recovery protocols
- `invariants.md` — generic repo-wide project invariants (domain overlays: `invariants-emis.md`, etc.)
- `git-protocol.md` — branches, worktrees, integration choreography
- `memory-protocol.md` — ownership и timing для `memory.md`
- `usage-telemetry.md` — append-only usage history и optimization analytics contract

## 1. Модель работы

### 1.1. Интегрированная модель (primary, с codex-plugin-cc)

```text
Пользователь
    │
    ├─ ставит задачу
    ▼
Claude Opus (lead-tactical, tactical-orchestrator)
    │
    ├─ /codex:rescue --write "создай/обнови план"
    ├─ исполняет plan loop: workers, review, report
    ├─ /codex:rescue --resume "strategic review report"
    ├─ post-slice reframe и strategic acceptance loop по выбранному operating mode
    │
    ▼
Пользователь: подтверждает merge / эскалации
```

**Маппинг ролей:**

| Роль workflow | Реализация | Основная ответственность |
| --- | --- | --- |
| `lead-strategic` | Codex / GPT-5.4 | canonical owner `current_plan.md`, strategic acceptance |
| `strategic-reviewer` | bounded pass внутри `lead-strategic` thread | strategic acceptance/reframe safety net по `plan/report/diff` |
| `lead-tactical` | Claude Opus | execution flow, worker dispatch, Review Gate, report |
| `worker` | Claude teammate | реализация одного slice |
| `*-reviewer` | fresh Claude subagent | diff review по своей зоне |

**Правило `--write`:**

- если `lead-strategic` должен записать `current_plan.md`, `memory.md` или governance artifact, нужен `--write`;
- без `--write` Codex читает и анализирует, но не фиксирует canonical state.

**Thread continuity (`--resume` / `--fresh`):**

| Флаг | Поведение |
| --- | --- |
| `--resume` | продолжить последний Codex thread в этом repo |
| `--fresh` | начать новый thread |
| без флага | tooling спрашивает, продолжать thread или открыть новый |

**Когда `resume`, когда `fresh`:**

- `resume` — iterative review/fix/re-review cycle;
- `resume` — follow-up к уже открытому plan/report thread;
- `fresh` — новая задача или новый plan owner context;
- `fresh` — governance-heavy pass, если текущий thread уже загрязнён.

**Ограничения интеграции:**

1. `--resume` экономит токены внутри одного thread, но не заменяет durable `memory.md`.
2. Codex не видит navigation docs автоматически; нужные файлы нужно явно включать в task или prompt.
3. Пользователь остаётся decision owner для merge, scope changes и CRITICAL escalations.
4. Долгие Codex-задачи можно запускать в background, но execution ownership остаётся у `lead-tactical`.

### 1.2. Ручная модель (fallback, deprecated)

> **Deprecated.** Используется только если Codex CLI полностью недоступен. Если Codex временно недоступен — используй `recovery.md`, RP-3.

Пользователь ставит задачу GPT-5.4 в отдельном чате, GPT-5.4 пишет `current_plan.md`, Claude исполняет план, пользователь передаёт `last_report.md` обратно в GPT-5.4 вручную. Все роли и артефакты те же, меняется только transport: вместо Codex plugin — ручной relay через пользователя.

### Ключевые принципы

- `lead-strategic` — canonical owner плана, а не кодовой реализации.
- initial plan — рабочая гипотеза; после каждого принятого slice он уточняется по реальному состоянию repo.
- `lead-tactical` — owner execution flow, но не semantic owner плана.
- `worker` реализует slice в заданном scope и сдаёт truthful handoff с evidence.
- `reviewer` — fresh pass без persistent review memory.
- Качество важнее параллелизма; параллелизм нужен только для независимых bounded slices.
- Пользователь — approver, а не manual relay.

### Протокол оркестрации (`lead-tactical`)

`lead-tactical` совмещает исполнение и orchestration. Отдельной top-level роли `orchestrator` нет.

**Когда делегировать Codex / GPT-5.4:**

- создание или обновление `current_plan.md`;
- strategic acceptance review;
- bounded strategic acceptance/reframe pass;
- semantic reframe через `Plan Change Request`;
- governance decision, если change упирается в placement, waiver или baseline state.

**Когда делать самому:**

- координация execution flow;
- быстрые локальные фиксы;
- self-checks и интеграционные проверки;
- сборка report;
- обновление tactical memory и strategic backfill при необходимости.

**Когда делегировать worker'у:**

- slice нетривиальный, unfamiliar или multi-file;
- plan iterative и требует свежего контекста на каждый slice;
- нужен bounded parallelism по независимым ownership slices.

### Гибридная модель: teammates + subagents

| Роль | Технология | Почему |
| --- | --- | --- |
| `worker` | Agent Teams / teammate | полный проектный контекст и session continuity |
| `reviewer` | fresh subagent | дешёвый и воспроизводимый bounded review по diff |

Workers как teammates (default):

- видят `AGENTS.md`, локальные docs и репозиторий целиком;
- работают в том же checkout и integration branch, что и `lead-tactical`; коммитят только в рамках assigned scope;
- общаются с `lead-tactical` через SendMessage;
- не ведут отдельный durable `memory.md`.

Эскалация worker в subagent:

Если нужна файловая изоляция, worker создаётся как subagent через Agent tool с `isolation: "worktree"`. Получает отдельный worktree и `agent/worker/<slug>` branch. Trigger criteria: `docs/agents/git-protocol.md` §4.

Reviewers как fresh subagents:

- стартуют заново на каждый review pass;
- получают только diff, changed files и review scope;
- не накапливают межзадачный review state.

## 2. Цикл задачи

Два режима: `batch` для простых задач и `iterative` для задач с частым slice-by-slice review.

### 2.1. Выбор режима

| Критерий | Batch | Iterative |
| --- | --- | --- |
| Подзадачи независимы | да | нет |
| Реализация может поменять следующий slice | нет | да |
| Количество slices | 1-3 | 4+ |
| Архитектурный риск | низкий | средний-высокий |
| Новый домен / unfamiliar code | нет | да |

**Default heuristic для `lead-tactical`:**

Выбирай `iterative`, если верно хотя бы одно:

- план уже распался на `4+` slices;
- один slice трогает `6+` файлов;
- change включает schema files или DB contract;
- change пересекает больше одного контура или package/app boundary;
- acceptance следующего slice зависит от результата текущего;
- это unfamiliar code для текущего tactical context.

Выбирай `batch`, если одновременно верно всё ниже:

- `1-3` slices;
- каждый slice остаётся в одной зоне ownership;
- нет schema changes;
- не ожидается новый exception / waiver;
- не ожидается `Plan Change Request` после первого выполненного slice.

Если сигналы смешанные, побеждает `iterative`.

### 2.2. Планирование (`lead-strategic`)

**Интегрированная модель:**

1. `lead-tactical` получает задачу от пользователя.
2. Поднимает strategic loop через `/codex:rescue --fresh --write`.
3. `lead-strategic` создаёт или обновляет `current_plan.md`.
4. Пользователь подтверждает план, если задача нетривиальна или меняет scope.

**Fallback (deprecated):** пользователь передаёт задачу в отдельный GPT-чат, `lead-strategic` пишет `current_plan.md` вручную.

Bootstrap hints (`--low-risk`, legacy `--simple`) не создают sanctioned exception:

- они только подсказывают ожидаемый risk profile для initial triage;
- не убирают `lead-strategic` как canonical owner `current_plan.md`;
- не отменяют final strategic acceptance;
- максимум позволяют батчить cadence до `integration/final stage`, если это допускает выбранный operating mode.

### 2.3. Ownership плана

- `lead-strategic` — canonical owner `docs/agents/lead-strategic/current_plan.md`;
- `lead-tactical` — owner execution flow, но не semantic owner плана;
- если нужен reframe, `lead-tactical` оформляет `Plan Change Request`;
- следующий dependent slice не стартует, пока новый plan state не зафиксирован.

### 2.4. Strategic operating mode

`lead-strategic` выбирает operating mode в начале wave и фиксирует его в canonical plan/report context.
После любого post-slice reframe mode можно оставить без изменений или переключить, но только с коротким rationale.

Три canonical mode:

- `high-risk iterative / unstable wave` — per-slice strategic-reviewer pass по умолчанию;
- `ordinary iterative` — post-slice reframe обязателен всегда, но отдельный strategic-reviewer pass идёт только по risk signals;
- `batch / low-risk` — acceptance и reframe можно батчить до integration/final stage.

`high-risk iterative / unstable wave` используй, если есть хотя бы один сигнал:

- cross-layer work или package/app boundary touch;
- schema/runtime-contract-sensitive change;
- stabilization wave или unfamiliar code;
- частые findings, которые меняют sequencing;
- реальный diff уже хотя бы раз заметно разошёлся с initial plan.

В этом mode bounded `strategic-reviewer` pass по умолчанию запускай на `gpt-5.4-mini` как дешёвый cross-model recheck после Sonnet-based review.

`ordinary iterative` используй, если задача всё ещё slice-dependent, но:

- следующий slice можно reframe'ить локально без полного strategic pass;
- reviewer verdicts в целом стабильны;
- boundaries и core acceptance пока не дрейфуют.

`batch / low-risk` используй, если:

- slices независимы или почти независимы;
- post-slice reframe не меняет plan semantics;
- strategic loop нужен в основном на integration/final acceptance.

Risk signals для slice-level strategic-reviewer pass: canonical list в `review-gate.md` §2.1.

### 2.5. Batch-исполнение

1. `lead-tactical` читает `current_plan.md`.
2. Выполняет подзадачи сам или через worker'ов.
3. Запускает Review Gate, если он нужен по `review-gate.md`.
4. Выбирает формат report и пишет `last_report.md`.
5. Запускает strategic acceptance review.
6. После acceptance пользователь подтверждает merge.

### 2.6. Iterative-исполнение

1. `worker` получает handoff на один slice.
2. Реализует slice, прогоняет self-check и slice review.
3. Фиксит локальные non-critical findings.
4. Возвращает `lead-tactical` summary, checks evidence и review disposition/results.
5. `lead-tactical` передаёт slice result в strategic loop.
6. `lead-strategic` делает post-slice reframe следующего slice и, в зависимости от current operating mode, запускает bounded `strategic-reviewer` pass или ограничивается direct strategic acceptance. По умолчанию bounded pass идёт через `gpt-5.4-mini`; на `gpt-5.4` эскалируй только для design/boundary/contract-sensitive ambiguity.
7. Вердикт:
   - `ACCEPT` — запускается следующий slice;
   - `ACCEPT WITH ADJUSTMENTS` — оформляется `Plan Change Request`, затем обновлённый slice flow;
   - `REJECT` — findings возвращаются в execution loop. При 3+ rejection cycles действует `recovery.md` RP-5.
8. После всех slices `lead-tactical` запускает integration Review Gate, если он нужен, затем final strategic review.

Детали slice review, integration review, governance passes и strategic acceptance/reframe pass лежат в `review-gate.md`.

### 2.7. Формат report

`lead-tactical` выбирает один из canonical report types:

- `full` — multi-slice, cross-layer, risky implementation;
- `lightweight` — trivial local fix, docs-only, one-slice batch;
- `governance-closeout` — verification/docs/baseline closure без нового product implementation.

Правила:

- формат определяется risk profile, а не количеством файлов;
- если review не запускался, report обязан содержать truthful `review disposition + rationale`;
- durable governance decisions живут в отдельном artifact только когда должны пережить текущий `last_report.md`.

Шаблоны report и handoff: `docs/agents/templates.md`.

### 2.8. Cost-aware defaults

Cost-awareness калибрует cadence strategic loop, а не отменяет high-yield review discipline.

Правила по умолчанию:

- не требуй отдельный strategic pass на trivial slice, если slice review green и post-slice reframe не меняет plan semantics;
- если несколько slices подряд не меняют plan, boundaries и acceptance logic, `lead-tactical` может предложить снизить cadence, а `lead-strategic` — переключить operating mode;
- если per-slice strategic pass регулярно находит important issues или меняет next-slice plan, это high-yield cadence, и его не нужно "оптимизировать away";
- если passes становятся low-yield, cadence нужно снижать или явно объяснять, почему выбранный mode остаётся оправданным.
- default cost-saving path для cross-model recheck: сначала `gpt-5.4-mini`, а не full `gpt-5.4`.

Признаки low-yield / cost creep:

- repeated `accept-ready` без новых strategic findings;
- unchanged next-slice plan across several slices;
- stable reviewer verdicts without new risk classes;
- trivial slices consuming the same strategic cadence as risky slices.

### 2.9. Приёмка

**Интегрированная модель:**

1. `lead-tactical` запускает `/codex:rescue --resume`.
2. `lead-strategic` сверяет report, plan fit, scope, architecture и review discipline.
3. Делает post-slice or final reframe и запускает bounded `strategic-reviewer` pass, если этого требует current operating mode или risk signals.
4. Выносит `ACCEPT`, `ACCEPT WITH NOTES` или `REJECT`.
5. Пользователь подтверждает merge.

**Fallback (deprecated):** пользователь передаёт report в GPT-чат, `lead-strategic` делает acceptance review вручную.

### 2.10. Эскалация

`lead-tactical` эскалирует к пользователю, когда:

- найден `CRITICAL`;
- нужен scope или priority change;
- change вводит новый контракт, schema change или cross-module decision;
- нужен новый exception / waiver;
- reviewer'ы расходятся;
- baseline state спорный, а команда хочет открыть следующую large wave;
- решение не покрыто документацией.

Формат эскалации:

```md
## Эскалация
Причина: <почему нужно решение>
Контекст: <что произошло>
Варианты:
1. <вариант A> — <последствия>
2. <вариант B> — <последствия>
Рекомендация: вариант <N>, потому что <причина>
```

Failure-path после эскалации описан в `docs/agents/recovery.md`.

## 3. Коммуникация и артефакты

### Файловый протокол

| Файл | Кто пишет | Кто читает |
| --- | --- | --- |
| `lead-strategic/current_plan.md` | `lead-strategic` | `lead-tactical`, workers по need-to-know |
| `lead-tactical/last_report.md` | `lead-tactical` | `lead-strategic`, пользователь |
| `lead-strategic/memory.md` | `lead-strategic` | следующий strategic thread |
| `lead-tactical/memory.md` | `lead-tactical` | следующий tactical session |
| `runtime/agents/usage-log.ndjson` | `lead-tactical` | локальная optimization analytics / future DB import |
| domain-specific exceptions registry (e.g. `emis_known_exceptions.md` per overlay) | `lead-strategic` governance loop | все роли по необходимости |

Правила хранения:

- `last_report.md` — всегда текущий canonical execution report;
- `runtime/agents/usage-log.ndjson` — append-only local usage history; не заменяет report или memory;
- отдельного worker-memory файла нет;
- durable governance trail оформляется отдельным artifact только при изменении долгоживущего решения.

### Tmux-сессии / Agent Teams

```text
pane #0  lead-tactical
pane #1  worker A
pane #2  worker B (если нужен)
```

- `lead-tactical` держит orchestration context и запускает reviewers как fresh subagents;
- worker-teammates разделяют checkout и integration branch с `lead-tactical`;
- worker-teammates общаются с `lead-tactical` через SendMessage;
- пользователь может зайти в pane worker'а напрямую.

### Canonical supporting docs

- `docs/agents/review-gate.md` — Review Gate, strategic acceptance/reframe loop, governance passes
- `docs/agents/recovery.md` — failure-path и recovery protocols
- `docs/agents/invariants.md` — generic repo-wide invariants (domain overlays: `invariants-emis.md`, etc.)
- `docs/agents/git-protocol.md` — branch/worktree discipline
- `docs/agents/memory-protocol.md` — кто и когда пишет `memory.md`
- `docs/agents/usage-telemetry.md` — durable usage log и usefulness rubric
- `docs/agents/roles.md` — role map и role ownership
- `docs/agents/templates.md` — templates для plan, task, handoff, report, governance verdicts
