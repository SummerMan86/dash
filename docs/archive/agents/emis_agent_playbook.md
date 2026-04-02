# EMIS Agent Playbook

Executable workflow for the EMIS multi-agent operating model.

This playbook turns the operating model into step-by-step instructions. It answers: "I have a task — what do I do now?"

References:
- [Operating Model](./emis_agent_operating_model.md) — roles, rules, model choices
- [Agent Roles](./emis_agent_roles.md) — canonical role definitions
- [Worker Handoff Template](./emis_worker_handoff_template.md) — worker output format
- [Review Handoff Template](./emis_review_handoff_template.md) — review request/result format
- [`.claude/agents/README.md`](../.claude/agents/README.md) — subagent configuration

---

## 1. Task Intake

### What the user provides

A task description in free form. For best results include:

```
Задача: <что нужно сделать>
Контекст: <зачем, что мотивирует>
Scope: <какие части системы затрагивает, если известно>
Ограничения: <сроки, зависимости, нельзя трогать X>
```

Minimal: just the task sentence. Lead-orchestrator (Claude Opus) clarifies the rest.

### What lead-orchestrator does first

1. **Read** relevant docs (`emis_session_bootstrap.md`, local `AGENTS.md` for touched modules)
2. **Clarify** ambiguities with user (using AskUserQuestion, not assumptions)
3. **Classify** the task tier (see section 2)
4. **Plan** — either decompose inline or enter Plan Mode for non-trivial tasks
5. **Confirm** plan with user before implementation

---

## 2. Tier Decision Tree

```
Is this change cosmetic (text, copy, style, typo)?
  YES → Tier 1
  NO  ↓

Does this change stay within one bounded module?
  YES → Does it introduce a new contract, schema, or API?
         NO  → Tier 2
         YES → Tier 3
  NO  → Tier 3

Does this change alter EMIS operational vs BI/read-side boundaries?
  YES → Tier 3
  NO  → use the answer above
```

| Tier | Review | Merge |
|------|--------|-------|
| **Tier 1** | Lead self-review | User confirms |
| **Tier 2** | Full Review Gate (4 reviewers in parallel) | User confirms |
| **Tier 3** | Full Review Gate + external lead recommended | User confirms |

---

## 3. Implementation Decision Tree

```
Is the task small enough to implement directly (< ~200 lines, 1-2 files)?
  YES → Lead implements directly in the feature branch
  NO  ↓

Can the task be split into independent slices?
  YES → Spawn worker subagents in parallel (each in own worktree)
  NO  → Lead implements sequentially, considers breaking into commits
```

### When to spawn workers

- The task has 2+ independent slices (e.g., backend + frontend)
- A slice is in a different domain (e.g., DB migration + API + UI)
- You want to parallelize for speed

### When NOT to spawn workers

- The slices have tight dependencies (output of A is input of B)
- The task is small and sequential
- Context sharing between slices is critical

---

## 4. Decomposition Plan

When a task is non-trivial, lead-orchestrator creates a decomposition plan before coding.

### Format

```markdown
# Decomposition: <task name>

## Overview
<1-2 sentences: what we're building and why>

## Subtasks

### ST-1: <name>
- scope: <files/layers to touch>
- depends on: — (or ST-N)
- owner: lead | worker
- tier: 1 | 2 | 3
- estimated size: S | M | L

### ST-2: <name>
- scope: <files/layers>
- depends on: ST-1
- owner: worker
- tier: 2
- estimated size: M

## Dependency Graph
ST-1 → ST-3
ST-2 → ST-3 (ST-1 and ST-2 are parallel)

## Risks
- <risk and mitigation>
```

Present to user for approval before implementation. For Tier 1 tasks, skip this step.

---

## 5. Worker Instruction Template

When lead-orchestrator spawns a worker subagent, it sends this structured instruction.

```markdown
# Worker Instruction

## Task
<clear, bounded description of what to implement>

## Scope boundary
- files to touch: <list>
- layers: <route UI | widgets | entities | server/emis | dataset/BI | db/docs>
- do NOT touch: <files/modules outside scope>

## Base branch
<branch name to create worktree from>

## Feature branch
agent/worker/<task-slug>

## Architecture constraints
- <relevant EMIS invariants from operating model section 6>
- <relevant patterns from existing code>

## Expected output
Use the worker handoff template (docs/emis_worker_handoff_template.md).
Commit your work and provide the handoff note.

## Checks to run
- TypeScript: no type errors in touched files
- <any specific validation>
```

---

## 6. Review Gate

### Trigger

After implementation is complete and committed, lead-orchestrator runs the Review Gate.

### Reviewer assignment by tier

| Tier | Reviewers |
|------|-----------|
| Tier 1 | Lead self-review only |
| Tier 2 | `architecture-reviewer` + `security-reviewer` + `docs-reviewer` + `codex-reviewer` |
| Tier 3 | All Tier 2 + `ui-reviewer` (if frontend) + external lead (recommended) |

### Diff preparation

1. Generate diff: `git diff main..feature/branch`
2. Check size: if diff > 4000 chars, note that `codex-reviewer` may need split
3. Identify changed file types: `.svelte`/`.css` = trigger `ui-reviewer`

### Spawn protocol

**First task in session:**
```
Spawn 4 reviewer agents in parallel (Agent tool, subagent_type for each).
Each receives: diff + changed file list + their role instructions.
```

**Subsequent tasks in same session:**
```
SendMessage to existing reviewer agents with new diff.
```

### Reviewer input format

Each reviewer receives:

```
Changed files:
<file list>

Diff (git diff main..feature):
<diff content>

Focus: <any specific concerns from lead-orchestrator>
```

---

## 7. Findings Aggregation

After all reviewers return, lead-orchestrator aggregates findings.

### Aggregation format (presented to user)

```markdown
## Review Gate Summary

**Tier**: 2
**Branch**: feature/emis-geo-import
**Diff**: main..feature/emis-geo-import (<N> files, <M> lines)

### Findings by severity

**CRITICAL** (blocks merge):
- [security-reviewer] file:line — description
  Fix: <what lead-orchestrator proposes>

**WARNING** (should fix):
- [architecture-reviewer] file:line — description
  Fix: <proposed fix>
- [codex-reviewer] file:line — description
  Fix: <proposed fix>

**INFO** (noted, not blocking):
- [docs-reviewer] file — docs update suggested
  Action: will fix

### Reviewer verdicts
- architecture-reviewer: OK
- security-reviewer: 1 WARNING
- docs-reviewer: 1 UPDATE needed
- codex-reviewer: OK
- ui-reviewer: not triggered (no frontend changes)

### Resolution plan
- WARNING items: will fix now
- INFO items: will fix now
- CRITICAL items: <escalated to user / none>

### Status: ready for merge | needs user decision
```

---

## 8. Escalation Protocol

Lead-orchestrator escalates to user when:

- Any `CRITICAL` finding from any reviewer
- Task requires a scope change or priority decision
- New shared contract, DB schema, or cross-module boundary shift
- Reviewers produce conflicting findings
- Design decision not covered by existing docs

### Escalation format

```markdown
## Escalation

**Reason**: <why this needs your decision>

**Context**: <what happened, which reviewer flagged it>

**Options**:
1. <option A> — <consequence>
2. <option B> — <consequence>
3. <option C> — <consequence>

**My recommendation**: option <N> because <reason>

**Waiting for**: your decision before proceeding
```

The user responds with one of:
- **Approve** recommendation
- **Choose** a different option
- **Request redesign** — lead goes back to decomposition
- **Provide context** — lead incorporates and continues

---

## 9. Merge Confirmation

After all findings are resolved, lead-orchestrator requests merge.

### Pre-merge checklist

- [ ] All CRITICAL findings addressed
- [ ] All WARNING findings fixed or explicitly accepted
- [ ] Docs reviewer confirmed updates made
- [ ] Commits are clean and bounded
- [ ] Feature branch is up to date with base

### Merge request format

```markdown
## Ready for merge

**Branch**: feature/X → main
**Summary**: <1-2 sentences>
**Review Gate**: passed (N findings resolved)
**Commits**: <count>

Confirm merge?
```

User says "yes" → lead merges. User says "wait" → lead holds.

---

## 10. Session Continuity

### Before ending a session with incomplete work

1. **Commit** all changes (even WIP) to the feature branch
2. **Document** current state:

```markdown
## Session Checkpoint

**Task**: <task name>
**Branch**: feature/X
**Status**: <implementing ST-2 | waiting for review | waiting for user decision>
**Completed**: ST-1, ST-2
**In progress**: ST-3 (files touched: X, Y)
**Next steps**: <what to do next>
**Active worktrees**: <list or "none">
```

3. **Save** to memory if the state has cross-session value

### Starting a new session on existing work

1. Read the feature branch: `git log main..feature/X`
2. Read the plan file if it exists
3. Check for session checkpoint in conversation or memory
4. Continue from documented next steps

---

## 11. Common Workflows

### Workflow A: Small Bug Fix (Tier 1)

```
User: "Fix the typo in EmisMap tooltip"
  ↓
Lead: classify → Tier 1
Lead: implement (1 file, 1 line)
Lead: self-review (EMIS invariants OK)
Lead: "Fixed. Confirm merge?"
User: "Yes"
Lead: merge
```

### Workflow B: New Feature (Tier 2)

```
User: "Add geo-import from OSM Overpass"
  ↓
Lead: classify → Tier 2 (new module, bounded)
Lead: enter Plan Mode, decompose into subtasks
Lead: present plan to user
User: approves plan
  ↓
Lead: create feature branch
Lead: implement (directly or via workers)
Lead: commit
  ↓
Lead: spawn 4 reviewers in parallel
Reviewers: return findings (~10-30 sec)
Lead: aggregate findings
Lead: fix non-critical issues
Lead: present Review Gate Summary to user
  ↓
User: "Looks good, merge"
Lead: merge to main
```

### Workflow C: Critical Change (Tier 3)

```
User: "Add new DB schema for vessel alerts"
  ↓
Lead: classify → Tier 3 (new schema, cross-module)
Lead: decompose, present plan
User: approves, requests external lead review
  ↓
Lead: implement in feature branch
Lead: produce worker handoff note
Lead: run Review Gate (4 reviewers)
  ↓
User: routes handoff + diff to external lead (Codex/GPT-5.4)
External lead: returns verdict
User: routes verdict back to lead
  ↓
Lead: address findings from all sources
Lead: present final summary
User: confirms merge
```

### Workflow D: Parallel Implementation

```
User: "Build geo-import: API client + repository + service + route"
  ↓
Lead: decompose into parallel slices:
  ST-1: entity contract + config (lead, direct)
  ST-2: Overpass client + Wikimapia client (worker A)
  ST-3: mappers + repository (worker B)
  ST-4: service + route (lead, after ST-1/2/3)
  ↓
Lead: implement ST-1 directly
Lead: spawn Worker A (worktree, ST-2)
Lead: spawn Worker B (worktree, ST-3)
  ↓
Workers: return handoffs
Lead: review handoffs, merge into feature branch
Lead: implement ST-4
Lead: run Review Gate on complete diff
  ↓
Lead: aggregate, fix, present summary
User: confirms merge
```

---

## 12. End-to-End Example: Geo-Import Task

Real example from this project.

### Step 1: Task intake

```
User: "Add Wikimapia objects to EMIS map"
```

### Step 2: Clarification

Lead asks:
- Source: live API or import to DB? → **Import to DB**
- Layer: separate or part of objects? → **Part of objects layer**
- Scope: all categories or specific? → **Specific categories**
- API key: available? → **Not sure, API may be deprecated**

### Step 3: Research & planning

Lead investigates:
- Wikimapia API status → deprecated, unreliable
- OSM Overpass → recommended alternative (free, current)
- EMIS objects schema → `external_id` + `source_origin='import'` fit perfectly

Lead enters Plan Mode, produces decomposition.

### Step 4: Tier classification

- New server module, new API client, new entity contract
- Bounded to one feature (geo-import), no cross-module changes
- No new DB schema (uses existing `emis.objects`)
- **Tier 2** (full Review Gate, no external lead needed)

### Step 5: Decomposition

```
ST-1: Entity contract (types + Zod schema)       — lead, direct
ST-2: Config + category whitelist                 — lead, direct
ST-3: Overpass client                             — worker A (parallel)
ST-4: Wikimapia client                           — worker A (parallel)
ST-5: Mappers                                    — worker B (parallel)
ST-6: Repository (upsertImportObject)            — worker B (parallel)
ST-7: Service (orchestration)                    — lead (after ST-1..6)
ST-8: API route                                  — lead (after ST-7)
ST-9: Seeds + docs + env                         — lead (after ST-8)
```

### Step 6: User approves plan

### Step 7: Implementation

Lead creates `feature/emis-geo-import` branch.
Lead implements ST-1, ST-2 directly.
Lead spawns Worker A (ST-3 + ST-4) and Worker B (ST-5 + ST-6) in parallel worktrees.
Workers return handoffs.
Lead merges, implements ST-7, ST-8, ST-9.

### Step 8: Review Gate

Lead spawns 4 reviewers on `git diff main..feature/emis-geo-import`:
- architecture-reviewer: checks FSD boundaries, server isolation
- security-reviewer: checks SQL parameterization, no raw SQL in routes, API key handling
- docs-reviewer: checks AGENTS.md, applied_changes.md, .env.example updates
- codex-reviewer: checks naming, framework conventions, code quality

### Step 9: Aggregation

```
## Review Gate Summary
Tier: 2
Branch: feature/emis-geo-import → main

CRITICAL: none
WARNING:
- [docs-reviewer] db/applied_changes.md — missing entry for new object types
  Fix: will add
INFO:
- [codex-reviewer] overpassClient.ts:45 — consider adding retry on timeout
  Action: noted for future, not blocking

Status: ready for merge (after docs fix)
```

### Step 10: Fix + merge confirmation

Lead fixes docs. Presents to user. User confirms. Merge.

---

## Quick Reference

| I need to... | Go to section |
|-------------|---------------|
| Start a new task | 1. Task Intake |
| Decide the review tier | 2. Tier Decision Tree |
| Decide: implement or spawn workers | 3. Implementation Decision Tree |
| Break a task into subtasks | 4. Decomposition Plan |
| Write instructions for a worker | 5. Worker Instruction Template |
| Run the Review Gate | 6. Review Gate |
| Present findings to user | 7. Findings Aggregation |
| Escalate a decision to user | 8. Escalation Protocol |
| Request merge | 9. Merge Confirmation |
| End session with WIP | 10. Session Continuity |
| See a full example | 12. End-to-End Example |
