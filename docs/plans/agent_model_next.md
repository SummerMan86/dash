# Agent Model — Next Slices

Active plan for continued bounded improvements to the agent workflow documentation and tooling.

## Context

Branch: `claude/review-agent-model-tAKki` (committed to origin).

Landed commits:

- `d32133e` — worker default flipped to `in-place`; `isolated` (subagent + worktree) is now opt-in only. Six files touched; net −2 lines.
- `80540d6` — collapsed duplicated "three detection points" table in `invariants.md` §8 to a stage-labeled cross-ref. Net −6 lines.

Invariants established by this wave (do not revert):

- `git-protocol.md` §3-4 is the single source of truth for worker mode selection. Do not re-embed mode rules in `workflow.md` or `orchestrator/instructions.md`.
- `invariants.md` §8 first table was removed because it duplicated `workflow.md` §2.3.1 / §3.3 / §5.1. The second table (enforcement rows) is preserved and is the actual invariant content.
- Active terminology: `in-place` (default), `isolated` (opt-in). Do not reintroduce `teammate mode` / `subagent mode as default`.

## Guiding principles

- Minimal docs footprint; prefer net-delta ≤ 0 where possible.
- Fresh `docs-reviewer` subagent after every doc-only slice before commit.
- `code-reviewer` floor for any code slice.
- One slice per commit; do not batch unrelated changes.

## Slices (prioritized by leverage / risk)

### A. Carry-Forward Context structured fields

- Scope: `docs/agents/templates.md` §1 (Worker Handoff), §4 (Task Packet); `docs/agents/worker/guide.md` §7.
- Change: replace free-form `Continuation Notes` with a structured block: `carried_decisions[]`, `open_findings[]`, `next_slice_assumptions[]`, `patterns_established[]`. Make it mandatory on every code-writing handoff, not just dependent slices.
- Estimated delta: ~+8 template lines, ~+3 guide lines; potential net-zero if free-form block is removed in exchange.
- Risk: low.

### B. Wave DoD docs WARNING escalation scope

- Scope: `docs/agents/workflow.md` §3.8 and §6.2.
- Change: `WARNING → CRITICAL` auto-escalation at wave closure applies only to contract-touching docs (`RUNTIME_CONTRACT.md`, `db/schema_catalog.md`, `db/current_schema.sql`, new invariants). Navigation `AGENTS.md` drift is allowed to carry over with recorded owner + expiry.
- Estimated delta: ~+3 lines.
- Risk: low; this relaxes rather than tightens governance.

### C. Strategic-reviewer adaptive cadence

- Scope: `docs/agents/workflow.md` §4.1.
- Change: `high-risk iterative` starts with per-slice strategic-reviewer pass, auto-downshifts to `by signal` after two consecutive `ACCEPT` verdicts without new findings or plan changes; upshifts on reappearance of a risk signal from §4.1.
- Estimated delta: ~+5 / −3 lines.
- Risk: low.

### D. Orchestrator bounded diff-read for acceptance triage

- Scope: `docs/agents/orchestrator/instructions.md` §Transparency Requests and §Evidence Acceptance.
- Change: after the first transparency request and before the second, the orchestrator is allowed a bounded read: `git diff --stat` plus up to 200 lines on one file. Explicitly scoped to acceptance triage only, not to making or revising writes.
- Estimated delta: ~+6 lines.
- Risk: medium — touches the "code-blind orchestrator" invariant. Requires a `strategic-reviewer` pass before merge.

### E. wave-journal.md split from memory.md

- Scope: new file `docs/agents/orchestrator/wave-journal.md`; update `docs/agents/orchestrator/instructions.md` §Memory Discipline.
- Change: `memory.md` retains only active state (~20 lines); `wave-journal.md` is append-only (one line per slice outcome) and is archived to `docs/agents/orchestrator/archive/waves/<id>.md` at wave closure. Intent: survive auto-compact without bloating durable memory.
- Estimated delta: one new file + ~+4 instruction lines.
- Risk: low; net improvement for recovery.

### F. Automated ESLint rules

- Scope: `eslint.config.js` plus CI configuration.
- Rules:
  1. Verify and, if missing, enforce ban on `$lib/server/*` imports from client routes/layers.
  2. Ban retired aliases: `$shared`, `$entities`, `$features`, `$widgets`.
  3. CI check (not ESLint): edits to `db/*.sql` require a companion touch to `db/applied_changes.md`.
- Must follow `invariants.md` §10 (ESLint rule-introduction policy): baseline-diff report, rule severity assignment, remediation plan for any rule that would produce >20 new violations.
- Risk: higher — actual code change; requires a test baseline and may create noise.

### G. Cross-runtime plan versioning (OPTIONAL — defer until demonstrated need)

- Scope: `docs/agents/workflow.md` §2.3, `docs/agents/templates.md` §3.
- Change: plan header gains `plan_version: N` and `hash: <sha>`; append-only log sidecar; `Plan Change Request` becomes the only write-path into the canonical plan.
- Risk: likely over-engineering for current project scale. Defer until a real race or drift incident is observed.

## Recommended execution order

1. Batch of low-risk doc shrinkers: **A → B → C → E**. Each a separate commit with a fresh `docs-reviewer` pass.
2. **D** separately — requires a `strategic-reviewer` pass before merge because it touches a core invariant.
3. **F** last — needs a real code baseline and ESLint governance run.
4. **G** — skip until demonstrated need.

## Bootstrap prompt for a fresh session

> I'm continuing the `claude/review-agent-model-tAKki` wave. State:
>
> - Two commits on branch already pushed: `d32133e` (in-place default), `80540d6` (architecture-docs-first table collapse).
> - Single source of truth for worker mode — `docs/agents/git-protocol.md` §3-4. Do not re-duplicate in `workflow.md` or `orchestrator/instructions.md`.
> - `invariants.md` §8 first table was removed as a duplicate of `workflow.md` §2.3.1 / §3.3 / §5.1. Do not restore it.
>
> Principles for this wave: minimal docs footprint; net-delta ≤ 0 where possible; fresh `docs-reviewer` subagent on diff before every commit; one slice per commit.
>
> Read `docs/agents/orchestrator/memory.md`, `docs/agents/workflow.md` §6.1 (Slice DoD), then execute Slice [A | B | C | E] from `docs/plans/agent_model_next.md`.
