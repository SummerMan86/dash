# Agent Templates

Canonical artifact shapes only. Workflow policy, ownership, routing, and runtime rules live in `workflow.md`, role instructions, and `docs/codex-integration.md`.

---

## 1. Worker Handoff (worker → orchestrator)

```md
# Worker Handoff

## Task
<what was assigned>

## What Was Done
- <what was implemented>
- key files: <list>

## Change Manifest
- owned files changed: <list>
- out-of-scope files touched: `none` | <list>
- contracts / schema / boundaries touched: `none` | <brief>
- short diff summary: <1-5 bullets>

## Verification
- verification intent: <what was verified>
- verification mode: `test-first` | `prototype-pin` | `verification-first`

## Debugging Outcome (required when `orchestrator` routed this slice through `Debugging`; omit otherwise)
- reproduction rerun result: <pass|fail|blocked> — <scenario/command and observed result>
- root cause: <brief causal explanation>
- why the fix is correct: <why this change addresses the root cause>
- related regression check run: <command/test/check> `fresh` | `not run` — <reason>

## Branches
- mode: `in-place` | `isolated`
- integration branch: <feature/topic>
- worker branch: <agent/worker/slug> | `N/A — in-place`

## Checks Evidence
- <command>: <green|red> `fresh` | `not run` — <reason>

## Review Disposition
- minimum independent review floor: `satisfied` | `N/A — no product code`
- slice review: `run` | `skipped` | `not applicable`
- rationale: <why>

## Review Results
- code-reviewer: <OK | findings summary>
- security-reviewer: <OK | findings summary>
- architecture-reviewer: <OK | findings summary>
- docs-reviewer: <OK | findings summary>
- ui-reviewer: <OK | findings summary>

## Slice DoD Status
Per `workflow.md` §6.1. Report only gaps or N/A; green items implied:
- docs: <done | N/A — reason | gap — what's missing>
- baseline tests: <maintained | grew to N>

## Carry-Forward Context (required for code-writing handoffs; `none` if empty)
- carried_decisions: <patterns chosen and why>
- open_findings: <reviewer findings not yet closed>
- next_slice_assumptions: <what next slice may assume>
- patterns_established: <patterns to reuse, not reinvent>

## Next Action Requested
- `accept` | `re-review` | `fix-worker` | `escalate`

## Risks / Escalations
- <risk, blocker, question> or `none`
```

## 2. Micro-Worker Handoff (micro-worker → orchestrator)

```md
# Micro-Worker Handoff

## What Was Done
- <brief, 1-3 bullets>
- files: <list>

## Change Manifest
- owned files changed: <list>
- out-of-scope files touched: `none` | <list>

## Checks Evidence
- <command>: <green|red> `fresh` | `not run` — <reason>

## Debugging Outcome (required when `orchestrator` routed this slice through `Debugging`; omit otherwise)
- reproduction rerun result: <pass|fail|blocked> — <scenario/command and observed result>
- root cause: <brief causal explanation>
- why the fix is correct: <why this change addresses the root cause>
- related regression check run: <command/test/check> `fresh` | `not run` — <reason>

## Review Disposition
- code-reviewer: <OK | findings summary>
- rationale: <why>

## Next Action
- `accept` | `fix-worker` | `escalate`
```

---

## 3. Plan (lead-strategic → orchestrator)

File: `docs/agents/lead-strategic/current_plan.md`

```md
# Plan: <task name>

## Goal
<what and why>

## Subtasks

### ST-1: <name>
- scope: <files/layers>
- depends on: — (or ST-N)
- size: S | M | L
- acceptance: <done-when>
- verification intent: <what to verify>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- notes: <optional>

## Constraints
- <what not to touch>
- <architectural requirements>

## Expected Result
- <what should work after execution>
```

## 4. Task Packet (orchestrator → worker)

```md
# Task: <name>

## What To Do
<clear description>

## Scope
- files: <list>
- layers: route UI | widgets | entities | server/<domain> | db/docs
- DO NOT touch: <files/modules out of scope>

## Branches
- mode: `in-place` (default) | `isolated` (opt-in — record trigger from git-protocol.md §4)
- integration branch: feature/<topic>
- worker branch: agent/worker/<task-slug> | `N/A — in-place`
- base commit: <sha>

## Bootstrap Reads
- docs/agents/worker/guide.md
- <local AGENTS.md in touched zones>

## Optional References
- <2-4 docs if needed for context>

## Verification
- verification intent: <what must be proven for this slice>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- mode rules (inline only the selected mode from `docs/agents/skills/testing-strategy.md`; do not send a bare link):
  - <3-6 concise bullets for the selected mode>
- waiver rationale: `none` | <why verification is deferred, partial, or substituted>

## Debugging (required when `orchestrator` chooses the debugging path; typical triggers: `bug report` | `failing test` | `regression`)
- trigger: `bug report` | `failing test` | `regression`
- reproduction scenario: <command/input/path; expected vs actual>
- known-good comparison path: <working test/route/commit/fixture> | `none` — <reason>
- current hypothesis / first hypothesis: <what to validate first> | `none yet — diagnose first`
- escalation trigger: <when worker must stop and escalate>
- expected regression check after fix: <related test/check to rerun>

## Carry-Forward Context (required for code-writing handoffs; `none` if empty)
- previous slice: <ST-N> or `none` (independent slice)
- carried_decisions: <from prior handoff>
- open_findings: <unresolved reviewer findings> or `none`
- next_slice_assumptions: <what this slice may assume>
- patterns_established: <patterns to reuse, not reinvent>

## Acceptance
- <done-when criteria>

## Checks
- <what to run>

## Review Floor
- minimum: per `workflow.md` §3.1
- selected reviewers: per `workflow.md` §3.2

## Return Artifacts
- change manifest, boundary notes, review disposition, next action
- include `Debugging Outcome` if this task packet included `Debugging`
- use Worker Handoff template (§1) or Micro-Worker Handoff (§2)
```

### 4.1. Micro-Task Packet

```md
# Task: <name>

## What To Do
<clear description>

## Scope
- files: <list>
- DO NOT touch: <files/modules out of scope>

## Branches
- mode: `in-place` (default for micro-workers)
- integration branch: feature/<topic>
- base commit: <sha>

## Bootstrap Reads
- docs/agents/worker/guide.md
- <local AGENTS.md in touched zones>

## Verification
- verification intent: <what must be proven for this slice>
- verification mode: `test-first` | `prototype-pin` | `verification-first`
- mode rules (inline only the selected mode from `docs/agents/skills/testing-strategy.md`; keep it short):
  - <3-6 concise bullets for the selected mode>
- waiver rationale: `none` | <why verification is deferred, partial, or substituted>

## Debugging (required when `orchestrator` chooses the debugging path; typical triggers: `bug report` | `failing test` | `regression`)
- trigger: `bug report` | `failing test` | `regression`
- reproduction scenario: <command/input/path; expected vs actual>
- known-good comparison path: <working test/route/commit/fixture> | `none` — <reason>
- current hypothesis / first hypothesis: <what to validate first> | `none yet — diagnose first`
- escalation trigger: <when worker must stop and escalate>
- expected regression check after fix: <related test/check to rerun>

## Acceptance
- <done-when criteria>

## Checks
- <what to run>

## Return Artifacts
- include `Debugging Outcome` if this task packet included `Debugging`
- use Micro-Worker Handoff template (§2)
```

## 5. Reports (orchestrator → lead-strategic)

File: `docs/agents/orchestrator/last_report.md`

### 5.1. Full Report

```md
# Report: <task name>

## Report Type
`full`

## Status
<done | partial | blocked>

## What Was Done
- ST-1: <status, brief>
- ST-2: <status>

## Plan Sync
- current_plan.md: `unchanged` | `updated` | `pending update`
- plan change requests: `none` | `PCR-...`
- operating mode: <mode>
- mode change signal: `none` | `consider <from> -> <to>`

## Review Disposition
- minimum independent review floor: `satisfied` | `N/A`
- integration review: `run` | `skipped` | `N/A`
- rationale: <why>

## Findings by Severity
- CRITICAL: <reviewer: file:line — description> or `none`
- WARNING: <description — what was done>
- INFO: <notes>

## Reviewer Verdicts
- architecture-reviewer: OK | N issues
- security-reviewer: OK | N issues
- docs-reviewer: OK | N updates
- code-reviewer: OK | N issues
- ui-reviewer: OK | N issues

## Checks Evidence
- `pnpm check`: <green|red> `fresh` | `not run` — <reason>
- `pnpm build`: <green|red> `fresh` | `not run` — <reason>
- `pnpm lint:boundaries`: <green|red> `fresh` | `not run` — <reason>

## Readiness
<ready to merge | needs lead-strategic decision | needs rework>

## Questions
- <question> or `none`
```

### 5.2. Lightweight Report

```md
# Report: <task name>

## Report Type
`lightweight`

## Status
<done | partial | blocked>

## What Changed
- <brief summary>
- (for direct-fix: `direct-fix: <file> — <what was fixed>`)

## Review Disposition
- minimum review floor: `satisfied` | `N/A` | `N/A — direct-fix`
- rationale: <why>

## Checks Evidence
- <command>: <green|red|not run> — <reason>

## Readiness
<ready to merge | needs decision | needs rework>
```

### 5.3. Governance Closeout Report

```md
# Report: <task name>

## Report Type
`governance-closeout`

## Status
<done | partial | blocked>

## What Was Closed
- <wave / verification / docs alignment>

## Governance Disposition
- architecture pass: `not needed` | `done` | `see artifact`
- baseline pass: `not needed` | `done` | `see artifact`
- baseline status: `Red` | `Yellow` | `Green` | `not assessed`

## Checks Evidence
- <command>: <green|red|not run> — <reason>

## Readiness
<ready to merge | needs decision | needs rework>
```

## 6. Review Request / Result (orchestrator ↔ reviewer)

### Review Request

```md
Changed files: <list>
Diff: <slice diff or git diff main..feature/topic>
Architecture context:
- contour: <platform/shared | domain operational | domain BI/read-side>
- expected home: <packages/... | apps/web/...>
- exceptions touched: <none | EXC-...>
Required Reads (for architecture/docs reviewers): <invariants.md, overlay, registry>
Focus: <what to pay attention to>
```

### Review Result

```md
# Review: <role name>

Verdict: OK | request changes | needs design decision

Findings:
- [CRITICAL|WARNING|INFO] file:line — description
- or "No issues found."

Required follow-ups:
- <what to fix> or "none"
```

Base shape above is canonical.
Role-specific reviewer instructions may narrow the allowed verdict set and add a small local delta
(for example extra finding subfields such as `Detail`, `Fix`, `Console`, or `Screenshot`).

## 7. Strategic Review Request / Result

### Request (lead-strategic → strategic review pass)

```md
# Strategic Review Request

Goal: <acceptance readiness, plan fit, next-slice impact, missed bugs>
Inputs:
- current plan, last report, operating mode
- reviewer verdicts / risk signal
- changed files, diff
- 2-4 canonical docs
Questions:
- <question 1>
- <question 2>
```

### Result

```md
# Strategic Review

Operating Mode: current: <mode> | mode change: none | <from -> to>
Verdict: accept-ready | needs follow-up | needs strategic decision
Findings: [CRITICAL|WARNING|INFO] file:line — description (or "No issues found.")
Plan Fit: <matches plan / scope drift / acceptance partially closed>
Next-Slice Impact: <no changes / local reframe / needs strategic re-slice>
Yield: meaningful | low-yield
Cross-Model Value: found likely missed bug | found acceptance signal | no additional value
Recommended next step: accept | request fixes | re-slice | escalate
```

## 8. Baseline Verdict

```md
# Baseline Verdict

Status: Red | Yellow | Green
Verdict: baseline not closed | baseline conditionally open | baseline closed
Why: <reasons>
Checks: <command>: <green|red|not run> (repo-wide + overlay-specific)
Known Exceptions: <id — owner, expiry, note> or `none`
Allowed Next Work: <what is allowed>
Required Follow-ups: <items> or `none`
```

## 9. Architecture Pass Decision

```md
# Architecture Pass Decision

Decision: approve placement | approve with exception | request reshape | needs escalation
Context: contour, reusable home, app-leaf touch points
Why: <reasons>
Exception / waiver: <EXC-id — owner, expiry, note> or `none`
Required doc updates: <doc> or `none`
Allowed implementation scope: <what may proceed>
```

## 10. Plan Change Request (orchestrator → lead-strategic)

```md
# Plan Change Request: <PCR-id / title>

Triggered by: slice <ST-N> — <what was discovered>
Requested change: current wording → proposed wording → impact on next slices
Why now: <why continuing is unsafe without this>
Evidence: changed files, findings
Decision needed: approve and rewrite plan | reject | escalate
```

## 11. Transparency Request (orchestrator → worker/reviewer)

```md
# Transparency Request

Request Type: <EXPLAIN_DIFF | EXPLAIN_DECISION | SHOW_STRUCTURE | SHOW_IMPACT | ALTERNATIVE_APPROACH | DOCUMENT_RISK | VERIFY_INVARIANT | CHECK_STATUS>
Target Scope: slice <ST-N>, files/modules: <list>
Question: <what to clarify>
Expected Output: bullets | table | short summary (no raw diff dumps)
Why Needed: <why handoff/verdict cannot be accepted without this>
```
