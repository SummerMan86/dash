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
Claude Opus (orchestrator; legacy alias: lead-tactical)
    │
    ├─ /codex:rescue --write "создай/обнови план"
    ├─ ведёт execution loop: workers, review, report
    ├─ /codex:rescue --resume "strategic review report"
    ├─ post-slice reframe и strategic acceptance loop по выбранному operating mode
    │
    ▼
Пользователь: подтверждает merge / эскалации
```

**Маппинг ролей:**

| Роль workflow | Реализация | Основная ответственность |
| --- | --- | --- |
| `lead-strategic` | Codex / GPT-5.4 | canonical owner `current_plan.md`, strategic acceptance, architecture-docs-first при планировании |
| `strategic-reviewer` | bounded pass внутри `lead-strategic` thread | strategic acceptance/reframe safety net по `plan/report/diff` |
| `orchestrator` | Claude Opus | code-blind execution flow, worker dispatch, Review Gate, Architecture Readiness Check, report |
| `worker` | Claude teammate | реализация одного slice |
| `*-reviewer` | fresh Claude subagent | diff review по своей зоне |
| `architecture-reviewer` (audit mode) | fresh Claude subagent | pre-implementation readiness assessment по planned scope |

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
4. Долгие Codex-задачи можно запускать в background, но execution ownership остаётся у `orchestrator`.

### 1.2. Ручная модель (fallback, deprecated)

> **Deprecated.** Используется только если Codex CLI полностью недоступен. Если Codex временно недоступен — используй `recovery.md`, RP-3.

Пользователь ставит задачу GPT-5.4 в отдельном чате, GPT-5.4 пишет `current_plan.md`, Claude исполняет план, пользователь передаёт `last_report.md` обратно в GPT-5.4 вручную. Все роли и артефакты те же, меняется только transport: вместо Codex plugin — ручной relay через пользователя.

### Ключевые принципы

- `lead-strategic` — canonical owner плана, а не кодовой реализации.
- initial plan — рабочая гипотеза; после каждого принятого slice он уточняется по реальному состоянию repo.
- `orchestrator` — owner execution flow, но не semantic owner плана.
- `orchestrator` не реализует product code вне `direct-fix` protocol; остальной implementation идёт через worker.
- `worker` реализует slice в заданном scope и сдаёт truthful handoff с evidence.
- `reviewer` — fresh pass без persistent review memory.
- любой product-code slice должен пройти минимум один independent reviewer pass (`code-reviewer` как минимальный floor; дополнительные reviewer'ы — по поверхности change).
- Качество важнее параллелизма; параллелизм нужен только для независимых bounded slices.
- Пользователь — approver, а не manual relay.

### Протокол оркестрации (`orchestrator`)

`orchestrator` — отдельная top-level execution role.
`lead-tactical` остаётся только compatibility alias в старых prompt/script flows.
Canonical durable artifacts живут в `docs/agents/orchestrator/*`.
Legacy wrappers остаются по путям `docs/agents/lead-tactical/*`.

**Что `orchestrator` читает по умолчанию:**

- `current_plan.md`;
- свою durable memory в `docs/agents/orchestrator/memory.md`;
- worker handoff notes;
- reviewer verdicts;
- checks evidence;
- changed-files inventory;
- branch/checkpoint metadata;
- короткие diff/impact summaries.

**Что `orchestrator` не делает:**

- не пишет product code вне `direct-fix` protocol;
- не открывает source files и raw diff hunks по умолчанию вне `direct-fix` triage;
- не запускает product checks (`check/build/test/lint`) для implementation slices сам вне `direct-fix`;
- не делает `git add/commit` для product changes;
- не исправляет reviewer findings сам;
- не компенсирует плохой handoff тем, что "сам быстро посмотрит код".

**Когда делегировать Codex / GPT-5.4:**

- создание или обновление `current_plan.md`;
- strategic acceptance review;
- bounded strategic acceptance/reframe pass;
- semantic reframe через `Plan Change Request`;
- governance decision, если change упирается в placement, waiver или baseline state.

**Что `orchestrator` делает сам:**

- координация execution flow;
- сборка report;
- обновление memory и usage telemetry;
- strategic backfill при необходимости.
- `direct-fix`, если change подпадает под fast path.

**Когда dispatch worker обязателен:**

- любой implementation slice, который не подпадает под `direct-fix`;
- любые product checks и runtime verification;
- любые code changes по findings;
- любые уточнения, которые требуют открыть код или diff.

**Как `orchestrator` держит контекст чистым:**

- `direct-fix` используй только для `<= 10` строк в одном файле без architectural surface;
- если trivial change не подпадает под `direct-fix`, он идёт через `micro-worker`, а не через self-execution;
- при недостаточном evidence запускается transparency request, re-review или verification/fix-worker;
- при design/boundary ambiguity эскалация идёт в `lead-strategic`, а не в self-implementation loop.

### Гибридная модель: isolated writers + fresh reviewers

| Роль | Технология | Почему |
| --- | --- | --- |
| `worker` | subagent + worktree (default for code-writing); teammate only as shared-checkout exception | diff isolation, scope hygiene, reproducible handoff |
| `reviewer` | fresh subagent | дешёвый и воспроизводимый bounded review по diff |

Workers как isolated subagents (default for code-writing):

- получают отдельный worktree и `agent/worker/<slug>` branch;
- дают diff-isolated handoff и review input без shared-checkout contamination;
- позволяют `orchestrator` проверять scope по branch/diff boundaries, не полагаясь только на manifest;
- не ведут отдельный durable `memory.md`;
- **контекст:** получают только prompt (task packet) + `CLAUDE.md` из worktree; `settings.json` и user profile не наследуются; протокол spawn и prompt composition — в `orchestrator/instructions.md` §Worker Spawn Protocol.

Workers как teammates (shared-checkout exception):

- видят `AGENTS.md`, локальные docs и репозиторий целиком;
- допускаются только для docs-only, read-only investigation или governance-closeout slices без product code;
- работают в том же checkout и integration branch, что и `orchestrator`; коммитят только в рамках assigned scope;
- общаются с `orchestrator` через SendMessage;
- не ведут отдельный durable `memory.md`.

Reviewers как fresh subagents:

- стартуют заново на каждый review pass;
- получают только diff, changed files и review scope;
- не накапливают межзадачный review state.

## 2. Цикл задачи

Три execution path:

- `direct-fix` — inline fast path для микроправки без architectural surface;
- `batch` — для простых задач;
- `iterative` — для задач с частым slice-by-slice review.

### 2.1. Выбор режима

| Критерий | Direct-fix | Batch | Iterative |
| --- | --- | --- | --- |
| Размер change | `<= 10` строк, 1 файл | 1-3 bounded slices | 4+ или slice-dependent |
| Architectural surface | нет | низкий | средний-высокий |
| Schema / contract touch | нет | нет или локальный | возможен |
| Нужен worker handoff | нет | да | да |
| Нужен post-slice reframe | нет | обычно в конце | да |

**Default heuristic для `orchestrator`:**

Выбирай `direct-fix`, если одновременно верно всё ниже:

- change укладывается в `<= 10` изменённых строк;
- затронут ровно один файл;
- нет architectural surface;
- нет schema changes или contract changes;
- не нужен новый exception / waiver / `Plan Change Request`.

Выбирай `iterative`, если верно хотя бы одно:

- план уже распался на `4+` slices;
- один slice трогает `6+` файлов;
- change включает schema files или DB contract;
- change пересекает больше одного контура или package/app boundary;
- acceptance следующего slice зависит от результата текущего;
- это unfamiliar code для текущего orchestration context.

Выбирай `batch`, если одновременно верно всё ниже:

- `1-3` slices;
- каждый slice остаётся в одной зоне ownership;
- нет schema changes;
- не ожидается новый exception / waiver;
- не ожидается `Plan Change Request` после первого выполненного slice.

Если сигналы смешанные, побеждает `iterative`.

Dispatch heuristic:

- если change подпадает под `direct-fix`, выполняй его inline;
- любой другой implementation slice идёт через worker;
- если slice trivial и bounded, но уже не `direct-fix`, выбирай `micro-worker`;
- parallel workers допустимы только для независимых ownership slices;
- если workers идут параллельно, default и required mode = isolated `subagent + worktree`;
- teammate/shared-checkout path не используется для parallel execution, даже если slices маленькие.

`direct-fix` protocol:

- `orchestrator` правит change inline;
- сам прогоняет `pnpm check` и `pnpm build`;
- пишет `lightweight` report с короткой строкой `direct-fix: <file> — <summary>`;
- не использует reviewer skip для более широкого scope, чем разрешает protocol.

### 2.2. Планирование (`lead-strategic`)

**Интегрированная модель:**

1. `orchestrator` получает задачу от пользователя.
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
- `orchestrator` — owner execution flow, но не semantic owner плана;
- если нужен reframe, `orchestrator` оформляет `Plan Change Request`;
- следующий dependent slice не стартует, пока новый plan state не зафиксирован.

### 2.3.1. Architecture Readiness Check (pre-implementation)

Перед началом исполнения фичи или значимого изменения `orchestrator` проводит bounded architecture readiness check.

**Trigger:** хотя бы один из:

- фича затрагивает BI vertical (datasets, providers, filters, BI pages);
- фича вводит новый dataset, provider или BI-страницу;
- фича затрагивает cross-layer boundaries (package ↔ app, server ↔ client);
- фича затрагивает зону с известным migration debt (см. `architecture_dashboard_bi.md` §9);
- unfamiliar code или новый домен (orchestrator оценивает по описанию в `current_plan.md` и собственной `memory.md`, а не по чтению source files).

**Что проверяется:**

1. Соответствие planned change текущим architectural guardrails (`architecture_dashboard_bi.md` §8, `invariants.md` §1-9).
2. Не попадает ли planned scope в зону migration debt (`architecture_dashboard_bi.md` §9) — если да, миграция включается в scope.
3. Нужны ли новые архитектурные решения, которых нет в текущей документации.

**Протокол документирования архитектурных решений:**

Если аудит выявил потребность в новом архитектурном решении (новый паттерн, новый контракт, расширение IR, новый scope фильтров):

1. Решение фиксируется в соответствующем architecture doc **до начала реализации** (не после).
2. Если решение создаёт новый инвариант — он добавляется в `invariants.md`.
3. Если решение меняет migration debt — обновляется §9 `architecture_dashboard_bi.md`.
4. Если решение требует governance — эскалируется через `architecture pass` (§3.1 `review-gate.md`).

**Не обязателен для:**

- docs-only / trivial изменений;
- работы строго в рамках одного уже задокументированного паттерна (e.g. добавление ещё одного declarative dataset по существующему шаблону);
- фиксов, явно привязанных к конкретному багу без architectural surface.

**Кто выполняет:**

- `lead-strategic` выявляет потребность в new architectural decisions **при планировании** (шаг 5 в `lead-strategic/instructions.md`) и фиксирует их в docs как часть плана;
- `orchestrator` проводит bounded readiness check самостоятельно перед началом execution;
- если нужен structured audit, `orchestrator` запускает **`architecture-reviewer` в audit mode** (Mode 2 в `architecture-reviewer/instructions.md`);
- `architecture-reviewer` возвращает readiness verdict: `CLEAR | CLEAR WITH DEBT | DOCS FIRST | ESCALATE`;
- если readiness = `ESCALATE` — `orchestrator` эскалирует к `lead-strategic` для architecture pass (`review-gate.md` §3.1).

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

1. `orchestrator` читает `current_plan.md` и свою durable memory.
2. Dispatches worker'ов на все implementation slices, которые не пошли через `direct-fix`.
3. Принимает handoff packets и добирает недостающий evidence через reviewers / transparency requests / verification-workers.
4. Запускает Review Gate, если он нужен по `review-gate.md`.
5. Выбирает формат report и пишет `last_report.md`.
6. Запускает strategic acceptance review.
7. После acceptance пользователь подтверждает merge.

### 2.6. Iterative-исполнение

1. `worker` получает handoff на один slice.
2. Реализует slice, прогоняет self-check и slice review.
3. Фиксит локальные non-critical findings.
4. Возвращает `orchestrator` summary, change manifest, checks evidence и review disposition/results.
5. `orchestrator` принимает или отклоняет handoff на основе артефактов, затем передаёт slice result в strategic loop.
6. `lead-strategic` делает post-slice reframe следующего slice и, в зависимости от current operating mode, запускает bounded `strategic-reviewer` pass или ограничивается direct strategic acceptance. По умолчанию bounded pass идёт через `gpt-5.4-mini`; на `gpt-5.4` эскалируй только для design/boundary/contract-sensitive ambiguity.
7. Вердикт:
   - `ACCEPT` — запускается следующий slice;
   - `ACCEPT WITH ADJUSTMENTS` — оформляется `Plan Change Request`, затем обновлённый slice flow;
   - `REJECT` — findings возвращаются в execution loop. При 3+ rejection cycles действует `recovery.md` RP-5.
8. После всех slices `orchestrator` запускает integration Review Gate, если он нужен, затем final strategic review.

Детали slice review, integration review, governance passes и strategic acceptance/reframe pass лежат в `review-gate.md`.

### 2.7. Формат report

`orchestrator` выбирает один из canonical report types:

- `full` — multi-slice, cross-layer, risky implementation;
- `lightweight` — docs-only, direct-fix или one-slice low-risk worker-owned change;
- `governance-closeout` — verification/docs/baseline closure без нового product implementation.

Правила:

- формат определяется risk profile, а не количеством файлов;
- если review не запускался, report обязан содержать truthful `review disposition + rationale`;
- durable governance decisions живут в отдельном artifact только когда должны пережить текущий `last_report.md`.

Шаблоны report и handoff: `docs/agents/templates.md`.

### 2.8. Cost-aware defaults

Cost-awareness калибрует cadence strategic loop, а не отменяет high-yield review discipline.

Правила по умолчанию:

- не требуй отдельный strategic pass на `direct-fix` или trivial slice, если review/reframe действительно не дают нового сигнала;
- если несколько slices подряд не меняют plan, boundaries и acceptance logic, `orchestrator` может предложить снизить cadence, а `lead-strategic` — переключить operating mode;
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

1. `orchestrator` запускает `/codex:rescue --resume`.
2. `lead-strategic` сверяет report, plan fit, scope, architecture и review discipline.
3. Делает post-slice or final reframe и запускает bounded `strategic-reviewer` pass, если этого требует current operating mode или risk signals.
4. Выносит `ACCEPT`, `ACCEPT WITH NOTES` или `REJECT`.
5. Пользователь подтверждает merge.

**Fallback (deprecated):** пользователь передаёт report в GPT-чат, `lead-strategic` делает acceptance review вручную.

### 2.10. Эскалация

Default routing:

- technical/governance ambiguity сначала идёт в `lead-strategic`, а не к пользователю;
- пользователь подключается там, где нужен product/scope/business decision или явное принятие риска.

`orchestrator` эскалирует к `lead-strategic`, когда:

- change вводит новый контракт, schema change или cross-module / cross-layer decision;
- нужен новый exception / waiver;
- reviewer'ы расходятся по technical acceptance;
- baseline state или architecture state спорный;
- решение упирается в documented technical governance, а не в product priority.

`orchestrator` эскалирует к пользователю, когда:

- найден `CRITICAL`;
- нужен scope или priority change;
- нужен product/business tradeoff, не покрытый текущим plan state;
- есть shared-environment side effect, destructive recovery или другой decision с внешним blast radius;
- после strategic pass остаются несколько допустимых вариантов, и выбор между ними пользовательский;
- план или merge ждут явного пользовательского approval по standard mode.

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

### 2.11. Wave Closure

После принятия последнего slice волны и прохождения integration review (если нужен) `orchestrator` запускает wave closure.

**Кто:** `orchestrator` выполняет, `lead-strategic` верифицирует.

**Checklist:** `docs/agents/definition-of-done.md` Level 2 (Wave DoD).

**Порядок:**

1. Все slices волны имеют `ACCEPT` verdict.
2. Plan change requests resolved или rejected.
3. Integration review green (если применим).
4. Governance passes выполнены: architecture pass (если placement/boundary decisions), baseline pass (статус зафиксирован).
5. Documentation sync: architecture docs, invariants, current_plan.md отражают итоги волны.
6. State: operating mode валиден, memory.md обновлён, test baseline зафиксирован числом.

**Output:** governance-closeout report или финальная секция в full report с Wave DoD status.

Baseline number из wave closure становится минимальным порогом для следующей волны.

## 3. Коммуникация и артефакты

### Файловый протокол

| Файл | Кто пишет | Кто читает |
| --- | --- | --- |
| `docs/agents/lead-strategic/current_plan.md` | `lead-strategic` | `orchestrator`, workers по need-to-know |
| `docs/agents/orchestrator/last_report.md` | `orchestrator` | `lead-strategic`, пользователь |
| `docs/agents/lead-strategic/memory.md` | `lead-strategic` | следующий strategic thread |
| `docs/agents/orchestrator/memory.md` | `orchestrator` | следующий orchestration session |
| `runtime/agents/usage-log.ndjson` | `orchestrator` | локальная optimization analytics / future DB import |
| domain-specific exceptions registry (e.g. `emis_known_exceptions.md` per overlay) | `lead-strategic` governance loop | все роли по необходимости |

Правила хранения:

- `last_report.md` — всегда текущий canonical execution report;
- `runtime/agents/usage-log.ndjson` — append-only local usage history; не заменяет report или memory;
- отдельного worker-memory файла нет;
- durable governance trail оформляется отдельным artifact только при изменении долгоживущего решения.

### Tmux-сессии / Agent Teams

```text
pane #0  orchestrator
pane #1  worker A
pane #2  worker B (если нужен)
```

- `orchestrator` держит orchestration context и запускает reviewers как fresh subagents;
- isolated code-writing workers по умолчанию живут в своих worktree/branch и не обязаны появляться как shared tmux pane;
- teammate panes — exception path для docs-only / read-only / governance-closeout work;
- пользователь может зайти в pane teammate-worker'а напрямую, если такой mode был выбран.

### Canonical supporting docs

- `docs/agents/definition-of-done.md` — composable DoD checklists (Slice → Wave → Feature)
- `docs/agents/review-gate.md` — Review Gate, strategic acceptance/reframe loop, governance passes
- `docs/agents/recovery.md` — failure-path и recovery protocols
- `docs/agents/invariants.md` — generic repo-wide invariants (domain overlays: `invariants-emis.md`, etc.)
- `docs/agents/git-protocol.md` — branch/worktree discipline
- `docs/agents/memory-protocol.md` — кто и когда пишет `memory.md`
- `docs/agents/usage-telemetry.md` — durable usage log и usefulness rubric
- `docs/agents/roles.md` — role map и role ownership
- `docs/agents/templates.md` — templates для plan, task, handoff, report, governance verdicts
