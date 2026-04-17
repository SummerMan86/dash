# Orchestrator Memory

## Active State

- wave: Agent Model — bounded doc/code improvements (High Priority)
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `claude/review-agent-model-tAKki` (pushed; 3 commits ahead of prior wave close)
- current slice: `ST-A` accepted (`78b1cd8`); `ST-B` is next
- mode: `ordinary iterative` for B/C/E; switch to `high-risk iterative / unstable wave` for D/F
- profile: `opus-orchestrated-codex-workers` via canonical companion runtime `./scripts/codex-companion.sh`
- Codex launch rule: use the companion runtime, not `/codex:rescue`, for orchestration-critical launches
- Codex proof rule: record `jobId + threadId` per slice/reviewer pass; do not rely on "latest completed"
- Codex resume rule: `--resume` is safe only when no unrelated active job remains; if a dead job still blocks, inspect via `status` and recover with `cancel`
- Codex concurrency note: concurrent companion jobs are verified, but parallel Codex workers in a shared checkout remain unproven
- test baseline: `309` tests (`19` files)
- baseline status: `Yellow` (pre-existing `pnpm lint:eslint` errors only)

## Pruning Rule

On new wave: rewrite this file, don't append. ~20 lines max.
