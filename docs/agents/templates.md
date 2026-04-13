# Agent Communication Templates

Все шаблоны коммуникации между агентами в одном месте.

## 0. Правила заполнения

### Required vs Optional

- `Required` означает: секция должна присутствовать.
- `Optional` означает: секцию можно опустить целиком, если skip condition не сработал.
- Если нужен truthful negative signal по конкретной проверке, используй `not run`.
- Если целый блок не применим к задаче, не заполняй его `none/not applicable` построчно; опусти блок и зафиксируй причину в краткой секции-disposition.

### Report Types

У `orchestrator` есть три canonical формата `last_report.md`:

| Report type | Когда использовать | Что обязательно |
| --- | --- | --- |
| `full` | multi-slice, cross-layer, risky implementation, полноценный integration review | plan sync, review findings/disposition, checks evidence, readiness |
| `lightweight` | docs-only, direct-fix или one-slice low-risk worker-owned change | status, done summary, checks evidence, review disposition, readiness |
| `governance-closeout` | verification/docs/baseline closure slice без нового product implementation | status, closure summary, baseline/architecture disposition, checks evidence, readiness |

Жёсткое правило:

- `file count < N` сам по себе не определяет формат.
- Выбирай формат по risk profile, а не по размеру diff.

### Verdict Artifacts

Отдельные `Baseline Verdict` и `Architecture Pass Decision` нужны только если решение должно жить дольше текущего `last_report.md`:

- открывает/закрывает wave;
- вводит или закрывает exception/waiver;
- меняет allowed next work;
- нужен durable governance trail.

Во всех остальных случаях достаточно короткого summary внутри `last_report.md`.

## 1. План задачи (lead-strategic → orchestrator)

Файл: `docs/agents/lead-strategic/current_plan.md`

Required:

- цель
- список подзадач / slices
- acceptance для каждого slice
- ограничения
- ожидаемый результат

Optional:

- `depends on`, если есть зависимости между slices
- notes, если есть tactical constraints или known caveats

```md
# Plan: <название задачи>

## Цель

<что нужно сделать и зачем>

## Подзадачи

### ST-1: <название>

- scope: <файлы/слои>
- depends on: — (или ST-N)
- размер: S | M | L
- acceptance: <done-when для slice>
- verification intent: <что проверяем>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- заметки: <опционально>

### ST-2: <название>

- scope: <файлы/слои>
- depends on: ST-1
- размер: M
- acceptance: <done-when для slice>
- verification intent: <что проверяем>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- заметки: <опционально>

## Ограничения

- <что нельзя трогать>
- <архитектурные требования>

## Ожидаемый результат

- <что должно работать после выполнения>
- <какие файлы/контракты появятся или изменятся>
```

### Plan self-review checklist

Before handing off the plan, verify:

- [ ] Every slice has `acceptance` that is testable, not vague
- [ ] Every non-trivial slice has `verification intent` and `verification mode`
- [ ] If verification is deferred or waived, there is a `waiver rationale`
- [ ] Plan stays at decision-level — no implementation walkthroughs

## 2. Задача worker'у (orchestrator → worker)

Передаётся через Agent spawn или SendMessage.

Required:

- что сделать
- scope
- что не трогать
- base branch / base checkpoint
- bootstrap reads
- acceptance
- проверки
- какие артефакты вернуть оркестратору

Optional:

- отдельные ветки, если worker не работает напрямую в integration branch
- архитектурные ограничения, если они важны для slice
- optional references — документы, полезные worker'у, если возникнут вопросы по ходу
- extra evidence hints, если нужны domain-specific checks
- slice context — summary предыдущего handoff, если текущий slice зависит от предыдущего

```md
# Task: <название>

## Что сделать

<чёткое описание, что реализовать>

## Scope

- файлы: <список>
- слои: route UI | widgets | entities | server/<domain> | db/docs
- НЕ трогать: <файлы/модули вне scope>

## Ветки

- integration branch: feature/<topic>
- worker branch: agent/worker/<task-slug> (default for code-writing) | direct integration branch (teammate exception)
- base commit: <commit sha / checkpoint>

## Bootstrap Reads (прочитать до начала реализации)

- docs/agents/worker/guide.md
- <локальные AGENTS.md в затронутых модулях — перечислить конкретные пути>

## Optional References (читать при необходимости)

- <docs/agents/git-protocol.md — если неясна branch discipline>
- <docs/agents/review-gate.md — если нужны детали review model>
- <domain bootstrap doc, e.g. docs/emis_session_bootstrap.md — если slice в EMIS-контуре>
- <architecture doc, e.g. docs/architecture_dashboard_bi.md — если slice затрагивает BI>

## Carry-Forward Context (required для dependent slices, skip для independent)

Orchestrator собирает этот блок из handoff предыдущего worker'а. Worker не реконструирует continuity сам.

- предыдущий slice: <ST-N>
- summary: <что было сделано — 3-5 bullets>
- decisions/patterns: <какой паттерн выбрал предыдущий worker, что текущий должен продолжить, а не переизобретать>
- open findings/risks: <findings из прошлого review, которые переходят в текущий slice> или `none`
- continuation notes от предыдущего worker'а: <вставить из Continuation Notes предыдущего handoff> или `none`

## Архитектурные ограничения

- <опционально: релевантные правила>

## Acceptance

- <что должно быть истинно, чтобы slice считался законченным>

## Проверки

- TypeScript: без ошибок в затронутых файлах
- <специфичные проверки>

## Review Floor

- minimum independent review: `code-reviewer` required for any code-writing slice
- extra reviewers: `security` / `architecture` / `docs` / `ui` as applicable
- full skip allowed only for non-code work

## Evidence

- верни, какие проверки реально запускались, где и с каким итогом
- каждый check должен иметь состояние: `fresh` (прогнан после финального diff) или `not run + reason`
- evidence без состояния не принимается (см. `review-gate.md` §1.6)

## Артефакты для Orchestrator

- change manifest: какие owned files реально изменены
- boundary notes: затронуты ли contracts / schema / imports / exceptions
- review disposition: что реально запускалось и почему
- next action requested: `accept` | `re-review` | `fix-worker` | `escalate`

## Формат сдачи

Используй шаблон `Worker Handoff` из `docs/agents/templates.md` §3.
```

### 2.1. Micro-Task (orchestrator → micro-worker)

Сокращённый task packet для trivial bounded slices (one-file fix, rename, config tweak).

Micro-worker использует тот же worker contract, но с минимальным overhead.

Required:

- что сделать
- scope
- ветки
- bootstrap reads
- acceptance
- проверки

Optional:

- optional references, если контекст нетривиален
- carry-forward context, если micro-task зависит от предыдущего slice

```md
# Micro-Task: <название>

## Что сделать

<одно предложение>

## Scope

- файлы: <список>
- НЕ трогать: <список>

## Ветки

- integration branch: feature/<topic>
- worker branch: agent/worker/<task-slug>
- base commit: <commit sha>

## Bootstrap Reads

- docs/agents/worker/guide.md
- <локальный AGENTS.md, если файл находится внутри зоны с локальной навигацией>

## Optional References

- <только если нужны для контекста>

## Acceptance

- <done-when>

## Проверки

- <что запустить>

## Формат сдачи

Используй шаблон `Micro-Worker Handoff` из `docs/agents/templates.md` §3.1.
```

## 3. Результат worker'а (worker → orchestrator)

Required:

- задача
- что сделано
- change manifest
- проверки / evidence
- review disposition
- риски / эскалации, если есть

Optional:

- branches, если worker работал не напрямую в integration branch
- assumptions, если были реальные допущения
- detailed review results, только если slice review запускался

Skip conditions:

- `Review Results` можно опустить для docs-only / read-only / governance-closeout slice без product code; вместо этого укажи `Review Disposition`.
- `Допущения` можно опустить, если их нет.

```md
# Worker Handoff

## Задача

<что было поручено>

## Что сделано

- <что реализовано>
- ключевые файлы: <список>
- placement notes: <только если решение неочевидно>

## Change Manifest

- owned files changed: <список>
- out-of-scope files touched: `none` | <список>
- contracts / schema / boundaries touched: `none` | <кратко>
- short diff summary for orchestrator: <1-5 bullets>

## Verification

- verification intent: <что проверялось>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- waiver rationale: <если verification deferred или skipped>

## Ветки

- worker branch: agent/worker/<slug> (default for code-writing) | direct integration branch (teammate exception)
- integration branch: <feature/topic>

## Допущения

- <опционально>

## Проверки

- <команда>: <результат>

## Checks Evidence

- <команда>: <green|red> `fresh` | `not run` — <reason>

## Review Disposition

- minimum independent review floor: `satisfied` | `N/A — no product code`
- slice review: `run` | `skipped` | `not applicable`
- rationale: <почему>

## Review Results

- code-reviewer: <OK | findings summary>
- security-reviewer: <OK | findings summary>
- architecture-reviewer: <OK | findings summary>
- docs-reviewer: <OK | findings summary>
- ui-reviewer: <OK | findings summary>

## Slice DoD Status

Per `docs/agents/definition-of-done.md` Level 1. Отмечай только items с gaps или N/A; green items подразумеваются пройденным self-check:

- docs: <done | N/A — reason | gap — what's missing>
- baseline tests: <maintained | grew to N>

## Continuation Notes (optional — для dependent slices)

Что следующему worker'у нужно знать, если следующий slice зависит от этого:

- decisions: <какой паттерн/подход выбран и почему — чтобы следующий worker продолжил, а не переизобретал>
- gotchas: <неочевидные моменты, обнаруженные по ходу реализации>
- deferred items: <что осознанно отложено в следующий slice>

Если slice независим или последний в цепочке — опусти секцию целиком.

## Next Action Requested

- `accept` | `re-review` | `fix-worker` | `escalate`

## Риски / Эскалации

- <риск, блокер, вопрос> или `none`
```

### 3.1. Micro-Worker Handoff (micro-worker → orchestrator)

Сокращённый handoff для trivial bounded slices (micro-task из §2.1).

Required:

- что сделано
- change manifest
- checks evidence
- review disposition
- next action

Optional:

- риски / эскалации, если есть

```md
# Micro-Worker Handoff

## Что сделано

- <кратко, 1-3 bullets>
- файлы: <список>

## Change Manifest

- owned files changed: <список>
- out-of-scope files touched: `none` | <список>

## Checks Evidence

- <команда>: <green|red> `fresh` | `not run` — <reason>

## Review Disposition

- code-reviewer: <OK | findings summary>
- rationale: <почему>

## Next Action

- `accept` | `fix-worker` | `escalate`

## Риски / Эскалации

- <риск, блокер, вопрос> или `none`
```

## 4. Report (orchestrator → lead-strategic)

Файл: `docs/agents/orchestrator/last_report.md`

### 4.1. Full Report

Используется для multi-slice, risky или cross-layer задач.

Required:

- report type
- status
- done summary
- plan sync
- review disposition
- checks evidence
- readiness

Optional:

- findings by severity, если review запускался или были исправления по findings
- strategic cadence summary, если slice или wave требуют reframe/mode decision
- usage telemetry summary, если нужен durable optimization signal
- governance summary, если обсуждались architecture/baseline passes
- branches, если branch choreography важен для приёмки
- agent effort (workers, review passes, codex calls) — для cost awareness
- questions, если нужен strategic input
- extra sections (`Doc Updates`, `Fixes`, `Audit`), если реально помогают приёмке

```md
# Report: <название задачи>

## Report Type

`full`

## Статус

<выполнено | частично | заблокировано>

## Что сделано

- ST-1: <статус, краткое описание>
- ST-2: <статус>

## Plan Sync

- current_plan.md: `unchanged` | `updated by lead-strategic/Codex` | `pending strategic update`
- plan change requests: `none` | `PCR-...`
- operating mode at handoff: `high-risk iterative / unstable wave` | `ordinary iterative` | `batch / low-risk` | `not involved`
- mode change signal: `none` | `consider <from> -> <to>`

## Review Disposition

- minimum independent review floor: `satisfied` | `N/A — no product code`
- integration review: `run` | `skipped` | `not applicable`
- rationale: <почему>

## Strategic Cadence

- next-slice impact: `none` | `local reframe` | `strategic re-slice`
- strategic-reviewer yield: `meaningful` | `low-yield` | `not run`
- strategic-reviewer model: `gpt-5.4-mini` | `gpt-5.4` | `not run`
- why strategic-reviewer was run: <risk signal> | `none`
- cross-model value: `found likely missed bug/regression` | `found acceptance/reframe signal` | `no additional value` | `not run`
- cadence note: <кратко> | `none`

## Findings по severity

**CRITICAL**:

- <reviewer: файл:строка — описание> или `none`

**WARNING**:

- <reviewer: описание — что сделано>

**INFO**:

- <заметки>

## Reviewer Verdicts

- architecture-reviewer: OK | N issues
- security-reviewer: OK | N issues
- docs-reviewer: OK | N updates
- code-reviewer: OK | N issues
- ui-reviewer: OK | N issues

## Governance Summary

- architecture pass: `not needed` | `summarized inline` | `see artifact`
- baseline pass: `not needed` | `summarized inline` | `see artifact`
- exceptions / waivers touched: `none` | `EXC-...`
- rationale: <кратко>

## Checks Evidence

- `pnpm check`: <green|red> `fresh` | `not run` — <reason>
- `pnpm build`: <green|red> `fresh` | `not run` — <reason>
- `pnpm lint:boundaries`: <green|red> `fresh` | `not run` — <reason>
- other: <command/result> `fresh` | `none`

## Ветки

- integration branch: feature/<topic>
- worker branches merged: agent/worker/<slug> | `none`
- review diff: `git diff main..feature/<topic>` | `not applicable`

## Agent Effort

- workers spawned: <N>
- review passes: <N> (slice: N, integration: N)
- codex calls: <N> (`--fresh`: N, `--resume`: N)

## Usage Telemetry

- agent value: `meaningful` | `neutral` | `excessive`
- agent value reason: <кратко> | `none`
- orchestration value: `efficient` | `acceptable` | `overbuilt`
- optimization note: <что менять в будущем> | `none`

## Wave DoD Status (optional — only at wave close)

Per `docs/agents/definition-of-done.md` Level 2:

- all slices accepted: <yes | no — which pending>
- docs sync: <done | gaps — what's missing>
- governance: <architecture pass: done/N/A | baseline pass: done/N/A>
- test baseline: <N (was M at wave start)>

## Готовность

<готово к merge | нужно решение lead-strategic | нужна доработка>

## Вопросы к lead-strategic

- <вопрос> или `none`
```

### 4.2. Lightweight Report

Используется для docs-only change, direct-fix или low-risk one-slice worker-owned batch.

Required:

- report type
- status
- what changed
- checks evidence
- review disposition
- readiness

Optional:

- plan sync, если был strategic loop
- strategic cadence summary, если есть signal для reframe/mode change
- usage telemetry summary, если нужен durable optimization signal
- governance summary, если change touched docs/contracts/boundaries
- agent effort, для cost awareness
- questions, если нужен strategic input

```md
# Report: <название задачи>

## Report Type

`lightweight`

## Статус

<выполнено | частично | заблокировано>

## Что изменено

- <краткий summary>

Для `direct-fix` допускается одна строка:

- `direct-fix: <file> — <что исправлено>`

## Plan Sync (optional — опусти, если strategic loop не задействовался)

- current_plan.md: `unchanged` | `updated by lead-strategic/Codex` | `not involved`
- plan change requests: `none` | `PCR-...`
- operating mode at handoff: `high-risk iterative / unstable wave` | `ordinary iterative` | `batch / low-risk` | `not involved`
- mode change signal: `none` | `consider <from> -> <to>`

## Review Disposition

- minimum independent review floor: `satisfied` | `N/A — no product code` | `N/A — direct-fix protocol`
- slice/integration review: `run` | `skipped` | `not applicable`
- rationale: <почему>

## Strategic Cadence (optional — опусти, если strategic-reviewer не запускался)

- next-slice impact: `none` | `local reframe` | `strategic re-slice`
- strategic-reviewer yield: `meaningful` | `low-yield` | `not run`
- strategic-reviewer model: `gpt-5.4-mini` | `gpt-5.4` | `not run`
- why strategic-reviewer was run: <risk signal> | `none`
- cross-model value: `found likely missed bug/regression` | `found acceptance/reframe signal` | `no additional value` | `not run`
- cadence note: <кратко> | `none`

## Governance Summary (optional — опусти, если change не затрагивал docs/contracts/boundaries)

- architecture/baseline follow-up: `none` | <кратко>

## Checks Evidence

- <команда>: <green|red|not run> — <where / reason>

## Agent Effort (optional — опусти для trivial one-liner)

- workers spawned: <N>
- review passes: <N>
- codex calls: <N>

## Usage Telemetry (optional — опусти для trivial low-risk задач)

- agent value: `meaningful` | `neutral` | `excessive`
- agent value reason: <кратко> | `none`
- orchestration value: `efficient` | `acceptable` | `overbuilt`
- optimization note: <что менять в будущем> | `none`

## Готовность

<готово к merge | нужно решение lead-strategic | нужна доработка>

## Вопросы к lead-strategic

- <вопрос> или `none`
```

### 4.3. Governance Closeout Report

Используется для verification/docs/baseline closure slice без нового feature implementation.

Required:

- report type
- status
- closure summary
- governance disposition
- checks evidence
- readiness

Optional:

- plan sync
- bounded fixes done during verification
- agent effort, для cost awareness
- usage telemetry summary, если verification materially учит agent model
- linked durable artifact, если baseline/architecture verdict должен жить дольше отчёта

```md
# Report: <название задачи>

## Report Type

`governance-closeout`

## Статус

<выполнено | частично | заблокировано>

## Что закрыто

- <какая wave / verification slice / docs alignment закрыта>
- <что реально проверено или исправлено>

## Plan Sync

- current_plan.md: `unchanged` | `updated by lead-strategic/Codex` | `not involved`
- plan change requests: `none` | `PCR-...`

## Governance Disposition

- architecture pass: `not needed` | `summarized inline` | `see artifact`
- baseline pass: `not needed` | `summarized inline` | `see artifact`
- review gate: `skipped` | `not applicable` | `run`
- rationale: <почему>

## Baseline Verification

- status: `Red | Yellow | Green` | `not assessed`
- verdict: `baseline not closed` | `baseline conditionally open` | `baseline closed` | `not applicable`
- known exceptions touched: `none` | `EXC-...`

## Checks Evidence

- `pnpm check`: <green|red> `fresh` | `not run` — <reason>
- `pnpm build`: <green|red> `fresh` | `not run` — <reason>
- `pnpm lint:boundaries`: <green|red> `fresh` | `not run` — <reason>
- other: <command/result> `fresh` | `none`

## Fixes During Verification

- <опционально: что пришлось поправить по итогам проверки>

## Agent Effort

- workers spawned: <N>
- review passes: <N>
- codex calls: <N>

## Usage Telemetry

- agent value: `meaningful` | `neutral` | `excessive`
- agent value reason: <кратко> | `none`
- orchestration value: `efficient` | `acceptable` | `overbuilt`
- optimization note: <что менять в будущем> | `none`

## Готовность

<готово к merge | нужно решение lead-strategic | нужна доработка>
```

## 5. Review Request (orchestrator → reviewer)

Передаётся при запуске субагента-ревьюера.

Required:

- changed files
- diff
- architecture context
- focus

Optional (by role):

- required reads — canonical docs, которые reviewer обязан прочитать до начала review. Нужны для reviewer'ов, зависящих от project-wide reference docs:
  - **architecture-reviewer:** `docs/agents/invariants.md` + domain overlay (e.g. `docs/agents/invariants-emis.md`) + exceptions registry (e.g. `docs/emis_known_exceptions.md`) — если применимы
  - **docs-reviewer:** `db/schema_catalog.md` — если diff затрагивает DB schema или contracts
  - остальные reviewer'ы (code, security, ui): не требуют required reads, их `.claude/agents/` definitions самодостаточны

```md
Changed files:
<список файлов>

Diff (slice diff или git diff main..feature/<topic>):
<содержимое diff>

Architecture context:

- contour: <platform/shared | domain operational | domain BI/read-side> (e.g. EMIS operational, EMIS BI/read-side)
- expected home: <packages/... | apps/web/...>
- exceptions / waivers touched: <none | EXC-...>

Required Reads (optional — include for architecture-reviewer, docs-reviewer):

- <docs/agents/invariants.md>
- <domain overlay, e.g. docs/agents/invariants-emis.md>
- <exceptions registry, e.g. docs/emis_known_exceptions.md>

Focus: <на что обратить внимание>
```

## 6. Review Result (reviewer → orchestrator)

Required:

- verdict
- findings
- required follow-ups

```md
# Review: <role name>

Verdict: OK | request changes | needs design decision

Findings:

- [CRITICAL|WARNING|INFO] file:line | [route] — description
- или `No issues found.`

Required follow-ups:

- <что нужно исправить>
- или `none`
```

## 7. Strategic Review Request (lead-strategic → strategic-reviewer)

Передаётся при запуске bounded strategic acceptance/reframe pass.

Required:

- goal
- inputs
- questions

```md
# Strategic Review Request

Goal:
<что нужно проверить: acceptance readiness, plan fit, next-slice impact, mode validity, likely missed bugs/regressions>

Inputs:

- current plan: `docs/agents/lead-strategic/current_plan.md`
- orchestrator report: `docs/agents/orchestrator/last_report.md`
- current operating mode: `high-risk iterative / unstable wave` | `ordinary iterative` | `batch / low-risk`
- reviewer verdicts / risk signal: <почему нужен cross-model pass>
- changed files: <список>
- diff: <ссылка/вставка/summary>
- canonical docs: <2-4 документа максимум>

Questions:

- <вопрос 1>
- <вопрос 2>
```

## 8. Strategic Review Result (strategic-reviewer → lead-strategic)

Required:

- model
- operating mode
- verdict
- findings
- plan fit
- next-slice impact
- reframe needed
- yield
- cross-model value
- recommended next step

```md
# Strategic Review

Model:

- `gpt-5.4-mini` | `gpt-5.4`

Operating Mode:

- current: `high-risk iterative / unstable wave` | `ordinary iterative` | `batch / low-risk`
- mode change: `none` | `<from> -> <to>`
- mode change rationale: <почему> | `none`

Verdict: accept-ready | needs follow-up | needs strategic decision

Findings:

- [CRITICAL|WARNING|INFO] file:line | <описание>
- или `No issues found.`

Plan Fit:

- <соответствует плану / есть scope drift / есть недоделанный acceptance item>

Next-Slice Impact:

- <без изменений / локальный reframe / нужен strategic re-slice>

Reframe Needed:

- `none` | `local` | `strategic`

Yield:

- `meaningful` | `low-yield`

Cross-Model Value:

- `found likely missed bug/regression` | `found acceptance/reframe signal` | `no additional value`

Recommended next step:

- <accept | request fixes | re-slice | escalate>
```

## 9. Baseline Verdict (baseline pass → lead-strategic / user)

Файл или сообщение по итогам stabilization check.

Используй как отдельный artifact только если verdict должен пережить текущий `last_report.md`.

Required:

- status
- verdict
- why
- checks
- allowed next work
- required follow-ups

Optional:

- known exceptions, если они есть

```md
# Baseline Verdict

Status: Red | Yellow | Green
Verdict: baseline not closed | baseline conditionally open | baseline closed

Why:

- <reason 1>
- <reason 2>

Checks:

- `pnpm check`: <green|red|not run>
- `pnpm build`: <green|red|not run>
- `pnpm lint:boundaries`: <green|red|not run>
- domain-specific smoke tests (per command, if any):
  - `<command>`: <green|red|not run>
  - or `not required` if domain has no smoke suite

Known Exceptions:

- <id> — owner: <role/person>, expiry: <wave/date>, note: <short reason>
- или `none`

Allowed Next Work:

- <what is allowed while this status stands>

Required Follow-ups:

- <item>
- или `none`
```

## 10. Architecture Pass Decision (architecture pass → lead-strategic / orchestrator)

Файл или сообщение по итогам bounded architecture-governance pass.

Используй как отдельный artifact только если decision должен пережить текущий `last_report.md`.

Required:

- decision
- context
- why
- allowed implementation scope

Optional:

- exception / waiver, если он реально появился
- required doc updates, если они нужны

```md
# Architecture Pass Decision

Decision: approve placement | approve with exception | request reshape | needs strategic escalation

Context:

- contour: <platform/shared | domain operational | domain BI/read-side> (e.g. EMIS operational, EMIS BI/read-side)
- reusable home: <packages/... | not applicable>
- app-leaf touch points: <apps/web/... | none>

Why:

- <reason 1>
- <reason 2>

Exception / waiver:

- <EXC-id — owner, expiry, short note>
- или `none`

Required doc updates:

- <doc or `none`>

Allowed implementation scope:

- <what may proceed next>
```

## 11. Plan Change Request (orchestrator → lead-strategic / Codex)

Используется, когда execution reality требует semantic reframe плана.

Required:

- triggered by
- requested change
- why now
- evidence
- decision needed

```md
# Plan Change Request: <PCR-id / short title>

Triggered by:

- slice: <ST-N>
- reason: <что выяснилось в реализации / review / strategic pass>

Requested change:

- current wording: <что было в плане>
- proposed wording: <что должно стать>
- impact on next slices: <что сдвигается / добавляется / упрощается>

Why now:

- <почему без этого нельзя безопасно продолжать dependent work>

Evidence:

- changed files / diff summary
- findings / checks, которые к этому привели

Decision needed:

- approve and rewrite `current_plan.md`
- reject and continue current plan
- escalate to strategic decision
```

## 12. Usage Log Entry (orchestrator → runtime/agents/usage-log.ndjson)

Append-only telemetry entry для optimization analytics.

Required:

- timestamp
- task_id
- wave_id
- stage
- report_type
- operating mode
- status

Полная схема required/optional fields: `usage-telemetry.md` §3.

Core fields (always required):

```json
{
  "timestamp": "2026-04-06T14:25:00+03:00",
  "task_id": "<task-id>",
  "wave_id": "<wave-id>",
  "stage": "slice-acceptance | final-acceptance | governance-closeout",
  "report_type": "full | lightweight | governance-closeout",
  "operating_mode": "high-risk iterative / unstable wave | ordinary iterative | batch / low-risk",
  "status": "accept | accept_with_adjustments | reject | re_slice"
}
```

Extended и optional fields (effort, findings, usefulness, cross-model value и др.): `usage-telemetry.md` §3.
Полный пример со всеми полями: `usage-telemetry.md` §3, Minimal example.

## 13. Transparency Request (orchestrator → worker / reviewer)

Используется, когда handoff или review verdict недостаточен для приёмки, но `orchestrator` не должен открывать raw diff или исходники сам.

Required:

- request type
- target scope
- question
- expected output format

Allowed request types:

- `EXPLAIN_DIFF`
- `EXPLAIN_DECISION`
- `SHOW_STRUCTURE`
- `SHOW_IMPACT`
- `ALTERNATIVE_APPROACH`
- `DOCUMENT_RISK`
- `VERIFY_INVARIANT`
- `CHECK_STATUS`

```md
# Transparency Request

Request Type:

- `EXPLAIN_DIFF` | `EXPLAIN_DECISION` | `SHOW_STRUCTURE` | `SHOW_IMPACT` | `ALTERNATIVE_APPROACH` | `DOCUMENT_RISK` | `VERIFY_INVARIANT` | `CHECK_STATUS`

Target Scope:

- slice: <ST-N / worker name / review pass>
- files/modules: <список или `not needed`>

Question:

- <что именно нужно прояснить>

Expected Output:

- format: bullets | table | short summary
- max detail: no raw diff dump, no full code listing

Why Needed:

- <почему без этого нельзя принять handoff / verdict>
```
