# Plan: Agent Workflow Simplification Wave 1

## Status

- opened on `2026-04-15`
- wave status: ready for execution
- priority: high-risk docs refactor
- goal: shrink the agent-doc surface area without breaking role ownership, review discipline, or truthful reporting
- scope: `docs/agents/*`, root navigation links that point into `docs/agents/*`, and only the minimum compatibility redirects needed during the transition
- selected execution profile: `mixed-claude-workers`
- operating mode: `high-risk iterative / unstable wave`
- model policy for this wave:
  - `lead-strategic` = `gpt-5.4`
  - `strategic-reviewer` = `gpt-5.4` on every slice
  - `orchestrator` = `Opus`
  - `worker` = `Opus`
  - `docs-reviewer` = strongest available lane, prefer `Opus`
- user-directed review exception:
  - do not dispatch `architecture-reviewer`
  - do not dispatch `code-reviewer`
  - this is an explicit user instruction, not a claim that those passes became unnecessary

## Goal

Reduce agent-model bureaucracy by collapsing duplicate docs and legacy surfaces into a smaller canonical set, while keeping the working execution contract intact enough that a later wave can simplify semantics without losing safety.

## Guardrails

- Keep `lead-strategic` as the canonical owner of `current_plan.md`.
- Keep `orchestrator` as execution-only; do not expand product-code ownership.
- Keep the minimum independent review floor as a canonical rule for code-writing work.
- Keep `direct-fix` as a narrow exception, not a generic convenience path.
- Keep truthful evidence rules; if the wording is simplified, the enforcement meaning must survive.
- Do not silently keep append-only durable memory. Wave 1 must either shrink it to a minimal current-state snapshot or remove it from the default bootstrap path by explicit decision.
- Treat this wave as docs-first for the agent model itself: if a slice changes role semantics or lifecycle wording, the canonical doc home must be clear in the same slice.
- No big-bang rewrite. Each slice must leave the docs set internally coherent before the next one starts.
- Do not silently remove advanced modes just to hit a file-count target. Archive or explicitly defer them instead.

## Review And Verification Policy

- `docs-reviewer` is required after every slice.
- `strategic-reviewer` is required after every accepted slice because this wave changes canonical governance wording.
- `architecture-reviewer` and `code-reviewer` are intentionally skipped by explicit user instruction.
- `security-reviewer` is optional and should run only if a slice materially changes executable command guidance, shell snippets, or runtime invocation contracts.
- Every slice must end with:
  - link check for touched docs via targeted `rg`
  - truthful review disposition
  - concise note on whether bootstrap reads became shorter, stayed flat, or accidentally grew

## Wave-1 Non-Goals

- Do not redesign role ownership.
- Do not invent a new runtime model beyond the supported profiles already documented.
- Do not fully rewrite `autonomous-protocol.md` unless a slice explicitly targets it.
- Do not decide keep/delete for `docs/agents/skills/*` in this wave without explicit evidence.
- Do not optimize for a headline file count at the cost of burying important invariants.

## Expected Result

- The main orchestration spine reads from fewer canonical docs.
- Modes and passes stop masquerading as fully separate agents.
- Legacy alias surface is either removed or reduced to one obvious compatibility pointer.
- Templates stop requiring navigation across multiple files for ordinary execution.
- Durable memory becomes either:
  - a tiny active-state bootstrap artifact,
  - or an opt-in/advanced recovery artifact instead of a default always-read document.
- The resulting state is simpler enough that a later wave can safely simplify semantics further.

## Initial Migration Map

- `docs/agents/memory-protocol.md` -> merge into `docs/agents/workflow.md`
- `docs/agents/lead-strategic/memory.md` -> keep only if ST-0 proves a minimal durable-memory bootstrap is still worth the cost
- `docs/agents/orchestrator/memory.md` -> keep only if ST-0 proves a minimal durable-memory bootstrap is still worth the cost
- `docs/agents/definition-of-done.md` -> merge into `docs/agents/review-gate.md`
- `docs/agents/templates-handoff.md` -> merge into `docs/agents/templates.md`
- `docs/agents/templates-orchestration.md` -> merge into `docs/agents/templates.md`
- `docs/agents/strategic-reviewer/instructions.md` -> inline into `docs/agents/lead-strategic/instructions.md`
- `docs/agents/baseline-governor/instructions.md` -> inline into `docs/agents/lead-strategic/instructions.md`
- `docs/agents/architecture-steward/instructions.md` -> inline into `docs/agents/lead-strategic/instructions.md`
- `docs/agents/worker/guide.md` -> merge into `docs/agents/worker/instructions.md`
- `docs/agents/ui-reviewer-deep/instructions.md` -> merge into `docs/agents/ui-reviewer/instructions.md`
- `docs/agents/lead-tactical/*` -> remove in ST-4, unless one compatibility pointer proves necessary during repointing
- `docs/agents/recovery.md` -> target merge into `docs/agents/workflow.md`, but allow defer if the merged spine becomes unreadable
- `docs/agents/usage-telemetry.md` -> likely delete or move out of the core workflow; final decision deferred to ST-5
- `docs/agents/execution-profiles.md` -> keep as an advanced appendix in wave 1 unless ST-5 proves a safe collapse
- `docs/agents/autonomous-protocol.md` -> keep separate in wave 1 unless the main flow still depends on it as a bootstrap-required document

## Success Heuristics For ST-1

- Every file in the map has one of four states: `merge`, `delete`, `keep`, or `defer`.
- If a file is marked `merge`, the destination canonical home is explicit.
- If a file is marked `delete`, link cleanup is part of a later slice acceptance.
- If a file is marked `keep` or `defer`, the plan says why it survives wave 1.
- Durable memory is not exempt from this map; it must end ST-0 with an explicit status and rationale.

## Subtasks

### ST-0: Memory Policy And Prune Pass

- scope:
  - `docs/agents/lead-strategic/memory.md`
  - `docs/agents/orchestrator/memory.md`
  - `docs/agents/memory-protocol.md`
  - `docs/agents/workflow.md`
  - `docs/agents/lead-strategic/current_plan.md`
- depends on: —
- size: S
- acceptance:
  - the wave chooses one explicit default:
    - `keep-minimal durable memory`
    - or `remove memory from default bootstrap`
  - both existing `memory.md` files are rewritten so they no longer carry closed-wave detail that belongs in `last_report.md`, archived plans, or `git log`
  - if durable memory survives, there is a simple pruning rule for opening a new wave:
    - rewrite, do not append
    - keep only active state, still-valid durable decisions, and resume point
    - drop closed-wave narrative unless it is still action-guiding
  - if durable memory does not survive as default bootstrap, the replacement recovery path is stated explicitly
- verification intent: stop the simplification wave from inheriting stale bootstrap state
- verification mode: `verification-first`
- notes:
  - new-dialog-heavy usage is a valid argument against rich durable memory, but not against having a tiny recovery snapshot if interruptions still happen

### ST-1: Freeze The Migration Map

- scope: `docs/agents/lead-strategic/current_plan.md` and, if useful, one durable planning artifact under `docs/agents/lead-strategic/archive/`
- depends on: ST-0
- size: S
- acceptance:
  - there is an explicit old->new/keep/delete map for the current `docs/agents/*` surface
  - wave-1 non-goals are written down
  - exceptions to default review coverage are written down truthfully
- verification intent: prevent scope drift before file merges start
- verification mode: `verification-first`
- notes:
  - this slice can refine sequencing, but it must not yet rewrite the agent docs corpus

### ST-2: Collapse Role Surface Without Changing Ownership

- scope:
  - `docs/agents/lead-strategic/instructions.md`
  - `docs/agents/strategic-reviewer/instructions.md`
  - `docs/agents/baseline-governor/instructions.md`
  - `docs/agents/architecture-steward/instructions.md`
  - `docs/agents/worker/instructions.md`
  - `docs/agents/worker/guide.md`
  - `docs/agents/ui-reviewer/instructions.md`
  - `docs/agents/ui-reviewer-deep/instructions.md`
  - `docs/agents/roles.md`
- depends on: ST-1
- size: M
- acceptance:
  - governance passes live inline under `lead-strategic` instead of looking like separate decision-owner roles
  - worker bootstrap has one canonical instructions file
  - deep UI review is expressed as a mode/lane of `ui-reviewer`, not as a separate role directory
  - `roles.md` no longer implies that pass-like helpers are standalone agents
- verification intent: remove the most confusing role/mode duplication first
- verification mode: `prototype-pin`
- notes:
  - keep enough compatibility breadcrumbs that older prompts fail soft, not hard

### ST-3: Collapse Protocol And Template Surface

- scope:
  - `docs/agents/workflow.md`
  - `docs/agents/review-gate.md`
  - `docs/agents/memory-protocol.md`
  - `docs/agents/definition-of-done.md`
  - `docs/agents/templates.md`
  - `docs/agents/templates-handoff.md`
  - `docs/agents/templates-orchestration.md`
- depends on: ST-2
- size: L
- acceptance:
  - each major concept has one obvious canonical home
  - memory ownership, if it survives, lives in `workflow.md` or another single canonical home, not a separate bootstrap-required file
  - DoD and evidence rules live with review/governance, not as a parallel protocol tree
  - ordinary task execution no longer requires navigating three template files
- verification intent: cut the navigation cost that currently dominates bootstrap
- verification mode: `prototype-pin`
- notes:
  - simplify wording aggressively, but preserve the actual safety rules around review floor, truthful evidence, and governance ownership

### ST-4: Remove Legacy And Repoint Navigation

- scope:
  - `docs/agents/lead-tactical/*`
  - `docs/agents/user-guide.md`
  - `docs/agents/roles.md`
  - `docs/agents/workflow.md`
  - `docs/AGENTS.md`
  - `AGENTS.md`
  - any remaining files that still point to removed agent docs
- depends on: ST-3
- size: M
- acceptance:
  - `lead-tactical` no longer exists as a parallel directory surface, or is reduced to a single explicit compatibility pointer if hard deletion proves unsafe
  - root and docs navigation point to the new canonical set without dangling references
  - primary bootstrap for `orchestrator` and `lead-strategic` is shorter than before
- verification intent: ensure the simplified model is actually navigable in practice
- verification mode: `verification-first`
- notes:
  - use targeted search to prove that deleted paths are no longer referenced outside archive or compatibility notes

### ST-5: Optional Advanced-Mode Follow-Up Gate

- scope:
  - `docs/agents/autonomous-protocol.md`
  - `docs/agents/execution-profiles.md`
  - `docs/agents/usage-telemetry.md`
- depends on: ST-4
- size: M
- acceptance:
  - either these files are explicitly kept as advanced appendices with slimmer references from the main flow
  - or one narrowly scoped simplification is applied with no spillover into the core workflow
- verification intent: stop wave 1 from accidentally becoming an unbounded rewrite
- verification mode: `verification-first`
- notes:
  - default outcome for ST-5 is `defer with explicit rationale` unless ST-4 reveals a blocking contradiction

## Slice Order

1. ST-0 — decide memory policy and prune stale memory
2. ST-1 — freeze migration map and review exceptions
3. ST-2 — collapse role surface
4. ST-3 — collapse protocol/template surface
5. ST-4 — remove legacy and repoint navigation
6. ST-5 — decide defer vs narrow advanced-mode cleanup

## Merge Criteria For The Whole Wave

- The simplified doc set still makes `lead-strategic`, `orchestrator`, `worker`, and reviewer ownership unambiguous.
- The main bootstrap path for `orchestrator` and `lead-strategic` is materially shorter than before.
- The fate of durable memory is explicit: either small and disciplined, or removed from the default bootstrap path.
- No deleted doc path remains a hidden canonical dependency.
- The wave closes with an explicit note on what still feels overbuilt and should move to wave 2.
