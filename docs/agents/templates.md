# Agent Communication Templates

Все шаблоны коммуникации между агентами в одном месте.

## 1. План задачи (lead-strategic → lead-tactical)

Файл: `docs/agents/lead-strategic/current_plan.md`

```md
# Plan: <название задачи>

## Цель
<что нужно сделать и зачем>

## Подзадачи

### ST-1: <название>
- scope: <файлы/слои>
- depends on: — (или ST-N)
- размер: S | M | L
- заметки: <ограничения, подсказки>

### ST-2: <название>
- scope: <файлы/слои>
- depends on: ST-1
- размер: M
- заметки:

## Ограничения
- <что нельзя трогать>
- <архитектурные требования>

## Ожидаемый результат
- <что должно работать после выполнения>
- <какие файлы/контракты появятся или изменятся>
```

## 2. Задача worker'у (lead-tactical → worker)

Передаётся через Agent spawn или SendMessage.

```md
# Task: <название>

## Что сделать
<чёткое описание, что реализовать>

## Scope
- файлы: <список>
- слои: route UI | widgets | entities | server/emis | db/docs
- НЕ трогать: <файлы/модули вне scope>

## Ветки
- integration branch: feature/<topic> (куда lead-tactical смержит результат)
- worker branch: agent/worker/<task-slug> (твоя ветка, коммить сюда)

## Архитектурные ограничения
- <релевантные правила из workflow.md секция 6>

## Проверки
- TypeScript: без ошибок в затронутых файлах
- <специфичные проверки>

## Формат сдачи
Используй шаблон "Worker Handoff" из этого файла (секция 3).
```

## 3. Результат worker'а (worker → lead-tactical)

```md
# Worker Handoff

## Задача
<что было поручено>

## Что сделано
- <что реализовано>
- ключевые файлы: <список>
- почему такое placement: <обоснование>

## Ветки
- worker branch: <agent/worker/slug> (или integration branch если работал напрямую)
- integration branch: <feature/topic>

## Допущения
- <допущение или "нет">

## Проверки
- <команда>: <результат>

## Риски / Эскалации
- <риск или "нет">
- <что осталось нерешённым>
```

## 4. Report (lead-tactical → lead-strategic)

Файл: `docs/agents/lead-tactical/last_report.md`

```md
# Report: <название задачи>

## Статус
<выполнено | частично | заблокировано>

## Что сделано
- ST-1: <статус, краткое описание>
- ST-2: <статус>

## Review Gate

### Findings по severity

**CRITICAL** (блокирует merge):
- <reviewer: файл:строка — описание> или "нет"

**WARNING** (исправлено / принято с обоснованием):
- <reviewer: описание — что сделано>

**INFO**:
- <заметки>

### Вердикты ревьюеров
- architecture-reviewer: OK | N issues
- security-reviewer: OK | N issues
- docs-reviewer: OK | N updates
- code-reviewer: OK | N issues
- ui-reviewer: OK | N issues | не запускался

### Architecture / exceptions
- architecture-steward: not needed | approve placement | approve with exception | needs strategic escalation
- known exceptions / waivers touched: `none` | `EXC-...`

## Ветки
- integration branch: feature/<topic>
- worker branches merged: agent/worker/<slug> (если были)
- review diff: `git diff main..feature/<topic>` (всегда по integration branch)

## Готовность
<готово к merge | нужно решение lead-strategic | нужна доработка>

## Вопросы к lead-strategic
- <вопрос или "нет">
```

## 5. Review Request (lead-tactical → reviewer)

Передаётся при запуске субагента-ревьюера.

```md
Changed files:
<список файлов>

Diff (git diff main..feature/<topic>):
<содержимое diff>

Architecture context:
- contour: <platform/shared | EMIS operational | EMIS BI/read-side>
- expected home: <packages/... | apps/web/...>
- exceptions / waivers touched: <none | EXC-...>

Focus: <на что обратить внимание>
```

## 6. Review Result (reviewer → lead-tactical)

```md
# Review: <role name>

Verdict: OK | request changes | needs design decision

Findings:
- [CRITICAL|WARNING|INFO] file:line | [route] — description
- или "No issues found."

Required follow-ups:
- <что нужно исправить> или "none"
```

## 7. Strategic Review Request (lead-strategic → strategic-reviewer)

Передаётся при запуске optional sidecar-review.

```md
# Strategic Review Request

Goal:
<что нужно проверить: plan fit, report quality, acceptance readiness, scope drift>

Inputs:
- current plan: `docs/agents/lead-strategic/current_plan.md`
- tactical report: `docs/agents/lead-tactical/last_report.md`
- changed files: <список>
- diff: <ссылка/вставка/summary>
- canonical docs: <2-4 документа максимум>

Questions:
- <вопрос 1>
- <вопрос 2>
```

## 8. Strategic Review Result (strategic-reviewer → lead-strategic)

```md
# Strategic Review

Verdict: accept-ready | needs follow-up | needs strategic decision

Findings:
- [CRITICAL|WARNING|INFO] file:line | <описание>
- или "No issues found."

Plan Fit:
- <соответствует плану / есть scope drift / есть недоделанный acceptance item>

Recommended next step:
- <accept | request fixes | re-slice | escalate>
```

## 9. Baseline Verdict (baseline-governor → lead-strategic / user)

Файл или сообщение по итогам stabilization check.

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

## 10. Architecture Steward Decision (architecture-steward → lead-strategic / lead-tactical)

Файл или сообщение по итогам bounded architecture-governance pass.

```md
# Architecture Steward Decision

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
