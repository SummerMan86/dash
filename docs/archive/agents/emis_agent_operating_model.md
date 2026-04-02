# EMIS Agent Operating Model

Working document for agent roles, boundaries, escalation rules, and model choices for EMIS development and review.

Read [EMIS Session Bootstrap](./emis_session_bootstrap.md) first for current repository state and active architecture constraints.

## 1. Purpose

This document fixes the minimal multi-agent operating model for EMIS.

Its goals:

- keep architecture decisions in a stable place instead of reopening them every task;
- reduce context overload for weaker agents and newcomers;
- separate implementation work from review and integration decisions;
- preserve independent review perspectives across architecture, security, docs/contracts, and UI;
- define which agent should be persistent and which should be on-demand.

## 2. Recommended Role Set

The recommended baseline is intentionally small:

1. `user` — task owner, final merge authority
2. `lead-orchestrator` (Claude Opus) — consolidated lead + orchestrator + worker
3. `architecture-reviewer` (Claude Sonnet subagent)
4. `security-reviewer` (Claude Sonnet subagent)
5. `docs-reviewer` / EMIS alias: `docs-contracts-reviewer` (Claude Sonnet subagent)
6. `codex-reviewer` / EMIS alias: `code-reviewer` (Codex/GPT via `codex exec`)
7. `worker` (Claude subagent in worktree, when parallel work needed)
8. `ui-reviewer` / `ui-reviewer-deep` — only when frontend changes are involved

Agent names follow the Claude Code built-in dispatch names (`.claude/agents/`). EMIS aliases are used in discussions and handoff notes where the built-in name does not fully convey the EMIS-specific scope.

Full role mapping: [emis_agent_roles.md — Role Mapping](./emis_agent_roles.md#role-mapping).

### Default mode: consolidated lead-orchestrator

In the default setup, **Claude Opus** consolidates the roles of `lead-integrator`, `user-orchestrator` (for agent-to-agent routing), and `worker` into a single persistent session:

- receives the task from the user
- decomposes and plans the implementation
- implements directly or spawns worker subagents in worktrees
- spawns all reviewer subagents in parallel after implementation
- aggregates findings and applies fixes or escalates to the user
- `codex-reviewer` (via `codex exec --sandbox read-only`) provides the independent cross-model second opinion

The user retains final authority over:

- merge decisions
- scope changes and priority
- critical escalations (see section 3)

### When to use a separate external lead

For critical changes that benefit from a fully independent integration review, the user may route the diff to a separate GPT-5.4 / Codex session as `lead-integrator`. This is recommended when:

- a new shared contract or DB schema is introduced
- the change crosses multiple EMIS modules or alters operational vs BI/read-side boundaries
- the user wants an independent architectural verdict from a different model family

In this mode, the user acts as `user-orchestrator` and routes handoff notes between Claude Opus (worker) and Codex (lead) manually.

Do not split the system into too many permanent specialists unless the project becomes materially larger.
At the current scale, map-specific, BI-specific, or DB-specific reviewers would create more coordination overhead than value.

## 3. Primary Operating Loop

### Default mode: consolidated (Claude Opus as lead-orchestrator)

```
User → task
         ↓
  Claude Opus (lead-orchestrator)
    1. Clarifies scope, plans implementation
    2. Implements directly (or spawns worker subagents in worktrees)
    3. Spawns reviewer subagents in parallel:
       ├─ architecture-reviewer  (Sonnet)
       ├─ security-reviewer      (Sonnet)
       ├─ docs-reviewer          (Sonnet)
       ├─ codex-reviewer         (Codex/GPT via codex exec)
       └─ ui-reviewer            (Sonnet/Opus, if frontend changed)
    4. Aggregates findings
    5. Applies fixes or escalates to user
         ↓
  User → confirms merge (or requests changes)
```

The user does not need to route messages between agents — Claude Opus handles all inter-agent communication within one session.

### Escalation to user

Claude Opus escalates to the user (instead of self-approving) when:

- review findings include `CRITICAL` severity
- the task requires a scope change or new priority decision
- the change introduces a new shared contract, DB schema, or cross-module boundary shift
- `codex-reviewer` and Claude reviewers produce conflicting findings
- the implementation requires a design decision not covered by existing docs

### External lead mode (optional)

For critical changes, the user may route the diff to a separate Codex/GPT-5.4 session:

1. Claude Opus implements and hands off via [worker handoff template](./emis_worker_handoff_template.md).
2. User passes the handoff + `base..feature` diff to the external lead.
3. External lead reviews and returns verdict.
4. User routes verdict back to Claude Opus.

This mode preserves full model-family independence for the integration decision.

## 4. Persistent vs On-Demand

### Persistent (lives across tasks within one session)

- **Claude Opus** (`lead-orchestrator`) — the main session, holds full project context, orchestrates everything

### Persistent subagents (spawned once, reused via SendMessage)

These are spawned on first review and kept alive for subsequent tasks in the same session:

- `architecture-reviewer`
- `security-reviewer`
- `docs-reviewer`
- `codex-reviewer`

### On-demand subagents

These are spawned only when the task needs them:

- `ui-reviewer` / `ui-reviewer-deep` — only for frontend changes
- `worker` — only when the task needs parallel implementation in a separate worktree

## 5. Role Definitions

Full role definitions for reviewer and worker agents — mission, scope, checks, output format, escalation rules, and constraints — are in **[emis_agent_roles.md](./emis_agent_roles.md)**.

This section defines the roles that are not implemented as `.claude/agents/` subagents.

### 5.0. `user`

**Mission**

Own the project, set priorities, confirm merges.

**Scope**

- assign tasks to Claude Opus
- confirm or reject merge after review summary
- escalation decisions when Claude Opus flags them
- optionally route critical diffs to an external lead (Codex/GPT-5.4)

**Do not**

- need to manually route messages between subagents (Claude Opus handles that)
- need to copy-paste diffs or handoff notes between windows in default mode

### 5.1. `lead-orchestrator` (Claude Opus)

**Mission**

Own the whole EMIS change as a system. Decompose, implement, orchestrate reviews, aggregate findings, and either fix or escalate.

**Why consolidated**

- Eliminates the user-as-message-broker bottleneck for routine tasks.
- Claude Opus holds the full project context within one session.
- `codex-reviewer` (via `codex exec`) provides the independent cross-model review signal.
- Subagent reviewers (Sonnet) provide specialized independent checks.

**Scope**

- task decomposition and planning
- implementation (directly or via worker subagents)
- spawning and coordinating reviewer subagents
- aggregating review findings
- applying fixes for non-critical findings
- escalating to user for critical findings or scope decisions

**Main checks**

- does the code live in the correct layer?
- does the change increase or reduce long-term complexity?
- does the change respect EMIS operational vs BI/read-side boundaries?
- does the task need follow-up refactoring before more feature growth?

**Escalate to user when**

- review findings include `CRITICAL` severity
- the task requires a scope change or priority decision
- a new shared contract, DB schema, or cross-module boundary shift is introduced
- `codex-reviewer` and Claude reviewers produce conflicting findings
- a design decision is not covered by existing docs

**Do not**

- self-approve and merge without user confirmation
- skip Review Gate for code changes
- suppress or downplay `CRITICAL` findings from any reviewer
- let "it works" override structural regressions

### 5.2. `lead-integrator` (external, optional)

**When used**

Only when the user explicitly routes a diff to a separate Codex/GPT-5.4 session for an independent integration verdict. See section 3 "External lead mode".

**Mission**

Provide an independent integration review from a different model family.

**Scope**

- whole diff (`git diff base..feature`)
- cross-layer consequences
- architectural placement
- final decision: approve / request changes / needs redesign

## 6. Non-Negotiable EMIS Invariants

These invariants should be enforced by the lead and checked by reviewers:

- SQL lives in `src/lib/server/emis/modules/*`, not in `src/routes/api/emis/*`.
- `routes/api/emis/*` is transport only.
- `entities/emis-*` contain contracts, DTOs, types, schemas, and pure mappers only.
- client-side code does not import `$lib/server/*`.
- EMIS operational flows do not get pushed into dataset/IR abstraction "just in case".
- schema changes update `db/current_schema.sql` and `db/applied_changes.md`.
- runtime behavior changes update `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`.
- new active slices with meaningful complexity should gain local navigation docs.

## 7. Complexity Guardrails

The current repository already has warning signs around oversized route/widget orchestration files.

Use these thresholds as a soft policy:

- `500-700` lines: warning, ask whether decomposition is overdue
- `700-900` lines: mandatory discussion in review
- `900+` lines: default expectation is decomposition unless there is a very strong reason not to

This is especially important for:

- `src/routes/emis/+page.svelte`
- `src/lib/widgets/emis-map/EmisMap.svelte`
- route-level BI dashboards that start embedding too much transformation logic

## 8. Review Flow

### Default flow (consolidated lead-orchestrator)

1. User assigns task to Claude Opus.
2. Claude Opus plans the implementation and declares touch points.
3. Claude Opus implements (directly or via worker subagents).
4. Claude Opus spawns reviewer subagents in parallel on the diff:
   - `architecture-reviewer` (Sonnet)
   - `security-reviewer` (Sonnet)
   - `docs-reviewer` (Sonnet)
   - `codex-reviewer` (Codex/GPT via `codex exec`)
   - `ui-reviewer` if frontend changed (Sonnet or Opus)
5. Claude Opus aggregates findings:
   - fixes non-critical issues directly
   - presents review summary to user
   - escalates `CRITICAL` findings or design decisions
6. User confirms merge or requests changes.

### External lead flow (for critical changes)

1. Claude Opus implements and produces a [worker handoff](./emis_worker_handoff_template.md).
2. User passes the handoff + branch range to external Codex/GPT-5.4 lead.
3. External lead reviews and returns verdict via [review handoff](./emis_review_handoff_template.md).
4. User routes verdict back to Claude Opus.
5. Claude Opus applies fixes if needed, user confirms merge.

### Reviewer independence

Independence is maintained through model diversity:

- `codex-reviewer` runs via `codex exec --sandbox read-only` — a separate model (GPT) that sees only the diff, not the Claude Opus conversation context
- `architecture-reviewer`, `security-reviewer`, `docs-reviewer` run as Sonnet subagents with their own isolated context — they receive the diff, not the full orchestrator reasoning
- In external lead mode, the lead is a completely separate session/model

Minimum rules:

- `codex-reviewer` always reviews a concrete diff, not chat context
- reviewer subagents are read-only — they do not modify files
- Claude Opus must not suppress or downplay findings from any reviewer
- for critical changes (see section 2), an external lead pass is recommended

### Review tiers

Not every change needs the full review gate:

| Tier | When | Review |
| ---- | ---- | ------ |
| **Tier 1** (cosmetic) | copy/text/style-only, no logic change | Claude Opus self-review + user confirm |
| **Tier 2** (bounded) | single-module bugfix, small feature | Full Review Gate (4 reviewers) |
| **Tier 3** (critical) | new route/contract/schema, cross-module | Full Review Gate + external lead recommended |

Claude Opus determines the tier and includes it in the review summary. The user may override.

### Compatibility with repository Review Gate

This document refines the EMIS role model but does not replace the repository-level Review Gate from the root `AGENTS.md`.

For EMIS work, use the following mapping:

- `lead-integrator` is the final approver and owner of integration decisions
- `architecture-reviewer` maps directly to the root architecture review
- `security-reviewer` maps directly to the root security review
- `docs-reviewer` (EMIS alias: `docs-contracts-reviewer`) is the EMIS-specific extension of the root docs review
- `codex-reviewer` (EMIS alias: `code-reviewer`) is the EMIS implementation-quality pass via Codex/GPT-5.4

Practical alias table:

| `.claude/agents/` name (dispatch) | EMIS alias | Root Review Gate role | Notes |
| ---------------------------------- | ----------------------- | --------------------- | ----- |
| `architecture-reviewer` | `architecture-reviewer` | `architecture-reviewer` | same name everywhere |
| `security-reviewer` | `security-reviewer` | `security-reviewer` | same name everywhere |
| `docs-reviewer` | `docs-contracts-reviewer` | `docs-reviewer` | EMIS alias makes runtime/db contract ownership explicit |
| `codex-reviewer` | `code-reviewer` | `codex-reviewer` | EMIS alias emphasizes implementation-quality review |
| `ui-reviewer` | `ui-reviewer` | `ui-reviewer` | same name everywhere |
| `ui-reviewer-deep` | `ui-reviewer` (deep) | `ui-reviewer` | Opus-level UX/a11y audit |

Full role definitions: [emis_agent_roles.md](./emis_agent_roles.md).

When a workflow or automation expects built-in agent names, use the `.claude/agents/` column.
When discussing EMIS-specific responsibility boundaries, EMIS aliases are acceptable.

If there is any conflict, the root `AGENTS.md` remains the higher-level repository rule, and this document explains how EMIS applies it in practice.

## 9. Local Git Collaboration Flow

Current assumption: Git collaboration is local-first, without requiring remote MR infrastructure.

### Default flow (consolidated)

1. User assigns task to Claude Opus.
2. Claude Opus works in the main checkout or creates a feature branch.
3. For parallel subtasks, Claude Opus spawns worker subagents in separate worktrees.
4. After implementation, Claude Opus runs Review Gate on the diff.
5. Claude Opus presents review summary to the user.
6. Merge happens only after user confirmation.

### External lead flow

1. User assigns task to Claude Opus.
2. Claude Opus implements in a feature branch.
3. Claude Opus produces a [worker handoff](./emis_worker_handoff_template.md) with:
   - `base branch`, `feature branch`, optional `commit range`
   - what changed, assumptions, checks run, risks
4. User passes the handoff to external lead (Codex/GPT-5.4).
5. External lead reviews `git diff base..feature`.
6. User routes verdict back to Claude Opus.
7. Merge happens only after lead approval and user confirmation.

### Important constraints

- review comments should point to a branch, file, or commit range, not only to chat context
- branch handoff must always include an explicit base branch; do not assume `main` if the user named another baseline
- in external lead mode, agents in separate runtimes cannot see each other's local branches unless the user exposes them

### Local worktree rules

For parallel work, do not run multiple agents in the same working directory.

Default rule set:

1. `main` is the integration baseline.
2. Each agent gets its own local feature branch.
3. Each agent gets its own `git worktree` created from `main` or another explicitly named base branch.
4. One worktree is owned by one agent only.
5. Review is branch-based: `base..feature`.

Recommended branch naming:

- `agent/<role>/<task-slug>`
- `review/<topic>`
- `integration/<topic>`

Minimum hygiene rules:

- do not develop in the shared root worktree when parallel agent work is active; keep it for lead review, integration, and conflict resolution only
- do not reuse another agent's worktree for a different task
- do not mix two bounded tasks in one branch
- keep temporary local files out of commits unless they are explicitly part of the task
- if a branch becomes the new integration baseline, merge it into `main` before spawning the next wave of workers

Current practical recommendation for this repository:

- keep the main repository checkout as the lead/integrator workspace, not as a worker implementation workspace when parallel work is active
- create separate worktrees for worker branches
- treat `.claude/worktrees/*`, `tmp/`, scratch files, and other local helper artifacts as non-deliverable by default unless the task explicitly says otherwise

## 10. Recommended Model Choices

Model diversity reduces correlated blind spots. The default assignment optimizes for minimal user overhead while preserving independent review signals.

### Default assignment (consolidated mode)

| Role | Model | Why |
| ---- | ----- | --- |
| `lead-orchestrator` | Claude Opus | strongest context, orchestration, and implementation |
| `architecture-reviewer` | Claude Sonnet (subagent) | fast, cheap, good at structural review |
| `security-reviewer` | Claude Sonnet (subagent) | efficient risk scanning |
| `docs-reviewer` | Claude Sonnet (subagent) | consistency checks across docs and contracts |
| `codex-reviewer` | Codex/GPT via `codex exec` | cross-model independent second opinion |
| `worker` (parallel) | Claude Sonnet/Opus (subagent in worktree) | bounded implementation |
| `ui-reviewer` | Claude Sonnet (subagent + Chrome) | quick smoke validation |
| `ui-reviewer-deep` | Claude Opus (subagent + Chrome) | nuanced UX/a11y audit |

### External lead assignment (critical changes)

| Role | Model | Why |
| ---- | ----- | --- |
| `lead-integrator` | Codex `gpt-5.4` (separate session) | independent integration judgment from another model family |

### Independence guarantees

- `codex-reviewer` always runs via `codex exec --sandbox read-only` — sees only the diff, not the Claude Opus context
- Sonnet reviewer subagents receive the diff and their role instructions — they do not share the orchestrator's reasoning
- In external lead mode, the lead is a completely separate session/model/runtime

### Recommended reasoning level for `codex-reviewer`

- default: `gpt-5.4` with `medium`
- use `high` for large diffs, framework-heavy frontend changes, or changes where maintainability judgment matters more than speed
- do not use `mini` as the default; reserve it only for very small low-risk diffs

## 11. Minimum Instruction Template Per Agent

Each agent instruction should define:

- `Mission`
- `Scope`
- `Inputs`
- `Checks`
- `Output format`
- `Escalate when`
- `Do not`

If an agent cannot be described in these seven fields, its role is probably too vague and should not be made persistent yet.

## 12. Next Documentation To Add

The first operating-model doc pack now exists.
The next useful docs are:

- a short example pack of reviewer/worker instructions for common EMIS task types

Already available local navigation docs:

- `src/lib/server/emis/AGENTS.md`
- `src/routes/api/emis/AGENTS.md`
- `docs/emis_worker_handoff_template.md`
- `docs/emis_review_handoff_template.md`

Until the remaining templates exist, this document is the canonical place for role boundaries and model choices.
