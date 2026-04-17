# Plan: Cross-Model Architectural Audit — baseline-governor role

## Status

- opened on `2026-04-17`
- wave status: `active`
- priority: `high` — baseline-governor was merged into `main` as a checkpoint (`a406984`) without prior cross-model review; this wave closes that gap before the role is relied on in a real wave close
- branch: `main` (audit wave; no product code expected)
- recommended execution profile: `opus-orchestrated-codex-workers` — two reviewer lanes per phase, Claude Opus + Codex `gpt-5.4` at `high` effort
- recommended operating mode: `high-risk iterative / unstable wave` — critical governance surface, architecture doc not recently re-verified against repo
- baseline status: `Yellow` (carried from prior wave; `pnpm lint:eslint` pre-existing errors only)
- test baseline: `309` tests (`19` files)
- canonical live plan path: `docs/agents/lead-strategic/current_plan.md`

## Goal

Produce a cross-model audit verdict on the baseline-governor role merged in `a406984`. Two reviewer models (Claude Opus + Codex `gpt-5.4`) on two phases (architecture root doc baseline + baseline-governor delta consistency). Surface any drift, contradiction, or unverified decision before the next real wave close relies on the governor.

No product code is expected in this wave. Any findings that require code or doc edits become follow-up slices.

## Context carried into this wave

### What was merged in `a406984` (baseline-governor checkpoint)

- `docs/agents/baseline-governor/instructions.md` — new role guide (97 lines)
- `.claude/agents/baseline-governor.md` — thin subagent wrapper (`tools: Read, Grep, Glob, Bash`, `model: opus`)
- `.claude/agents/README.md` — governance subagents section
- `docs/agents/execution-profiles.md` — governor row in both profiles (Claude `Opus`, no silent fallback)
- `docs/agents/workflow.md` §5.2 — Baseline Pass delegated to governor; Responsibility Matrix row added (§6.4)
- `docs/agents/lead-strategic/instructions.md` — inline checklist replaced with delegation through orchestrator
- `docs/agents/orchestrator/instructions.md` — step 16 Baseline gate + Baseline-Governor Spawn section
- Verdict template (`templates.md` §8 Baseline Verdict) — already canonical, untouched

Spawn constraint: **only orchestrator** spawns the governor. Primary trigger = wave close, including the final wave of current_plan. lead-strategic requests recheck through orchestrator.

### Known unknowns entering this wave

- `docs/architecture.md` has not been independently verified against current repo state for some time; it is the root document other reviewer checks rely on
- The baseline-governor role definition introduces a new ownership lane (independent from lead-strategic); whether this is consistent with existing architecture.md boundaries is unverified
- Cross-refs between `workflow.md` §5.2, `lead-strategic/instructions.md`, `orchestrator/instructions.md`, `baseline-governor/instructions.md`, `templates.md` §8, `execution-profiles.md`, and `.claude/agents/README.md` have not been independently walked

## Operating principle for this wave

Cross-model review-lane concurrency is the canonical default for reviewer passes per `docs/codex-integration.md` §5 item 6. Both phases use paired reviewer launches (one Claude, one Codex) running in parallel. Disagreement between models is treated as signal, not noise: findings are unioned, and the stricter severity wins on the same item.

## Slices

### Phase 1 — architecture.md sanity audit

**ST-1. Architecture root doc baseline audit (paired reviewer pass)**

- scope: `docs/architecture.md` vs current repo state (packages/*, apps/web/src/**, active aliases, active enforcement rules)
- reviewers (parallel in shared checkout):
  - `architecture-reviewer` Claude Opus — via Agent tool (subagent, audit mode — planned scope = the doc itself vs repo reality)
  - `architecture-reviewer` Codex `gpt-5.4` at `high` effort — via `./scripts/codex-companion.sh task --fresh --effort high` with architecture-reviewer audit-mode role prompt
- questions to answer:
  - Are the architectural facts in `architecture.md` still accurate against the current repo?
  - Any stale references to retired buckets (`shared/features/widgets/entities`)?
  - Do package boundaries, package-vs-app leaf rules, server isolation, alias policy sections reflect the current repo?
  - Any internal contradictions?
- acceptance for ST-1:
  - both reviewer outputs retrieved with stable `jobId`/`threadId` (Codex) and subagent id (Claude) recorded
  - union of findings triaged by lead-strategic
  - verdict = `CLEAR` (proceed to Phase 2) | `DOCS FIRST` (fix architecture.md before Phase 2) | `ESCALATE` (deeper architectural decision required)

### Phase 2 — baseline-governor delta consistency audit

Blocked by Phase 1 verdict. If Phase 1 = `DOCS FIRST`, Phase 2 does not run until architecture.md is fixed and re-verified.

**ST-2a. Architectural consistency of baseline-governor delta (paired reviewer pass)**

- scope: `git diff main~2..main` (the two baseline-governor commits: `bc6801d` reviewer pointer refactor + `a406984` baseline-governor role)
  - actually the baseline-governor delta is `git diff bc6801d..a406984` — Phase 2a focuses on that range
- reviewers (parallel):
  - `architecture-reviewer` Claude Opus — via Agent tool, review mode over the diff
  - `architecture-reviewer` Codex `gpt-5.4` at `high` effort — via `./scripts/codex-companion.sh review --wait` over the same diff
- questions:
  - Does the new role respect the architecture-doc boundaries verified in Phase 1?
  - Is governor ↔ lead-strategic ↔ orchestrator ownership separation clean (no hidden coupling, no responsibility overlap)?
  - Does the role introduce a new enforceable rule that should live in `invariants.md` §8 (architecture-docs-first) but doesn't?
  - Is the "spawn only through orchestrator" constraint structurally enforceable, or just convention?
- acceptance:
  - both reviewer outputs retrieved with proof handles
  - union of findings triaged
  - verdict = `OK` | `request changes` | `needs design decision`

**ST-2b. Documentation consistency of baseline-governor delta (paired reviewer pass)**

- scope: same diff as ST-2a, but focus on cross-doc consistency
- reviewers (parallel):
  - `docs-reviewer` Claude Opus — via Agent tool, review mode
  - `docs-reviewer` Codex `gpt-5.4` at `high` effort — via `./scripts/codex-companion.sh review --wait`
- questions:
  - Cross-refs between `workflow.md` §5.2, `lead-strategic/instructions.md`, `orchestrator/instructions.md`, `baseline-governor/instructions.md`, `templates.md` §8, `execution-profiles.md`, and `.claude/agents/README.md` — all valid, no dangling?
  - Trigger semantics identical across all documents (wave close + new-wave gate + lead-strategic-request-via-orchestrator)?
  - No contradictions on "who spawns", "when", "what governor does / does not do"?
  - `.claude/agents/README.md` governance subagents section aligned with `execution-profiles.md` (model choice, escalation rules)?
  - `docs/AGENTS.md` navigation reflects the new role if required?
- acceptance:
  - both reviewer outputs retrieved with proof handles
  - union of findings triaged
  - verdict = `OK` | `request changes`

ST-2a and ST-2b run in parallel (4 reviewer subagents in one batch per `docs/codex-integration.md` §5 item 6).

### Phase 3 — findings resolution (conditional)

Only if Phase 1 or Phase 2 produces any finding above `INFO`.

**ST-3. Close findings (fix-worker path if any code or doc edits are required)**

- scope: whatever the aggregated Phase 1 + Phase 2 findings demand
- execution: per-finding triage by lead-strategic; fix slices dispatched as needed (direct-fix for ≤10-line trivia; worker path otherwise)
- acceptance:
  - all `CRITICAL` findings closed
  - all `WARNING` findings closed or explicitly justified
  - `INFO` findings logged in report
  - re-review pass only for findings that touched architectural surface

## Expected result

- Written cross-model verdict on architecture.md root doc (ST-1)
- Written cross-model verdict on baseline-governor delta (ST-2a + ST-2b)
- If any follow-up edits required: merged fix commits closing all `CRITICAL`/`WARNING` findings
- Updated `invariants.md` §8 if the audit surfaces a new enforceable rule for the governor role
- `baseline-governor` role declared production-ready for real wave-close use

## Out of scope

- Changes to governor's canonical checks list (those stay as defined in `baseline-governor/instructions.md`)
- Extending the audit to overlays (`architecture_dashboard_bi.md`, `architecture_emis.md`) unless Phase 1 surfaces a root-doc gap that explicitly requires overlay re-verification
- Product code changes in apps/web or packages/*

## Risk notes

- Merge-before-review risk accepted at user direction: if the audit finds `CRITICAL`, the project uses fix-forward (or revert of `a406984` as last resort). Documented here so the decision trail is not lost.
- Codex `gpt-5.4` at `high` effort is a first cross-model reviewer pass on governance docs for this repo; if the Codex lane proves unstable for docs audit, fall back to single-model review and mark the cross-model aspect as `unverified` with rationale.
