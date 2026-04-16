# Agent Templates

All communication templates between agents. Each role reads only the sections relevant to them.

## Routing

| Role | Sections |
| --- | --- |
| **Worker** | §1 (Worker Handoff), §2 (Micro-Worker Handoff) |
| **Orchestrator** | §3 (Plan), §4 (Task Packet), §5 (Reports), §6 (Review Request/Result), §7-§10 (Governance), §11 (Transparency) |
| **Lead-strategic** | §3 (Plan), §7-§9 (Strategic/Governance), §10 (Plan Change Request) |
| **Reviewer** | Output format is inline in each reviewer's `instructions.md` |

## Rules

- `Required` = section must be present. `Optional` = may be omitted entirely if not applicable.
- If a block is N/A, omit it with a one-line disposition note, don't fill each field with "not applicable".
- Report type is determined by risk profile, not file count.
- Verdict artifacts (Baseline Verdict, Architecture Pass Decision) become separate files only when the decision must outlive `last_report.md`.

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

## Branches
- worker branch: agent/worker/<slug>
- integration branch: <feature/topic>

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
Per `review-gate.md` § 4.1. Report only gaps or N/A; green items implied:
- docs: <done | N/A — reason | gap — what's missing>
- baseline tests: <maintained | grew to N>

## Continuation Notes (for dependent slices)
- decisions: <pattern chosen and why>
- gotchas: <non-obvious discoveries>
- deferred items: <what was consciously deferred>

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

Plan self-review: every slice has testable acceptance; non-trivial slices have verification intent and mode; plan stays at decision-level, no implementation walkthroughs.

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
- integration branch: feature/<topic>
- worker branch: agent/worker/<task-slug>
- base commit: <sha>

## Bootstrap Reads
- docs/agents/worker/guide.md
- <local AGENTS.md in touched zones>

## Optional References
- <2-4 docs if needed for context>

## Carry-Forward Context (for dependent slices)
- previous slice: <ST-N>
- summary: <what was done — 3-5 bullets>
- decisions/patterns: <what to continue, not reinvent>
- open findings: <from previous review> or `none`
- continuation notes: <from previous handoff> or `none`

## Acceptance
- <done-when criteria>

## Checks
- <what to run>

## Review Floor
- minimum: `code-reviewer` for any code-writing slice
- extra: `security` / `architecture` / `docs` / `ui` as applicable

## Return Artifacts
- change manifest, boundary notes, review disposition, next action
- use Worker Handoff template (§1) or Micro-Worker Handoff (§2)
```

### 4.1. Micro-Task Packet

Shortened packet for trivial bounded slices. Same fields minus Carry-Forward, Optional References, and Review Floor.

## 5. Reports (orchestrator → lead-strategic)

File: `docs/agents/orchestrator/last_report.md`

### 5.1. Full Report

For multi-slice, risky, or cross-layer work.

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

Optional sections (add when applicable): Execution Profile, Strategic Cadence, Governance Summary, Branches, Agent Effort, Usage Telemetry, Wave DoD Status (at wave close per `review-gate.md` §4.2).

### 5.2. Lightweight Report

For docs-only, direct-fix, or low-risk one-slice work.

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

For verification/docs/baseline closure without new implementation.

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

Format: see `lead-strategic/instructions.md` § "Strategic review output format".

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

Types: `EXPLAIN_DIFF` | `EXPLAIN_DECISION` | `SHOW_STRUCTURE` | `SHOW_IMPACT` | `ALTERNATIVE_APPROACH` | `DOCUMENT_RISK` | `VERIFY_INVARIANT` | `CHECK_STATUS`

```md
# Transparency Request

Request Type: <type>
Target Scope: slice <ST-N>, files/modules: <list>
Question: <what to clarify>
Expected Output: bullets | table | short summary (no raw diff dumps)
Why Needed: <why handoff/verdict cannot be accepted without this>
```

## 12. Usage Log Entry

Append-only telemetry: `runtime/agents/usage-log.ndjson`. Core fields: timestamp, task_id, wave_id, stage, report_type, operating_mode, status. Full schema: `usage-telemetry.md` §3.
