# Agent Roles

Инструкции для пользователя: [user-guide.md](./user-guide.md)

## Role Map

| Роль                      | Агент                                | Модель                 | Технология                               | Persistence                                                | Задача                                                                            |
| ------------------------- | ------------------------------------ | ---------------------- | ---------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **lead-strategic**        | GPT-5.4                              | GPT-5.4                | Codex thread                                      | Между сессиями (memory.md)                                 | Планирование, декомпозиция, приёмка                                               |
| **strategic-reviewer**    | bounded pass внутри `lead-strategic` | GPT-5.4-mini / GPT-5.4 | тот же Codex thread (mini-sidecar = gpt-5.4-mini call внутри thread) | Session-level внутри `lead-strategic`, без отдельного `memory.md` | Strategic acceptance/reframe safety net по plan/report/diff и next-slice impact   |
| **lead-tactical**         | Claude Opus                          | Opus                   | tmux pane #0                             | Сессия + memory.md                                         | Tactical orchestration, dispatch, Review Gate, отчёты                             |
| **worker**                | Claude                               | Opus/Sonnet            | **Agent Teams** (teammate, default); subagent+worktree при trigger criteria из `git-protocol.md` §4 | Сессия (teammate context only)                             | Реализация подзадачи                                                              |
| **architecture-reviewer** | Claude                               | Sonnet                 | **Subagent** (fresh per review)          | Нет; каждый pass с чистого листа                           | Diff review по package/app boundaries, EMIS contour split, complexity             |
| **security-reviewer**     | Claude                               | Sonnet                 | **Subagent** (fresh per review)          | Нет; каждый pass с чистого листа                           | SQL injection, XSS, secrets                                                       |
| **docs-reviewer**         | Claude                               | Sonnet                 | **Subagent** (fresh per review)          | Нет; каждый pass с чистого листа                           | Docs/contracts sync                                                               |
| **code-reviewer**         | Claude                               | Sonnet                 | **Subagent** (fresh per review)          | Нет; каждый pass с чистого листа                           | Naming, conventions                                                               |
| **ui-reviewer**           | Claude                               | Sonnet/Opus            | **Subagent** (fresh per review)          | Нет; каждый pass с чистого листа                           | Smoke / deep UX (Chrome)                                                          |

## Коротко по ролям

- `lead-strategic` — планирует, декомпозирует, принимает результат.
- `strategic-reviewer` — bounded strategic pass внутри `lead-strategic`; помогает принять текущий slice и уточнить план следующего, но не становится отдельным plan owner.
- `lead-tactical` — tactical-orchestrator: исполняет execution flow, управляет workers, запускает Review Gate, собирает report.
- `worker` — реализует одну подзадачу в рамках scope и сдаёт handoff. По умолчанию teammate в shared checkout; subagent+worktree при необходимости файловой изоляции (`git-protocol.md` §4).
- `architecture-reviewer` — bounded read-only review по diff своего уровня: slice diff у worker или integrated diff у `lead-tactical`; если нужен новый placement/waiver verdict, эскалирует в architecture pass у `lead-strategic`.
- `*-reviewer` — read-only review по своей зоне ответственности на том diff scope, который им передали: slice-level или integration-level.

## Governance Passes

Это не отдельные decision owners, а режимы `lead-strategic`.
Canonical definition и lifecycle: `docs/agents/review-gate.md`.

- `architecture pass` — placement, exception/waiver, cross-layer pre-approval
- `baseline pass` — baseline status, truthful checks, open/close следующей wave

Гибридная модель остаётся такой:

- `worker = teammate` (default) в shared checkout с полным контекстом проекта; subagent+worktree при trigger criteria из `git-protocol.md` §4.
- `reviewer = fresh subagent` с минимальным review-контекстом и без persistent review memory.
- отдельной top-level роли `orchestrator` нет: orchestration входит в `lead-tactical`.
- `strategic-reviewer = bounded strategic pass` внутри того же `lead-strategic` контекста; cadence задаётся выбранным operating mode и может меняться после post-slice reframe.
- `architecture pass` и `baseline pass` — не отдельные агенты, а именованные governance modes внутри `lead-strategic`.

## Instructions и Memory

- `instructions.md` — role-specific правила и чеклисты.
- `memory.md` — персистентная память роли между сессиями там, где роль действительно держит durable context. В текущей модели это canonical memory только для `lead-strategic` и `lead-tactical`; governance passes пишут durable state в `lead-strategic/memory.md` или в отдельный governance artifact, если решение должно пережить текущий report.

Canonical процесс: `docs/agents/workflow.md`.
Canonical review/governance model: `docs/agents/review-gate.md`.
Canonical invariants: `docs/agents/invariants.md`.
Canonical git/worktree protocol: `docs/agents/git-protocol.md`.
Canonical memory ownership: `docs/agents/memory-protocol.md`.
Canonical шаблоны plan/handoff/report/review: `docs/agents/templates.md`.
