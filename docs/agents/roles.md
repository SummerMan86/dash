# Agent Roles

Инструкции для пользователя: [user-guide.md](./user-guide.md)

## Role Map

| Роль | Агент | Модель | Технология | Persistence | Задача |
| --- | --- | --- | --- | --- | --- |
| **lead-strategic** | GPT-5.4 | GPT-5.4 | Codex thread | Между сессиями (`docs/agents/lead-strategic/memory.md`) | Планирование, декомпозиция, приёмка |
| **strategic-reviewer** | bounded pass внутри `lead-strategic` | GPT-5.4-mini / GPT-5.4 | тот же Codex thread (mini-sidecar = `gpt-5.4-mini` call внутри thread) | Session-level внутри `lead-strategic`, без отдельного `memory.md` | Strategic acceptance/reframe safety net по `plan/report/diff` и next-slice impact |
| **orchestrator** | Claude Opus | Opus | tmux pane #0 | Сессия + `docs/agents/orchestrator/memory.md` | Code-blind execution orchestration, worker dispatch, Review Gate, report |
| **worker** | Claude | Opus/Sonnet | **Subagent + worktree** (default for code-writing); teammate only as shared-checkout exception per `git-protocol.md` §4 | Session context only | Реализация одного slice; trivial slice идёт тем же worker'ом в `micro-worker` режиме |
| **architecture-reviewer** | Claude | Sonnet | **Subagent** (fresh per review) | Нет; каждый pass с чистого листа | Diff review по package/app boundaries, domain-overlay contour split, complexity |
| **security-reviewer** | Claude | Sonnet | **Subagent** (fresh per review) | Нет; каждый pass с чистого листа | SQL injection, XSS, secrets |
| **docs-reviewer** | Claude | Sonnet | **Subagent** (fresh per review) | Нет; каждый pass с чистого листа | Docs/contracts sync |
| **code-reviewer** | Claude | Sonnet | **Subagent** (fresh per review) | Нет; каждый pass с чистого листа | Naming, conventions |
| **ui-reviewer** | Claude | Sonnet/Opus | **Subagent** (fresh per review) | Нет; каждый pass с чистого листа | Smoke / deep UX (Chrome) |

## Коротко по ролям

- `lead-strategic` — планирует, декомпозирует, принимает результат.
- `strategic-reviewer` — bounded strategic pass внутри `lead-strategic`; помогает принять текущий slice и уточнить план следующего, но не становится отдельным plan owner.
- `orchestrator` — top-level execution role. Он держит orchestration-clean контекст, управляет workers/reviewers, принимает evidence и пишет report, но не пишет product code.
- `worker` — реализует одну подзадачу в рамках scope и сдаёт handoff. Любой implementation slice, включая trivial fix, идёт через worker; размер меняет только режим (`micro-worker` vs ordinary worker), а не owner роли.
- `architecture-reviewer` — bounded read-only review по diff своего уровня: slice diff у worker или integrated diff у integration review; если нужен новый placement/waiver verdict, эскалирует в architecture pass у `lead-strategic`.
- `*-reviewer` — read-only review по своей зоне ответственности на том diff scope, который им передали: slice-level или integration-level.

Compatibility note:

- `lead-tactical` — legacy alias роли `orchestrator`.
- Canonical durable artifacts живут по путям `docs/agents/orchestrator/memory.md` и `docs/agents/orchestrator/last_report.md`.
- Старые `docs/agents/lead-tactical/*` файлы оставлены как compatibility wrappers.
- Если prompt или doc всё ещё говорит `lead-tactical`, читать это как `orchestrator`, если не сказано иное.

## Governance Passes

Это не отдельные decision owners, а режимы `lead-strategic`.
Canonical definition и lifecycle: `docs/agents/review-gate.md`.

- `architecture pass` — placement, exception/waiver, cross-layer pre-approval
- `baseline pass` — baseline status, truthful checks, open/close следующей wave

Гибридная модель такая:

- `orchestrator = отдельная top-level execution role`, не feature-implementer.
- `worker = isolated subagent + worktree` по умолчанию для code-writing slices; teammate — только исключение для non-code shared-checkout work по `git-protocol.md` §4.
- parallel workers = всегда isolated subagents + worktrees; teammate path не используется для parallel execution.
- `reviewer = fresh subagent` с минимальным review-контекстом и без persistent review memory.
- `strategic-reviewer = bounded strategic pass` внутри того же `lead-strategic` контекста; cadence задаётся выбранным operating mode и может меняться после post-slice reframe.
- `architecture pass` и `baseline pass` — не отдельные агенты, а именованные governance modes внутри `lead-strategic`.

## Instructions и Memory

- `instructions.md` — role-specific правила и чеклисты.
- `memory.md` — персистентная память роли между сессиями там, где роль действительно держит durable context. В текущей модели canonical durable memory есть у `lead-strategic` и `orchestrator`; orchestrator memory хранится в `docs/agents/orchestrator/memory.md`.

Canonical процесс: `docs/agents/workflow.md`.
Canonical review/governance model: `docs/agents/review-gate.md`.
Canonical invariants: `docs/agents/invariants.md`.
Canonical git/worktree protocol: `docs/agents/git-protocol.md`.
Canonical memory ownership: `docs/agents/memory-protocol.md`.
Canonical шаблоны plan/handoff/report/review: `docs/agents/templates.md`.
