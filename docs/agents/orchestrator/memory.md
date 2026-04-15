# Orchestrator Memory

Canonical durable memory для top-level execution роли `orchestrator`.

`lead-tactical` — legacy alias; `docs/agents/lead-tactical/memory.md` — wrapper only.

Writing rules:

- новые записи должны быть state-oriented и orchestration-only;
- подробный implementation log должен жить в worker handoff, `last_report.md` и `git log`, а не здесь.

## Current Orchestration State

- Active wave:
  - none
- Current plan state:
  - `docs/agents/lead-strategic/current_plan.md` is closed historical context until a new plan supersedes it
- Active branch:
  - `feature/agent-model-simplification`
- Current orchestration state:
  - no active execution wave is open in canonical artifacts
  - do not dispatch a new wave until `lead-strategic` writes a new plan

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

## Notes For The Next Session

- Do not resume old waves as active execution state; recover product history from plans/reports and `git log` instead
- Before any new wave:
  - wait for a new `current_plan.md`
  - choose the execution profile explicitly
  - if `opus-orchestrated-codex-workers` is selected, verify proof tuple for any claimed plugin-mapped Codex worker/reviewer lane
