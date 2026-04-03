# Report: ST-10 — Legacy Docs Cleanup And Archive Normalization

## Статус
Выполнено

## Что сделано

### 1. Canonical doc classification in docs/AGENTS.md

Added explicit classification system with four labels:
- **canonical** — source of truth for active work, read first
- **active** — supporting doc, useful but not source of truth
- **reference** — external pointer, not maintained in this repo
- **archive** — historical only, not source of truth

Restructured sections 2 (Dashboard-builder/Strategy) and 3 (EMIS) into subsections by classification (Canonical / Active / Reference / Archive). Added new section 3a (Agent Workflow) to separate agent docs from EMIS docs.

Added missing `archive/emis/emis_todo_vessel_markers.md` to catalog.

### 2. Carry-forward cleanup

**emis_working_contract.md** (section 10):
- Changed stale forward-tense "должен быть resolved до или в ST-4" to past-tense "resolved в ST-4; `pnpm check` green с этого момента"

**README.md** ("Что уже есть"):
- Added clarification note: "пути указаны концептуально; физически код живёт в `apps/web/src/lib/` и `packages/`"
- Explicitly marks these as conceptual overview, not filesystem navigation

### 3. Root AGENTS.md reading order fix

- Added `docs/emis_monorepo_target_layout.md` to EMIS starting path (was missing between baseline and working_contract)
- Now consistent with docs/AGENTS.md and emis_session_bootstrap.md reading orders

### 4. Empty directory cleanup

- Removed empty `docs/emis/` directory (was a cleanup candidate from pre-migration inventory)

### 5. Navigation coherence verification

All cross-references verified:
- 34 referenced files checked — all exist
- Root AGENTS.md, docs/AGENTS.md, emis_session_bootstrap.md, emis_working_contract.md reading orders are now consistent
- No broken references in touched docs
- Archive docs clearly marked as historical / not source of truth

## Docs that remain canonical

- `docs/emis_session_bootstrap.md` — EMIS entry point, current state
- `docs/emis_architecture_baseline.md` — EMIS boundary map
- `docs/emis_monorepo_target_layout.md` — target layout and migration rules
- `docs/emis_working_contract.md` — operational rules, placement, DoD
- `docs/emis_mve_tz_v_2.md` — scope, invariants, acceptance
- `docs/emis_implementation_spec_v1.md` — implementation decisions
- `docs/emis_freeze_note.md` — frozen decisions
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — runtime/API conventions
- `docs/current-project-analysis.md` — platform analysis
- `docs/strategy/bi_strategy.md` — BI strategy contract
- `docs/ops/beget_deployment_plan.md` — deployment runbook
- `docs/agents/workflow.md`, `roles.md`, `templates.md` — agent workflow
- `docs/emis_monorepo_target_layout.md` — monorepo target layout
- Local `AGENTS.md` files in route/package directories

## Docs archived/reclassified

- `docs/archive/emis/*` — 4 files, all archive-only (were already in archive, now explicitly classified)
- `docs/archive/strategy-v1/*` — historical strategy pack (were already in archive, now explicitly classified)
- `docs/archive/agents/*` — historical agent model (were already in archive, now explicitly classified)
- Empty `docs/emis/` directory — removed

## Docs intentionally left in place

- `docs/emis_architecture_review.md` — classified as **active** (not canonical, but useful for review tasks)
- `docs/emis_offline_maps_ops.md` — classified as **active** (ops runbook, used when working on offline maps)
- `docs/emis_next_tasks_2026_03_22.md` — classified as **active** (backlog, used for task planning)

## Explicit exclusions

ST-10 did NOT absorb:
- `P3: Post-Split Architecture Hardening` — remains deferred backlog
- `fetchDataset.ts` boundary-gap remediation — remains pre-existing FSD gap
- `widgets/stock-alerts` BI-only debt — remains pre-existing FSD violation
- `emis-server` decoupling / `EmisMap` decomposition / similar runtime cleanup — remains deferred
- `// MIGRATION` shim removal — shims remain in place (~53 files), classified as docs inventory only

## Проверки

No runtime commands needed — this slice touched only docs/navigation/archive surface. No new runtime commands, no package topology changes, no code edits.

## Review Gate

### Вердикты ревьюеров
- architecture-reviewer: OK — no issues, topology not reopened, classification labels correct
- docs-reviewer: request changes → fixed

### Findings по severity

**CRITICAL:** нет

**WARNING (fixed):**
- `emis_working_contract.md` §12 Reading Order was missing `emis_mve_tz_v_2.md` — inserted as position 5

**INFO (fixed):**
- `docs/AGENTS.md` line 72 — status bar path was imprecise, now lists both `emis-map/` and `emis-status-bar/`
- `emis_working_contract.md` §4 Ownership — was listing old app paths as canonical, now updated to reflect packages as canonical and app paths as compatibility shims

## Ветки

- integration branch: `feature/emis-foundation-stabilization`
- executed directly as lead-tactical (no worker branch)

## Вопросы к lead-strategic

Нет. ST-10 is a clean docs cleanup pass. All acceptance checklist items are addressed.

### Cleanup candidates that remain deferred after ST-10

- ~53 `// MIGRATION` re-export shims in `apps/web/` — removal is code work, not docs scope
- `docs/emis_next_tasks_2026_03_22.md` title says "1 April 2026" — will become stale if backlog is updated; no fix needed now
- Further ops/strategy doc separation if more runbooks or design docs appear
- Any future completed handoff/wave notes that accidentally land in top-level `docs/`
