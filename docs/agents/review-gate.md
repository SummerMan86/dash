# Review Gate

Canonical decision model для review passes и governance passes.

`workflow.md` отвечает на вопрос "когда запускается review loop".
Этот документ отвечает на вопрос "как именно устроены review и governance passes".

## 1. Review Gate (двухуровневый)

Review Gate работает на двух уровнях:

- `slice review` — worker проверяет свой bounded diff сразу после реализации;
- `integration review` — `orchestrator` запускает reviewers на интегрированный diff после merge slices.

Не каждая задача требует оба уровня, но truthful `review disposition` обязателен всегда.

Минимальный независимый review floor:

- любой slice, который пишет product code, требует хотя бы одного fresh reviewer pass от агента, который этот код не писал, кроме `direct-fix`;
- минимальный floor для code-writing slice — `code-reviewer`;
- дополнительные reviewer'ы (`security`, `architecture`, `docs`, `ui`) подключаются по поверхности change;
- пользователь или `orchestrator` могут снизить coverage только сверх этого минимума; полностью waiv'ить независимый review для code change нельзя вне `direct-fix`.

`direct-fix` — это special-case fast path у `orchestrator`:

- `<= 10` изменённых строк;
- один файл;
- нет architectural surface;
- нет schema/contract changes;
- verification = свежие `pnpm check` + `pnpm build`.

### 1.1. Slice Review

После реализации slice worker запускает релевантных ревьюеров в своём контексте.
Это те же diff-level reviewers, что потом могут быть перезапущены на integration stage; меняется не роль, а scope diff:

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

Почему slice review запускает сам worker:

- у него самый свежий implementation context;
- он может исправить локальные findings до handoff;
- `orchestrator` получает уже очищенный bounded slice и принимает его по артефактам, а не по повторному чтению кода.

`direct-fix` не проходит worker-owned slice review loop: он верифицируется inline у `orchestrator` и truthfully помечается как `N/A — direct-fix protocol`.

**Execution context по режимам:**

- **Teammate mode:** reviewer input собирается строго по owned files из handoff + коммиты worker'а в этих файлах. Worker не включает в review чужие коммиты из integration branch — даже если они есть в `git log`.
- **Subagent mode:** worker запускает ревьюеров на полный diff своей `agent/worker/<slug>` branch от base commit (diff изолирован по определению).

Сам process review не меняется, меняется только способ сборки reviewer input.

**Выбор ревьюеров:**

| Что менялось | Ревьюеры |
| --- | --- |
| Любой код | `code-reviewer` |
| SQL, auth, API, secrets, user input | `+ security-reviewer` |
| Cross-layer imports, новый package home, placement | `+ architecture-reviewer` |
| BI vertical: datasets, providers, filters, BI pages | `+ architecture-reviewer` |
| Docs, contracts, schema files | `+ docs-reviewer` |
| UI components, страницы | `+ ui-reviewer` |
| Только markdown | только `docs-reviewer` |

Для code-writing slice первая строка таблицы не является optional.

**Pre-implementation (до начала реализации):**

| Ситуация | Кто запускает | Роль |
| --- | --- | --- |
| Planned scope с architectural surface | `orchestrator` | `architecture-reviewer` (audit mode) |
| Architectural decision при планировании | `lead-strategic` | `architecture-reviewer` (audit mode) или `architecture pass` (§3.1) |

### 1.2. Integration Review

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

Integration review нужен для того, что не видно на уровне одного slice:

- cross-slice naming conflicts;
- architecture drift на стыке нескольких slices;
- doc/code inconsistency после серии изменений;
- security regressions, которые проявляются только в полном data flow.

`architecture-reviewer` и остальные `*-reviewer` не ограничены только integrated diff:

- на slice stage они смотрят bounded worker diff;
- на integration stage они смотрят полный интегрированный diff;
- governance-level placement/waiver decisions по-прежнему эскалируются не в diff reviewer, а в `architecture pass` у `lead-strategic`.

**Протокол `needs design decision`:**

Если `architecture-reviewer` на любом stage (slice или integration) выносит verdict `needs design decision`:

1. Merge блокируется до согласования.
2. `orchestrator` эскалирует finding к `lead-strategic` (или запускает `architecture pass` §3.1).
3. Решение согласуется и фиксируется в architecture doc **до merge**.
4. Если решение создаёт enforceable rule → обновляется `invariants.md`.
5. После фиксации в docs → re-review подтверждает соответствие diff зафиксированному решению.

Полный протокол: `architecture-reviewer/instructions.md`, секция "Verdict `needs design decision`".

### 1.3. Severity

- `CRITICAL` — блокирует merge. Нужно исправить или эскалировать.
- `WARNING` — исправить до merge, если нет явного обоснования исключения.
- `INFO` — неблокирующее наблюдение.

### 1.4. Когда Review Gate можно не запускать

**Slice review:**

- change purely docs-only;
- read-only analysis / audit / governance-closeout без product code;
- change подпадает под `direct-fix` protocol;
- пользователь явно попросил пропустить review только для non-code work;
- `trivial` не является причиной skip, если slice пишет product code и не подпадает под `direct-fix`.

**Integration review:**

- задача была только чтение/анализ;
- пользователь явно попросил сократить review coverage, но minimum independent floor для code change уже закрыт на slice stage;
- batch из одного slice, если slice review уже покрыл diff;
- change целиком закрыт `direct-fix` protocol и не дал cross-slice risk;
- изменения только в markdown;
- governance-closeout slice без нового product logic и без cross-slice risk.

Если docs-only change меняет active architecture contract, adds/removes exception или оформляет complexity waiver, нужен хотя бы bounded `architecture pass`, даже если полный Review Gate не запускается.
Если change пишет product code, хотя бы один независимый reviewer pass остаётся обязательным даже при skip полного Review Gate, кроме `direct-fix`.

### 1.5. Truthful reporting

- если конкретный reviewer ожидался, но не запускался, это отражается как `not run`;
- если review-блок не применим к задаче, достаточно `skipped/not applicable + rationale`;
- не нужно механически перечислять всех reviewer'ов как `not run`, если review вообще не ожидался.

### 1.6. Evidence freshness

Checks evidence в handoff и report оценивается по двум допустимым состояниям:

| Состояние | Значение | Действие |
| --- | --- | --- |
| `fresh` | Прогнан в текущей сессии после финального diff | Принимается как есть |
| `not run` | Не запускался | Допустимо только с причиной (e.g. "not applicable", "blocked by X") |

Evidence без явного состояния или с устаревшим результатом (прогнан до финального diff) не принимается — worker должен перезапустить check (→ `fresh`) или честно указать `not run + reason`.

Fabricated evidence (заявленный результат, которого не было) или contradictory evidence (результат противоречит наблюдаемому состоянию) — **`CRITICAL`** finding, блокирующий acceptance.

Missing expected evidence (check ожидался по handoff, но не упомянут в результате) — **`WARNING`**, требует явного разрешения от `orchestrator` или `lead-strategic`.

### 1.7. Documentation completeness escalation

Docs gaps обнаруживаются `docs-reviewer` и `architecture-reviewer` (architecture-docs-first violations).

Severity зависит от уровня, на котором gap остаётся неразрешённым:

| Уровень | Severity | Действие |
|---|---|---|
| Slice | `WARNING` | Worker исправляет до handoff; если не исправлено — orchestrator возвращает на доработку |
| Wave | `CRITICAL` | Блокирует wave closure; orchestrator не закрывает волну без docs sync |
| Feature | `CRITICAL` | Блокирует merge в main; lead-strategic не принимает feature без полной документации |

Неразрешённый docs `WARNING` на slice level автоматически поднимается до `CRITICAL` при wave closure.

Какие gaps считаются docs gaps:

- отсутствующий `AGENTS.md` для новой директории
- устаревший `AGENTS.md` после изменения structure/exports/deps
- новое архитектурное решение без записи в architecture doc (architecture-docs-first violation)
- schema change без обновления `db/current_schema.sql` и `db/applied_changes.md`
- API/contract change без обновления `RUNTIME_CONTRACT.md`

Полный DoD checklist по документации: `docs/agents/definition-of-done.md` §1 (Slice) и §2 (Wave).

## 2. Strategic Acceptance / Reframe Pass

`strategic-reviewer` не входит в обязательный Review Gate.
Это bounded strategic acceptance/reframe pass внутри того же `lead-strategic` thread.

Что он делает:

- перепроверяет acceptance readiness текущего slice/report/diff;
- помогает определить plan fit и next-slice impact;
- даёт bounded cross-model second opinion перед reframe или final acceptance;
- может поймать likely bugs/regressions, которые не были подняты Sonnet-based reviewers;
- не заменяет финальный strategic verdict от `lead-strategic`.
- не заменяет профильные reviewer passes (`code-reviewer`, `security-reviewer`, `architecture-reviewer`).

Минимальный вход:

- `current_plan.md`;
- `last_report.md`;
- diff или changed files;
- только релевантные canonical docs.

### 2.1. Strategic-reviewer cadence

Mode definitions and selection heuristic: `workflow.md` §2.4.
Cost-aware defaults for strategic cadence: `workflow.md` §2.8.

Strategic-reviewer cadence per mode:

| Mode | Default cadence |
|---|---|
| `high-risk iterative / unstable wave` | strategic-reviewer после каждого slice |
| `ordinary iterative` | strategic-reviewer только по risk signals; short post-slice reframe обязателен всегда |
| `batch / low-risk` | strategic-reviewer обычно только на integration/final acceptance |

Risk signals для slice-level strategic-reviewer pass:

- scope drift или unclear plan fit;
- conflicting reviewer signals;
- новый architecture/topology question;
- changed acceptance conditions for next slice;
- findings, которые меняют sequencing или decomposition;
- реальный diff заметно отличается от initial-plan assumptions;
- slice review формально green, но confidence в acceptance низкий;
- нужен дешёвый cross-model recheck на likely bugs/regressions после Sonnet review.

Чего strategic-reviewer не делает:

- не пишет код;
- не становится отдельным каналом для `orchestrator`;
- не забирает plan ownership у `lead-strategic`.

### 2.2. Reframe policy after acceptance

После каждого принятого slice `lead-strategic` делает короткий reframe следующего slice:

- сверяет plan против нового состояния репозитория;
- оценивает, остаётся ли текущий operating mode валидным;
- правит локальные формулировки и acceptance в `current_plan.md`, если этого достаточно;
- при необходимости меняет operating mode с коротким rationale;
- запускает bounded `strategic-reviewer` pass по выбранному mode или по risk signals;
- не открывает новый full-context chat без необходимости.

### 2.3. Cost-aware defaults

Canonical cost-aware rules and low-yield/cost-creep signals: `workflow.md` §2.8.

## 3. Governance Passes

Governance passes не создают новых decision owners.
Это именованные режимы внутри `lead-strategic`.

### 3.1. Architecture Pass

Подключается, когда нужен:

- package/app placement decision;
- новый exception или waiver;
- пересечение контуров: `platform/shared` ↔ domain overlays, или `operational` ↔ `BI/read-side` внутри одного домена (e.g. EMIS operational vs EMIS BI/read-side);
- docs-only rewrite active ownership rules.

Timing:

- default: event-driven;
- end-of-wave нужен только если волна реально меняла boundaries, waivers/exceptions или ownership docs.

Проверяет:

- packages как canonical reusable homes;
- `apps/web` как app leaf / transport-orchestration layer;
- separation of domain `operational` vs `BI/read-side` paths where that split exists (e.g. EMIS operational vs EMIS BI/read-side);
- owner + expiry + removal condition для exceptions/waivers.

Не делает:

- не пишет product plan вместо `lead-strategic`;
- не заменяет diff-level `architecture-reviewer`;
- не выносит baseline status вместо baseline pass.

Полномочия:

- approve/reject placement;
- требовать doc updates и exception id до merge;
- разрешать временный complexity waiver только с owner + expiry;
- оформлять отдельный artifact только для durable governance trail.

Checklist: `docs/agents/architecture-steward/instructions.md`.

### 3.2. Baseline Pass

Подключается в stabilization / baseline-control waves, когда baseline спорный, checks не все green или exceptions ещё под контролем.

Timing:

- default: end-of-wave;
- ранний pass допустим как gate перед следующей large feature wave.

Проверяет:

- baseline status (`Red | Yellow | Green`);
- truthful status canonical checks;
- consistency между docs, ownership rules и active code;
- registry known exceptions.

Не делает:

- не декомпозирует product work;
- не пишет код;
- не заменяет Review Gate.

Полномочия:

- пометить baseline как `not closed`;
- блокировать запуск новых large feature slices;
- требовать owner + expiry для exception перед продолжением work;
- оформлять отдельный `Baseline Verdict` только если решение должно пережить текущий `last_report.md`.

Практическое правило:

- `baseline pass = end-of-wave default`;
- `architecture pass = event-driven, end-of-wave optional`.

Checklist: `docs/agents/baseline-governor/instructions.md`.

### 3.3. Pre-Implementation Architecture Audit

Bounded audit pass, запускаемый перед реализацией фичи, которая затрагивает architectural surface.

**Исполнитель:** `architecture-reviewer` в audit mode (Mode 2, см. `docs/agents/architecture-reviewer/instructions.md`).

**Инициаторы:**

- `orchestrator` — перед execution, когда bounded self-check недостаточен (`workflow.md` §2.3.1);
- `lead-strategic` — при планировании, когда architectural surface неочевиден (шаг 5 в `lead-strategic/instructions.md`).

Trigger: `workflow.md` §2.3.1 Architecture Readiness Check.

**Что проверяется:**

1. **Compliance с текущими guardrails:**
   - BI: `architecture_dashboard_bi.md` §8 (page decomposition, paramsSchema, fetchDataset migration, caching symmetry, chart configuration)
   - Общие: `invariants.md` §1-9
   - Domain overlays: `invariants-emis.md` и др., если затронут domain

2. **Migration debt impact:**
   - Planned change попадает в зону debt из `architecture_dashboard_bi.md` §9?
   - Если да — debt resolution включается в plan scope и slice budget

3. **New architectural decisions needed:**
   - Новый паттерн (new IR node, new filter scope, new provider type)?
   - Новый контракт или расширение существующего?
   - Новое placement decision (где живёт код)?

4. **Extensibility assessment:**
   - Planned change не ломает существующие extension points?
   - Не создаёт new coupling между packages/layers?
   - Следует extension pattern "add registration, not poke holes"?

**Протокол документирования (architecture-docs-first):**

Если аудит выявил новое архитектурное решение:

```
1. Зафиксируй решение в architecture doc
   → architecture_dashboard_bi.md для BI
   → architecture_emis.md для EMIS
   → architecture.md для repo-wide

2. Если решение создаёт enforceable rule → добавь инвариант в invariants.md

3. Если решение создаёт migration debt → добавь entry в §9 architecture_dashboard_bi.md

4. Решение фиксируется ДО начала реализации,
   не "задним числом" после merge
```

**Output:**

- `readiness: CLEAR` — нет новых decisions, compliance OK, можно начинать реализацию
- `readiness: CLEAR WITH DEBT` — compliance OK, но planned scope пересекается с debt zone; debt resolution добавлен в plan
- `readiness: DOCS FIRST` — нужны doc updates до начала реализации; docs → approve → implement
- `readiness: ESCALATE` — нужен architecture pass (§3.1) или strategic decision

**Не делает:**

- не пишет код;
- не заменяет slice review или integration review;
- не выносит governance verdicts — только подготавливает factual basis для decisions.

**Полномочия:**

- блокировать начало реализации до разрешения `DOCS FIRST` или `ESCALATE`;
- требовать обновления architecture docs и invariants;
- включать debt resolution в plan scope.
