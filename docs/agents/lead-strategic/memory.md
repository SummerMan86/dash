# Lead-Strategic Memory

## Active Strategic Context

- Active wave:
  - none
- Last closed wave:
  - `Agent Docs Dedup Pass 2 (Medium Priority)` — closed `2026-04-13`
- Current plan state:
  - `docs/agents/lead-strategic/current_plan.md` is historical/closed and must be superseded before the next execution wave
- Active branch:
  - `feature/agent-model-simplification`
- Current strategic state:
  - no active execution wave is open in canonical artifacts
  - the next task must start from the integrated repo state, not from old MP-1 / MP-4 assumptions

## Durable Strategic Decisions

- Canonical ownership stays split as follows:
  - `workflow.md` owns lifecycle, execution-path selection, operating-mode definitions, and cost-aware defaults
  - `execution-profiles.md` owns runtime/model binding for supported profiles
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
- For `opus-orchestrated-codex-workers` in Claude Code:
  - plugin-first mapping is mandatory for worker/reviewer lanes only
  - `lead-strategic` is not implicitly mapped to `/codex:rescue`
  - if no dedicated strategic plugin lane exists, use a documented alternative runtime path or record an explicit per-role exception
  - a plugin-mapped Codex lane claim needs a proof tuple: launch surface + matching `/codex:result` + stable session/run ID

## Resume Point For The Next Chat

- Do not resume old CA / BI-clean-architecture context from prior memories; that is historical only
- `current_plan.md` is closed historical context until a new plan supersedes it
- Before any new execution wave:
  - write a new `current_plan.md`
  - choose the execution profile explicitly
  - if `opus-orchestrated-codex-workers` is selected, use `execution-profiles.md` as the canonical runtime contract
