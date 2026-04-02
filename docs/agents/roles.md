# Agent Roles

Инструкции для пользователя: [user-guide.md](./user-guide.md)

## Role Map

| Роль | Агент | Модель | Технология | Persistence | Задача |
|---|---|---|---|---|---|
| **lead-strategic** | GPT-5.4 | GPT-5.4 | Отдельный чат | Между сессиями (memory.md) | Планирование, декомпозиция, приёмка |
| **lead-tactical** | Claude Opus | Opus | tmux pane #0 | Сессия + memory.md | Управление, Review Gate, отчёты |
| **worker** | Claude | Opus/Sonnet | **Agent Teams** (teammate, tmux pane) | Сессия + memory.md | Реализация подзадачи |
| **architecture-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | FSD boundaries, complexity |
| **security-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | SQL injection, XSS, secrets |
| **docs-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | Docs/contracts sync |
| **code-reviewer** | Claude | Sonnet | **Subagent** (session-persistent) | Сессия (reuse через SendMessage) | Naming, conventions |
| **ui-reviewer** | Claude | Sonnet/Opus | **Subagent** (on-demand) | По вызову, reuse если был создан | Smoke / deep UX (Chrome) |

## Коротко по ролям

- `lead-strategic` — планирует, декомпозирует, принимает результат.
- `lead-tactical` — исполняет план, управляет workers, запускает Review Gate.
- `worker` — реализует одну подзадачу в рамках scope и сдаёт handoff.
- `*-reviewer` — read-only review по своей зоне ответственности на интегрированном diff.

Гибридная модель остаётся такой:

- `worker = teammate` с полным контекстом проекта.
- `reviewer = subagent` с минимальным review-контекстом.

## Instructions и Memory

- `instructions.md` — role-specific правила и чеклисты.
- `memory.md` — персистентная память роли между сессиями.

Canonical процесс, lifecycle, escalation и branch protocol: `docs/agents/workflow.md`.
Canonical шаблоны plan/handoff/report/review: `docs/agents/templates.md`.
