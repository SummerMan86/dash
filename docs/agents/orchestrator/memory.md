# Orchestrator Memory

Canonical durable memory для top-level execution роли `orchestrator`.

`lead-tactical` — legacy alias; `docs/agents/lead-tactical/memory.md` — wrapper only.

Writing rules:

- новые записи должны быть state-oriented и orchestration-only;
- подробный implementation log должен жить в worker handoff, `last_report.md` и `git log`, а не здесь.

## Current Orchestration State

- Active wave:
  - `Agent Model Runtime Validation — opus-orchestrated-codex-workers` — opened `2026-04-15`
- Current plan state:
  - `docs/agents/lead-strategic/current_plan.md` is active and owns the runtime-validation wave
- Active branch:
  - `feature/agent-model-runtime-validation`
- Current orchestration state:
  - plan ready for dispatch
  - ST-1 pending
  - ST-2 pending, blocked by ST-1
  - ST-3 pending, blocked by ST-1/ST-2 outcome
  - ST-4 pending, blocked by earlier validation evidence

## Durable Operational Knowledge

- `pnpm lint` (Prettier) not green repo-wide — non-blocking unless a slice claims formatting cleanup
- ESLint `no-restricted-imports` flat config — each scope needs one combined block
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `export { X } from 'Y'` does not bring `X` into local scope; import separately if used locally
- Worker bootstrap source of truth = task packet + `docs/agents/worker/guide.md`
- Worktree-local `CLAUDE.md` is snapshot-based redirect only; if bootstrap docs changed after worktree creation, spawn a fresh worktree
- Consumer-scoped template split is active:
  - `docs/agents/templates-orchestration.md` for orchestrator-facing templates
  - `docs/agents/templates-handoff.md` for worker handoff
- Runtime/model binding stays canonical in `docs/agents/execution-profiles.md`
- For `opus-orchestrated-codex-workers`, Codex lane claims need a proof tuple in report/telemetry:
  - launch surface + matching `/codex:result` + stable session/run ID
  - `/codex:status`, Codex history alone, helper names, or bare session IDs are not sufficient
- In Claude Code, plugin-first mapping stays role-specific:
  - `/codex:rescue` for worker / micro-worker lanes
  - `/codex:review` / `/codex:adversarial-review` for reviewer lanes
  - `lead-strategic` / `strategic-reviewer` are not implicitly mapped to those commands
- If no dedicated strategic plugin lane exists on the active surface, do not silently reuse worker/reviewer slash commands; classify it truthfully as per-role exception, alternative documented runtime path, or blocker/fallback
- Observed failure mode from the first blind trial:
  - plugin dispatch can return `[Tool result missing due to internal error]`
  - no recoverable run ID may be exposed
  - if that happens, stop waiting and classify the lane `blocked` or `unverified`

## Notes For The Next Session

- Resume the active runtime-validation wave from slice status above
- Dispatch ST-1 first
- If a Codex lane hangs without proof tuple, close it as `blocked` or `unverified`; do not leave the wave nominally waiting forever
