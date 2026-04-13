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

If you are running as `subagent + worktree`:

- `CLAUDE.md` is only a redirect; the task packet is the real source of truth.
- `settings.json` and user profile are not available.
- You work only in your assigned worker branch.

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

### Subagent mode

Default for code-writing work.

- Work only in `agent/worker/<slug>`.
- Do not commit to the integration branch.
- Do not reuse another worker's worktree.
- `orchestrator` merges your branch after handoff.

### Teammate mode

Exception for docs-only, read-only, or governance-closeout work without product code.

- Work directly in the assigned integration branch.
- Touch only the owned files from the task packet.
- If scope overlap appears, stop and escalate.

### Shared rules

- If base branch or base commit is unclear, escalate before implementation.
- If the slice becomes architectural, cross-scope, or no longer local, escalate before expanding it.
- Do not silently rewrite the task.

## 5. Guardrails You Enforce

### Architecture and boundaries

| Rule | Worker action |
| --- | --- |
| `shared` does not import upper app layers or server-only modules | Keep `shared` leaf-like; do not pull in `entities`, `features`, `widgets`, `routes`, or `$lib/server/*`. |
| `entities` does not import `features`, `widgets`, `routes`, or server-only modules | Keep entities reusable and client-safe. |
| `features` does not import `widgets`, `routes`, or server-only modules | Keep feature logic below page composition. |
| Client-side code does not import `$lib/server/*` | Use route/load/API seams instead of server imports in client modules. |
| Use path aliases consistently | Prefer `$lib`, `$shared`, `$entities`, `$features`, `$widgets` over fragile cross-tree relative paths. |

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

## 6. Review Trigger Table

Run reviewers on your slice diff after implementation.

| What changed | Reviewers |
| --- | --- |
| Any product code | `code-reviewer` required |
| SQL, auth, API, secrets, user input | `code-reviewer` + `security-reviewer` |
| Cross-layer imports, placement, package/app home, boundaries | `code-reviewer` + `architecture-reviewer` |
| BI datasets, providers, filters, BI pages | `code-reviewer` + `architecture-reviewer` |
| Docs, contracts, schema files | `docs-reviewer`; add `code-reviewer` too if product code changed in the same slice |
| UI components or pages | `code-reviewer` + `ui-reviewer` |
| Only markdown / docs-only work | `docs-reviewer` only |

If multiple conditions apply, combine reviewers.

## 7. Evidence Rules

- Every reported check is either `fresh` or `not run + reason`.
- `fresh` means it ran in the current session after the final diff.
- Stale results are not acceptable; rerun the check or mark it `not run`.
- Fabricated or contradictory evidence is a `CRITICAL` failure.
- If the task packet expected a check and you did not run it, say so explicitly.

## 8. Slice DoD

### Micro-task exemption

If the final change is `<= 10` changed lines in a single file and has no architectural surface:

- required: acceptance criteria met
- required: scope not violated
- required: checks green
- everything else may be marked `N/A`

This exemption reduces checklist overhead.
It does **not** waive independent review for worker-owned product-code changes; review skip belongs only to `direct-fix`.

### Level 1 checklist

#### Implementation

- [ ] Acceptance criteria from the task packet are met
- [ ] Scope is not violated
- [ ] Applicable invariants are not violated
- [ ] Required checks are green
- [ ] Baseline tests did not shrink

#### Documentation

- [ ] New directories got `AGENTS.md` when needed
- [ ] Changed directories updated `AGENTS.md` when needed
- [ ] New architectural pattern/decision is documented
- [ ] Public API/contract change updated `RUNTIME_CONTRACT.md` when needed
- [ ] Schema change updated `db/current_schema.sql` and `db/applied_changes.md`
- [ ] New feature/capability got user-facing documentation if the packet asked for it

#### Quality

- [ ] No hardcoded secrets or obvious security regressions
- [ ] No speculative abstraction
- [ ] File complexity stayed within guardrails or existing waiver
- [ ] Independent review floor is satisfied for code-writing slices
- [ ] Security-relevant changes ran `security-reviewer`

#### Evidence

- [ ] Every check is `fresh` or `not run + reason`
- [ ] Change manifest is truthful
- [ ] Review disposition is recorded
- [ ] No fabricated or contradictory evidence

## 9. Handoff Templates

### Worker Handoff

```md
# Worker Handoff

## Задача

<что было поручено>

## Что сделано

- <что реализовано>
- ключевые файлы: <список>
- placement notes: <только если решение неочевидно>

## Change Manifest

- owned files changed: <список>
- out-of-scope files touched: `none` | <список>
- contracts / schema / boundaries touched: `none` | <кратко>
- short diff summary for orchestrator: <1-5 bullets>

## Verification

- verification intent: <что проверялось>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- waiver rationale: <если verification deferred или skipped>

## Ветки

- worker branch: agent/worker/<slug> (default for code-writing) | direct integration branch (teammate exception)
- integration branch: <feature/topic>

## Допущения

- <опционально>

## Проверки

- <команда>: <результат>

## Checks Evidence

- <команда>: <green|red> `fresh` | `not run` — <reason>

## Review Disposition

- minimum independent review floor: `satisfied` | `N/A — no product code`
- slice review: `run` | `skipped` | `not applicable`
- rationale: <почему>

## Review Results

- code-reviewer: <OK | findings summary>
- security-reviewer: <OK | findings summary>
- architecture-reviewer: <OK | findings summary>
- docs-reviewer: <OK | findings summary>
- ui-reviewer: <OK | findings summary>

## Slice DoD Status

- docs: <done | N/A — reason | gap — what's missing>
- baseline tests: <maintained | grew to N>

## Continuation Notes (optional — для dependent slices)

- decisions: <какой паттерн/подход выбран и почему>
- gotchas: <неочевидные моменты>
- deferred items: <что осознанно отложено>

## Next Action Requested

- `accept` | `re-review` | `fix-worker` | `escalate`

## Риски / Эскалации

- <риск, блокер, вопрос> или `none`
```

### Micro-Worker Handoff

```md
# Micro-Worker Handoff

## Что сделано

- <кратко, 1-3 bullets>
- файлы: <список>

## Change Manifest

- owned files changed: <список>
- out-of-scope files touched: `none` | <список>

## Checks Evidence

- <команда>: <green|red> `fresh` | `not run` — <reason>

## Review Disposition

- code-reviewer: <OK | findings summary>
- rationale: <почему>

## Next Action

- `accept` | `fix-worker` | `escalate`

## Риски / Эскалации

- <риск, блокер, вопрос> или `none`
```
