# Agent Workflow Superpowers Adaptation

## Purpose

This document captures the agreed hybrid adoption path for selected `obra/superpowers`
practices inside the existing agent workflow.

It is a supporting execution plan, not a replacement for the active strategic wave in
`docs/agents/lead-strategic/current_plan.md`.

## Decision Summary

The repository keeps its current agent model as canonical:

- GPT-5.4 `lead-strategic`
- Claude `orchestrator` (legacy alias: `lead-tactical`)
- worker slices
- five reviewer types
- Review Gate
- governance passes
- memory ownership
- recovery protocols

What we adopt from `superpowers`:

- stronger verification-before-completion discipline
- systematic debugging protocol
- explicit testing strategy for logic vs exploratory vs schema work
- tighter plan granularity for execution slices

What we reject:

- full `superpowers` plugin/workflow replacement
- blanket TDD for the whole repo
- generic single-agent/subagent model in place of the current role hierarchy
- mandatory worktree-per-task model
- "complete code in every plan step" planning style

## Testing Strategy

This rollout uses a three-mode testing strategy instead of blanket TDD.

### 1. Test-First

Use for:

- pure logic
- compiler/planner behavior
- bugfixes with a reproducible failure
- data/runtime contracts with isolated behavior

Rule:

- add or update a failing test first when the behavior is stable enough to specify
- implement the fix or feature
- rerun the test and relevant checks before claiming completion

### 2. Prototype -> Pin -> Refactor

Use for:

- exploratory work
- UI/layout-heavy work
- new feature slices where requirements are still moving

Rule:

- produce the smallest working prototype
- pin the accepted behavior with tests or an explicit verification artifact as soon as the behavior stabilizes
- refactor only after the behavior is pinned

### 3. Verification-First

Use for:

- DB/schema changes
- ops runbooks
- structural contract publication
- snapshot-first DB work

Rule:

- prioritize snapshot/contract/integration verification over forced unit-test-first ceremony
- completion requires truthful verification evidence for the relevant schema/runtime/docs contract

## Rollout Waves

### Wave 0: Test Harness Bootstrap

Goal:

- create a minimal root-level test harness for package-layer unit tests

Changes:

- add `vitest` at workspace root
- add root scripts `pnpm test` and `pnpm test:watch`
- add one root `vitest.config.ts`
- scope the initial harness to `packages/*`

Acceptance:

- `pnpm test` runs clean even when zero tests exist
- `pnpm test:watch` starts without config or resolution errors

### Wave 1: Verification Before Completion

Goal:

- strengthen existing checks-evidence discipline without adding a new parallel gate

Changes:

- formalize fresh-evidence wording in worker instructions
- formalize verification discipline in review gate
- require `orchestrator` to reject stale or vague evidence

Acceptance:

- expected checks require fresh evidence or truthful `not run + reason`
- missing expected evidence is documented as `WARNING`
- fabricated or contradictory evidence is treated as `CRITICAL`

### Wave 2: Systematic Debugging Protocol

Goal:

- add a reusable debugging playbook for workers and tactical execution

Changes:

- create `docs/agents/skills/debugging.md`
- register it in `docs/AGENTS.md`
- reference it from worker instructions

Protocol:

1. reproduce and investigate root cause
2. compare with a known-good path
3. validate one hypothesis at a time
4. implement and verify

Escalation trigger:

- three or more failed fix attempts
- or loss of confidence in the actual root cause

Acceptance:

- debugging protocol exists, is registered, and is referenced from worker instructions

### Wave 3: Testing Strategy And Pilot Tests

Goal:

- publish the three-mode testing strategy and prove it on package-level logic

Changes:

- create `docs/agents/skills/testing-strategy.md`
- register it in `docs/AGENTS.md`
- update templates to require:
  - `verification intent`
  - `verification mode`
  - `waiver rationale` when applicable
- add pilot tests for:
  - `packages/platform-datasets/src/server/compile.ts`
  - `packages/platform-filters/src/model/planner.ts`

Acceptance:

- the testing strategy doc exists and is referenced from worker instructions
- package-layer pilot tests pass
- no production-only helper is exported solely for test convenience

### Wave 4: Plan Granularity

Goal:

- tighten the strategic plan template without turning it into implementation scriptwriting

Changes:

- update the strategic plan template so every slice has:
  - `size`
  - `acceptance`
  - `verification intent`
  - `verification mode`
- add a short self-review checklist for plan authors

Acceptance:

- plan templates require explicit verification stance per slice
- strategic plans remain decision-level, not full code walkthroughs

## Execution Strategy

Implementation should not run as one oversized execution thread.

Recommended chat split:

1. `Wave 0 + Wave 1`
2. `Wave 2`
3. `Wave 3 + Wave 4`

Why:

- Wave 0 and Wave 1 provide the execution foundation
- Wave 2 is a small isolated docs/process slice
- Wave 3 and Wave 4 are tightly coupled through testing policy and templates

Each execution chat should:

- stay bounded to its assigned waves
- run its own acceptance checks
- update docs truthfully before the next chat begins

## Out Of Scope

- replacing the current multi-agent workflow with `superpowers`
- changing the active EMIS strategic wave
- adding repo-wide session-start hooks as canonical contract
- adding package-local Vitest configs in v1
- expanding the first test harness to `apps/web`

## Deferred V2 Ideas

These items are intentionally deferred from v1 because they are useful, but not
foundational for the first rollout wave.

### 1. Branch Closeout Discipline

Source inspiration:

- `finishing-a-development-branch`

Useful delta for this repo:

- require an explicit closeout step after implementation is complete
- verify tests/checks before presenting merge or PR options
- present a small fixed set of end-of-branch outcomes:
  - merge locally
  - open PR / keep branch for review
  - keep branch as-is
  - discard with explicit confirmation
- define safe cleanup rules for worktrees and temporary branches

Why deferred:

- current `git-protocol.md` already defines branch/worktree ownership and merge choreography
- this is a quality-of-life closeout layer, not a prerequisite for Wave 0-4

Recommended v2 shape:

- add a short closeout section to `docs/agents/git-protocol.md`
- optionally add a tiny reusable `docs/agents/skills/branch-closeout.md`

### 2. Review Request / Review Reception Discipline

Source inspiration:

- `requesting-code-review`
- `receiving-code-review`

Useful delta for this repo:

- tighten review-request inputs so reviewer context is always bounded and explicit
- require `orchestrator` or worker to provide:
  - what changed
  - plan or acceptance reference
  - changed files or diff scope
  - checks already run
- formalize review-reception behavior:
  - do not implement unclear feedback partially
  - verify feedback against repo reality before changing code
  - push back on technically wrong or context-blind findings
  - fix one issue at a time and re-verify

Why deferred:

- current workflow already has strong reviewer roles and templates
- the main v1 gap is verification/testing/debugging, not reviewer dispatch itself

Recommended v2 shape:

- refine review request/result templates in `docs/agents/templates.md`
- add a short behavioral section to reviewer-facing and worker/tactical instructions

## Deferred V3 Ideas

These items look valuable from `quint-code`, but they should come only after the
v1/v2 rollout proves useful in practice.

### 1. Decision Refresh / Stale-Review Cadence

Source inspiration:

- `README.md` decision refresh / evidence aging
- `/q-refresh`
- `/q-status`

Useful delta for this repo:

- add an explicit `refresh by` or `review by` field for active supporting decisions
- make stale rollout docs and temporary policies visible before they silently drift
- require explicit `superseded`, `extended`, or `closed` disposition for active rollout docs
- standardize evidence state as:
  - `fresh`
  - `stale`
  - `missing`
- keep this as simple status wording only, not as a computed trust score

Why this is useful here:

- the repo already cares about stale docs, owner+expiry, and truthful governance
- current workflow has expiry for waivers, but not a general refresh cadence for active supporting plans

Why deferred:

- it is process-governance polish, not a prerequisite for verification/testing/debugging adoption
- adding refresh mechanics too early would create overhead before the base rollout is battle-tested

Recommended v3 shape:

- add a small lifecycle section to active rollout docs
- use `fresh/stale/missing` evidence wording in supporting rollout and review-related docs
- optionally add a short refresh rule to `docs/agents/workflow.md` or `memory-protocol.md`

### 2. Onboarding / Decision Backfill Scan

Source inspiration:

- `/q-onboard`

Useful delta for this repo:

- when entering an older or underdocumented module, require a quick scan for:
  - existing local `AGENTS.md`
  - current contracts
  - unresolved caveats / deferred items
  - decisions worth backfilling into docs before implementation starts

Why this is useful here:

- this repo relies heavily on doc truthfulness and contour-aware navigation
- the highest friction areas are often legacy or half-documented zones, not greenfield slices

Why deferred:

- current navigation is already strong enough for the first rollout waves
- this becomes more valuable once the new verification/testing discipline is in steady use

Recommended v3 shape:

- add a short “onboarding scan” rule to worker/tactical instructions
- optionally create a tiny reusable `docs/agents/skills/onboarding-scan.md`

### 3. Depth Calibration

Source inspiration:

- analysis depth / blast-radius calibration in `quint-code`

Useful delta for this repo:

- require an explicit depth hint for non-trivial work:
  - `light`
  - `standard`
  - `deep`
- tie depth to blast radius, reversibility, and cross-module impact instead of vague “be thorough”
- make plan and handoff expectations more proportional to actual risk

Why this is useful here:

- current workflow already distinguishes low-risk vs high-risk work, but not with one compact shared depth label
- it would help align planning effort, review intensity, and evidence expectations

Why deferred:

- the current rollout already introduces new verification/testing structure
- depth labels are useful only after the base workflow changes settle

Recommended v3 shape:

- add `depth: light | standard | deep` to strategic plan and tactical handoff templates
- define one short rubric in `docs/agents/templates.md` or `workflow.md`

### 4. Diversity Check On Variants

Source inspiration:

- variant-diversity checks in `quint-code`

Useful delta for this repo:

- when `lead-strategic` or `orchestrator` compares alternatives, require a quick check that options differ in kind, not only in degree
- reduce false choice between near-identical variants with cosmetic differences

Why this is useful here:

- it improves architectural or tactical comparisons without adding heavy process
- it is especially relevant when using agents to generate multiple “alternatives” that are often structurally the same

Why deferred:

- it is useful mainly for design/decision-heavy slices, not for the foundational v1 rollout

Recommended v3 shape:

- add one checklist line to planning/decision templates:
  - “Do the variants differ in kind, not only in degree?”

## Next Execution Entrypoint

The first implementation chat should execute:

1. Wave 0
2. Wave 1

and treat this document as the execution reference for the rollout.
