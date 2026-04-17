# Orchestrator Memory

## Active State

- wave: Cross-Model Architectural Audit — baseline-governor role
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `main` (at `a406984`)
- current slice: `ST-1` (Phase 1 — architecture.md paired-reviewer audit) — not yet dispatched
- mode: `high-risk iterative / unstable wave`
- profile: `opus-orchestrated-codex-workers` via canonical companion runtime `./scripts/codex-companion.sh`
- Codex launch rule: companion runtime, not `/codex:*` slash surface, for orchestration-critical launches
- Codex proof rule: record `jobId + threadId` per reviewer pass; do not rely on "latest completed"
- reviewer concurrency: paired cross-model reviewer lanes (Claude Opus + Codex `gpt-5.4` `high`) run in parallel per `docs/codex-integration.md` §5.6
- test baseline: `309` tests (`19` files)
- baseline status: `Yellow` (pre-existing `pnpm lint:eslint` errors only; not a governor scope item)

## Carry Forward

- baseline-governor merged into `main` at `a406984` as a checkpoint without prior cross-model review; this wave closes that gap
- governor delta scope to audit: `git diff bc6801d..a406984` — 7 files, +148/−14, strictly governance
- verdict template `templates.md` §8 Baseline Verdict was already canonical before the role merge
- spawn constraint recorded during governor introduction: orchestrator-only spawn; lead-strategic requests recheck through orchestrator

## Pruning Rule

On new wave: rewrite this file, don't append. ~20 lines max.
