# Agent Roles

Инструкции для пользователя: [user-guide.md](./user-guide.md)

## Role Map

| Роль                      | Агент                                | Модель                 | Технология                               | Persistence                                                | Задача                                                                            |
| ------------------------- | ------------------------------------ | ---------------------- | ---------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **lead-strategic**        | GPT-5.4                              | GPT-5.4                | Отдельный чат                            | Между сессиями (memory.md)                                 | Планирование, декомпозиция, приёмка                                               |
| **strategic-reviewer**    | GPT-5.4 sidecar                      | GPT-5.4-mini / GPT-5.4 | **Subagent** (on-demand)                 | По вызову, reuse в рамках текущей сессии при необходимости | Узкая strategic second opinion по plan/report/diff                                |
| **architecture-steward**  | GPT-5.4 architecture governance role | GPT-5.4                | Отдельный чат или bounded strategic loop | Между сессиями (memory.md)                                 | Canonical architecture docs, placement decisions, architecture waivers/exceptions |
| **baseline-governor**     | GPT-5.4 baseline governance role     | GPT-5.4                | Отдельный чат или bounded strategic loop | Между сессиями (memory.md)                                 | Baseline status, known exceptions validation, stabilization verdict               |
| **lead-tactical**         | Claude Opus                          | Opus                   | tmux pane #0                             | Сессия + memory.md                                         | Управление, Review Gate, отчёты                                                   |
| **worker**                | Claude                               | Opus/Sonnet            | **Agent Teams** (teammate, tmux pane)    | Сессия + memory.md                                         | Реализация подзадачи                                                              |
| **architecture-reviewer** | Claude                               | Sonnet                 | **Subagent** (session-persistent)        | Сессия (reuse через SendMessage)                           | Diff review по package/app boundaries, EMIS contour split, complexity             |
| **security-reviewer**     | Claude                               | Sonnet                 | **Subagent** (session-persistent)        | Сессия (reuse через SendMessage)                           | SQL injection, XSS, secrets                                                       |
| **docs-reviewer**         | Claude                               | Sonnet                 | **Subagent** (session-persistent)        | Сессия (reuse через SendMessage)                           | Docs/contracts sync                                                               |
| **code-reviewer**         | Claude                               | Sonnet                 | **Subagent** (session-persistent)        | Сессия (reuse через SendMessage)                           | Naming, conventions                                                               |
| **ui-reviewer**           | Claude                               | Sonnet/Opus            | **Subagent** (on-demand)                 | По вызову, reuse если был создан                           | Smoke / deep UX (Chrome)                                                          |

## Коротко по ролям

- `lead-strategic` — планирует, декомпозирует, принимает результат.
- `strategic-reviewer` — optional sidecar-review для `lead-strategic`; сам решения не принимает, только даёт bounded verdict/risks.
- `architecture-steward` — держит canonical architecture story, placement rules, pre-approval для cross-layer changes и новые architecture waivers/exceptions.
- `baseline-governor` — держит stabilization baseline, валидирует truthful status known exceptions registry и выносит verdict `baseline closed | not closed`.
- `lead-tactical` — исполняет план, управляет workers, запускает Review Gate.
- `worker` — реализует одну подзадачу в рамках scope и сдаёт handoff.
- `architecture-reviewer` — bounded read-only review по интегрированному diff; если нужен новый placement/waiver verdict, эскалирует к `architecture-steward`.
- `*-reviewer` — read-only review по своей зоне ответственности на интегрированном diff.

Гибридная модель остаётся такой:

- `worker = teammate` с полным контекстом проекта.
- `reviewer = subagent` с минимальным review-контекстом.
- `strategic-reviewer = optional GPT sidecar` с узким контекстом (`current_plan`, `last_report`, diff, 2-4 canonical docs).
- `architecture-steward = governance/design role` с узким контекстом (`current_plan`, canonical architecture docs, known exceptions, changed boundaries`). Обычно это тот же GPT-5.4 оператор, что и `lead-strategic`, но в отдельном bounded governance pass, а не второй product lead.
- `baseline-governor = governance role` с узким фокусом на baseline, truthful checks, registry validation и merge/block decisions during stabilization waves.

## Instructions и Memory

- `instructions.md` — role-specific правила и чеклисты.
- `memory.md` — персистентная память роли между сессиями.

Canonical процесс, lifecycle, escalation и branch protocol: `docs/agents/workflow.md`.
Canonical шаблоны plan/handoff/report/review: `docs/agents/templates.md`.
