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
