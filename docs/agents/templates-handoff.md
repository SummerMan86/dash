# Worker Handoff Templates

Шаблоны сдачи результата от worker'а к orchestrator'у.

Правила заполнения: `docs/agents/templates.md` §0.

## 1. Worker Handoff (worker → orchestrator)

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

## 2. Micro-Worker Handoff (micro-worker → orchestrator)

Сокращённый handoff для trivial bounded slices (micro-task).

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
