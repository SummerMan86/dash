# Agent Roles

Инструкции для пользователя: [user-guide.md](./user-guide.md)

## Role Map

| Роль | Агент | Модель | Технология | Persistence | Задача |
|---|---|---|---|---|---|
| **lead-strategic** | GPT-5.4 | GPT-5.4 | Отдельный чат | Между сессиями (memory.md) | Планирование, декомпозиция, приёмка |
| **strategic-reviewer** | GPT-5.4 sidecar | GPT-5.4-mini / GPT-5.4 | **Subagent** (on-demand) | По вызову, reuse в рамках текущей сессии при необходимости | Узкая strategic second opinion по plan/report/diff |
| **baseline-governor** | GPT-5.4 governance role | GPT-5.4 | Отдельный чат или bounded strategic loop | Между сессиями (memory.md) | Baseline status, known exceptions, stabilization verdict |
| **lead-tactical** | Claude Opus | Opus | tmux pane #0 | Сессия + memory.md | Управление, Review Gate, отчёты |
| **worker** | Claude | Opus/Sonnet | **Agent Teams** (teammate, tmux pane) | Сессия + memory.md | Реализация подзадачи |
| **architecture-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | FSD boundaries, complexity |
| **security-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | SQL injection, XSS, secrets |
| **docs-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | Docs/contracts sync |
| **code-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | Naming, conventions |
| **ui-reviewer** | Claude | Sonnet/Opus | **Subagent** (on-demand) | По вызову, reuse если был создан | Smoke / deep UX (Chrome) |

## Коротко по ролям

- `lead-strategic` — планирует, декомпозирует, принимает результат.
- `strategic-reviewer` — optional sidecar-review для `lead-strategic`; сам решения не принимает, только даёт bounded verdict/risks.
- `baseline-governor` — держит stabilization baseline, known exceptions registry и verdict `baseline closed | not closed`.
- `lead-tactical` — исполняет план, управляет workers, запускает Review Gate.
- `worker` — реализует одну подзадачу в рамках scope и сдаёт handoff.
- `*-reviewer` — read-only review по своей зоне ответственности на интегрированном diff.

Гибридная модель остаётся такой:

- `worker = teammate` с полным контекстом проекта.
- `reviewer = subagent` с минимальным review-контекстом.
- `strategic-reviewer = optional GPT sidecar` с узким контекстом (`current_plan`, `last_report`, diff, 2-4 canonical docs).
- `baseline-governor = governance role` с узким фокусом на baseline, exceptions и merge/block decisions during stabilization waves.

## Instructions и Memory

- `instructions.md` — role-specific правила и чеклисты.
- `memory.md` — персистентная память роли между сессиями.

Canonical процесс, lifecycle, escalation и branch protocol: `docs/agents/workflow.md`.
Canonical шаблоны plan/handoff/report/review: `docs/agents/templates.md`.
