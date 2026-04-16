# Plan: Execute Wave 2 - Agent Docs Radical Simplification (v3)

## Status

- opened on `2026-04-16`
- purpose: consolidate `current_plan.md` + `current_plan_v2.md` into one executable plan
- wave status: ready for execution
- selected execution profile: `mixed-claude-workers`
- operating mode: `high-risk iterative / unstable wave`
- writing mode: one writing agent, sequential edits only
- second-agent mode: independent read-only verification after each slice; no parallel writing in `docs/agents/`
- adoption rule: `current_plan.md` remains the canonical active plan path; if v3 is accepted, copy its decisions back into `current_plan.md`, then archive or remove `current_plan_v2.md` and `current_plan_v3.md` before wave close

## Verified Baseline

- live docs in `docs/agents/`: `37 files / 5689 lines`
- canonical-budget scope in `docs/agents/` excluding live state and draft plans: `31 files / 4894 lines`
- live refs to retiring docs outside `archive/`:
  - `review-gate.md`: `63`
  - `roles.md`: `21`
  - `autonomous-protocol.md`: `30`
  - `user-guide.md`: `20`
  - `usage-telemetry.md`: `17`
- navigation files present and therefore in repoint scope:
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `CLAUDE.md`

Baseline note:
- `wave2-preflight.md` freezes the pre-note baseline (`36` live files and lower legacy-ref counts).
- The numbers above are post-note counts because the temporary ST-0 ledger itself adds one live file and additional retiring-doc references.

## Why v3 Exists

- `current_plan.md` is stronger on scope, ownership, target set, and acceptance.
- `current_plan_v2.md` is stronger on session structure, write order, and preflight execution notes.
- v3 resolves the practical ambiguities between them:
  1. `execution-profiles.md` stays a live bootstrap doc where runtime/profile selection is actually needed; it is not a legacy target for removal.
  2. `usage-telemetry.md` currently has live consumers, so the default path is `move -> repoint -> delete old path`, not speculative deletion.
  3. Another agent is useful here as an independent verifier only; a second concurrent writer would create avoidable merge risk in the same doc tree.

## Locked Decisions

- Autonomous protocol becomes `docs/agents/autonomous-mode.md`.
- Codex runtime plumbing moves to `docs/codex-integration.md`.
- No deletion before repoint.
- No live state file may depend on deleted canon.
- `workflow.md` is the only owner of:
  - review floor
  - reviewer selection rules
  - integration review trigger
  - post-review re-review rule
  - DoD explicitness rule
- `execution-profiles.md` is the only canonical doc that names concrete models.
- `docs/codex-integration.md` is the only doc that owns plugin commands, proof tuples, and companion CLI details.
- Role docs reference canonical owners; they do not restate or weaken them.

## Session Structure

- Session 1: `ST-0` + `ST-1` + `ST-2`, then checkpoint commit, then independent verification.
- Session 2: `ST-3` + `ST-4`, then final verification and wave close.
- No parallel worker writers for this wave. The second agent verifies diffs, grep output, and ownership boundaries only.

## Subtasks

### ST-0: Preflight and Migration Ledger

- scope:
  - repo-wide ref counts for retiring docs
  - canonical-count baseline
  - navigation-file presence
  - telemetry-consumer decision
  - migration ledger for every live `docs/agents/*.md`
- depends on: -
- size: S
- acceptance:
  - baseline counts are captured with command-backed numbers, not estimates
  - the migration ledger classifies every live agent doc as `rewrite`, `touch-light`, `create`, `delete`, `move`, or `state/archive`
  - telemetry decision path is explicit before any deletion
- verification intent: freeze the factual baseline before rewrites start
- verification mode: `verification-first`
- notes:
  - no merge in this step
  - a temporary work note or checklist is acceptable; this does not need a new canonical doc

Second-agent verification:
- Verify that the recorded counts match actual command output.
- Verify that `AGENTS.md`, `docs/AGENTS.md`, and `CLAUDE.md` are explicitly included in repoint scope.
- Verify that `usage-telemetry.md` is treated as `move/repoint` because live consumers still exist.
- Verify that no file in live `docs/agents/` is left unclassified in the migration ledger.

### ST-1: Establish the New Canon

- scope:
  - `docs/codex-integration.md` (new)
  - `docs/agents/autonomous-mode.md` (new)
  - `docs/agents/workflow.md` (rewrite)
  - `docs/agents/execution-profiles.md` (rewrite)
  - one-line deprecation headers in legacy docs if they remain live after this slice
- depends on: `ST-0`
- size: L
- write order:
  1. `docs/codex-integration.md`
  2. `docs/agents/autonomous-mode.md`
  3. `docs/agents/workflow.md`
  4. `docs/agents/execution-profiles.md`
  5. deprecation headers for `review-gate.md`, `autonomous-protocol.md`, `roles.md`, `user-guide.md` if deletion is still later
- acceptance:
  - `workflow.md` contains no plugin commands, proof retrieval mechanics, companion CLI recipes, or concrete model names
  - `workflow.md` single-sources:
    - review floor
    - integration review trigger
    - post-review re-review rule
    - DoD explicitness rule
    - the rule that `micro-task` / `direct-fix` do not waive reviewer requirements
  - `execution-profiles.md` keeps role-to-runtime/model mapping, selection rules, and fallback policy only
  - `execution-profiles.md` does not retain plugin commands, proof tuples, or companion CLI guidance
  - `autonomous-mode.md` is delta-only and points back to `workflow.md`, `docs/codex-integration.md`, and `recovery.md`
- verification intent: prove canonical ownership is separated before any repointing starts
- verification mode: `verification-first`
- source reads:
  - `docs/agents/workflow.md`
  - `docs/agents/review-gate.md`
  - `docs/agents/autonomous-protocol.md`
  - `docs/agents/execution-profiles.md`
  - `docs/agents/roles.md`
  - `docs/agents/user-guide.md`

Second-agent verification:
- Verify that `workflow.md` has no `/codex:` commands, proof-tuple mechanics, or concrete model names.
- Verify that `execution-profiles.md` is now the only canonical owner for concrete model naming.
- Verify that `docs/codex-integration.md` fully owns runtime-command and proof-retrieval content that was removed elsewhere.
- Verify that `autonomous-mode.md` is a delta appendix, not a duplicated lifecycle doc.
- Verify that deprecation headers were added only if the legacy files still exist after `ST-1`.

### ST-2: Repoint Bootstrap Docs

- scope:
  - `docs/agents/orchestrator/instructions.md`
  - `docs/agents/lead-strategic/instructions.md`
  - `docs/agents/worker/guide.md`
  - `docs/agents/templates.md`
  - `docs/agents/architecture-reviewer/instructions.md`
  - `docs/agents/invariants.md`
  - `docs/QUICKSTART.md` (new)
- depends on: `ST-1`
- size: L
- write order:
  1. `orchestrator/instructions.md`
  2. `lead-strategic/instructions.md`
  3. `worker/guide.md`
  4. `templates.md`
  5. `architecture-reviewer/instructions.md`
  6. `invariants.md`
  7. `docs/QUICKSTART.md`
- acceptance:
  - no default bootstrap doc points to:
    - `review-gate.md`
    - `roles.md`
    - `autonomous-protocol.md`
    - `user-guide.md`
  - `execution-profiles.md` remains referenced only where runtime/profile selection is actually needed
  - `templates.md` contains artifact shapes only
  - role docs and templates do not restate, weaken, or override:
    - review floor
    - reviewer selection rules
    - integration review trigger
    - post-review re-review rule
  - role docs use role names only; no concrete model names outside `execution-profiles.md`
  - plugin-level runtime details live only in `docs/codex-integration.md`
- verification intent: confirm that role bootstrap paths point to the new canon and do not keep shadow ownership
- verification mode: `verification-first`
- source reads:
  - `docs/agents/orchestrator/instructions.md`
  - `docs/agents/lead-strategic/instructions.md`
  - `docs/agents/worker/guide.md`
  - `docs/agents/templates.md`
  - `docs/agents/architecture-reviewer/instructions.md`
  - `docs/agents/invariants.md`
  - `docs/agents/user-guide.md`

Second-agent verification:
- Verify that bootstrap docs no longer cite retired canon, but do still cite `execution-profiles.md` where that file is legitimately required.
- Verify that `templates.md` no longer contains routing policy, governance prose, or telemetry schema.
- Verify that role docs do not carry `/codex:` commands, proof retrieval mechanics, or model names.
- Verify that `worker/guide.md` and `templates.md` no longer duplicate review-floor or DoD ownership from `workflow.md`.
- Verify that `docs/QUICKSTART.md` is an operator runbook extracted from `user-guide.md`, not a new competing workflow canon.

### ST-3: Slim Support Docs, Refresh Live State, Repoint Navigation

- scope:
  - `docs/agents/git-protocol.md`
  - `docs/agents/recovery.md`
  - `docs/agents/lead-strategic/current_plan.md`
  - `docs/agents/orchestrator/last_report.md`
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `CLAUDE.md`
  - move `docs/agents/usage-telemetry.md` to `docs/ops/usage-telemetry.md`
- depends on: `ST-2`
- size: M
- acceptance:
  - `git-protocol.md` contains worktree/branch/merge mechanics only
  - `recovery.md` contains recovery protocol only and references canon instead of duplicating it
  - active `lead-strategic/current_plan.md` and `orchestrator/last_report.md` still exist at their current paths after refresh
  - navigation files point to `workflow.md`, `docs/codex-integration.md`, and `docs/QUICKSTART.md`
  - any surviving telemetry note lives outside `docs/agents/`
  - before closeout, only one active plan path remains: `lead-strategic/current_plan.md`
- verification intent: ensure support docs and live state stop depending on the legacy canon before deletion starts
- verification mode: `verification-first`

Second-agent verification:
- Verify that `git-protocol.md` and `recovery.md` no longer duplicate lifecycle or review ownership from `workflow.md`.
- Verify that `current_plan.md` and `last_report.md` are refreshed, not merely archived away.
- Verify that `AGENTS.md`, `docs/AGENTS.md`, and `CLAUDE.md` were repointed because they do exist in this repo.
- Verify that telemetry was moved out of `docs/agents/` because live consumers remain.
- Verify draft-plan hygiene: `current_plan_v2.md` and `current_plan_v3.md` must be archived or removed before final zero-ref checks.

### ST-4: Delete Legacy Docs and Final Verify

- scope:
  - delete guaranteed legacy docs:
    - `review-gate.md`
    - `roles.md`
    - `autonomous-protocol.md`
    - `user-guide.md`
    - `architecture-steward/instructions.md`
    - `baseline-governor/instructions.md`
    - `definition-of-done.md`
    - `memory-protocol.md`
    - `strategic-reviewer/instructions.md`
    - `templates-handoff.md`
    - `templates-orchestration.md`
    - `ui-reviewer-deep/instructions.md`
    - `worker/instructions.md`
  - remove the old `docs/agents/usage-telemetry.md` path after move/repoint
  - record final counts/results in live state docs
- depends on: `ST-3`
- size: M
- acceptance:
  - zero live refs to deleted docs outside `archive/`
  - canonical docs count is `18`
  - canonical line budget lands in `~1850-2050`
  - historical refs to retired canon remain only in archived files
  - no superseded draft plans remain live in `docs/agents/lead-strategic/`
- verification intent: prove the rewrite is structurally closed, not just mostly rewritten
- verification mode: `verification-first`

Second-agent verification:
- Verify the deletion list is complete and matches the locked target set.
- Verify final grep output shows zero live refs to deleted docs outside `archive/`.
- Verify final count/line-budget commands pass with draft plans excluded from canonical scope.
- Verify that `execution-profiles.md` is still the only canonical doc with concrete model names.
- Verify that archive-only historical references are not leaking through `AGENTS.md`, `docs/AGENTS.md`, `CLAUDE.md`, `current_plan.md`, or `last_report.md`.

## Final Verification Commands

Canonical docs count:

```bash
find docs/agents -name '*.md' -not -path '*/archive/*' \
| grep -vE 'lead-strategic/current_plan(_v[0-9]+)?\.md|lead-strategic/memory\.md|orchestrator/last_report\.md|orchestrator/memory\.md|orchestrator/decision-log\.md' \
| wc -l
```

Target: `18`

Canonical lines:

```bash
find docs/agents -name '*.md' -not -path '*/archive/*' \
| grep -vE 'lead-strategic/current_plan(_v[0-9]+)?\.md|lead-strategic/memory\.md|orchestrator/last_report\.md|orchestrator/memory\.md|orchestrator/decision-log\.md' \
| xargs wc -l
```

Target: `~1850-2050`

Zero live refs to deleted docs:

```bash
rg 'review-gate\.md|roles\.md|autonomous-protocol\.md|user-guide\.md|usage-telemetry\.md' \
  --glob '!*/archive/*' docs/ AGENTS.md CLAUDE.md
```

Concrete model names outside `execution-profiles.md` in canonical docs:

```bash
rg -i 'opus|sonnet|gpt-5\.4|claude-opus|claude-sonnet' docs/agents/ \
  --glob '!*/archive/*' \
  --glob '!execution-profiles.md' \
  --glob '!lead-strategic/current_plan*.md' \
  --glob '!lead-strategic/memory.md' \
  --glob '!orchestrator/last_report.md' \
  --glob '!orchestrator/memory.md' \
  --glob '!orchestrator/decision-log.md'
```

## Non-Goals

- no runtime-behavior changes
- no tool/plugin redesign
- no reviewer-policy rewrite beyond the three locked semantic conflicts
- no archive-history rewrite except to archive superseded live docs

## Expected Result

- The agent-docs tree becomes process-centric, not governance-centric.
- Bootstrap paths become obvious and role-specific.
- Runtime detail, process truth, and support docs have single owners.
- Legacy canon is fully repointed before deletion.
- The second agent has a precise verification checklist after every slice instead of a vague "please review" request.
