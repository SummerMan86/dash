# Orchestrator Memory

## Active State

- active wave: Architecture Docs Alignment — Foundation / BI / EMIS (ST-1..ST-5 closed; ST-6 triage done; awaiting baseline-governor + lead-strategic final wave-close acceptance)
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `main` (docs-only wave, no commits yet)
- mode: `ordinary iterative`; ST-6 executed as `governance-closeout flow` (orchestrator-led triage, no new worker)
- profile: `opus-orchestrated-codex-workers` via `./scripts/codex-companion.sh`
- Codex launch rule: companion runtime, not `/codex:*` slash surface, for orchestration-critical launches
- Codex proof rule: record `jobId + threadId` from `./scripts/codex-companion.sh status --json` `latestFinished`; worker-reported `N/A` placeholders are runtime limitation, not missing proof
- Reviewer concurrency: default per `codex-integration.md §5 item 6`; used concurrent Claude Opus architecture-reviewer + docs-reviewer on ST-3 / ST-4 / ST-5 diffs
- test baseline: `309` tests (`19` files) — unchanged throughout wave
- baseline status: `Yellow` (pre-existing `pnpm lint:eslint` only; baseline-governor pass in flight)

## Carry Forward

- direct-fix inline by orchestrator is acceptable for mechanical code→docs correction inside the slice's already-edited file (ST-4 `ifts.pay_docs_hourly` → `ifts.message_stats` precedent); not a D-6 scope-creep waiver
- worker dispatch pattern: prompt via heredoc / `$(cat /tmp/...)` to avoid shell arg-size pain; write pre-worker task packet to `/tmp/<slice>-worker-packet.md`
- strategic dispatch pattern: same heredoc; lead-strategic `--write --fresh` for plan/memory rewrites, no `--resume` when thread context isn't needed
- wave-close needs BOTH memory files rewritten per `workflow.md §6.2`; don't forget the orchestrator side

## Pruning Rule

- On new wave: rewrite this file, don't append. ~20 lines max.
