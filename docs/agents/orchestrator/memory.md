# Orchestrator Memory

Canonical durable memory для top-level execution роли `orchestrator`.

`lead-tactical` — legacy alias; `docs/agents/lead-tactical/memory.md` — wrapper only.

Writing rules:

- новые записи должны быть state-oriented и orchestration-only;
- подробный implementation log должен жить в worker handoff, `last_report.md` и `git log`, а не здесь.

## Historical Baseline

- Earlier EMIS / BI implementation waves are historical context only for the current session
- The previously active `CA — BI Clean Architecture` wave is no longer the live orchestration target
- If historical product context is needed, recover it from archived plans/reports and `git log`, not from this memory file

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

## Most Recent Closed Wave: AD2 — Agent Docs Dedup Pass 2 (2026-04-13)

Plan: `docs/agents/lead-strategic/current_plan.md`

Integration branch: `feature/agent-model-simplification`

### Progress

- Agent-model simplification baseline landed in prior commits (`961dce4`, `42fd793`, `7e8f31b`, `5e9a3d1`)
- Consumer-scoped template split landed (`e8d8f41`)
- Bootstrap/recovery hardening landed (`4d9cf32`)
- Fresh worktree bootstrap rules landed (`6e9463b`)

### Plan-derived status

- MP-1 done:
  - ownership cleanup between `workflow.md` and `review-gate.md` is reflected in the integrated docs state
- MP-2 done:
  - `worker/guide.md` uses sourced excerpts with canonical-wins / escalate-on-conflict rules
- MP-3 done:
  - root `AGENTS.md` §8 is orientation-only and pointer-based
- MP-4 done:
  - `autonomous-protocol.md` §12 examples are slimmed without reintroducing prompt-template duplication

### Key Constraints

- docs-only scope; no runtime behavior changes
- do not broaden the role model while deduplicating docs
- do not make `invariants.md` a mandatory default bootstrap read in this pass
- keep root `AGENTS.md` navigation-first
- after bootstrap/recovery doc changes, use fresh worktrees for new worker tasks

## Notes For The Next Session

- This wave is closed; do not resume it as active execution state
- `current_plan.md` now serves as closed historical context until a new plan supersedes it
- Template references in the closed plan predate the consumer-scoped template split; interpret old `templates.md` references through the new split docs
- If the next task is not historical review of this docs pass, request a new strategic reframe instead of reusing this orchestration state blindly
