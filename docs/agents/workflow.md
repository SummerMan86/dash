# Agent Workflow

Core process для работы агентной команды.

Lifecycle, ownership, review model, governance, and memory protocol.
Supporting docs:

- `execution-profiles.md` — runtime/model binding
- `recovery.md` — failure-path protocols
- `invariants.md` — project invariants (domain overlays: `invariants-emis.md`, etc.)
- `git-protocol.md` — branches, worktrees, integration choreography
- `autonomous-mode.md` — autonomous execution delta
- `templates.md` — all templates (plan, task, handoff, report, governance, transparency)
- `docs/codex-integration.md` — Codex runtime integration, plugin commands, proof tuples

## 1. Модель работы

### 1.1. Интегрированная модель (primary)

```text
Пользователь
    │
    ├─ ставит задачу
    ▼
orchestrator
    │
    ├─ поднимает lead-strategic по runtime/model binding из execution-profiles.md
    ├─ dispatches workers/reviewers по выбранному execution profile
    ├─ ведёт execution loop: workers, review, report
    ├─ возвращает план на approval, эскалации и merge decision
    │
    ▼
Пользователь: подтверждает merge / эскалации
```

Runtime/model binding for supported profiles lives in
`execution-profiles.md`.

Codex plugin integration, thread continuity (`--resume` / `--fresh`), and companion CLI guidance: `docs/codex-integration.md`.

**Role map:**

| Роль workflow | Реализация | Основная ответственность |
|---|---|---|
| `lead-strategic` | profile-selected Codex lane | canonical owner `current_plan.md`, strategic acceptance, architecture-docs-first при планировании |
| `strategic-reviewer` | bounded pass внутри `lead-strategic` context | strategic acceptance/reframe safety net по `plan/report/diff` |
| `orchestrator` | profile-selected orchestration lane | code-blind execution flow, worker dispatch, Review Gate, Architecture Readiness Check, report |
| `worker` | profile-selected implementation lane | реализация одного slice |
| `micro-worker` | profile-selected implementation lane | реализация одного trivial bounded slice под worker contract |
| `*-reviewer` | profile-selected review lane | diff review по своей зоне |
| `architecture-reviewer` (audit mode) | profile-selected reviewer lane | pre-implementation readiness assessment по planned scope |

**Persistence:**

| Role | Durable state |
|---|---|
| `lead-strategic` | `lead-strategic/memory.md` |
| `orchestrator` | `orchestrator/memory.md` + `last_report.md` |
| `worker` | none (session context + handoff) |
| reviewers | none (fresh per pass) |

### 1.2. Ручная модель (fallback, deprecated)

> **Deprecated.** Используется только если Codex CLI полностью недоступен. Если Codex временно недоступен — используй `recovery.md`, RP-3.

Пользователь ставит задачу в отдельном чате, `lead-strategic` пишет `current_plan.md`, orchestrator исполняет план, пользователь передаёт `last_report.md` обратно вручную.

### Ключевые принципы

- `lead-strategic` — canonical owner плана, а не кодовой реализации.
- initial plan — рабочая гипотеза; после каждого принятого slice он уточняется по реальному состоянию repo.
- `orchestrator` — owner execution flow, но не semantic owner плана.
- `orchestrator` не реализует product code вне `direct-fix` protocol; остальной implementation идёт через worker.
- `worker` реализует slice в заданном scope и сдаёт truthful handoff с evidence.
- `reviewer` — fresh pass без persistent review memory.
- любой product-code slice должен пройти минимум один independent reviewer pass (`code-reviewer` как минимальный floor; дополнительные reviewer'ы — по поверхности change). `direct-fix` — единственный waiver. `micro-task` size не waiv'ит это требование.
- Качество важнее параллелизма; параллелизм нужен только для независимых bounded slices.
- Пользователь — approver, а не manual relay.

### Протокол оркестрации (`orchestrator`)

`orchestrator` — отдельная top-level execution role.

**Что `orchestrator` читает по умолчанию:**

- `current_plan.md`;
- свою durable memory в `orchestrator/memory.md`;
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

**Когда делегировать Codex:**

- создание или обновление `current_plan.md`;
- strategic acceptance review;
- bounded strategic acceptance/reframe pass;
- semantic reframe через `Plan Change Request`;
- governance decision, если change упирается в placement, waiver или baseline state.

**Что `orchestrator` делает сам:**

- координация execution flow;
- сборка report;
- обновление memory и usage telemetry;
- strategic backfill при необходимости;
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

### Worker и reviewer execution shape

| Роль | Технология | Почему |
|---|---|---|
| `worker` | in-place (default) или isolated `subagent + worktree` (opt-in) | sequential sharing для простоты; isolation по trigger'у |
| `reviewer` | fresh subagent | дешёвый и воспроизводимый bounded review по diff |

Workers:

- по умолчанию работают sequentially в общем checkout (`feature/<topic>`);
- профиль `opus-orchestrated-codex-workers` не меняет этот default: Codex worker по умолчанию идёт `in-place`, без отдельного worktree и без automatic parallel fan-out;
- isolated mode (отдельный worktree + `agent/worker/<slug>` branch) подключается только по trigger'у из `git-protocol.md` §4 (parallel execution, schema/cross-layer touch, explicit isolation rationale);
- не ведут отдельный durable `memory.md`;
- **контекст:** получают только prompt (task packet); для isolated дополнительно видят `CLAUDE.md` из worktree (redirect-only); протокол spawn и prompt composition — `orchestrator/instructions.md` §Worker Spawn Protocol.

Reviewers как fresh subagents:

- стартуют заново на каждый review pass;
- получают только diff, changed files и review scope;
- не накапливают межзадачный review state.

Полные правила mode selection, bootstrap и integration choreography — `git-protocol.md` §3-6.

## 2. Цикл задачи

Три execution path:

- `direct-fix` — inline fast path для локальной механической микроправки без architectural surface;
- `batch` — для простых задач;
- `iterative` — для задач с частым slice-by-slice review.

### 2.1. Выбор режима

| Критерий | Direct-fix | Batch | Iterative |
|---|---|---|---|
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
- change purely local/mechanical; нет import-home, branching, data-flow, auth/query/persistence или business-rule changes;
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
- workers по умолчанию идут sequentially в in-place mode;
- parallel execution — opt-in; требует явного rationale в task packet и автоматически переводит workers в isolated mode (`git-protocol.md` §4).

`direct-fix` protocol:

- `orchestrator` правит change inline;
- сам прогоняет `pnpm check` и `pnpm build`;
- пишет `lightweight` report с короткой строкой `direct-fix: <file> — <summary>`;
- не использует reviewer skip для более широкого scope, чем разрешает protocol.

### 2.2. Планирование (`lead-strategic`)

1. `orchestrator` получает задачу от пользователя.
2. Поднимает strategic loop через selected runtime path per `execution-profiles.md`.
3. `lead-strategic` создаёт или обновляет `current_plan.md`.
4. Пользователь подтверждает план, если задача нетривиальна или меняет scope.

Bootstrap hints (`--low-risk`) не создают sanctioned exception:

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
- unfamiliar code или новый домен.

**Что проверяется:**

1. Соответствие planned change текущим architectural guardrails (`architecture_dashboard_bi.md` §8, `invariants.md` §1-9).
2. Не попадает ли planned scope в зону migration debt — если да, миграция включается в scope.
3. Нужны ли новые архитектурные решения, которых нет в текущей документации.

**Протокол документирования (architecture-docs-first):**

Если аудит выявил потребность в новом архитектурном решении:

1. Решение фиксируется в соответствующем architecture doc **до начала реализации**.
2. Если решение создаёт новый инвариант — он добавляется в `invariants.md`.
3. Если решение меняет migration debt — обновляется §9 `architecture_dashboard_bi.md`.
4. Если решение требует governance — эскалируется через architecture pass (§5.1).

**Output:** `CLEAR | CLEAR WITH DEBT | DOCS FIRST | ESCALATE`.

**Не обязателен для:** docs-only / trivial изменений; работы строго в рамках одного уже задокументированного паттерна; фиксов без architectural surface.

**Кто выполняет:**

- `lead-strategic` выявляет потребность при планировании и фиксирует в docs как часть плана;
- `orchestrator` проводит bounded check перед execution;
- если нужен structured audit, `orchestrator` запускает `architecture-reviewer` в audit mode;
- если readiness = `ESCALATE` — `orchestrator` эскалирует к `lead-strategic` для architecture pass (§5.1).

### 2.4. Strategic operating mode

`lead-strategic` выбирает operating mode в начале wave и фиксирует его в canonical plan/report context. После любого post-slice reframe mode можно переключить с коротким rationale.

Три canonical mode:

- `high-risk iterative / unstable wave` — per-slice strategic-reviewer pass по умолчанию;
- `ordinary iterative` — post-slice reframe обязателен, но отдельный strategic-reviewer pass идёт только по risk signals;
- `batch / low-risk` — acceptance и reframe можно батчить до integration/final stage.

`high-risk iterative / unstable wave` используй, если есть хотя бы один сигнал:

- cross-layer work или package/app boundary touch;
- schema/runtime-contract-sensitive change;
- stabilization wave или unfamiliar code;
- частые findings, которые меняют sequencing;
- реальный diff уже хотя бы раз заметно разошёлся с initial plan.

`ordinary iterative` используй, если задача slice-dependent, но reviewer verdicts стабильны и boundaries не дрейфуют.

`batch / low-risk` используй, если slices независимы, post-slice reframe не меняет plan semantics, и strategic loop нужен в основном на integration/final acceptance.

Transparency request throttle: after 2 transparency requests for the same handoff, `orchestrator` must choose `accept`, `reject`, or `escalate`. A third request is prohibited.

### 2.5. Batch-исполнение

1. `orchestrator` читает `current_plan.md` и свою durable memory.
2. Dispatches worker'ов на все implementation slices, которые не пошли через `direct-fix`.
3. Принимает handoff packets и добирает evidence через reviewers / transparency requests / verification-workers.
4. Запускает Review Gate (§3).
5. Выбирает формат report и пишет `last_report.md`.
6. Запускает strategic acceptance review.
7. После acceptance пользователь подтверждает merge.

### 2.6. Iterative-исполнение

1. `worker` получает handoff на один slice.
2. Реализует slice, прогоняет self-check и slice review.
3. Фиксит локальные non-critical findings.
4. Возвращает `orchestrator` summary, change manifest, checks evidence и review disposition/results.
5. `orchestrator` принимает или отклоняет handoff на основе артефактов, затем передаёт slice result в strategic loop.
6. `lead-strategic` делает post-slice reframe и, в зависимости от operating mode, запускает bounded `strategic-reviewer` pass или ограничивается direct strategic acceptance.
7. Вердикт:
   - `ACCEPT` — запускается следующий slice;
   - `ACCEPT WITH ADJUSTMENTS` — `Plan Change Request`, затем обновлённый slice flow;
   - `REJECT` — findings возвращаются в execution loop. При 3+ rejection cycles: `recovery.md` RP-5.
8. После всех slices `orchestrator` запускает integration review (§3.2), затем final strategic review.

### 2.7. Формат report

`orchestrator` выбирает один из canonical report types:

- `full` — multi-slice, cross-layer, risky implementation;
- `lightweight` — docs-only, direct-fix или one-slice low-risk worker-owned change;
- `governance-closeout` — verification/docs/baseline closure без нового product implementation.

Правила:

- формат определяется risk profile, а не количеством файлов;
- если review не запускался, report обязан содержать truthful `review disposition + rationale`;
- durable governance decisions живут в отдельном artifact только когда должны пережить текущий `last_report.md`.

Шаблоны report и handoff: `templates.md`.

### 2.8. Cost-aware defaults

Cost-awareness калибрует cadence strategic loop, а не отменяет high-yield review discipline.

Правила по умолчанию:

- не требуй отдельный strategic pass на `direct-fix` или trivial slice, если review/reframe действительно не дают нового сигнала;
- если несколько slices подряд не меняют plan, boundaries и acceptance logic, `orchestrator` может предложить снизить cadence, а `lead-strategic` — переключить operating mode;
- если per-slice strategic pass регулярно находит important issues или меняет next-slice plan, это high-yield cadence, и его не нужно "оптимизировать away";
- если passes становятся low-yield, cadence нужно снижать или явно объяснять, почему выбранный mode остаётся оправданным.

Признаки low-yield / cost creep:

- repeated `accept-ready` без новых strategic findings;
- unchanged next-slice plan across several slices;
- stable reviewer verdicts without new risk classes;
- trivial slices consuming the same strategic cadence as risky slices.

### 2.9. Приёмка

1. `orchestrator` запускает strategic acceptance через selected runtime path per `execution-profiles.md`.
2. `lead-strategic` сверяет report, plan fit, scope, architecture и review discipline.
3. Делает post-slice or final reframe и запускает bounded `strategic-reviewer` pass, если этого требует operating mode или risk signals.
4. Выносит `ACCEPT`, `ACCEPT WITH NOTES` или `REJECT`.
5. Пользователь подтверждает merge.

### 2.10. Эскалация

Default routing:

- technical/governance ambiguity сначала идёт в `lead-strategic`, а не к пользователю;
- пользователь подключается там, где нужен product/scope/business decision или явное принятие риска.

`orchestrator` эскалирует к `lead-strategic`, когда:

- change вводит новый контракт, schema change или cross-module decision;
- нужен новый exception / waiver;
- reviewer'ы расходятся по technical acceptance;
- baseline state или architecture state спорный;
- решение упирается в documented technical governance.

`orchestrator` эскалирует к пользователю, когда:

- найден `CRITICAL`;
- нужен scope или priority change;
- нужен product/business tradeoff, не покрытый текущим plan state;
- есть shared-environment side effect, destructive recovery или другой decision с внешним blast radius;
- после strategic pass остаются несколько допустимых вариантов, и выбор между ними пользовательский;
- план или merge ждут явного пользовательского approval.

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

Failure-path после эскалации: `recovery.md`.

### 2.11. Wave Closure

После принятия последнего slice волны и прохождения integration review `orchestrator` запускает wave closure.

**Кто:** `orchestrator` выполняет, `lead-strategic` верифицирует.

**Checklist:** §6.2 (Wave DoD).

**Порядок:**

1. Все slices волны имеют `ACCEPT` verdict.
2. Plan change requests resolved или rejected.
3. Integration review green (если применим).
4. Governance passes выполнены: architecture pass (если placement/boundary decisions), baseline pass (статус зафиксирован).
5. Documentation sync: architecture docs, invariants, current_plan.md отражают итоги волны.
6. State: operating mode валиден, memory.md обновлён, test baseline зафиксирован числом.

**Output:** governance-closeout report или финальная секция в full report с Wave DoD status.

Baseline number из wave closure становится минимальным порогом для следующей волны.

## 3. Review Model

Review Gate работает на двух уровнях:

- `slice review` — worker проверяет свой bounded diff сразу после реализации;
- `integration review` — `orchestrator` запускает reviewers на интегрированный diff после merge slices.

Не каждая задача требует оба уровня, но truthful `review disposition` обязателен всегда.

### 3.1. Minimum Independent Review Floor

Любой slice, который пишет product code, требует хотя бы одного fresh reviewer pass от агента, который этот код не писал, кроме `direct-fix`.

- Минимальный floor для code-writing slice — `code-reviewer`.
- Дополнительные reviewer'ы (`security`, `architecture`, `docs`, `ui`) подключаются по поверхности change.
- Пользователь или `orchestrator` могут снизить coverage только сверх этого минимума; полностью waiv'ить independent review для code change нельзя вне `direct-fix`.
- `micro-task` size не является причиной waiver, если slice пишет product code и не подпадает под `direct-fix`.

`direct-fix` protocol: `<= 10` строк, один файл, нет architectural surface, change purely local/mechanical, нет schema/contract changes. Verification = свежие `pnpm check` + `pnpm build`.

### 3.2. Slice Review

После реализации slice worker запускает релевантных ревьюеров:

```text
Worker завершил slice
    │
    ├─ self-check
    ├─ git diff по файлам slice
    │
    ├─► code-reviewer
    ├─► security-reviewer       (если auth / SQL / API / secrets)
    ├─► architecture-reviewer   (если imports / placement / boundaries)
    ├─► docs-reviewer           (если docs / contracts / schema)
    └─► ui-reviewer             (если UI)
    │
    ├─ фикс локальных non-critical findings
    └─ handoff оркестратору
```

Почему slice review запускает сам worker: у него самый свежий implementation context; он может исправить локальные findings до handoff; `orchestrator` получает уже очищенный bounded slice.

`direct-fix` не проходит worker-owned slice review loop: он верифицируется inline и помечается `N/A — direct-fix protocol`.

**Выбор ревьюеров:**

| Что менялось | Ревьюеры |
|---|---|
| Любой код | `code-reviewer` |
| SQL, auth, API, secrets, user input | `+ security-reviewer` |
| Cross-layer imports, новый package home, placement | `+ architecture-reviewer` |
| BI vertical: datasets, providers, filters, BI pages | `+ architecture-reviewer` |
| Docs, contracts, schema files | `+ docs-reviewer` |
| UI components, страницы | `+ ui-reviewer` |
| Только markdown | только `docs-reviewer` |

Для code-writing slice первая строка таблицы не является optional.

**Execution context:**

- **In-place mode:** reviewer input по owned files из handoff + коммиты worker'а в `feature/<topic>`. Worker не включает чужие коммиты.
- **Isolated mode:** worker запускает ревьюеров на полный diff своей `agent/worker/<slug>` branch от base commit.

### 3.3. Integration Review

После всех slices `orchestrator` запускает review на полный интегрированный diff, если он нужен:

```text
git diff main..feature/<topic>
    │
    ├─► architecture-reviewer
    ├─► security-reviewer
    ├─► docs-reviewer
    ├─► code-reviewer
    └─► ui-reviewer (если фронтенд)
```

Integration review нужен для:

- cross-slice naming conflicts;
- architecture drift на стыке нескольких slices;
- doc/code inconsistency после серии изменений;
- security regressions, видимые только в полном data flow.

**Протокол `needs design decision`:**

Если `architecture-reviewer` на любом stage выносит `needs design decision`:

1. Merge блокируется до согласования.
2. `orchestrator` эскалирует к `lead-strategic` (или запускает architecture pass §5.1).
3. Решение фиксируется в architecture doc **до merge**.
4. Если решение создаёт enforceable rule → обновляется `invariants.md`.
5. Re-review подтверждает соответствие diff зафиксированному решению.

### 3.4. Severity

- `CRITICAL` — блокирует merge. Нужно исправить или эскалировать.
- `WARNING` — исправить до merge, если нет явного обоснования исключения.
- `INFO` — неблокирующее наблюдение.

### 3.5. Когда Review Gate можно не запускать

**Slice review skip:**

- change purely docs-only;
- read-only analysis / audit / governance-closeout без product code;
- change подпадает под `direct-fix` protocol;
- пользователь явно попросил пропустить review только для non-code work;
- `trivial` не является причиной skip, если slice пишет product code и не подпадает под `direct-fix`.

**Integration review skip:**

- задача была только чтение/анализ;
- batch из одного slice, если slice review уже покрыл diff;
- change целиком закрыт `direct-fix` и не дал cross-slice risk;
- изменения только в markdown;
- governance-closeout slice без нового product logic.

Если docs-only change меняет active architecture contract, adds/removes exception или оформляет complexity waiver, нужен хотя бы bounded architecture pass.

### 3.6. Truthful Reporting

- если конкретный reviewer ожидался, но не запускался → `not run`;
- если review не применим → `skipped/not applicable + rationale`;
- не нужно механически перечислять всех reviewer'ов как `not run`, если review вообще не ожидался.

### 3.7. Evidence Freshness

| Состояние | Значение | Действие |
|---|---|---|
| `fresh` | Прогнан в текущей сессии после финального diff | Принимается как есть |
| `not run` | Не запускался | Допустимо только с причиной |

Evidence без явного состояния или с устаревшим результатом не принимается.

- Fabricated evidence (заявленный результат, которого не было) — **`CRITICAL`**, блокирует acceptance.
- Contradictory evidence (результат противоречит наблюдаемому) — **`CRITICAL`**, блокирует acceptance.
- Missing expected evidence (check ожидался, но не упомянут) — **`WARNING`**, требует явного разрешения.

### 3.8. Documentation Completeness Escalation

| Уровень | Severity | Действие |
|---|---|---|
| Slice | `WARNING` | Worker исправляет до handoff; если нет — orchestrator возвращает |
| Wave | `CRITICAL` | Блокирует wave closure |
| Feature | `CRITICAL` | Блокирует merge в main |

Неразрешённый docs `WARNING` на slice level автоматически поднимается до `CRITICAL` при wave closure только для contract-touching docs: `RUNTIME_CONTRACT.md`, `db/schema_catalog.md`, `db/current_schema.sql`, `db/applied_changes.md`, новые инварианты в `docs/agents/invariants.md` и overlay-файлах типа `invariants-emis.md`.
Navigation `AGENTS.md` drift, не введённый slice'ами текущей волны и не относящийся к её touched directories, может carry over до wave closure как `WARNING`, если в wave report явно зафиксированы owner и expiry. Slice-level gate сохраняется: worker обновляет связанный `AGENTS.md` для touched directories до handoff (см. таблицу выше).

Docs gaps: отсутствующий/устаревший `AGENTS.md`, новое решение без записи в architecture doc, schema change без обновления `db/current_schema.sql` + `db/applied_changes.md`, API/contract change без обновления `RUNTIME_CONTRACT.md`.

## 4. Strategic Acceptance / Reframe Pass

`strategic-reviewer` не входит в обязательный Review Gate. Это bounded strategic acceptance/reframe pass внутри того же `lead-strategic` thread.

Что он делает:

- перепроверяет acceptance readiness текущего slice/report/diff;
- помогает определить plan fit и next-slice impact;
- даёт bounded cross-model second opinion перед reframe или final acceptance;
- может поймать likely bugs/regressions, которые не были подняты review-lane reviewers;
- не заменяет финальный strategic verdict от `lead-strategic`;
- не заменяет профильные reviewer passes (`code-reviewer`, `security-reviewer`, etc.).

Минимальный вход: `current_plan.md`, `last_report.md`, diff или changed files, только релевантные canonical docs.

### 4.1. Strategic-reviewer cadence

| Mode | Default cadence |
|---|---|
| `high-risk iterative / unstable wave` | strategic-reviewer после каждого slice |
| `ordinary iterative` | только по risk signals; short post-slice reframe обязателен всегда |
| `batch / low-risk` | обычно только на integration/final acceptance |

Risk signals для slice-level pass:

- scope drift или unclear plan fit;
- conflicting reviewer signals;
- новый architecture/topology question;
- changed acceptance conditions for next slice;
- findings, которые меняют sequencing или decomposition;
- реальный diff заметно отличается от initial-plan assumptions;
- slice review формально green, но confidence в acceptance низкий;
- нужен дешёвый cross-model recheck на likely bugs/regressions.

Чего strategic-reviewer не делает: не пишет код; не становится отдельным каналом для `orchestrator`; не забирает plan ownership у `lead-strategic`.

### 4.2. Reframe policy after acceptance

После каждого принятого slice `lead-strategic` делает короткий reframe:

- сверяет plan против нового состояния репозитория;
- оценивает, остаётся ли текущий operating mode валидным;
- правит локальные формулировки и acceptance в `current_plan.md`, если достаточно;
- при необходимости меняет operating mode с коротким rationale;
- запускает bounded `strategic-reviewer` pass по mode или по risk signals.

## 5. Governance Passes

Governance passes не создают новых decision owners. Это именованные режимы внутри `lead-strategic`.

### 5.1. Architecture Pass

Подключается, когда нужен:

- package/app placement decision;
- новый exception или waiver;
- пересечение контуров: `platform/shared` ↔ domain overlays, или `operational` ↔ `BI/read-side`;
- docs-only rewrite active ownership rules.

Timing: default event-driven; end-of-wave только если волна реально меняла boundaries, waivers/exceptions или ownership docs.

Проверяет: packages как canonical homes; `apps/web` как app leaf; separation of domain paths; owner + expiry + removal condition для exceptions.

Не делает: не пишет product plan; не заменяет diff-level `architecture-reviewer`; не выносит baseline status.

Полномочия: approve/reject placement; требовать doc updates и exception id до merge; разрешать временный complexity waiver с owner + expiry; оформлять отдельный artifact для durable governance trail.

Checklist: `lead-strategic/instructions.md` §Governance Passes > Architecture Pass.

### 5.2. Baseline Pass

Подключается в stabilization / baseline-control waves.

Timing: default end-of-wave; ранний pass допустим как gate перед следующей large feature wave.

Проверяет: baseline status (`Red | Yellow | Green`); truthful status canonical checks; consistency docs/ownership/code; registry known exceptions.

Не делает: не декомпозирует product work; не пишет код; не заменяет Review Gate.

Полномочия: пометить baseline как `not closed`; блокировать запуск новых large feature slices; требовать owner + expiry для exception.

Практическое правило: `baseline pass = end-of-wave default`; `architecture pass = event-driven, end-of-wave optional`.

Checklist: `lead-strategic/instructions.md` §Governance Passes > Baseline Pass.

### 5.3. Pre-Implementation Architecture Audit

Bounded audit pass перед реализацией фичи с architectural surface. Исполнитель: `architecture-reviewer` в audit mode. Trigger и протокол: §2.3.1.

## 6. Definition of Done

Composable checklists: each level includes the previous. `N/A` with a one-line reason is allowed; silent omission is not.

### Micro-task exemption

If change is `<= 20` lines, at most 2 files, no architectural surface, no schema/contract change — only these are required: acceptance criteria met, scope not violated, checks satisfy current baseline policy. Everything else may be `N/A`.

### 6.1. Slice DoD (Level 1)

**Owner:** worker. **Verifier:** orchestrator at handoff.

**Implementation:** acceptance criteria met; scope not violated; invariants not violated; required checks satisfy current baseline policy (`Green` baseline → `pnpm check`, `pnpm build`, `pnpm lint:boundaries` green; `Red/Yellow` baseline → each check is green or truthful `not run + reason`, and the slice does not widen the known failing baseline); baseline tests not shrunk.

**Documentation:** new directories got `AGENTS.md`; changed directories updated `AGENTS.md`; new architectural decisions documented; public API/contract changes updated `RUNTIME_CONTRACT.md`; schema changes updated `db/current_schema.sql` + `db/applied_changes.md`.

**Quality:** no hardcoded secrets; no speculative abstractions; file complexity within guardrails; minimum independent review floor satisfied for code-writing slices; security-relevant changes ran `security-reviewer`.

**Evidence:** every check is `fresh` or `not run + reason`; change manifest truthful; review disposition recorded; no fabricated evidence.

### 6.2. Wave DoD (Level 2)

**Owner:** orchestrator. **Verifier:** lead-strategic at wave acceptance.

- All slices have `ACCEPT` verdict
- Plan change requests resolved or rejected
- Integration review green (if 3+ files or cross-module impact)
- Architecture pass done (if placement/boundary decisions)
- Baseline status (`Red`/`Yellow`/`Green`) recorded
- Architecture docs reflect wave decisions; `invariants.md` updated if new rules
- `current_plan.md` slices marked done
- Operating mode valid for next wave
- Both `memory.md` files rewritten to active state (~20 lines max)
- Test baseline recorded for next wave
- Contract-touching docs closed (unresolved gaps block wave closure per §3.8); any pre-existing navigation `AGENTS.md` carry-over recorded with owner + expiry

### 6.3. Feature DoD (Level 3)

**Owner:** lead-strategic. **Verifier:** user (standard) or decision-log (autonomous).

- Expected Result from plan achieved
- All waves closed (Wave DoD passed)
- Architecture docs updated (as-is → reality)
- All CRITICAL findings closed; WARNING findings justified or closed
- Migration instructions if schema changes
- Final test baseline recorded

### 6.4. Responsibility Matrix

| Item | Creates | Verifies | Accepts |
|---|---|---|---|
| Code implementation | worker | code-reviewer | orchestrator |
| Security | worker | security-reviewer | orchestrator |
| Architecture boundaries | worker | architecture-reviewer | lead-strategic |
| AGENTS.md | worker | docs-reviewer | orchestrator |
| Architecture docs | worker/orchestrator | docs-reviewer | lead-strategic |
| Wave governance | orchestrator | governance passes | lead-strategic |
| Memory updates | each role | — | self |

Severity escalation: unresolved docs `WARNING` at slice level auto-escalates to `CRITICAL` at wave closure only per the contract-touching carve-out in §3.8; pre-existing navigation `AGENTS.md` drift outside the wave's touched directories may carry over with recorded owner + expiry (see §3.8).

## 7. Коммуникация и артефакты

### Файловый протокол

| Файл | Кто пишет | Кто читает |
|---|---|---|
| `lead-strategic/current_plan.md` | `lead-strategic` | `orchestrator`, workers по need-to-know |
| `orchestrator/last_report.md` | `orchestrator` | `lead-strategic`, пользователь |
| `lead-strategic/memory.md` | `lead-strategic` | следующий strategic thread |
| `orchestrator/memory.md` | `orchestrator` | следующий orchestration session |
| `runtime/agents/usage-log.ndjson` | `orchestrator` | локальная optimization analytics |
| domain-specific exceptions registry | `lead-strategic` governance loop | все роли по необходимости |

Правила хранения:

- `last_report.md` — всегда текущий canonical execution report;
- `runtime/agents/usage-log.ndjson` — append-only local usage history;
- отдельного worker-memory файла нет;
- durable governance trail оформляется отдельным artifact только при изменении долгоживущего решения.

### Tmux-сессии / Agent Teams

```text
pane #0  orchestrator
pane #1  worker A
pane #2  worker B (если нужен)
```

- `orchestrator` держит orchestration context и запускает reviewers как fresh subagents;
- sequential in-place workers разделяют checkout с `orchestrator` и коммитят в `feature/<topic>`;
- isolated workers (opt-in per `git-protocol.md` §4) живут в отдельных worktree/branch;
- пользователь может зайти в pane worker'а напрямую.

## 8. Memory Protocol

### Who writes what

| Role | File | When |
|---|---|---|
| `lead-strategic` | `lead-strategic/memory.md` | after plan decisions, acceptance, reframe |
| `orchestrator` | `orchestrator/memory.md` | after each accepted slice, before session end |
| `worker` | none | session context only, continuity via handoff |

### What to store

Active wave, branch, current/next slice, operating mode, still-valid decisions. Not: closed-wave narratives, implementation logs, diff summaries (these belong in `last_report.md`, `archive/`, or `git log`).

### Pruning rule

On every new wave: **rewrite, don't append**. Keep only active state, still-valid durable decisions, and resume point. If memory exceeds ~20 lines, it is too long.

### Recovery after auto-compact

1. Determine role from context.
2. `orchestrator`: read `orchestrator/memory.md` then `current_plan.md`.
3. `lead-strategic`: read `lead-strategic/memory.md` then `current_plan.md`.
4. `worker` / `reviewer`: do not run recovery; follow task packet / review request only.

### Inter-worker continuity

Workers have no shared memory. Continuity between dependent workers is orchestrator's responsibility via `Carry-Forward Context` in the task packet.
