# Lead-Strategic Memory

## Active State

- active wave: Agent Model — bounded doc/code improvements (High Priority)
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `claude/review-agent-model-tAKki` (pushed)
- profile: `opus-orchestrated-codex-workers`
- operating mode (recommended): `ordinary iterative` for B/C/E; `high-risk iterative / unstable wave` for D and F
- awaiting: strategic pickup — verify plan per `current_plan.md` §Для лид-стратега
- last closed wave: Restructure `src/lib/` app-local surface and remove FSD-named buckets (closed `2026-04-16`, archived as `archive/plan_src_lib_dissolve_fsd_buckets_closed_2026-04-16.md`)
- baseline status: `Yellow` (`pnpm lint:eslint` pre-existing)
- test baseline: `309` tests (`19` files)

## Carry Forward

- Slice A landed as `78b1cd8` (structured Carry-Forward fields); fresh docs-reviewer `OK`; strategic verification pending
- Wave invariants (do not revert): single SoT for worker mode is `git-protocol.md` §3-4; `invariants.md` §8 first table stays removed; four structured Carry-Forward fields canonical; `in-place` default / `isolated` opt-in terminology
- Prior-wave non-blocking baseline debt carries over: `pnpm lint:eslint` in packages/scripts, barrel/direct import inconsistency, broad peer-isolation glob, oversized `routes/emis/+page.svelte`

## Pruning Rule

- On new wave: rewrite this file, don't append. Keep only live strategic state.
