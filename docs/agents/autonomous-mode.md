# Autonomous Mode

Delta appendix to `workflow.md` for autonomous execution without user-in-the-loop.

Standard process (roles, review, governance, DoD): `workflow.md`.
Codex commands and prompting templates: `docs/codex-integration.md`.
Standard recovery protocols: `recovery.md`.

Important:

- Autonomous mode removes user-in-the-loop but does not expand `orchestrator` product-code ownership beyond standard `direct-fix`.
- Canonical path for autonomous decision log: `docs/agents/orchestrator/decision-log.md`.
- Runtime/model binding: `execution-profiles.md`.

## 1. Two Autonomy Levels

| Aspect | Lightweight | Full |
|---|---|---|
| When | Task by analogy, clear scope, no arch decisions | Cross-layer, schema changes, arch decisions |
| Strategic loop | No. `orchestrator` plans and accepts alone | Yes. `lead-strategic` = autonomous decision-maker |
| Codex required | No | Yes |
| Plan | Mini-plan inline in decision-log | Full `current_plan.md` via Codex |
| Review Gate | Mandatory (code + security minimum) | Full (all applicable reviewers) |
| Decision-log | Mandatory | Mandatory |

### Selection criteria

Lightweight if ALL true:

- Task is "do like X but for Y" (reference implementation exists)
- Scope ≤ 1 module / ≤ 10 files
- No non-obvious architectural decisions
- No schema/DB changes
- No cross-layer / cross-package changes
- Acceptance criteria are unambiguous

Full if ANY true:

- Architectural decision required
- Cross-layer or cross-package scope
- Schema / contract changes
- 4+ files in different modules
- Sequencing depends on previous step result
- Non-obvious acceptance criteria

## 2. Entry Protocol

### Lightweight prompt

```text
Автономная задача (lightweight): <что сделать>
Reference: <файл-образец>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
Timeout: 30 минут
```

### Full prompt

```text
Автономная задача (full): <что сделать>
Контекст: <зачем>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
Режим: autonomous full
Timeout: 60 минут
Guardrails: default
```

Headless CLI templates and Codex prompting: `docs/codex-integration.md` §6.

### Autonomy parameters

| Parameter | Default (lightweight) | Default (full) |
|---|---|---|
| `timeout` | 30m | 60m |
| `scope` | required | required |
| `guardrails` | `default` | `default` |
| `operating-mode` | n/a | `lead-strategic` decides |
| `max-slices` | 3 | 9 |
| `escalation-policy` | `stop` | `log-and-continue` |
| `reference` | recommended | optional |

## 3. Role Deltas

Standard roles and responsibilities: `workflow.md` §1.

### Lightweight: `orchestrator` as autonomous owner

`orchestrator` combines planning and acceptance but does NOT get broader self-write scope than standard workflow.

- Plans via mini-plan in decision-log (no `current_plan.md`)
- Accepts by self-checking acceptance criteria
- Implementation: eligible `direct-fix` inline; otherwise 1 isolated worker
- If architectural decision arises → STOP, switch to full or standard mode

### Full: `lead-strategic` as autonomous decision-maker

Everything from `lead-strategic/instructions.md` plus:

- Approves plan without user input (plan is APPROVED on creation if guardrails OK)
- Issues slice verdicts autonomously (`ACCEPT` / `ADJUST` / `REJECT`)
- Resolves escalations via decision framework (§4) instead of escalating to user
- No new rights: cannot escape scope, ignore invariants, or change contracts without waiver

CTO-модель, transparency requests и информационная асимметрия: `lead-strategic/instructions.md` §CTO-модель.

### Full: `orchestrator` as autonomous executor

Standard `orchestrator/instructions.md` plus:

- Does not wait for user input; decides by framework or logs and continues
- Escalations → decision-log + Codex (instead of user)
- Self-monitors timeout and guardrails after each slice
- If guardrail violated or timeout exceeded → stop, commit state, write partial report

### Workers and reviewers: unchanged

They work identically to standard workflow. Workers do not know the mode is autonomous.

## 4. Decision Framework

Rules for decisions without user. Applied by `lead-strategic` and `orchestrator`.

### Architectural decisions

| Situation | Decision |
|---|---|
| Unclear layer placement | Follow existing patterns in neighboring modules |
| Two approaches equal | Choose simpler, log alternative |
| New dependency needed | Only if analogue already in `package.json`; new → `DEFERRED` |
| New shared utility needed | Inline first, extract only if 3+ call sites |
| Unclear DB schema | Read migrations + relevant domain bootstrap doc |

### Scope decisions

| Situation | Decision |
|---|---|
| Task larger than expected | Implement core scope, defer extras as `DEFERRED` |
| Unrelated bug found | Log in decision-log, do not fix |
| Refactoring needed for task | Minimal, only if blocking; log |
| Code outside scope broken | Minimal fix + log, do not refactor |

### Conflicts

| Situation | Decision |
|---|---|
| Reviewers disagree | `lead-strategic` picks position with better rationale, logs |
| Slice rejected 3+ times | `lead-strategic`: simplify scope, skip slice, or accept-with-known-limitation |
| Invariant violation | **STOP.** Cannot be resolved autonomously. Guardrail break. |
| New contract/schema needed | Allowed only if in scope. Log as `SIGNIFICANT DECISION` |

**Fallback:** if no rule applies, `lead-strategic` picks the decision that minimizes blast radius and logs as `JUDGMENT CALL` with full rationale.

## 5. Guardrails

### Hard stops (execution stops immediately)

- **Invariant violation** — `invariants.md`
- **Scope escape** — work outside specified scope without expansion in decision-log
- **Destructive operation** — `DROP TABLE`, force push, production data/file deletion
- **Secret exposure** — `.env`, credentials, tokens committed
- **Timeout exceeded**
- **External system mutation** — API writes, messages, deploy
- **New runtime dependency** — new package in `package.json` (unless explicitly allowed)

### Soft limits (logged, execution continues)

- File > 500 lines → warning, log justification
- \> 20 changed files → warning, verify against scope
- \> 5 slices executed → checkpoint: verify progress vs. timeout
- Review WARNING not fixed → log reason

### Custom guardrails

```text
Guardrails:
  allow: новые npm-зависимости (uuid, zod)
  deny: изменения в packages/emis-server/src/modules/auth/
  deny: DB migrations
```

## 6. Decision Log

Canonical path: `docs/agents/orchestrator/decision-log.md`.

Format:

```markdown
# Decision Log — <task name>

Mode: autonomous
Start: <ISO timestamp>
Scope: <scope>
Timeout: <timeout>

## Decisions

### D-1: <short description>
- **Type:** SCOPE | ARCHITECTURE | CONFLICT | JUDGMENT_CALL | SIGNIFICANT | DEFERRED
- **Context:** <what happened>
- **Decision:** <what was decided>
- **Rationale:** <why>
- **Alternative:** <what else could have been done>
- **Risk:** LOW | MEDIUM | HIGH

## Deferred
- <deferred items>

## Guardrail Events
- <soft limit warnings>
```

Writers: `orchestrator` creates at start and logs tactical decisions; `lead-strategic` (through Codex `--write`) logs strategic decisions. After completion, decision-log remains as artifact for user review.

## 7. Lifecycle

### Lightweight

1. Read reference implementation
2. Create decision-log with mini-plan (acceptance criteria from task, reference file)
3. Implement: `direct-fix` inline or 1 isolated worker
4. Review Gate (code-reviewer + security-reviewer minimum; architecture/docs as applicable)
5. Fix findings (worker-owned for worker path; orchestrator for direct-fix path)
6. Commit + finalize decision-log

No `last_report.md` — decision-log replaces it.
No `current_plan.md` — plan lives in decision-log.
No memory update — lightweight tasks do not change strategic context.

### Full — startup

1. Create decision-log
2. Invoke Codex for strategic planning (`docs/codex-integration.md` §6)
3. `lead-strategic` creates `current_plan.md` + self-approves
4. Begin execution loop

### Full — execution loop

Per slice:

1. Dispatch worker (as standard)
2. Worker: implement + slice review + handoff
3. Check handoff, run Review Gate
4. Invoke Codex for autonomous acceptance (`docs/codex-integration.md` §6)
5. `lead-strategic`: verdict + reframe
6. Check guardrails + timeout
7. REJECT → return to worker / simplify; ACCEPT → next slice

### Full — completion

1. Integration review (if needed)
2. Final autonomous acceptance via Codex
3. Collect `last_report.md` + finalize decision-log
4. Commit, update both `memory.md` files, output summary

### Interruption (any mode)

1. Reach safe state, commit
2. Decision-log: record stop reason
3. Full mode only: partial `last_report.md`, update both `memory.md`
4. Output summary: what's done, what's remaining, why stopped

**Lightweight escalation:** if task is harder than expected:

1. Log `ESCALATION_TO_FULL` in decision-log
2. Commit current work
3. Report: "Task requires full autonomous or standard mode"

## 8. Autonomous Recovery Protocols

Standard recovery: `recovery.md`. These extend for autonomous-specific cases.

### ARP-1. Codex unavailable in full mode

Full autonomous cannot continue without Codex. On failure:

1. Reach safe state, commit + decision-log + partial report
2. If remaining slices need no strategic decisions → downgrade to lightweight, log `DOWNGRADE_TO_LIGHTWEIGHT`
3. Otherwise → switch to standard workflow (`recovery.md` RP-3)

Lightweight mode does not depend on Codex — this protocol does not apply.

### ARP-2. Rejection loop

If `lead-strategic` rejects a slice 3+ times:

- Simplify scope if possible → log
- Skip slice, mark `DEFERRED`, continue → if possible
- If slice is critical for remaining work → **STOP**, partial report

### ARP-3. Timeout approaching

When < 20% timeout remains:

1. Can current slice finish? → finish + partial report
2. Cannot → stop, commit current state
3. Decision-log entry: `TIMEOUT_APPROACHING`

## 9. Post-Execution User Review

After autonomous execution the user gets:

1. `last_report.md` (full mode) or `decision-log.md` (lightweight)
2. `decision-log.md` — all autonomous decisions
3. Git diff

Checklist:

- [ ] No unacceptable `HIGH`-risk decisions
- [ ] `JUDGMENT_CALL` decisions are adequate
- [ ] `DEFERRED` items are understood and acceptable
- [ ] Code matches expectations
- [ ] Guardrail warnings are justified
- [ ] Merge or revert

## 10. Limitations

Do NOT use autonomous mode when:

- Task requires product/business decision (agents lack business context)
- Task affects production (deploy, migrations, external APIs)
- Scope is fuzzy ("improve performance" → needs dialogue)
- First task in a new domain
- Cross-repo changes

| Task type | Level | Why |
|---|---|---|
| Adapter by analogy | Lightweight | Reference exists, scope clear |
| Bug fix with reproduction | Lightweight | Narrow scope, unambiguous acceptance |
| Batch rename / pattern migration | Lightweight | Mechanical transformation |
| Existing feature extension | Lightweight | Pattern obvious |
| New module with non-standard API | Full | Architectural decisions |
| Cross-layer feature | Full | Layer coordination |
| Schema change + downstream | Full | Sequencing depends on result |
