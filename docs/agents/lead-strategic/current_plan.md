# Plan: Agent Model — bounded doc/code improvements (Active, High Priority)

## Status

- opened on `2026-04-16`
- wave status: `active`
- priority: `high` — picks up directly where the `src/lib/` wave closed; aligns agent-docs with real operating practice before larger product waves
- branch: `claude/review-agent-model-tAKki` (pushed)
- recommended execution profile: `opus-orchestrated-codex-workers` — through the canonical companion runtime path; shared-checkout parallel Codex workers remain unproven
- recommended operating mode at open: `ordinary iterative` for A/B/C/E (low-risk doc slices), `high-risk iterative / unstable wave` for D (touches a core invariant) and F (code + baseline)
- baseline status: `Yellow` (`pnpm lint:eslint` pre-existing baseline errors only; inherited from prior wave)
- test baseline: `309` tests (`19` files)
- canonical live plan path: `docs/agents/lead-strategic/current_plan.md`

## Goal

Land bounded, high-leverage improvements to the agent workflow documentation and tooling identified after the `in-place default` and `architecture-docs-first` consolidation. Keep the doc footprint minimal (net-delta ≤ 0 where possible), one slice per commit, fresh reviewer per slice.

## Context carried into this wave

### Already landed on this branch

- `d32133e` — worker default flipped to `in-place`; `isolated` (subagent + worktree) is now opt-in only. Six files touched; net −2 lines.
- `80540d6` — collapsed duplicated "three detection points" table in `invariants.md` §8 to a stage-labeled cross-ref. Net −6 lines.
- `78b1cd8` — structured Carry-Forward Context fields (Slice A). Worker Handoff §1 "Continuation Notes" renamed to "Carry-Forward Context"; Task Packet §4 aligned; required on every code-writing handoff (not just dependent slices); cross-refs in `orchestrator/instructions.md` updated. Net −1 line.

### Runtime delta since plan open (working tree; strategic acceptance pending)

- canonical Codex runtime path switched to repo-local `./scripts/codex-companion.sh`; slash/plugin surface is now optional convenience only, not orchestration-critical path
- active docs aligned to that runtime contract: `docs/codex-integration.md`, `docs/QUICKSTART.md`, `docs/agents/orchestrator/instructions.md`, `docs/agents/execution-profiles.md`, `docs/ops/usage-telemetry.md`, `scripts/AGENTS.md`
- validated through companion path: strategic read-only, strategic write-capable, worker write-capable, background task, `review`, and `adversarial-review`
- validated concurrency only at runtime level: concurrent background read-only jobs and concurrent write-to-`/tmp` jobs are green; parallel Codex workers in shared checkout remain intentionally unproven
- new operational caveats now part of the live contract: `--resume` is gated by the workspace active-job registry; stable proof handle is `jobId + threadId`, not "latest finished"
- follow-up signal only, not yet approved slice: wrapper hardening around env override trust and restricted writable-state behavior

### Invariants established by this wave (do not revert)

- `git-protocol.md` §3-4 is the single source of truth for worker mode selection. Do not re-embed mode rules in `workflow.md` or `orchestrator/instructions.md`.
- `invariants.md` §8 first table was removed because it duplicated `workflow.md` §2.3.1 / §3.3 / §5.1. The second table (enforcement rows) is preserved and is the canonical invariant content.
- Active terminology: `in-place` (default), `isolated` (opt-in). Do not reintroduce `teammate mode` / `subagent mode as default`.
- Worker Handoff §1 and Task Packet §4 share the same four structured Carry-Forward fields: `carried_decisions`, `open_findings`, `next_slice_assumptions`, `patterns_established`. Do not reintroduce the old free-form `Continuation Notes` shape.

## Guiding principles

- Minimal docs footprint; prefer net-delta ≤ 0 where possible.
- One slice per commit; do not batch unrelated changes.
- Fresh `docs-reviewer` subagent on the diff before every doc-only commit.
- `code-reviewer` floor for any code slice.
- Slice D requires a `strategic-reviewer` pass before merge (touches "code-blind orchestrator" invariant).
- Slice F requires a real code baseline and an ESLint rule-introduction run per `invariants.md` §10.

## Slice Status

- `ST-A` `done` — `78b1cd8` — structured Carry-Forward Context fields across templates.md §1/§4, worker/guide.md §7, orchestrator/instructions.md

### Pending slices (in recommended execution order)

#### ST-B: Wave DoD docs WARNING escalation scope (recommended next)

- scope: `docs/agents/workflow.md` §3.8 and §6.2
- change: `WARNING → CRITICAL` auto-escalation at wave closure applies only to contract-touching docs (`RUNTIME_CONTRACT.md`, `db/schema_catalog.md`, `db/current_schema.sql`, new invariants). Only pre-existing navigation `AGENTS.md` drift outside the current wave's touched directories may carry over with recorded owner + expiry; slice-level `AGENTS.md` gate for touched directories stays in force.
- estimated delta: ~+3 lines
- risk: low; relaxes rather than tightens governance
- size: S
- acceptance: §3.8 escalation matrix and §6.2 Wave DoD both carry the narrowed carve-out; touched-directory `AGENTS.md` expectations remain unchanged at slice handoff; cross-refs consistent; fresh `docs-reviewer` verdict `OK`
- verification intent: re-read §3.8, §6.1, and §6.2 after edit; ensure no new contradiction with `worker/guide.md` "docs: <done | N/A | gap>" field or with the Docs Completeness table
- verification mode: `verification-first`

#### ST-C: Strategic-reviewer adaptive cadence

- scope: `docs/agents/workflow.md` §4.1
- change: `high-risk iterative` starts per-slice strategic-reviewer pass, auto-downshifts to `by signal` after two consecutive `ACCEPT` verdicts without new findings or plan changes; upshifts on reappearance of a risk signal from §4.1
- estimated delta: ~+5 / −3 lines (net +2)
- risk: low
- size: S
- acceptance: §4.1 cadence table carries the downshift/upshift rule; operating-mode definitions in §2.4 still consistent; fresh `docs-reviewer` verdict `OK`
- verification intent: cross-check §2.4 operating-mode table, §4.1 cadence table, and `lead-strategic/instructions.md` §strategic-reviewer cadence are mutually consistent
- verification mode: `verification-first`

#### ST-E: wave-journal.md split from memory.md

- scope: new file `docs/agents/orchestrator/wave-journal.md`; update `docs/agents/orchestrator/instructions.md` §Memory Discipline; register in `docs/AGENTS.md`
- change: `memory.md` retains only active state (~20 lines); `wave-journal.md` is append-only (one line per accepted slice outcome) and is moved to `docs/agents/orchestrator/archive/waves/<id>.md` at wave closure. Intent: survive auto-compact without bloating durable memory
- estimated delta: one new file + ~+4 instruction lines
- risk: low; net improvement for recovery
- size: S
- acceptance: new file exists with template shape; `memory.md` protocol in workflow.md §8 still consistent; docs-reviewer `OK`
- verification intent: confirm the new wave-journal shape does not drift from `workflow.md` §8 memory protocol; confirm pruning rule still says "rewrite memory.md on new wave"
- verification mode: `verification-first`

#### ST-D: Orchestrator bounded diff-read for acceptance triage (separate batch)

- scope: `docs/agents/orchestrator/instructions.md` §Transparency Requests and §Evidence Acceptance
- change: after the first transparency request and before the second, orchestrator is allowed a bounded read: `git diff --stat` plus up to 200 lines on one file. Explicitly scoped to acceptance triage only, not to making or revising writes
- estimated delta: ~+6 lines
- risk: `medium` — touches the "code-blind orchestrator" invariant
- size: S
- acceptance: bounded-read carve-out in orchestrator/instructions.md; invariant wording in workflow.md §1 "что `orchestrator` не делает" updated to carry the carve-out with explicit scope-limit; fresh `strategic-reviewer` pass before merge; docs-reviewer `OK`
- verification intent: confirm the carve-out does not leak into worker code-writing territory; confirm `direct-fix` boundary is unchanged
- verification mode: `verification-first`
- gate: requires strategic acceptance before merge even if docs-reviewer is green

#### ST-F: Automated ESLint rules (last)

- scope: `eslint.config.js` plus CI configuration
- rules:
  1. Verify and, if missing, enforce ban on `$lib/server/*` imports from client routes/layers.
  2. Ban retired aliases: `$shared`, `$entities`, `$features`, `$widgets`.
  3. CI check (not ESLint): edits to `db/*.sql` require a companion touch to `db/applied_changes.md`.
- must follow `invariants.md` §10 (ESLint rule-introduction policy): baseline-diff report, rule severity assignment, remediation plan for any rule that would produce >20 new violations.
- estimated delta: code change + CI config
- risk: `higher` — actual code change; test baseline impact; may create noise
- size: M
- acceptance: three rules landed with baseline-diff report attached; `pnpm lint:boundaries` remains green; `pnpm check` and `pnpm build` green; fresh `code-reviewer` + `architecture-reviewer` verdicts `OK`
- verification intent: run baseline-diff before adoption; record Red/Yellow/Green transition explicitly
- verification mode: `test-first`

### Deferred

- `ST-G` — Cross-runtime plan versioning (`plan_version`, `hash`, append-only log sidecar, `Plan Change Request` as only canonical write-path). Likely over-engineering for current scale. Defer until a real race or drift incident is observed.

## Recommended execution order

1. **B → C → E** as low-risk doc shrinkers. Each a separate commit with a fresh `docs-reviewer` pass.
2. **D** separately — requires `strategic-reviewer` pass before merge.
3. **F** last — needs real code baseline and ESLint governance run per `invariants.md` §10.
4. **G** — skip until demonstrated need.

## Constraints

- Do not re-embed `git-protocol.md` §3-4 content into `workflow.md` or `orchestrator/instructions.md`.
- Do not restore the first table in `invariants.md` §8 (duplicate of `workflow.md` §2.3.1 / §3.3 / §5.1).
- Do not reintroduce the old free-form `Continuation Notes` shape; the four structured Carry-Forward fields are canonical.
- Do not treat `teammate mode` or `subagent mode as default` as current terminology.
- Do not reintroduce `/codex:rescue` or other slash-command surfaces as the canonical orchestration path for Codex lanes; use `./scripts/codex-companion.sh`.
- Do not rely on "latest completed" Codex status as proof; preserve `jobId + threadId` in artifacts / telemetry.
- One slice per commit; no batched commits across slices.

## Expected Result

Agent workflow docs reflect real operating practice: structured carry-forward, calibrated docs-severity escalation, adaptive strategic-reviewer cadence, explicit wave-journal recovery path, canonical Codex companion runtime with stable proof handles, and (for D/F) a bounded code-blind orchestrator carve-out plus automated lint guardrails. Wave closes with baseline still at or better than `Yellow`, test baseline not shrunk, and no doc duplication regressions.

## Для лид-стратега: что проверить перед pickup

1. **Ownership plan**: подтвердить, что порядок `B → C → E → D → F → (G deferred)` остаётся валидным — или оформить `Plan Change Request`, если после pre-pickup reframe order меняется.
2. **Operating mode per slice**: подтвердить `ordinary iterative` для B/C/E и `high-risk iterative / unstable wave` для D/F. Для D это обязательно из-за "code-blind orchestrator" invariant touch.
3. **Slice A verification** (already landed as `78b1cd8`):
   - diff coherent across `templates.md` §1, §4; `worker/guide.md` §7; `orchestrator/instructions.md` §Prompt composition, §Carry-Forward subsection, §Checklist перед spawn
   - fresh docs-reviewer verdict was `OK` after one round of follow-up fixes (CRITICAL + 2 WARNING from first pass resolved in the same commit)
   - four structured fields (`carried_decisions`, `open_findings`, `next_slice_assumptions`, `patterns_established`) appear consistently in all three files; no stale "Continuation Notes" / "gotchas" / "deferred items" / "decisions/patterns" references in `docs/agents/`
   - `workflow.md` §8 line 789 ("Continuity between dependent workers ...") left intentionally as-is; scoped to dependent-worker continuity, not to the task-packet requirement rule
4. **Slice D readiness**: если `lead-strategic` считает, что "code-blind orchestrator" не должен приобретать carve-out даже для triage — D отклонить до F/G; иначе включить `strategic-reviewer` per-slice gate в operating mode для D.
5. **Slice F readiness**: подтвердить или отклонить интеграцию CI check для `db/*.sql` ↔ `db/applied_changes.md` как часть этой волны (альтернатива — выделить отдельной волной, если baseline-diff показывает неприемлемый noise).
6. **Baseline carry-forward**: принять `Yellow` (`pnpm lint:eslint` pre-existing errors) как стартовую точку этой волны без попытки закрыть его внутри волны.

## Carry Forward (at wave close, to seed next wave)

- Non-blocking baseline debt remains: `pnpm lint:eslint` in packages/scripts, barrel/direct import inconsistency in product analytics, broad peer-isolation glob, oversized `routes/emis/+page.svelte`. These are explicitly out of scope for this wave.
- If F lands, record the final rule-introduction Red/Yellow/Green transition for next-wave planning.

## References

- Prior wave (closed): `docs/agents/lead-strategic/archive/plan_src_lib_dissolve_fsd_buckets_closed_2026-04-16.md`
- Operating-mode definitions: `docs/agents/workflow.md` §2.4
- Strategic-reviewer cadence and risk signals: `docs/agents/workflow.md` §4.1
- Worker mode selection (single SoT): `docs/agents/git-protocol.md` §3-4
- Codex runtime contract: `docs/codex-integration.md`
- Codex proof/telemetry contract: `docs/ops/usage-telemetry.md`
- ESLint rule-introduction policy: `docs/agents/invariants.md` §10
