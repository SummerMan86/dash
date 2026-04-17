# Lead-Strategic Memory

## Active State

- active wave: Cross-Model Architectural Audit — baseline-governor role
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `main` (at `a406984`)
- profile: `opus-orchestrated-codex-workers` via canonical companion runtime `./scripts/codex-companion.sh`
- operating mode: `high-risk iterative / unstable wave`
- awaiting: strategic pickup — Phase 1 dispatch decision (architecture.md paired-reviewer audit)
- last closed wave: Agent Model — bounded doc/code improvements (closed `2026-04-17`, archived as `archive/plan_agent_model_bounded_improvements_closed_2026-04-17.md`)
- baseline status: `Yellow` (pre-existing `pnpm lint:eslint`; unchanged across wave)
- test baseline: `309` tests (`19` files)

## Carry Forward

- baseline-governor merged into `main` at `a406984` as a checkpoint before cross-model review, per user direction; fix-forward (or revert as last resort) accepted if this wave finds `CRITICAL`
- architecture.md has not been independently verified against current repo state recently; Phase 1 must complete before Phase 2 to make the "docs consistent with architecture" check meaningful
- Codex runtime invariant: repo-local `./scripts/codex-companion.sh` is canonical; `/codex:*` slash surface is optional convenience only
- Codex proof invariant: preserve `jobId + threadId`; do not treat "latest completed" status output as sufficient proof
- Parallel reviewer-lane concurrency empirically verified on prior wave's ST-B integration review (see `docs/codex-integration.md` §5 item 6); paired cross-model reviewer launches are canonical default for this wave
- Prior-wave non-blocking baseline debt carries over unchanged: `pnpm lint:eslint` in packages/scripts, barrel/direct import inconsistency, broad peer-isolation glob, oversized `routes/emis/+page.svelte`

## Pruning Rule

- On new wave: rewrite this file, don't append. Keep only live strategic state.
