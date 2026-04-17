# Orchestrator Memory

## Active State

- wave: Agent Model — bounded doc/code improvements (High Priority)
- plan: `docs/agents/lead-strategic/current_plan.md`
- branch: `claude/review-agent-model-tAKki` (ST-A + ST-B landed locally; 12 commits ahead of origin)
- current slice: `ST-A` accepted (`78b1cd8`); `ST-B` ready for strategic ACCEPT (`3ee7822`..`b42bae4` + plan `af4806c`); `ST-C` is next
- mode: `ordinary iterative` for B/C/E (strategic-confirmed after ST-B); `high-risk iterative / unstable wave` for D/F
- profile: `opus-orchestrated-codex-workers` via canonical companion runtime `./scripts/codex-companion.sh`
- Codex launch rule: companion runtime, not `/codex:rescue`, for orchestration-critical launches
- Codex proof rule: record `jobId + threadId` per slice/reviewer pass; do not rely on "latest completed"
- Codex resume rule: `--resume` safe only when no unrelated active job remains; recover dead jobs via `status` then `cancel`
- Codex concurrency note: concurrent companion jobs green; parallel Codex workers in shared checkout unproven; nested docs-reviewer launch from inside a running Codex worker session fails on sandbox websocket block — prefer orchestrator-launched reviewer between worker commits
- test baseline: `309` tests (`19` files)
- baseline status: `Yellow` (pre-existing `pnpm lint:eslint` errors only)

## Carry Forward (ST-B → ST-C/E/D/F)

- ST-B observation: docs-only slice that touches wave-closure governance needs a task packet instruction to audit the full §3.8/§6.1/§6.2/§6.4 wording web symmetrically, not just the two primary sections listed. Worker's initial commit was directionally correct but needed 5 review iterations for wording propagation.
- ST-B open finding (strategic-deferred in thread `019d9aba-1603-7342-9c21-3c5cd9bf5d1b`): `templates.md` §1/§5 have no structured `owner`/`expiry` field for docs waivers; deferred without registering a new slice; fold into templates touch opportunistically if a future slice edits those files.

## Pruning Rule

On new wave: rewrite this file, don't append. ~20 lines max (carry-forward excluded from line budget but pruned at next slice acceptance).
