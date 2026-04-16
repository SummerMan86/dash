# Agent Roles

User guide: [user-guide.md](./user-guide.md).
Runtime/model binding: `docs/agents/execution-profiles.md`.

## Role Map

| Role | Runtime | Default model | Responsibility |
| --- | --- | --- | --- |
| **lead-strategic** | profile-selected Codex lane | `gpt-5.4` | Planning, decomposition, acceptance, governance passes |
| **strategic-reviewer** | bounded pass inside `lead-strategic` context | see profiles | Strategic acceptance/reframe second pass |
| **orchestrator** | Claude Opus | Opus | Code-blind execution flow, worker dispatch, review gate, report |
| **worker** | profile-selected lane | see profiles | Implement one slice, run checks, return truthful handoff |
| **micro-worker** | profile-selected lane | see profiles | Implement one trivial bounded slice under the worker contract |
| **architecture-reviewer** | fresh subagent | see profiles | Diff review: boundaries, placement, complexity |
| **code-reviewer** | fresh subagent | see profiles | Diff review: naming, conventions, maintainability |
| **security-reviewer** | fresh subagent | see profiles | Diff review: SQL injection, XSS, secrets, SSRF |
| **docs-reviewer** | fresh subagent | see profiles | Docs/contracts sync |
| **ui-reviewer** | fresh subagent | see profiles | Smoke-test + optional deep UX audit |

## Key properties

- `lead-strategic` — canonical owner of the plan. Governance passes (architecture pass, baseline pass, strategic review) are modes within lead-strategic, not separate agents.
- `orchestrator` — execution-only, no product code outside `direct-fix`. `lead-tactical` is a legacy alias.
- `worker` / `micro-worker` — isolated subagent + worktree (default for code-writing); teammate mode only for docs-only/read-only.
- Reviewers — fresh subagent per pass, no persistent review memory.

## Persistence

| Role | Durable state |
| --- | --- |
| `lead-strategic` | `docs/agents/lead-strategic/memory.md` |
| `orchestrator` | `docs/agents/orchestrator/memory.md` + `last_report.md` |
| `worker` | none (session context + handoff) |
| reviewers | none (fresh per pass) |

Canonical process: `docs/agents/workflow.md`.
Canonical review model: `docs/agents/review-gate.md`.
Canonical memory ownership: `docs/agents/workflow.md` §4.
