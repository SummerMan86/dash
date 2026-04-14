# Lead-Strategic Memory

## Active Strategic Context

- Active wave:
  - none
- Last closed wave:
  - `Agent Docs Dedup Pass 2 (Medium Priority)` - closed `2026-04-13`
- Last plan:
  - `docs/agents/lead-strategic/current_plan.md` (closed `2026-04-13`; supersede before next execution)
- Active branch:
  - `feature/agent-model-simplification`
- Current strategic state:
  - no open slices remain in this docs-only wave
  - the next task must start from the integrated repo state, not from earlier MP-1 / MP-4 assumptions

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
- This wave is closed with no carry-forward inside its declared scope:
  - MP-1 ownership cleanup is reflected in `workflow.md` and `review-gate.md`
  - MP-2 sourced excerpts are reflected in `worker/guide.md`
  - MP-3 navigation-only root `AGENTS.md` section is in place
  - MP-4 concise autonomous examples are reflected in `autonomous-protocol.md`

## Final Operating Mode

- Final mode for the closed wave:
  - `ordinary iterative`
- This cadence is recorded for historical context only; it is no longer an active requirement after wave close

## Resume Point For The Next Chat

- Do not resume the old CA / BI-clean-architecture wave from prior memories; that context is historical only
- `Agent Docs Dedup Pass 2` is closed; `current_plan.md` is historical until a new plan supersedes it
- Closed-wave status:
  - MP-1 done: `review-gate.md` now points mode definitions and cost-aware defaults back to `workflow.md`
  - MP-2 done: `worker/guide.md` uses sourced excerpts with canonical-wins / escalate-on-conflict rules
  - MP-3 done: root `AGENTS.md` §8 is orientation-only with canonical pointers
  - MP-4 done: `autonomous-protocol.md` §12 is slimmed to one concise lightweight example and one concise full example
- Template references in the closed plan predate the consumer-scoped split; read them through:
  - `docs/agents/templates-orchestration.md`
  - `docs/agents/templates-handoff.md`

## Next Strategic Targets

- No precommitted next wave
- If the next dialog is not just historical review of this docs pass, write a new `current_plan.md` before execution
- If future agent-doc cleanup is requested, start from the integrated docs state instead of reopening MP-1 / MP-4 as if they were still pending

## Historical Note

- Earlier EMIS and BI implementation waves, including `BI Clean Architecture`, are no longer active strategic state
- Historical rationale for those waves lives in archived plans, reports, and `git log`
