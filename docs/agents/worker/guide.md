# Worker Guide

Self-contained guide for `worker` and `micro-worker`.
Default assumption: you are implementing one bounded slice for `orchestrator`.
`direct-fix` is an `orchestrator`-only path and is not part of the worker contract.

## 1. What You Own

- Implement exactly the slice described in the task packet.
- Stay inside assigned scope and ownership boundaries.
- Run the requested checks and record truthful evidence.
- Run slice review when the change writes product code.
- Return a handoff that lets `orchestrator` accept or reject the slice without rereading the whole codebase.

You do **not** own the canonical plan, strategic reframe, or durable memory.

## 2. Bootstrap

Before touching code:

1. Read the full task packet.
2. Read every file listed in `Bootstrap Reads`.
3. Read local `AGENTS.md` files for the touched zones.
4. If the slice depends on previous work, read `Carry-Forward Context` before implementation.

If you are running in `isolated` mode (`subagent + worktree`):

- `CLAUDE.md` is only a redirect; the task packet is the real source of truth.
- If a worktree-local redirect is stale or conflicts with this guide, the task packet and this guide win.
- `settings.json` and user profile are not available.
- You work only in your assigned worker branch.

If you are running in `in-place` mode (default):

- You share the checkout with `orchestrator`.
- Commit directly to the integration branch listed in the task packet, only within owned files.
- `settings.json` and user profile may be visible, but you still follow the task packet, not ambient config.

Do not start implementation if any required task-packet field is missing:

- task description
- scope and out-of-scope
- integration branch and base commit
- bootstrap reads
- acceptance criteria
- required checks
- required return artifacts

For dependent slices, missing or placeholder-only `Carry-Forward Context` is also a blocker.
Escalate to `orchestrator` instead of guessing.

## 3. Work Cycle

1. Validate the task packet.
2. Read bootstrap docs and local module navigation.
3. Implement only the assigned slice.
4. Run self-check and requested verification.
5. Run slice review using the trigger table below.
6. Fix local non-critical findings when the fix is clear and still in scope.
7. Commit to the assigned branch.
8. Return a truthful handoff with evidence, review disposition, and risks.

## 4. Mode Discipline

Mode is assigned by `orchestrator` in the task packet per `git-protocol.md` §3-4.
Do not change modes yourself; escalate if the assigned mode looks wrong for the slice.

### In-place mode

Default for all workers and micro-workers (sequential execution).

- Work in the shared checkout.
- Commit directly to the integration branch listed in the task packet.
- Touch only owned files; if scope overlap appears, stop and escalate.
- Do not create a separate worker branch.

### Isolated mode

Opt-in for Claude subagent workers when a `git-protocol.md` §4 trigger applies (parallel execution, schema/cross-layer touch, explicit isolation rationale).

- Work only in `agent/worker/<slug>`.
- Do not commit to the integration branch.
- Do not reuse another worker's worktree.
- `orchestrator` merges your branch after handoff.

### Shared rules

- If base branch or base commit is unclear, escalate before implementation.
- If the slice becomes architectural, cross-scope, or no longer local, escalate before expanding it.
- Do not silently rewrite the task.

## 5. Guardrails You Enforce

> Derived from `docs/agents/invariants.md` §1-5, §9. If this excerpt and the canonical source diverge, the canonical source wins. If a slice appears to require changing or waiving one of these rules, stop and escalate to `orchestrator`.

### Architecture and boundaries

> App-local code в `apps/web/src/lib/` теперь живёт в плоских peer-модулях (`api`, `fixtures`, `styles`, `<module>`), а route-owned UI остаётся в `src/routes/...`. Reusable бизнес-логика, контракты и server-side код живут в `packages/*`.

| Rule | Worker action |
| --- | --- |
| Reusable logic lives in packages | New reusable contracts, server logic, UI — в `packages/*`; app-local peer modules in `src/lib/*` remain composition/orchestration only. |
| Flat app-local modules stay responsibility-scoped | Do not recreate `shared`, `entities`, `features`, or `widgets`; use `src/lib/<module>/` or route-local files. |
| App-local modules are peers, not hidden dependency layers | If two peer modules need shared code, move it to `packages/*` or to a narrower route-local shared home. |
| Client-side code does not import `$lib/server/*` | Use route/load/API seams instead of server imports in client modules. |
| Use path aliases consistently | Prefer `$lib/*` over fragile cross-tree relative paths. Removed aliases (`$shared`, `$entities`, `$features`, `$widgets`) must not appear in new code. |

### Placement and transport

| Rule | Worker action |
| --- | --- |
| SQL does not live in route handlers | Put SQL in `packages/*` or `src/lib/server/*`, not in `+server.ts`. |
| Reusable logic goes to the canonical package home | Put reusable contracts/logic into `packages/*`; keep routes thin and app-local. |
| Route handlers stay thin | Parse, validate, derive context, delegate, map errors; do not bury business logic in routes. |

### Docs, contracts, and schema sync

| Rule | Worker action |
| --- | --- |
| Schema changes update DB docs | Update `db/current_schema.sql` and `db/applied_changes.md`. |
| Runtime/API changes update active contract docs | Update `RUNTIME_CONTRACT.md` when the touched area has an active contract file. |
| New meaningful multi-file directories get `AGENTS.md` | Add a local navigation doc when you create a real module directory. |
| Changed module structure/exports/deps/placement updates existing `AGENTS.md` | Keep the nearest `AGENTS.md` truthful. |

### Quality and complexity

| Rule | Worker action |
| --- | --- |
| No speculative abstractions | Solve the current task, not future guesses. |
| `500-700` lines is a warning band | Call out growth and avoid making a large file worse without reason. |
| `700-900` lines needs explicit review discussion | Mention why the file is still acceptable or propose decomposition. |
| `900+` lines defaults to decomposition | Do not keep growing it unless an explicit waiver already exists. |

### BI-only guardrails

Apply these when the slice touches datasets, providers, filters, or BI pages.

| Rule | Worker action |
| --- | --- |
| New datasets do not use `looseParams` | Define explicit Zod schemas with named fields. |
| `paramsSchema` validation is not bypassed before custom compile | Keep parameter validation in the normal dataset path. |
| `SelectIr` stays read-model only | Do not add `groupBy`, `call()`, or aggregations to IR. |
| New BI pages use `useFlatParams: true` in `fetchDataset()` | Do not add new legacy filter-merge flows. |
| Operational workflows stay separate from analytics dashboards | Do not mix CRUD/external-write flows into dashboard composition. |
| Heavy view-model and aggregation logic lives in `.ts` modules | Precompute outside inline `.svelte` page logic. |
| Provider caching uses shared helpers | Reuse `providerCache`; do not invent provider-local cache systems. |
| Provider SQL safety stays intact | Do not bypass `isSafeIdent()` or similar provider safety guards. |
| New datasets and providers extend via registration | Add registrations; do not poke holes in central routers/switches. |

## 6. Review, Evidence, and DoD

Canonical ownership stays in `docs/agents/workflow.md`:

- reviewer selection and minimum independent review floor: §3.1-§3.2
- evidence freshness and truthful reporting: §3.6-§3.7
- Slice DoD and micro-task exemption: §6.1

Use those sections directly when deciding:

- which reviewers to run
- whether a review skip is allowed
- how to classify checks as `fresh` or `not run + reason`
- which DoD items may be marked `N/A`

This guide does not redefine review-floor rules, reviewer-selection rules, or DoD checklists.

## 7. Handoff Templates

Canonical handoff templates: `docs/agents/templates.md` §1-§2.

- Worker Handoff: §1
- Micro-Worker Handoff: §2

The task packet specifies which template to use. Key handoff contract:

- **Required:** task summary, change manifest, checks evidence, review disposition, next action requested
- **Micro-worker:** shortened format — what changed, manifest, checks, review, next action
- If a field is not applicable, mark it `N/A` with a reason; do not silently omit

## 10. Compatibility Notes

- `direct-fix` is an `orchestrator`-only path, not a worker path.
- Workers do not maintain a separate `memory.md`.
- This file (`worker/guide.md`) is the canonical worker doc. There is no separate worker bootstrap doc.
