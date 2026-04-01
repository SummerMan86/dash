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

1. `user-orchestrator`
2. `lead-integrator`
3. `architecture-reviewer`
4. `security-reviewer`
5. `docs-contracts-reviewer`
6. `worker`
7. `ui-reviewer` only when frontend changes are involved

The `user-orchestrator` is explicit here because the current collaboration model assumes independent agent conversations plus local Git as the transport layer.

Without that role, the operating model leaves unclear who routes tasks, branch references, and review feedback between agents.

Do not split the system into too many permanent specialists unless the project becomes materially larger.
At the current scale, map-specific, BI-specific, or DB-specific reviewers would create more coordination overhead than value.

## 3. Persistent vs On-Demand

### Persistent agents

These are worth keeping alive within one session because they own long-lived invariants:

- `lead-integrator`
- `architecture-reviewer`
- `security-reviewer`
- `docs-contracts-reviewer`

### On-demand agents

These should run only when the task actually needs them:

- `ui-reviewer`
- `worker`

Reason:

- UI review is not necessary for backend-only or docs-only changes.
- Workers should own a bounded slice, finish it, and hand the result back.

## 4. Role Definitions

### 4.0. `user-orchestrator`

**Mission**

Stay in contact with each independent agent and route work between them.

**Why this context must stay explicit**

- Independent agents do not automatically see each other's local conversations.
- Local Git is the shared transport, but the user remains the communication bridge.

**Scope**

- assign tasks
- provide branch names, commit ranges, and handoff context
- decide when work goes to review
- decide when approved work is merged

**Main checks**

- every worker has a bounded task and a target branch
- the lead receives the correct base branch and feature branch for review
- unresolved review comments are routed back to the correct agent

**Escalate when**

- two agents claim the same ownership slice;
- review feedback conflicts across agents;
- the branch structure no longer reflects the intended integration order.

**Do not**

- assume independent agents can see or coordinate with each other automatically;
- treat local Git history as self-explanatory without a short handoff.

### 4.1. `lead-integrator`

**Mission**

Own the whole EMIS change as a system, not just as a diff.

**Why this context must stay separate**

- It carries the full architecture map.
- It decides placement, boundaries, and acceptable complexity.
- It is responsible for final approve/reject and tradeoff decisions.

**Scope**

- whole diff
- cross-layer consequences
- architectural placement
- complexity control
- integration of worker outputs
- final decision on approve / request changes / needs redesign

**Main checks**

- does the code live in the correct layer?
- does the change increase or reduce long-term complexity?
- does the change respect EMIS operational vs BI/read-side boundaries?
- does the task need follow-up refactoring before more feature growth?

**Escalate when**

- the task changes the placement of responsibilities between layers;
- a file is becoming a god-component or god-module;
- a change introduces a new contract or affects several slices at once;
- workers disagree or produce conflicting implementations.

**Do not**

- micromanage trivial implementation details;
- duplicate all specialized review work;
- let "it works" override structural regressions.

### 4.2. `architecture-reviewer`

**Mission**

Check boundaries, imports, layering, and complexity drift.

**Why this context must stay separate**

- Architecture drift is usually gradual and easy to miss in feature work.
- This role should focus only on structural correctness, not product behavior.

**Scope**

- changed files
- direct imports around changed files
- FSD boundaries
- server-only isolation
- EMIS route/service/query/repository boundaries
- complexity warnings for oversized files

**Main checks**

- `routes/api/emis/*` stay thin
- SQL remains in `server/emis/modules/*`
- `entities/emis-*` remain contracts/schemas/types only
- client code does not import `$lib/server/*`
- operational flows do not leak into dataset/IR abstraction without a real BI reason

**Escalate when**

- a route starts accumulating business logic;
- a query/service boundary becomes blurred;
- a file keeps growing instead of being decomposed;
- a new shared abstraction is introduced without clear reuse pressure.

**Do not**

- comment on security unless it directly follows from a boundary issue;
- block work over stylistic preferences alone.

### 4.3. `security-reviewer`

**Mission**

Check EMIS changes for security regressions and unsafe data handling.

**Why this context must stay separate**

- Security review is orthogonal to architecture and should not be diluted by broader comments.

**Scope**

- changed files only
- SQL safety
- XSS / unsafe rendering
- secrets
- command injection
- SSRF
- write-side guardrails

**Main checks**

- all SQL stays parameterized
- no raw SQL in routes
- no unsafe `{@html}` without sanitization
- no hardcoded secrets or leaked credentials
- no untrusted URL fetches without validation
- write-side flows do not silently accept unsafe defaults in production-shaped mode

**Escalate when**

- any critical issue appears;
- a contract allows unsafe writes or destructive behavior;
- a change weakens auditability.

**Do not**

- rewrite the whole task as a generic secure-coding lecture;
- report non-security style observations as findings.

### 4.4. `docs-contracts-reviewer`

**Mission**

Keep docs, DB truth, runtime contracts, and code in sync.

**Why this context must stay separate**

- In EMIS, docs are part of the architecture.
- Drift between code and declared contracts accumulates silently and hurts onboarding.

**Scope**

- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/emis_*`
- `db/current_schema.sql`
- `db/applied_changes.md`
- `db/schema_catalog.md`
- `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- dataset contracts that surface into BI/read-side

**Main checks**

- new route or endpoint appears in docs where needed
- schema changes update DB docs
- runtime behavior changes update runtime contract docs
- new active slices get local navigation docs when complexity justifies it

**Escalate when**

- the code changed a contract but docs still describe the old one;
- a new active slice has no discoverable navigation entry;
- a DB change is only reflected in code or in prose, but not both.

**Do not**

- request docs updates for trivial cosmetic changes;
- treat docs as optional afterthoughts.

### 4.5. `worker`

**Mission**

Implement one bounded slice quickly and hand it back cleanly.

**Why this context must stay separate**

- Workers should stay focused on execution, not on holding the whole project in memory.

**Scope**

- one endpoint
- one widget
- one form
- one BI page
- one DB patch
- one focused refactor slice

**Required handoff**

- what changed
- which files were touched
- what assumptions were made
- which checks were run
- what remains risky or unresolved

**Escalate when**

- the task crosses into another ownership slice;
- placement is ambiguous;
- the required fix becomes architectural rather than local.

**Do not**

- spread into unrelated files;
- invent new abstractions "for the future";
- silently rewrite the task.

### 4.6. `ui-reviewer`

**Mission**

Check that a frontend change still loads, renders, and behaves coherently.

**Why this context stays on-demand**

- It is expensive compared to simple code review.
- It is only useful when `.svelte`, route UI, form UX, or map interactions changed.

**Scope**

- blank screens
- console errors
- broken interactions
- missing content
- severe layout regressions
- obvious accessibility failures in changed flows

**Escalate when**

- the page does not load;
- console errors appear;
- the changed flow is visually or interactively broken.

**Do not**

- block a task over subjective design taste alone;
- comment on backend structure.

## 5. Non-Negotiable EMIS Invariants

These invariants should be enforced by the lead and checked by reviewers:

- SQL lives in `src/lib/server/emis/modules/*`, not in `src/routes/api/emis/*`.
- `routes/api/emis/*` is transport only.
- `entities/emis-*` contain contracts, DTOs, types, schemas, and pure mappers only.
- client-side code does not import `$lib/server/*`.
- EMIS operational flows do not get pushed into dataset/IR abstraction "just in case".
- schema changes update `db/current_schema.sql` and `db/applied_changes.md`.
- runtime behavior changes update `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`.
- new active slices with meaningful complexity should gain local navigation docs.

## 6. Complexity Guardrails

The current repository already has warning signs around oversized route/widget orchestration files.

Use these thresholds as a soft policy:

- `500-700` lines: warning, ask whether decomposition is overdue
- `700-900` lines: mandatory discussion in review
- `900+` lines: default expectation is decomposition unless there is a very strong reason not to

This is especially important for:

- `src/routes/emis/+page.svelte`
- `src/lib/widgets/emis-map/EmisMap.svelte`
- route-level BI dashboards that start embedding too much transformation logic

## 7. Review Flow

Recommended flow for code changes:

1. Worker receives a bounded task.
2. Before implementation, worker declares touch points and assumptions:
   - files to change
   - layers touched
   - DB/docs impact
3. Worker implements the slice in its ownership boundary.
4. Worker runs the required local checks.
5. Worker hands off the change with a short summary:
   - what changed
   - why the code lives here
   - what remains risky
6. Specialized reviewers inspect the diff:
   - architecture
   - security
   - docs/contracts
   - UI if needed
7. `lead-integrator` gives the final decision:
   - `approve`
   - `request changes`
   - `needs design decision`

The lead should be mandatory for:

- new route or endpoint
- new shared contract
- new DB schema or published view changes
- changes in `server/emis/modules/*`
- changes that affect `/emis` workspace orchestration
- changes that alter operational vs BI/read-side boundaries

Lightweight review is acceptable for:

- local UI polish without behavior change
- copy/text/style-only fixes
- small bugfix inside an existing bounded module

### Compatibility with repository Review Gate

This document refines the EMIS role model but does not replace the repository-level Review Gate from the root `AGENTS.md`.

For EMIS work, use the following mapping:

- `lead-integrator` is the final approver and owner of integration decisions
- `architecture-reviewer` maps directly to the root architecture review
- `security-reviewer` maps directly to the root security review
- `docs-contracts-reviewer` is the EMIS-specific extension of the root docs review
- an additional Codex second-opinion review remains optional but recommended for risky cross-slice changes

If there is any conflict, the root `AGENTS.md` remains the higher-level repository rule, and this document explains how EMIS applies it in practice.

## 8. Local Git Collaboration Flow

Current assumption: Git collaboration is local-first, without requiring remote MR infrastructure.

Recommended flow:

1. `user-orchestrator` assigns a bounded task to one worker.
2. The worker creates or receives a dedicated local feature branch.
3. The worker makes local commits and prepares a short handoff:
   - what changed
   - touched files
   - assumptions
   - checks run
   - open risks
4. The user passes the lead:
   - `base branch`
   - `feature branch`
   - optional `commit range`
   - the worker handoff note
5. `lead-integrator` reviews `git diff base..feature` and any relevant files.
6. Specialized reviewers inspect the same diff when needed.
7. Final decision is one of:
   - `approve`
   - `request changes`
   - `needs redesign`
8. Merge happens only after lead approval and explicit user confirmation.

Important constraints:

- agents should not assume they can see local branches created in another runtime unless the user exposes them
- local Git is the transport of record, but the user is still the routing layer for independent agents
- review comments should point to a branch, file, or commit range, not only to chat context

## 9. Recommended Model Choices

When both Codex and Claude are available, model diversity is useful.
The best default for this repository is:

- use Codex as the lead/integrator;
- use Claude reviewers for fast independent review passes;
- use Claude Agents Team as the default worker pool;
- use Codex workers selectively for integration-heavy or architecture-sensitive implementation slices.

### Default assignment

| Role                       | Recommended default  | Why                                                                 |
| -------------------------- | -------------------- | ------------------------------------------------------------------- |
| `lead-integrator`          | Codex `gpt-5.4`      | strongest coding/integration judgment and best fit for approve flow |
| `architecture-reviewer`    | Claude Sonnet        | fast, cheap, good at structural review and diff commentary          |
| `security-reviewer`        | Claude Sonnet        | efficient independent second perspective for risk scanning          |
| `docs-contracts-reviewer`  | Claude Sonnet        | strong at consistency checks across docs and contracts              |
| `worker`                   | Claude Agents Team   | good default for bounded implementation with direct user contact    |
| `worker` for hard refactor | Codex `gpt-5.4`      | better when the task crosses several modules                        |
| `ui-reviewer` smoke        | Claude Sonnet        | practical default for quick smoke validation                        |
| `ui-reviewer` deep         | Claude Opus          | better for nuanced UX and interaction critique                      |

### Practical recommendation for this repository

If one agent is explicitly assigned the technical lead role, prefer:

- `Codex gpt-5.4` as `lead-integrator`

Then keep the reviewer layer heterogeneous:

- Claude Sonnet for `architecture-reviewer`
- Claude Sonnet for `security-reviewer`
- Claude Sonnet for `docs-contracts-reviewer`
- Claude Sonnet or Opus for `ui-reviewer` depending on depth needed

For implementation work, prefer:

- Claude Agents Team as the default `worker`
- Codex `gpt-5.4-mini` or `gpt-5.4` only when the task is integration-heavy, refactor-heavy, or likely to require stronger local codebase synthesis

Reason:

- it reduces correlated blind spots;
- it keeps final architectural ownership in a coding-first lead agent;
- it gives independent review signals from another model family.

## 10. Minimum Instruction Template Per Agent

Each agent instruction should define:

- `Mission`
- `Scope`
- `Inputs`
- `Checks`
- `Output format`
- `Escalate when`
- `Do not`

If an agent cannot be described in these seven fields, its role is probably too vague and should not be made persistent yet.

## 11. Next Documentation To Add

The first operating-model doc pack now exists.
The next useful docs are:

- local `AGENTS.md` for `src/lib/server/emis/`
- local `AGENTS.md` for `src/routes/api/emis/`
- a short example pack of worker instructions for common EMIS task types

Until those exist, this document is the canonical place for role boundaries and model choices.
