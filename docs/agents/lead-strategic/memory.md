# Lead-Strategic Memory

## Active Strategic Context

- Active wave:
  - `Agent Docs Dedup Pass 2 (Medium Priority)`
- Active plan:
  - `docs/agents/lead-strategic/current_plan.md` (reviewed `2026-04-13`)
- Active branch:
  - `feature/agent-model-simplification`
- Scope:
  - agent-doc dedup only
  - goal: reduce maintenance drift without breaking worker bootstrap or root navigation

## Accepted Strategic Decisions (2026-04-13)

- Canonical ownership stays split as follows:
  - `workflow.md` owns lifecycle, execution-path selection, operating-mode definitions, and cost-aware defaults
  - `review-gate.md` owns review mechanics, strategic-reviewer cadence/risk signals, reframe protocol, and governance passes
  - `invariants.md` remains the source of truth for guardrails
  - `worker/guide.md` stays self-contained only via explicit derived excerpts
  - root `AGENTS.md` stays navigation-first
  - `autonomous-protocol.md` should keep concise scenario selectors, not become a second prompt-template spec
- Consumer-scoped template split is accepted:
  - `docs/agents/templates-orchestration.md` for orchestrator / governance / reporting
  - `docs/agents/templates-handoff.md` for worker handoff
- Bootstrap/recovery hardening is accepted:
  - orchestrator restore path reads both durable memories before `current_plan.md`
  - task packet / role guide override stale worktree-local redirects
- Autonomous mode no longer widens `orchestrator` product-code ownership beyond standard `direct-fix`
- Fresh-worktree rule is accepted:
  - after bootstrap/recovery doc changes, new worker tasks use fresh worktrees
  - stale worktree-local `CLAUDE.md` snapshots are not authoritative bootstrap context

## Operating Mode

- Active mode:
  - `ordinary iterative`
- Keep this mode while MP-1 / MP-4 still touch canonical workflow docs
- Escalate / reframe if the task stops being docs-only or starts changing role semantics, worker bootstrap requirements, or runtime behavior

## Resume Point For The Next Chat

- Do not resume the old CA / BI-clean-architecture wave from prior memories; that context is historical only
- Current plan remains `docs/agents/lead-strategic/current_plan.md`
- Practical status against the plan:
  - MP-2 is effectively satisfied: `worker/guide.md` now uses sourced excerpts with canonical-wins / escalate-on-conflict rules
  - MP-3 is effectively satisfied: root `AGENTS.md` §8 is now orientation-only with canonical pointers
  - MP-1 remains open: finish ownership cleanup between `workflow.md` and `review-gate.md`
  - MP-4 remains open: slim `autonomous-protocol.md` §12 examples
- Template references in the plan predate the consumer-scoped split; read them through:
  - `docs/agents/templates-orchestration.md`
  - `docs/agents/templates-handoff.md`

## Next Strategic Targets

- First: MP-1 in `docs/agents/workflow.md` + `docs/agents/review-gate.md`
- Then: MP-4 in `docs/agents/autonomous-protocol.md` §12
- If the next dialog switches to a non-docs objective, either:
  - close / supersede this plan explicitly, or
  - write a new `current_plan.md` before execution

## Historical Note

- Earlier EMIS and BI implementation waves, including `BI Clean Architecture`, are no longer active strategic state
- Historical rationale for those waves lives in archived plans, reports, and `git log`
