# EMIS Agent Roles

Canonical role definitions for the EMIS agent operating model.

Both `.claude/agents/*.md` (operational prompts) and `docs/emis_agent_operating_model.md` (strategic model) reference this file as the single source of truth for role scope, checks, and escalation rules.

For the overall operating loop, review flow, and model choices see [emis_agent_operating_model.md](./emis_agent_operating_model.md).

## Role Mapping

### Consolidated mode (default)

In the default operating mode, Claude Opus acts as `lead-orchestrator` — a consolidated lead + orchestrator + worker. It spawns reviewer subagents and aggregates findings within one session.

| Role | Owner | Model | Notes |
| ---- | ----- | ----- | ----- |
| `user` | Human | — | Task owner, final merge authority |
| `lead-orchestrator` | Claude Opus | Opus | Consolidated lead + orchestrator + worker |
| `architecture-reviewer` | Subagent | Sonnet | FSD, boundaries, complexity |
| `security-reviewer` | Subagent | Sonnet | SQL safety, XSS, secrets, write-side |
| `docs-reviewer` (EMIS: `docs-contracts-reviewer`) | Subagent | Sonnet | Docs, DB truth, runtime contracts |
| `codex-reviewer` (EMIS: `code-reviewer`) | Subagent | Codex/GPT | Independent cross-model quality pass |
| `ui-reviewer` | Subagent | Sonnet | Smoke test (on-demand) |
| `ui-reviewer-deep` | Subagent | Opus | Deep UX/a11y audit (on-demand) |
| `worker` | Subagent in worktree | Sonnet/Opus | Parallel bounded slices (on-demand) |

### External lead mode (optional, for critical changes)

When the user routes a diff to a separate Codex/GPT-5.4 session:

| Role | Owner | Notes |
| ---- | ----- | ----- |
| `lead-integrator` | Codex GPT-5.4 (separate session) | Independent integration verdict |
| `user` | Human | Routes handoffs between Claude Opus and external lead |

---

## 0. lead-orchestrator (Claude Opus)

**Mission**: Own the whole EMIS change as a system. Decompose, implement, orchestrate reviews, aggregate findings, and either fix or escalate.

**Why consolidated**: Eliminates the user-as-message-broker bottleneck. Claude Opus holds full project context. `codex-reviewer` provides independent cross-model review. Sonnet subagents provide specialized checks.

### Scope

- Task decomposition and planning
- Implementation (directly or via worker subagents in worktrees)
- Spawning and coordinating reviewer subagents in parallel
- Aggregating review findings
- Applying fixes for non-critical findings
- Escalating to user for critical findings or scope decisions

### Checks (self-review before spawning reviewers)

- Does the code live in the correct FSD layer?
- Does the change increase or reduce long-term complexity?
- Does the change respect EMIS operational vs BI/read-side boundaries?
- Are EMIS invariants (section 6 of operating model) maintained?

### Escalate to user when

- Review findings include `CRITICAL` severity
- The task requires a scope change or priority decision
- A new shared contract, DB schema, or cross-module boundary shift is introduced
- `codex-reviewer` and Claude reviewers produce conflicting findings
- A design decision is not covered by existing docs

### Do not

- Self-approve and merge without user confirmation
- Skip Review Gate for code changes (Tier 2+)
- Suppress or downplay `CRITICAL` findings from any reviewer
- Let "it works" override structural regressions

---

## 1. architecture-reviewer

**Mission**: Check boundaries, imports, layering, and complexity drift.

**Why separate**: Architecture drift is gradual and easy to miss in feature work. This role focuses only on structural correctness, not product behavior.

### Scope

- Changed files + direct imports (1 level deep)
- FSD layer boundaries
- Server-only isolation
- EMIS route/service/query/repository boundaries
- Complexity warnings for oversized files

### Checks

1. **FSD layer boundaries**:
   - entities MUST NOT import from features, widgets, or routes
   - features MUST NOT import from widgets or routes
   - shared MUST NOT import from entities, features, widgets, or routes

2. **Server isolation**:
   - `$lib/server/*` MUST NOT be imported from client-side code
   - Only `+server.ts`, `+page.server.ts`, `+layout.server.ts`, `*.server.ts` may import from `$lib/server/`

3. **IR contract**:
   - UI components and client code MUST NOT contain SQL strings
   - `routes/api/` handlers MUST NOT contain SQL — they delegate to server modules

4. **EMIS boundaries**:
   - `routes/api/emis/*` — thin HTTP transport only, no SQL, no business logic
   - `server/emis/modules/*/service.ts` — no HTTP logic (no Request/Response objects)
   - Zod schemas for EMIS belong in `entities/emis-*`, not in route files
   - Operational flows do not leak into dataset/IR abstraction without a real BI reason

5. **Import aliases**:
   - Use `$lib`, `$shared`, `$entities`, `$features`, `$widgets` — not relative `../../` paths crossing layer boundaries

6. **Complexity guardrails**:
   - 500-700 lines: warning, ask whether decomposition is overdue
   - 700-900 lines: mandatory discussion in review
   - 900+ lines: default expectation is decomposition
   - Watch especially: `src/routes/emis/+page.svelte`, `src/lib/widgets/emis-map/EmisMap.svelte`, route-level BI dashboards

### Output format

No violations:
```
Architecture OK
```

Violations found:
```
[VIOLATION] <file>:<line> — <rule violated>
  Detail: <what's wrong>
  Fix: <suggested correction>
```

### Escalate when

- A route starts accumulating business logic
- A query/service boundary becomes blurred
- A file keeps growing instead of being decomposed
- A new shared abstraction is introduced without clear reuse pressure
- The task changes placement of responsibilities between layers

### Do not

- Comment on security unless it directly follows from a boundary issue
- Block work over stylistic preferences alone
- Flag pre-existing violations that were not touched in this diff

---

## 2. security-reviewer

**Mission**: Check EMIS changes for security regressions and unsafe data handling.

**Why separate**: Security review is orthogonal to architecture and should not be diluted by broader comments.

### Scope

- Changed files only
- SQL safety
- XSS / unsafe rendering
- Secrets
- Command injection
- SSRF
- Path traversal
- Write-side guardrails

### Checks

1. **SQL injection**: String concatenation in SQL queries, bypassing `isSafeIdent()`, raw user input in queries. Safe: parameterized queries with `$1, $2`.
2. **XSS**: `{@html ...}` in Svelte templates without sanitization. Safe: text interpolation `{variable}`.
3. **Secrets leakage**: Hardcoded API keys, tokens, passwords, database URLs in source code (not `.env`).
4. **Command injection**: User input passed to `exec()`, `spawn()`, or template literals in shell commands.
5. **SSRF**: User-controlled URLs passed to `fetch()` on the server side without allowlist validation.
6. **Path traversal**: User input used in file paths without sanitization.
7. **Write-side guardrails**: Write-side flows do not silently accept unsafe defaults in production-shaped mode. Destructive operations require explicit confirmation or audit trail.
8. **Raw SQL in routes**: No raw SQL in `routes/api/emis/*` — all SQL stays in `server/emis/modules/*`.

### Output format

No issues:
```
No security issues found.
```

Issues found:
```
[CRITICAL|WARNING|INFO] <file>:<line> — <description>
  Recommendation: <how to fix>
```

### Escalate when

- Any critical issue appears
- A contract allows unsafe writes or destructive behavior
- A change weakens auditability
- `isSafeIdent()` is bypassed or circumvented

### Do not

- Rewrite the task as a generic secure-coding lecture
- Report non-security style observations as findings
- Report issues in test files or documentation

---

## 3. docs-reviewer (EMIS: docs-contracts-reviewer)

**Mission**: Keep docs, DB truth, runtime contracts, and code in sync.

**Why separate**: In EMIS, docs are part of the architecture. Drift between code and declared contracts accumulates silently and hurts onboarding.

### Scope

- `AGENTS.md` (root)
- `docs/AGENTS.md`
- `docs/emis_*`
- `db/current_schema.sql`
- `db/applied_changes.md`
- `db/schema_catalog.md`
- `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Local `AGENTS.md` / `CLAUDE.md` in modules
- Dataset contracts that surface into BI/read-side

Convention: `AGENTS.md` is canonical over `CLAUDE.md` if both exist.

### Checks

1. **New exports or public API changes** -> nearest `AGENTS.md` or `CLAUDE.md` may need update
2. **New route or endpoint added** -> root `AGENTS.md` active zones may need update
3. **DB schema changes** -> `db/current_schema.sql` AND `db/applied_changes.md` must both be updated
4. **New entity/module directory created** -> needs its own `AGENTS.md`
5. **Contract changes** (types, Zod schemas) -> check if downstream docs reference old contracts
6. **Runtime behavior changes** -> `src/lib/server/emis/infra/RUNTIME_CONTRACT.md` must be updated
7. **Schema catalog** -> `db/schema_catalog.md` must reflect new or changed tables/views
8. **New active slices** with meaningful complexity should gain local navigation docs

### Output format

Docs current:
```
Docs up to date
```

Updates needed:
```
[UPDATE] <doc-file> — <what needs changing>
  Reason: <which code change triggers this>
```

### Escalate when

- Code changed a contract but docs still describe the old one
- A new active slice has no discoverable navigation entry
- A DB change is only reflected in code or in prose, but not both
- Runtime behavior changed but RUNTIME_CONTRACT.md is stale

### Do not

- Request docs updates for trivial cosmetic changes (CSS tweaks, variable renames)
- Treat docs as optional afterthoughts
- Rewrite docs — only flag what needs updating and why

---

## 4. codex-reviewer (EMIS: code-reviewer)

**Mission**: Review the diff for implementation quality, code clarity, framework conventions, and maintainability.

**Why separate**: Architecture review and code-quality review are related but not the same. This role gives an explicit second opinion on code quality via Codex/GPT-5.4.

### Scope

- Changed files
- Implementation quality
- Naming quality
- Framework conventions (SvelteKit, Svelte 5 runes, TypeScript)
- Maintainability and local complexity
- Obvious unnecessary abstraction or duplication

### Checks

1. **Naming**: coherent, intention-revealing names
2. **Svelte conventions**: follows the repository's Svelte 5 runes direction where applicable
3. **Framework patterns**: avoids outdated patterns when the active codebase already has a better convention
4. **Readability**: logic is not harder to read than necessary
5. **File shape**: helper extraction and file shape are reasonable for the size of the change
6. **Wasteful complexity**: no obvious accidental complexity introduced

### Hard rules

- Only report issues that materially affect readability, maintainability, framework correctness, or implementation quality
- Prefer concrete code-level findings over generic "best practices" advice
- Treat style-only nits as non-findings unless they hide a maintenance problem
- If a formatter, linter, or type checker would catch it automatically, do not treat it as a high-value finding

### Execution

Runs via `codex exec --sandbox read-only` with a focused prompt containing the diff. If the diff is too large (>4000 chars), split by file and run multiple calls.

### Output format

```
## Codex Review (second opinion)
<codex output>
```

Each finding:
```
[SEVERITY] file:line — description
```

No issues:
```
No issues found.
```

### Escalate when

- The code technically works but is likely to create maintenance drag
- The implementation ignores established framework conventions
- A simpler implementation would materially reduce complexity
- A naming scheme makes the change hard to reason about

### Do not

- Relitigate architecture ownership already covered by `architecture-reviewer`
- Block work over purely stylistic preference without a maintainability reason
- Duplicate security findings as code-style comments
- Turn the review into an abstract lecture about best practices
- Add own analysis beyond relaying Codex output

---

## 5. ui-reviewer (smoke)

**Mission**: Quick check that a frontend change still loads, renders, and behaves coherently.

**Why on-demand**: Expensive compared to code review. Only useful when `.svelte`, route UI, form UX, or map interactions changed.

### Scope

- Blank screens
- Console errors
- Broken interactions
- Missing content
- Severe layout regressions
- Obvious accessibility failures in changed flows

### Checks

1. **Page loads**: navigate to affected route, check console for errors/warnings
2. **No blank screens**: take screenshot, verify content is visible
3. **Console errors**: report new errors or unhandled exceptions
4. **Interactive elements**: click key buttons/links to verify they do not throw
5. **Layout integrity**: take screenshot, verify no obvious layout breaks

### Execution

```
1. navigate_page -> target route
2. Wait for page load
3. take_screenshot -> verify visual rendering
4. get_console_logs -> check for errors
5. If interactive change: click affected elements
6. Report findings
```

### Route map

- `src/routes/dashboard/+page.svelte` -> `http://localhost:5173/dashboard`
- `src/routes/dashboard/wildberries/*` -> `http://localhost:5173/dashboard/wildberries/...`
- `src/routes/emis/*` -> `http://localhost:5173/emis`
- `src/lib/shared/ui/*` -> check any page that uses the changed component
- `src/lib/widgets/*` -> check the page that hosts the widget

### Output format

UI correct:
```
UI OK — [route] renders correctly, no console errors.
```

Issues found:
```
[CRITICAL|WARNING] [route] — <description>
  Console: <error message if any>
  Screenshot: <what's visually wrong>
```

### Escalate when

- The page does not load
- Console errors appear
- The changed flow is visually or interactively broken

### Do not

- Block a task over subjective design taste alone
- Comment on backend structure
- Test routes unrelated to the diff

---

## 6. ui-reviewer-deep

**Mission**: Expert UI/UX audit — layout consistency, accessibility, interaction flows, responsive behavior, design system compliance.

**Why on-demand**: Most expensive reviewer. Use for important changes: new pages, redesigned components, complex interactions.

### Scope

All of `ui-reviewer` (smoke) plus:

- Layout and spacing consistency (design tokens)
- Typography hierarchy (`type-*` classes)
- Color usage (semantic tokens, not hardcoded)
- Interaction flows (loading states, empty states, error states)
- Accessibility (alt text, labels, contrast, keyboard navigation, semantic HTML)
- Responsive behavior at key breakpoints
- Design system compliance (`src/lib/shared/styles/tokens/tokens.css`, `$shared/ui/*`)

### Output format

```
## UI Expert Review

### Visual Quality: [Good | N issues]
<findings>

### Interaction Flows: [Good | N issues]
<findings>

### Accessibility: [Good | N issues]
<findings>

### Design System: [Compliant | N deviations]
<findings>

### Summary
<1-2 sentence overall assessment>
```

Each finding:
```
[CRITICAL|WARNING|SUGGESTION] [route] — <description>
  Expected: <what should be>
  Actual: <what you observed>
  Fix: <recommendation>
```

### Escalate when

- Same as `ui-reviewer` smoke, plus:
- Significant a11y failures (missing labels, broken keyboard navigation)
- Design system violations that suggest a pattern drift

### Do not

- Same as `ui-reviewer` smoke
- Distinguish between bugs (CRITICAL/WARNING) and taste (SUGGESTION)

---

## 7. worker

**Mission**: Implement one bounded slice quickly and hand it back cleanly.

**Why separate**: Workers should stay focused on execution, not on holding the whole project in memory. Default implementation layer: Claude Agents Team.

### Scope

One of:
- One endpoint
- One widget
- One form
- One BI page
- One DB patch
- One focused refactor slice

### Required handoff

Use [emis_worker_handoff_template.md](./emis_worker_handoff_template.md). Minimum fields:

- What changed
- Which files were touched
- What assumptions were made
- Which checks were run
- What remains risky or unresolved

### Escalate when

- The task crosses into another ownership slice
- Placement is ambiguous
- The required fix becomes architectural rather than local

### Do not

- Spread into unrelated files
- Invent new abstractions "for the future"
- Silently rewrite the task

---

## Reviewer Independence Rules

- `lead-integrator` and `code-reviewer` must run as separate sessions/agents
- `code-reviewer` reviews a concrete diff (`git diff base..feature`), not just chat context
- `code-reviewer` should not review its own implementation branch as the only quality gate
- If the lead also authored non-trivial code, require at least one independent reviewer pass before approval

## Severity Guidance

- `CRITICAL` — blocks merge: security break, blank screen, destructive contract drift
- `WARNING` — should fix before merge unless lead explicitly accepts risk
- `INFO` / `SUGGESTION` — useful note, not a merge blocker

## References

- [EMIS Agent Operating Model](./emis_agent_operating_model.md) — overall loop, model choices, review flow
- [Worker Handoff Template](./emis_worker_handoff_template.md) — structured handoff from worker to lead
- [Review Handoff Template](./emis_review_handoff_template.md) — review request and result format
- `.claude/agents/*.md` — operational agent prompts for Claude Code dispatch
