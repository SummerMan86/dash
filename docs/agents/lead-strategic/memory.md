# Lead-Strategic Memory

## Active Strategic Context

- Active wave:
  - `Agent Model Runtime Validation — opus-orchestrated-codex-workers` — opened `2026-04-15`
- Last closed wave:
  - `Agent Docs Dedup Pass 2 (Medium Priority)` — closed `2026-04-13`
- Current plan state:
  - `docs/agents/lead-strategic/current_plan.md` is the active canonical plan for runtime validation
- Active branch:
  - `feature/agent-model-runtime-validation`
- Current strategic state:
  - runtime validation wave is open
  - no slices accepted yet
  - no slices accepted yet
  - worker-lane attempts already produced blocked outcomes without recoverable run IDs

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
  - after repeated blocked worker-lane attempts without a run ID, insert a micro-diagnostic gate before any further real slice dispatch

## Resume Point For The Next Chat

- Resume `Agent Model Runtime Validation — opus-orchestrated-codex-workers`
- Read `current_plan.md` first; it is active, not historical
- Start with ST-0 plugin micro-diagnostic, not a real slice
- Treat the most recent observed `codex-plugin-cc` symptom as a real risk signal:
  - `[Tool result missing due to internal error]`
  - no stable run ID
  - no matching `/codex:result`
  - this must classify the lane as `blocked` or `unverified`, never as silent success
  - this has now happened more than once on the same surface
