# Codex Integration

Runtime integration between the agent workflow and the Codex CLI / GPT-5.4 family.

Single owner of:

- Plugin command mapping in Claude Code
- Proof tuples and runtime verification contracts
- Companion CLI guidance
- Codex prompting templates for strategic and autonomous passes

Process semantics (roles, ownership, review, governance): `docs/agents/workflow.md`.
Profile-to-model binding: `docs/agents/execution-profiles.md`.
Autonomous-mode lifecycle: `docs/agents/autonomous-mode.md`.

## 1. Plugin Command Mapping (Claude Code)

Primary operational surface: `codex-plugin-cc`.

| Command | Lane | Notes |
|---|---|---|
| `/codex:setup` | preflight | Verify Codex CLI readiness |
| `/codex:rescue` | `worker` / `micro-worker` only | For code-writing slices: `--fresh --write` |
| `/codex:review` | reviewer lanes only | |
| `/codex:adversarial-review` | reviewer lanes only | |
| `/codex:status` | tracking | Not final proof by itself |
| `/codex:result` | result retrieval | |

`lead-strategic` and `strategic-reviewer` are **not** mapped to worker/reviewer slash commands. If the active surface has no dedicated strategic lane, record a truthful per-role exception, documented alternative runtime path, or blocker.

On the current Claude Code surface, strategic passes use companion CLI `task` (§2); plugin-first slash mapping remains worker/reviewer-only.

## 2. Companion CLI

### Strategic passes

On the current Claude Code surface, strategic Codex passes (`lead-strategic`, `strategic-reviewer`) use companion `task` as the documented runtime path.

| Command | Use |
|---|---|
| `task --write --fresh` | Strategic pass that writes `current_plan.md`, `memory.md`, or governance artifact; new context |
| `task --write --resume` | Follow-up in the same strategic thread |
| `task --fresh` | New strategic pass, read-only |
| `task --resume` | Continue existing strategic thread, read-only |

Without `--write`, Codex reads and analyzes but does not commit canonical state.

### Worker/reviewer proof retrieval

| Command | Use |
|---|---|
| `status --json` | Machine-readable progress tracking |
| `result` | Retrieve final output from a Codex run |

On the current Claude Code surface, reliable proof retrieval is via companion CLI, not the skill surface.

## 3. Thread Continuity

| Flag | Behavior |
|---|---|
| `--resume` | Continue last Codex thread in this repo |
| `--fresh` | Start new thread |
| no flag | Tooling asks whether to continue or start new |

When to `--resume`:

- iterative review/fix/re-review cycle
- follow-up to an already open plan/report thread

When to `--fresh`:

- new task or new plan owner context
- governance-heavy pass when current thread is polluted

## 4. Runtime Verification Contract

Minimum sufficient observable proof of a real plugin-mapped Codex run:

1. Role-appropriate slash launch (`/codex:rescue` for workers, `/codex:review` or `/codex:adversarial-review` for reviewers)
2. Completed `/codex:result` for that same launch
3. Returned Codex session ID or another stable Codex run ID recorded against the slice/reviewer role

For code-writing worker slices, the recorded proof must also show that the launch was write-capable (`write: true` or equivalent). A read-only rescue run proves Codex execution but does not satisfy a code-writing worker claim.

Rules:

- `/codex:status` is tracking only; not final proof.
- Codex history may corroborate a run only when the same session/run ID is already known; history alone is not sufficient.
- A bare session ID, codex-labeled subagent/helper name, or Claude-side relay acknowledgement is not sufficient proof.
- If the surface cannot expose `/codex:result` + stable run ID, treat that lane as `unverified`.
- For wrapper/debug runs outside plugin surface, `scripts/codex-exec-prompt.sh --json-file ...` is the fallback proof artifact.
- If the surface cannot prove the requested Codex lane, do not claim `opus-orchestrated-codex-workers`; stay on `mixed-claude-workers` or record a per-role/per-slice exception truthfully.
- If `/codex:rescue --fresh --write` resolves to `write: false` or ignores the flags, use companion `task --write --fresh` as explicit per-slice exception in report/telemetry.
- Do not request `--effort minimal` for Codex worker/reviewer launches. Use the role default effort unless the slice truthfully needs higher.

## 5. Integration Constraints

1. `--resume` saves tokens within one thread but does not replace durable `memory.md`.
2. Codex does not see navigation docs automatically; include needed files in task or prompt.
3. The user remains decision owner for merge, scope changes, and CRITICAL escalations.
4. Long Codex tasks can run in background, but execution ownership stays with `orchestrator`.
5. Runtime-local ambient injections (`CLAUDE.md`, memory reminders, git-status summaries) do not invalidate a profile; they remain non-authoritative unless the packet/request explicitly makes them authoritative.

## 6. Autonomous-Mode Codex Prompting

Templates for autonomous execution. Lifecycle rules: `docs/agents/autonomous-mode.md`.

### Initial plan prompt

```text
## Autonomous Strategic Planning

Role: lead-strategic (autonomous decision-maker)
Mode: autonomous — утверждаешь план сам, не ждёшь user approval.

### Задача
<описание от пользователя>

### Scope
<scope ограничения>

### Guardrails
<guardrails>

### Контекст
Прочитай:
- docs/agents/lead-strategic/memory.md
- Relevant domain bootstrap doc if applicable
- Если нужен кодовый контекст, запроси transparency artifacts

### Инструкции
1. Создай plan в docs/agents/lead-strategic/current_plan.md
2. Выбери operating mode
3. План считается APPROVED сразу
4. Укажи: "Autonomous mode — plan self-approved by lead-strategic"
5. Обнови memory.md
```

### Slice acceptance prompt

```text
## Autonomous Slice Acceptance

Slice: <N> — <название>
Result: <summary из handoff>
Review verdict: <reviewer verdicts>
Decision-log entries since last acceptance: <entries>
Remaining timeout: <minutes>
Guardrail status: <clean / warnings>

### Инструкции
1. ACCEPT / ACCEPT WITH ADJUSTMENTS / REJECT
2. Reframe next slice если нужно
3. Обнови current_plan.md если reframe
4. Логируй significant decisions
5. Если REJECT — объясни что исправить
6. Не жди user input
```

### Transparency request example

```text
ACCEPT WITH ADJUSTMENTS for SLICE-3.

Adjustments:
1. EXPLAIN_DECISION: worker выбрал inline SQL вместо repository pattern —
   задокументируй rationale в decision-log.
2. SHOW_IMPACT: slice добавил новый тип — покажи,
   какие существующие queries это затрагивает.
3. DOCUMENT_RISK: soft-delete — опиши edge cases
   при re-import того же объекта.

После выполнения adjustments — continue to SLICE-4.
```

### Headless entry (lightweight)

```bash
claude -p "$(cat <<'EOF'
## Autonomous Task (Lightweight)

Ты — orchestrator в lightweight autonomous mode.
Прочитай docs/agents/autonomous-mode.md, секцию 1.

Задача: <описание>
Reference: <файл-образец>
Scope: <файлы/модули>
Timeout: 30 минут

1. Прочитай reference implementation
2. Создай mini-plan в docs/agents/orchestrator/decision-log.md
3. direct-fix только если change соответствует; иначе 1 isolated worker
4. Review Gate (code-reviewer + security-reviewer минимум)
5. Коммит + decision-log
EOF
)" --allowedTools "Edit,Write,Bash,Glob,Grep,Read,Agent" \
   --max-turns 100
```

### Headless entry (full)

```bash
claude -p "$(cat <<'EOF'
## Autonomous Task (Full)

Ты — orchestrator в full autonomous mode.
Прочитай docs/agents/autonomous-mode.md.

Задача: <описание>
Scope: <файлы/модули>
Timeout: 60 минут

Все решения пиши в docs/agents/orchestrator/decision-log.md.
По завершении — коммит + docs/agents/orchestrator/last_report.md.
EOF
)" --allowedTools "Edit,Write,Bash,Glob,Grep,Read,Agent" \
   --max-turns 200
```

## 7. Operationally Critical Duplication

The runtime verification contract (§4) may be operationally duplicated only in docs that choose the profile, launch the lane, or record acceptance evidence:

- `docs/agents/orchestrator/instructions.md`
- `docs/agents/templates.md`

Elsewhere, refer back to this document.
