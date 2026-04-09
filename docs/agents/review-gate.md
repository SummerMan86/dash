# Review Gate

Canonical decision model для review passes и governance passes.

`workflow.md` отвечает на вопрос "когда запускается review loop".
Этот документ отвечает на вопрос "как именно устроены review и governance passes".

## 1. Review Gate (двухуровневый)

Review Gate работает на двух уровнях:

- `slice review` — worker проверяет свой bounded diff сразу после реализации;
- `integration review` — `lead-tactical` проверяет интегрированный diff после merge slices.

Не каждая задача требует оба уровня, но truthful `review disposition` обязателен всегда.

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
- `lead-tactical` получает уже очищенный bounded slice.

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
| Docs, contracts, schema files | `+ docs-reviewer` |
| UI components, страницы | `+ ui-reviewer` |
| Только markdown | только `docs-reviewer` |

### 1.2. Integration Review

После всех slices `lead-tactical` запускает review на полный интегрированный diff, если он нужен:

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

### 1.3. Severity

- `CRITICAL` — блокирует merge. Нужно исправить или эскалировать.
- `WARNING` — исправить до merge, если нет явного обоснования исключения.
- `INFO` — неблокирующее наблюдение.

### 1.4. Когда Review Gate можно не запускать

**Slice review:**

- slice тривиальный (`1-2` файла, `< 30` строк);
- пользователь явно попросил пропустить;
- change purely docs-only.

**Integration review:**

- задача была только чтение/анализ;
- пользователь явно попросил пропустить;
- batch из одного slice, если slice review уже покрыл diff;
- изменения только в markdown;
- governance-closeout slice без нового product logic и без cross-slice risk.

Если docs-only change меняет active architecture contract, adds/removes exception или оформляет complexity waiver, нужен хотя бы bounded `architecture pass`, даже если полный Review Gate не запускается.

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

Missing expected evidence (check ожидался по handoff, но не упомянут в результате) — **`WARNING`**, требует явного разрешения от `lead-tactical` или `lead-strategic`.

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

### 2.1. Operating modes

`lead-strategic` выбирает operating mode при старте wave и может переключить его после любого post-slice reframe с указанием причины.

Canonical modes:

- `high-risk iterative / unstable wave` — strategic-reviewer запускается после каждого slice;
- `ordinary iterative` — strategic-reviewer запускается только по risk signals, но short post-slice reframe обязателен всегда;
- `batch / low-risk` — strategic-reviewer обычно нужен только на integration/final acceptance.

Risk signals для slice-level strategic-reviewer pass:

- scope drift или unclear plan fit;
- conflicting reviewer signals;
- новый architecture/topology question;
- changed acceptance conditions for next slice;
- findings, которые меняют sequencing или decomposition;
- реальный diff заметно отличается от initial-plan assumptions.
- slice review формально green, но confidence в acceptance низкий;
- нужен дешёвый cross-model recheck на likely bugs/regressions после Sonnet review.

Чего не делает:

- не пишет код;
- не становится отдельным каналом для `lead-tactical`;
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

Strategic cadence должен зависеть от фактического yield, а не от привычки запускать одинаковый pass на каждый slice.

- trivial slice с green slice review и без semantic reframe можно закрыть без отдельного strategic-reviewer pass;
- если нужен дополнительный model lens после Sonnet review, сначала используй `gpt-5.4-mini`, а не full `gpt-5.4`;
- если per-slice strategic passes регулярно меняют next-slice plan или ловят important issues, это high-yield cadence, и его нужно сохранять;
- если несколько slices подряд проходят с `accept-ready`, без новых strategic findings и без plan drift, cadence можно снизить;
- снижение cadence или сохранение high-frequency mode должно быть объяснимо через фактический risk profile, а не "по памяти".

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
