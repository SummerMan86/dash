# Wave 2 Preflight — Migration Ledger (ST-0)

> Temporary work note. Not a canonical doc. Delete after wave close.

## Baseline Counts (command-backed)

| Metric | Value |
|--------|-------|
| Total live files in `docs/agents/` | 36 |
| Canonical files (excl. live state) | 31 |
| Canonical lines | 4894 |

## Live Ref Counts for Retiring Docs (outside `archive/`)

| Retiring doc | Total refs | Files referencing (non-archive) |
|---|---|---|
| `review-gate.md` | 58 across 19 files | workflow.md(8), lead-strategic/instructions.md(5), current_plan.md(5), orchestrator/instructions.md(4), AGENTS.md(2), docs/AGENTS.md(2), architecture-reviewer/instructions.md(2), templates.md(2), invariants.md(2), orchestrator/last_report.md(1), execution-profiles.md(1), roles.md(1), worker/guide.md(1), autonomous-protocol.md(1), definition-of-done.md(1), docs/plans/appliance_clickhouse_vm.md(1) |
| `roles.md` | 26 across 13 files | current_plan.md(5), AGENTS.md(2), docs/AGENTS.md(2), execution-profiles.md(1), workflow.md(1), .claude/agents/README.md(1), lead-strategic/instructions.md(1) |
| `autonomous-protocol.md` | 27 across 7 files | autonomous-protocol.md(5 self-ref), current_plan.md(5), lead-strategic/instructions.md(3), docs/AGENTS.md(2), execution-profiles.md(1) |
| `user-guide.md` | 19 across 7 files | current_plan.md(7), roles.md(1), execution-profiles.md(1), autonomous-protocol.md(1), AGENTS.md(1), docs/AGENTS.md(1) |
| `usage-telemetry.md` | 19 across 6 files | current_plan.md(5), docs/AGENTS.md(2), workflow.md(2), templates.md(1), execution-profiles.md(1) |

## Navigation Files

All three exist and are in repoint scope (ST-3):

- `AGENTS.md` — refs: review-gate(2), roles(2), user-guide(1)
- `docs/AGENTS.md` — refs: review-gate(2), roles(2), autonomous-protocol(2), user-guide(1), usage-telemetry(2)
- `CLAUDE.md` — no retiring-doc refs (clean)

## Telemetry Decision

`usage-telemetry.md` has live consumers:
- `templates.md` — schema reference
- `workflow.md` — 2 refs (reading list)
- `docs/AGENTS.md` — 2 refs (index table + reading order)
- `execution-profiles.md` — 1 ref (duplication allowlist)

**Path: move** to `docs/ops/usage-telemetry.md`, repoint consumers, delete old path in ST-4.

## Migration Ledger

### Rewrite (ST-1)

| File | Action | Notes |
|------|--------|-------|
| `workflow.md` (557 lines) | rewrite | Absorb review-gate content, single-source review floor/DoD |
| `execution-profiles.md` (127 lines) | rewrite | Keep role-to-model mapping only, strip plugin/proof content |

### Create (ST-1)

| File | Action | Notes |
|------|--------|-------|
| `autonomous-mode.md` | create | Delta appendix pointing to workflow.md, codex-integration.md, recovery.md |
| `docs/codex-integration.md` | create | Plugin commands, proof tuples, companion CLI — outside `docs/agents/` |

### Deprecate then Delete (ST-1 header → ST-4 delete)

| File | Lines | Notes |
|------|-------|-------|
| `review-gate.md` | 474 | Content absorbed into workflow.md |
| `autonomous-protocol.md` | 689 | Content absorbed into autonomous-mode.md |
| `roles.md` | 39 | Content absorbed into workflow.md / execution-profiles.md |
| `user-guide.md` | 430 | Content extracted to QUICKSTART.md |

### Touch-Light / Repoint (ST-2)

| File | Lines | Notes |
|------|-------|-------|
| `orchestrator/instructions.md` | 250 | Repoint review-gate refs → workflow.md |
| `lead-strategic/instructions.md` | 290 | Repoint review-gate, roles, autonomous-protocol refs |
| `worker/guide.md` | 229 | Repoint review-gate ref |
| `templates.md` | 410 | Repoint refs, remove governance prose |
| `architecture-reviewer/instructions.md` | 171 | Repoint review-gate refs |
| `invariants.md` | 152 | Repoint review-gate refs |

### Create (ST-2)

| File | Action | Notes |
|------|--------|-------|
| `docs/QUICKSTART.md` | create | Operator runbook extracted from user-guide.md |

### Touch-Light / Slim (ST-3)

| File | Lines | Notes |
|------|-------|-------|
| `git-protocol.md` | 158 | Slim to worktree/branch/merge only |
| `recovery.md` | 244 | Slim, reference canon |

### Move (ST-3)

| File | Action | Notes |
|------|--------|-------|
| `usage-telemetry.md` | move → `docs/ops/usage-telemetry.md` | Repoint consumers first |

### Delete (ST-4)

| File | Lines | Notes |
|------|-------|-------|
| `architecture-steward/instructions.md` | 3 | Stub |
| `baseline-governor/instructions.md` | 3 | Stub |
| `definition-of-done.md` | 3 | Redirect stub |
| `memory-protocol.md` | 3 | Stub |
| `strategic-reviewer/instructions.md` | 3 | Stub |
| `templates-handoff.md` | 3 | Stub |
| `templates-orchestration.md` | 3 | Stub |
| `ui-reviewer-deep/instructions.md` | 3 | Stub |
| `worker/instructions.md` | 3 | Stub |

### No-Touch (no retiring-doc refs)

| File | Lines |
|------|-------|
| `code-reviewer/instructions.md` | 51 |
| `docs-reviewer/instructions.md` | 56 |
| `security-reviewer/instructions.md` | 42 |
| `ui-reviewer/instructions.md` | 94 |
| `skills/debugging.md` | 54 |
| `skills/testing-strategy.md` | 84 |
| `invariants-emis.md` | 43 |

### Live State (excluded from canonical count)

| File | Lines | Notes |
|------|-------|-------|
| `lead-strategic/current_plan.md` | — | ST-3 refresh |
| `lead-strategic/memory.md` | — | No change |
| `orchestrator/last_report.md` | — | ST-3 refresh |
| `orchestrator/memory.md` | — | No change |
| `orchestrator/decision-log.md` | — | No change |

## Coverage Check

- 36 files listed = 36 files found. **No file left unclassified.**
- `execution-profiles.md` classified as `rewrite`, not delete — it stays as a live bootstrap doc.
- `usage-telemetry.md` classified as `move/repoint` because live consumers exist.
- Navigation files explicitly in repoint scope: `AGENTS.md`, `docs/AGENTS.md`, `CLAUDE.md`.
