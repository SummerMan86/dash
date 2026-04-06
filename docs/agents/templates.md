# Agent Communication Templates

Все шаблоны коммуникации между агентами в одном месте.

## 0. Правила заполнения

### Required vs Optional

- `Required` означает: секция должна присутствовать.
- `Optional` означает: секцию можно опустить целиком, если skip condition не сработал.
- Если нужен truthful negative signal по конкретной проверке, используй `not run`.
- Если целый блок не применим к задаче, не заполняй его `none/not applicable` построчно; опусти блок и зафиксируй причину в краткой секции-disposition.

### Report Types

У `lead-tactical` есть три canonical формата `last_report.md`:

| Report type | Когда использовать | Что обязательно |
| --- | --- | --- |
| `full` | multi-slice, cross-layer, risky implementation, полноценный integration review | plan sync, review findings/disposition, checks evidence, readiness |
| `lightweight` | trivial local fix, docs-only, one-slice batch, low-risk local change | status, done summary, checks evidence, review disposition, readiness |
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

## 1. План задачи (lead-strategic → lead-tactical)

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
- заметки: <опционально>

### ST-2: <название>

- scope: <файлы/слои>
- depends on: ST-1
- размер: M
- acceptance: <done-when для slice>
- заметки: <опционально>

## Ограничения

- <что нельзя трогать>
- <архитектурные требования>

## Ожидаемый результат

- <что должно работать после выполнения>
- <какие файлы/контракты появятся или изменятся>
```

## 2. Задача worker'у (lead-tactical → worker)

Передаётся через Agent spawn или SendMessage.

Required:

- что сделать
- scope
- что не трогать
- base branch / base checkpoint
- acceptance
- проверки

Optional:

- отдельные ветки, если worker не работает напрямую в integration branch
- архитектурные ограничения, если они важны для slice
- extra evidence hints, если нужны domain-specific checks

```md
# Task: <название>

## Что сделать

<чёткое описание, что реализовать>

## Scope

- файлы: <список>
- слои: route UI | widgets | entities | server/emis | db/docs
- НЕ трогать: <файлы/модули вне scope>

## Ветки

- integration branch: feature/<topic>
- worker branch: direct integration branch (default, teammate mode) | agent/worker/<task-slug> (subagent mode)
- base commit: <commit sha / checkpoint>

## Архитектурные ограничения

- <опционально: релевантные правила>

## Acceptance

- <что должно быть истинно, чтобы slice считался законченным>

## Проверки

- TypeScript: без ошибок в затронутых файлах
- <специфичные проверки>

## Evidence

- верни, какие проверки реально запускались, где и с каким итогом
- если ожидаемая проверка не запускалась, напиши `not run` и причину

## Формат сдачи

Используй шаблон `Worker Handoff` из этого файла.
```

## 3. Результат worker'а (worker → lead-tactical)

Required:

- задача
- что сделано
- проверки / evidence
- review disposition
- риски / эскалации, если есть

Optional:

- branches, если worker работал не напрямую в integration branch
- assumptions, если были реальные допущения
- detailed review results, только если slice review запускался

Skip conditions:

- `Review Results` можно опустить для trivial/docs-only slice; вместо этого укажи `Review Disposition`.
- `Допущения` можно опустить, если их нет.

```md
# Worker Handoff

## Задача

<что было поручено>

## Что сделано

- <что реализовано>
- ключевые файлы: <список>
- placement notes: <только если решение неочевидно>

## Ветки

- worker branch: direct integration branch (default) | agent/worker/<slug> (subagent mode)
- integration branch: <feature/topic>

## Допущения

- <опционально>

## Проверки

- <команда>: <результат>

## Checks Evidence

- <команда>: <green|red|not run> — <где запускалось / краткая причина>

## Review Disposition

- slice review: `run` | `skipped` | `not applicable`
- rationale: <почему>

## Review Results

- code-reviewer: <OK | findings summary>
- security-reviewer: <OK | findings summary>
- architecture-reviewer: <OK | findings summary>
- docs-reviewer: <OK | findings summary>
- ui-reviewer: <OK | findings summary>

## Риски / Эскалации

- <риск, блокер, вопрос> или `none`
```

## 4. Report (lead-tactical → lead-strategic)

Файл: `docs/agents/lead-tactical/last_report.md`

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

- `pnpm check`: <green|red|not run> — <where / reason>
- `pnpm build`: <green|red|not run> — <where / reason>
- `pnpm lint:boundaries`: <green|red|not run> — <where / reason>
- other: <command/result> | `none`

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

## Готовность

<готово к merge | нужно решение lead-strategic | нужна доработка>

## Вопросы к lead-strategic

- <вопрос> или `none`
```

### 4.2. Lightweight Report

Используется для trivial local fix, docs-only change или low-risk one-slice batch.

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

## Plan Sync (optional — опусти, если strategic loop не задействовался)

- current_plan.md: `unchanged` | `updated by lead-strategic/Codex` | `not involved`
- plan change requests: `none` | `PCR-...`
- operating mode at handoff: `high-risk iterative / unstable wave` | `ordinary iterative` | `batch / low-risk` | `not involved`
- mode change signal: `none` | `consider <from> -> <to>`

## Review Disposition

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

- `pnpm check`: <green|red|not run> — <where / reason>
- `pnpm build`: <green|red|not run> — <where / reason>
- `pnpm lint:boundaries`: <green|red|not run> — <where / reason>
- other: <command/result> | `none`

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

## 5. Review Request (lead-tactical → reviewer)

Передаётся при запуске субагента-ревьюера.

Required:

- changed files
- diff
- architecture context
- focus

```md
Changed files:
<список файлов>

Diff (slice diff или git diff main..feature/<topic>):
<содержимое diff>

Architecture context:

- contour: <platform/shared | EMIS operational | EMIS BI/read-side>
- expected home: <packages/... | apps/web/...>
- exceptions / waivers touched: <none | EXC-...>

Focus: <на что обратить внимание>
```

## 6. Review Result (reviewer → lead-tactical)

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
- tactical report: `docs/agents/lead-tactical/last_report.md`
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
- `pnpm emis:smoke`: <green|red|not run>
- `pnpm emis:offline-smoke`: <green|red|not run>
- `pnpm emis:write-smoke`: <green|red|not required>

Known Exceptions:

- <id> — owner: <role/person>, expiry: <wave/date>, note: <short reason>
- или `none`

Allowed Next Work:

- <what is allowed while this status stands>

Required Follow-ups:

- <item>
- или `none`
```

## 10. Architecture Pass Decision (architecture pass → lead-strategic / lead-tactical)

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

- contour: <platform/shared | EMIS operational | EMIS BI/read-side>
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

## 11. Plan Change Request (lead-tactical → lead-strategic / Codex)

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

## 12. Usage Log Entry (lead-tactical → runtime/agents/usage-log.ndjson)

Append-only telemetry entry для optimization analytics.

Required:

- timestamp
- task/wave identity
- stage
- operating mode
- effort summary
- usefulness summary

Полная схема required/optional fields: `usage-telemetry.md` §3.

```json
{
  "timestamp": "2026-04-06T14:25:00+03:00",
  "task_id": "<task-id>",
  "wave_id": "<wave-id>",
  "stage": "slice-acceptance | final-acceptance | governance-closeout",
  "slice_id": "<ST-N | null>",
  "report_type": "full | lightweight | governance-closeout",
  "operating_mode": "high-risk iterative / unstable wave | ordinary iterative | batch / low-risk",
  "status": "accept | accept_with_adjustments | reject | re_slice",
  "workers_spawned": 0,
  "review_passes_total": 0,
  "review_passes_by_type": {
    "slice": 0,
    "integration": 0,
    "strategic": 0
  },
  "codex_calls_total": 0,
  "strategic_reviewer_run": false,
  "strategic_reviewer_model": "not_run",
  "strategic_reviewer_reason": "none",
  "findings_summary": {
    "critical": 0,
    "warning": 0,
    "info": 0
  },
  "next_slice_impact": "none",
  "mode_change": "none",
  "agent_value": "meaningful | neutral | excessive",
  "agent_value_reason": "<why>",
  "orchestration_value": "efficient | acceptable | overbuilt",
  "optimization_note": "<future tuning note>",
  "cross_model_value": "found_likely_missed_bug | found_acceptance_or_reframe_signal | no_additional_value | not_applicable"
}
```
