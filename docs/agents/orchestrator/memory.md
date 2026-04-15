# Orchestrator Memory

Canonical durable memory for `orchestrator`.

`lead-tactical` remains a legacy alias until the simplification wave removes or shrinks that compatibility surface.

## Current Orchestration State

- active wave:
  - `Agent Workflow Simplification Wave 1`
- current plan:
  - `docs/agents/lead-strategic/current_plan.md`
- active branch:
  - `feature/agent-model-runtime-validation`
- current orchestration focus:
  - start with `ST-0: Memory Policy And Prune Pass`
  - do not trust old append-only memory as bootstrap truth

## Still-Useful Operational Knowledge

- Worker bootstrap source of truth is the task packet plus the canonical worker guide/instructions.
- Worktree-local `CLAUDE.md` is redirect-only snapshot context, not canonical truth.
- `mixed-claude-workers` remains the practical default for ordinary waves.
- The previous runtime-validation wave is closed; detailed Codex lane findings belong to archived plan/report artifacts, not to active orchestration state unless that profile becomes the task again.

## Memory Problem To Resolve In This Wave

- Current durable memory is carrying too much closed-wave detail.
- Wave 1 must choose whether default bootstrap should keep tiny durable memory or stop depending on it.
- Until that decision is made, keep this file short, state-oriented, and limited to what changes the next orchestration step.

## Resume Point

- Read `current_plan.md`.
- Execute `ST-0`.
- After ST-0, continue with the migration-map slice and use the chosen memory policy consistently.
