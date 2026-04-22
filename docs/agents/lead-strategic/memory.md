# Lead-Strategic Memory

## Active State

- active wave: Architecture Docs Alignment — Foundation / BI / EMIS
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `main`
- profile: `opus-orchestrated-codex-workers` via canonical companion runtime `./scripts/codex-companion.sh`
- operating mode: `high-risk iterative / unstable wave` until ST-2 closure (facts + topology locked); then `ordinary iterative` through apply STs (ST-3/4/5); direct wave closure after ST-6
- awaiting: ST-1 paired audit (Claude Opus + Codex `gpt-5.4` high) across the three active docs, starting with `architecture.md` as root per freeze rule
- last superseded wave: Cross-Model Architectural Audit — baseline-governor role (preserved in `docs/agents/lead-strategic/archive/current_plan.md`)
- baseline status: `Yellow` (pre-existing `pnpm lint:eslint`; unchanged)
- test baseline: `309` tests (`19` files)

## Carry Forward

- Active intent is docs-first and audit-first; do not reopen architectural core unless claims-vs-reality audit proves the written contract false.
- Default topology hypothesis: keep three primary docs (`architecture.md`, `architecture_dashboard_bi.md`, `architecture_emis.md`) with clearer sync and reading order; do not rename `architecture.md` in this phase unless ST-2 proves a real need.
- Package extraction rule: move code to `packages/*` for reusable ownership/boundary reasons, not because an app-local folder gained multiple submodules.
- EMIS BI/read-side should align with shared BI vocabulary where the execution model is truly shared, but EMIS operational default path remains separate and must stay explicit.
- Tenancy and `scheduler_locks` are documentation-clarification topics only in this wave, not redesign tracks.
- Draft inputs for this wave live in `docs/archive/architecture_improvements_backlog.md` and `docs/archive/bi_architecture_final_recommendations.md`.
- Triage backlog for ST-6: `OQ-1` (principles placement + monorepo stance + package extraction rule), `OQ-2` (agent model — architect at planning + worker visibility of arch docs; orthogonal, likely follow-up wave on `docs/agents/*`), `OQ-3` (naming conventions — separate doc vs foundation section).
- ST-1 uses paired reviewer concurrency (Claude Opus + Codex `gpt-5.4` high) per `docs/codex-integration.md` §5 item 6; single-lane fallback allowed only with `unverified cross-model` mark + rationale.

## Pruning Rule

- On new wave: rewrite this file, don't append. Keep only live strategic state.
