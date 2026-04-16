# Plan: Agent Docs Radical Simplification (Wave 2)

## Status

- opened on `2026-04-16`
- wave status: ready for execution
- priority: docs restructure — match process model to reality
- previous wave: Wave 1 (completed 2026-04-15, branch `feature/agent-workflow-simplification-wave1`)
- selected execution profile: `mixed-claude-workers`
- operating mode: `high-risk iterative / unstable wave`

## Introduction: What Our Agent Model Actually Is

The agent model exists so that an AI agent doesn't immediately jump into writing code. Instead, it follows a structured workflow:

1. **Brainstorming and spec refinement** — clarify requirements before any code is written
2. **Planning** — decompose the task into subtasks with acceptance criteria (`current_plan.md`)
3. **Subagent-driven development with TDD** — red-green-refactor cycle, one slice at a time
4. **Code review between tasks** — multi-aspect quality gates (security, code, architecture, docs, UI)
5. **Branch finalization** — verify, accept, merge

### Roles

| Role | What it does | Runtime |
|---|---|---|
| **lead-strategic** | High-level planning and acceptance only. Does NOT explore code. | GPT-5.4 via Codex |
| **orchestrator** | Enforces rules between agents, dispatches workers, collects evidence | Claude Opus |
| **worker** | Implements one slice via subagent + isolated worktree | Claude Opus/Sonnet |
| **reviewers** | Quality gates: code-reviewer, security-reviewer, architecture-reviewer, docs-reviewer, ui-reviewer | Claude Sonnet (fresh per pass) |

### Quality philosophy

The goal is **quality, extensible, maintainable code** — understandable by both humans and AI despite project growth. We develop deliberately, with checks and cross-checks, including different models (Opus, GPT-5.4) to catch blind spots for each model.

### Inspiration

The workflow is inspired by [superpowers](https://github.com/obra/superpowers): self-contained skills for TDD, systematic debugging, brainstorming, planning, and parallel subagents. Each skill tells one agent what to do without needing other files.

### The problem this wave solves

After Wave 1 simplification, we still have **28 active files and 5,600 lines** of agent docs. Only ~25% is about the core workflow above. The rest is Codex runtime plumbing (~450 lines), autonomous mode overlay (689 lines), governance formalism (~400 lines), tmux ops manual (~280 lines), and telemetry schema (~223 lines).

This wave restructures docs to match the mental model: process-centric, not governance-centric.

## What this wave is optimizing for

- One obvious bootstrap path per role.
- Process truth separated from runtime truth.
- No deletion before repoint.
- No live file should depend on a deleted canonical source.
- The rewrite must also fix three semantic conflicts, not just shorten docs:
  1. `micro-task` / `direct-fix` never waive the review floor.
  2. Integration review trigger is single-sourced.
  3. Slice DoD documentation fields are explicit `done` / `N/A`, not implicit green.

## User decisions already locked

- Autonomous protocol → slim appendix: `docs/agents/autonomous-mode.md`
- Codex runtime plumbing → external runtime doc: `docs/codex-integration.md`

## Success metrics

Measure core docs separately from state/history files.

### Canonical docs target

- **Scope:** `docs/agents/**/*.md`, excluding `*/archive/*` and excluding live state files:
  - `lead-strategic/current_plan.md`
  - `lead-strategic/memory.md`
  - `orchestrator/last_report.md`
  - `orchestrator/memory.md`
  - `orchestrator/decision-log.md`
- **Target:** **18 canonical docs**
- **Target lines:** **~1,850–2,050**

### Canonical set after rewrite (explicit)

These 18 files are the canonical docs budget inside `docs/agents/`:

- `workflow.md`
- `execution-profiles.md`
- `git-protocol.md`
- `recovery.md`
- `templates.md`
- `invariants.md`
- `invariants-emis.md`
- `autonomous-mode.md`
- `lead-strategic/instructions.md`
- `orchestrator/instructions.md`
- `worker/guide.md`
- `architecture-reviewer/instructions.md`
- `code-reviewer/instructions.md`
- `docs-reviewer/instructions.md`
- `security-reviewer/instructions.md`
- `ui-reviewer/instructions.md`
- `skills/debugging.md`
- `skills/testing-strategy.md`

### Runtime / ops docs target

Outside `docs/agents/`:
- `docs/codex-integration.md`
- `docs/QUICKSTART.md`
- optional `docs/ops/usage-telemetry.md` only if a repo-wide grep proves there is still an active consumer

### Hard acceptance rules

- Zero live refs to deleted docs.
- `workflow.md` contains no plugin-command details or proof retrieval mechanics.
- `execution-profiles.md` owns profile tables and selection rules (process-level runtime binding).
- `docs/codex-integration.md` owns plugin-specific commands, proof tuples, companion CLI (implementation-level runtime plumbing).
- Historical refs to old docs are allowed only inside archived files.

## Canonical ownership after the rewrite

| File | Owns |
|---|---|
| `workflow.md` | End-to-end process, role responsibilities, execution paths, review floor, reviewer selection, acceptance, user-in-loop operating modes, DoD, escalation, memory protocol |
| `execution-profiles.md` | Profile tables (role → runtime/model/effort mapping), selection rules, fallback policies. Process-level "which lane for which role". Extensible for future profiles. |
| `docs/codex-integration.md` | Plugin commands, proof tuples, companion CLI, runtime caveats. Implementation-level "how to invoke the lane". |
| `docs/agents/autonomous-mode.md` | No-user-in-loop autonomous overlay only; autonomous-only deltas relative to `workflow.md`; no duplicated lifecycle |
| `templates.md` | Handoff/report shapes only |
| `git-protocol.md` | Worktree / branch / merge mechanics only |
| `recovery.md` | Recovery procedures only |
| `invariants.md`, `invariants-emis.md` | Project-specific constraints only |
| Role docs | Role-local execution detail only |

## Files to REWRITE (8 files)

| File | Now | Target | Key change |
|---|---:|---:|---|
| `workflow.md` | 553 | ~240–280 | Full rewrite. Process truth only. Absorbs role map, review model core, DoD, memory protocol. **Does not absorb runtime/model tables.** |
| `execution-profiles.md` | 127 | ~80–100 | Keep profile tables, selection rules, fallback policies. Strip plugin commands, proof tuples, companion CLI → `docs/codex-integration.md`. Extensible for future profiles. |
| `orchestrator/instructions.md` | 248 | ~110–130 | Keep work cycle, direct-fix rules, escalation, evidence discipline. Runtime details move to `docs/codex-integration.md`. |
| `lead-strategic/instructions.md` | 290 | ~110–130 | Keep planning cadence, acceptance, governance passes. Remove autonomous/runtime prompt surface. |
| `worker/guide.md` | 229 | ~120–140 | Remove duplicated BI guardrails and duplicated DoD. Keep worker loop only. |
| `templates.md` | 410 | ~150–180 | Artifact shapes only. Remove routing table, governance prose, telemetry schema. |
| `git-protocol.md` | 158 | ~80–100 | Keep spawn/worktree/merge rules only. Drop diagrams and repeated policy. |
| `recovery.md` | 244 | ~120–140 | Keep recovery only. Absorb small autonomous-specific deltas by reference, not by duplicate protocol. |

## Files to TOUCH-LIGHT / REPOINT (4 files)

| File | Why |
|---|---|
| `architecture-reviewer/instructions.md` | Replace `review-gate.md` pointers with `workflow.md` / `recovery.md` pointers. |
| `invariants.md` | Replace `review-gate.md` pointers with the new `workflow.md` ownership. |
| `lead-strategic/current_plan.md` | Refresh to the new canon, or archive the old one and create a new active plan. Live state must not point at deleted canon. |
| `orchestrator/last_report.md` | Refresh or archive for the same reason. Live report must not point at deleted canon. |

## Files to CREATE (3 guaranteed + 1 conditional)

| File | Lines | What |
|---|---:|---|
| `docs/agents/autonomous-mode.md` | ~80–100 | Delta-only appendix: when autonomous mode is allowed, lightweight vs full, decision framework, guardrails, decision log, recovery deltas. |
| `docs/codex-integration.md` | ~80–120 | Plugin-level runtime plumbing: plugin commands, proof tuples, companion CLI, runtime caveats. Profile tables stay in `execution-profiles.md`. Outside `docs/agents/`. |
| `docs/QUICKSTART.md` | ~80–120 | Human/operator runbook extracted from `user-guide.md`. Outside `docs/agents/`. |
| `docs/ops/usage-telemetry.md` | ~40–80 | **Conditional.** Create only if repo-wide grep shows a real consumer remains after the simplification. Otherwise delete telemetry doc completely. |

## Files to DELETE from `docs/agents/` (13 guaranteed + 1 conditional)

### Guaranteed canonical deletions (4)

- `review-gate.md`
- `roles.md`
- `autonomous-protocol.md`
- `user-guide.md`

### Guaranteed redirect-stub deletions (9)

- `architecture-steward/instructions.md`
- `baseline-governor/instructions.md`
- `definition-of-done.md`
- `memory-protocol.md`
- `strategic-reviewer/instructions.md`
- `templates-handoff.md`
- `templates-orchestration.md`
- `ui-reviewer-deep/instructions.md`
- `worker/instructions.md`

### Conditional deletion / move (1)

- `usage-telemetry.md` → delete if no active consumer remains; otherwise move it out of `docs/agents/` to `docs/ops/usage-telemetry.md`

## Files unchanged (content-stable)

These should stay content-stable unless repointing is absolutely required:

- `code-reviewer/instructions.md`
- `docs-reviewer/instructions.md`
- `security-reviewer/instructions.md`
- `ui-reviewer/instructions.md`
- `skills/debugging.md`
- `skills/testing-strategy.md`
- `invariants-emis.md`
- `lead-strategic/memory.md`
- `orchestrator/memory.md`
- `orchestrator/decision-log.md`

## New `workflow.md` structure (~240–280 lines)

```
# Agent Workflow

## Overview
Mental model paragraph. Role table with responsibility only.
Runtime pointer goes to docs/codex-integration.md.

## 1. Roles and entrypoints
Who starts what. Which role owns which decision.

## 2. Planning
lead-strategic decomposes into current_plan.md. User approval boundary.

## 3. Execution paths
direct-fix / batch / iterative. Worker loop.
Isolated subagent + worktree default. Teammate only for docs-only work.

## 4. Review model
Single canonical owner for:
- minimum code review floor
- reviewer selection matrix
- integration review trigger
- severity semantics
- when skip is allowed
- rule: orchestrator-authored code changes after review require re-review
- rule: micro-task exemption shortens packet only; it does not change reviewer requirements

## 5. Acceptance and operating modes
Strategic pass triggers, reframe, lightweight / standard / full modes.
Runtime details are only a pointer to docs/codex-integration.md.

## 6. Finalize
Wave close, report, merge.

## 7. Memory protocol
Who writes what, pruning, compact recovery.

## 8. Escalation
orchestrator → lead-strategic vs → user.

## 9. Definition of Done
Slice / wave / feature DoD. Documentation items must be explicit done or N/A.

## 10. Pointers
execution-profiles.md, templates.md, docs/codex-integration.md,
autonomous-mode.md, git-protocol.md, recovery.md, invariants.md.
```

## Execution plan

### Preflight (no merge)

- Run a repo-wide grep for external references to files being deleted:
  - `review-gate.md`
  - `roles.md`
  - `autonomous-protocol.md`
  - `user-guide.md`
  - `usage-telemetry.md`
- Check whether `AGENTS.md`, `docs/AGENTS.md`, and `CLAUDE.md` exist in the repo; if present, add them to repoint scope. If absent, do not count them in acceptance.
- Create a migration ledger that lists every file as one of: `rewrite`, `touch-light`, `create`, `delete`, `move`, `state/archive`.

**Preflight acceptance:**
- Scope locked.
- Counts refer only to canonical docs, not state/history.
- Telemetry decision path is explicit before deletion.

### Slice 1: establish the new canon

- Create `docs/codex-integration.md` (plugin-level plumbing extracted from execution-profiles.md and other sources)
- Rewrite `workflow.md` from scratch
- Rewrite `execution-profiles.md` (keep profile tables + selection rules; strip plugin commands → codex-integration.md)
- Create `docs/agents/autonomous-mode.md`
- If Slice 1 is merged before legacy deletion, add one-line deprecation headers to:
  - `review-gate.md`
  - `autonomous-protocol.md`
  - `roles.md`
  - `user-guide.md`

**Slice 1 acceptance:**
- `workflow.md` contains **no** plugin commands, proof retrieval details, or companion CLI usage.
- `execution-profiles.md` contains profile tables and selection rules but **no** plugin commands, proof tuples, or companion CLI recipes.
- `workflow.md` single-sources all of these:
  - review floor
  - integration review trigger
  - post-review re-review rule
  - DoD explicitness rule
- `autonomous-mode.md` is delta-only and points back to `workflow.md`, `docs/codex-integration.md`, and `recovery.md`.

### Slice 2: repoint bootstrap docs

- Rewrite `orchestrator/instructions.md`
- Rewrite `lead-strategic/instructions.md`
- Rewrite `worker/guide.md`
- Rewrite `templates.md`
- Touch-light:
  - `architecture-reviewer/instructions.md`
  - `invariants.md`
- Create `docs/QUICKSTART.md` from the operational subset of `user-guide.md`

**Slice 2 acceptance:**
- No default bootstrap doc points to `review-gate.md`, `roles.md`, `execution-profiles.md`, `autonomous-protocol.md`, or `user-guide.md`.
- `templates.md` contains only artifact shapes.
- Role docs point runtime questions only to `docs/codex-integration.md`.
- `orchestrator/instructions.md`, `lead-strategic/instructions.md`, `worker/guide.md`, and `templates.md`
  do not restate, weaken, or override:
  - review floor
  - reviewer selection rules
  - integration review trigger
  - re-review after post-review orchestrator code changes
- Those rules are owned only by `workflow.md`.
- These files also do not restate:
  - runtime commands
  - model defaults
  - proof retrieval mechanics
- Runtime details are owned only by `docs/codex-integration.md`.

### Slice 3: slim support docs + refresh live state

- Rewrite `git-protocol.md`
- Rewrite `recovery.md`
- Refresh or archive:
  - `lead-strategic/current_plan.md`
  - `orchestrator/last_report.md`
- Update repo navigation files if they exist:
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `CLAUDE.md`
- Decide `usage-telemetry.md` using the preflight grep result:
  - delete, or
  - move to `docs/ops/usage-telemetry.md`

**Slice 3 acceptance:**
- Live state docs do not cite deleted canon.
- Any telemetry note that remains lives outside `docs/agents/`.
- Navigation points to `workflow.md`, `docs/codex-integration.md`, and `docs/QUICKSTART.md`.
- `lead-strategic/current_plan.md` and `orchestrator/last_report.md`
  must continue to exist at their current active paths after refresh.
  Archiving old content without creating a replacement active file is not allowed.

### Slice 4: delete legacy docs + final verify

- Delete the guaranteed 13 legacy files
- Remove any temporary deprecation headers by removing the legacy files entirely
- Record final counts/results in live state docs

**Slice 4 acceptance:**
- Zero live refs to deleted docs.
- Canonical file count and line budget pass.
- Historical refs to old docs exist only in archived files.

## Verification

### Quantitative verification

Canonical docs count:
```bash
find docs/agents -name '*.md' -not -path '*/archive/*' \
| grep -vE 'lead-strategic/current_plan.md|lead-strategic/memory.md|orchestrator/last_report.md|orchestrator/memory.md|orchestrator/decision-log.md' \
| wc -l
```
Target: `18`

Canonical lines:
```bash
find docs/agents -name '*.md' -not -path '*/archive/*' \
| grep -vE 'lead-strategic/current_plan.md|lead-strategic/memory.md|orchestrator/last_report.md|orchestrator/memory.md|orchestrator/decision-log.md' \
| xargs wc -l
```
Target: `~1,850–2,050`

### Structural verification

- `rg` for deleted docs returns no hits outside `archive/`
- `workflow.md` contains no:
  - `/codex:`
  - companion CLI command recipes
  - model-default tables
  - proof tuple retrieval mechanics
- `docs/codex-integration.md` owns runtime/profile/proof details

### Semantic verification

These are mandatory, not optional:
- Any product code change still requires `code-reviewer`.
- `micro-task` / `direct-fix` do not weaken reviewer requirements.
- Integration review trigger is single-sourced and impact-based.
- `orchestrator` code changes after review trigger re-review.
- Slice DoD documentation fields are explicit `done` / `N/A`, not omitted.

### Bootstrap verification

Use realistic bootstrap, not one-file fantasy:
- `lead-strategic` bootstrap: `workflow.md` + `lead-strategic/instructions.md` (+ `docs/codex-integration.md` when runtime details matter)
- `orchestrator` bootstrap: `workflow.md` + `orchestrator/instructions.md` + `templates.md` + `execution-profiles.md` (+ `docs/codex-integration.md` when plugin-level details matter)
- `worker` bootstrap: `workflow.md` + `worker/guide.md` + `invariants.md`

## Non-goals

- No runtime behavior changes.
- No tool/plugin redesign.
- No substantial reviewer-policy rewrite outside the three conflicts explicitly fixed above.
- No editing of archive history except to move old live docs into archive.

## Critical path files

### Rewrite first
- `workflow.md`
- `execution-profiles.md`
- `orchestrator/instructions.md`
- `lead-strategic/instructions.md`
- `worker/guide.md`
- `templates.md`

### Then support
- `git-protocol.md`
- `recovery.md`
- `architecture-reviewer/instructions.md`
- `invariants.md`

### Create
- `docs/agents/autonomous-mode.md`
- `docs/codex-integration.md`
- `docs/QUICKSTART.md`
- optional `docs/ops/usage-telemetry.md`

### Delete last
- `review-gate.md`
- `roles.md`
- `autonomous-protocol.md`
- `user-guide.md`
- 9 redirect stubs
- optional `usage-telemetry.md`
