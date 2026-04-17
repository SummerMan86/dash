# Codex Integration

Runtime integration between the agent workflow and the Codex CLI / GPT-5.4 family.

Single owner of:

- Canonical repo runtime entrypoint for Codex lanes
- Optional Claude Code slash-surface mapping
- Proof tuples and runtime verification contracts
- Companion CLI guidance
- Codex prompting templates for strategic and autonomous passes

Process semantics (roles, ownership, review, governance): `docs/agents/workflow.md`.
Profile-to-model binding: `docs/agents/execution-profiles.md`.
Autonomous-mode lifecycle: `docs/agents/autonomous-mode.md`.

## 1. Canonical Runtime Path

For this repo, the canonical operational path for Codex lanes is the repo-local wrapper:

`./scripts/codex-companion.sh`

The wrapper resolves the installed `openai-codex` plugin runtime and shells into
`codex-companion.mjs` directly. Use this path for `lead-strategic`,
`strategic-reviewer`, `worker`, and `micro-worker` launches so orchestration does
not depend on Claude Code slash-command / nested-subagent behavior.

| Command | Use |
|---|---|
| `./scripts/codex-companion.sh setup` | preflight; verify Codex runtime availability |
| `./scripts/codex-companion.sh task --write --fresh` | new write-capable `lead-strategic` or worker pass |
| `./scripts/codex-companion.sh task --write --resume` | continue a write-capable strategic/worker thread |
| `./scripts/codex-companion.sh task --fresh` | new read-only strategic, reviewer-adjacent, or diagnosis pass |
| `./scripts/codex-companion.sh task --resume` | continue an existing read-only thread |
| `./scripts/codex-companion.sh review --wait ...` | reviewer lane |
| `./scripts/codex-companion.sh adversarial-review --wait ...` | adversarial reviewer lane |
| `./scripts/codex-companion.sh status [job-id] [--json]` | progress tracking |
| `./scripts/codex-companion.sh result [job-id] [--json]` | final output retrieval |

Role routing:

- `lead-strategic` / `strategic-reviewer`: `task` only; add `--write` only when updating canonical artifacts
- `worker` / `micro-worker`: `task`; default to `--write`; use `--fresh` for a new slice and `--resume` inside the same slice thread
- reviewer lanes: `review` / `adversarial-review` when a diff-scoped review pass is specifically required

Without `--write`, Codex reads and analyzes but does not commit canonical state.

## 2. Optional Claude Code Slash Surface

If `codex-plugin-cc` is enabled in Claude Code, the following slash commands may
exist as an interactive convenience surface:

| Command | Lane | Notes |
|---|---|---|
| `/codex:setup` | preflight | Interactive convenience only |
| `/codex:rescue` | `worker` / `micro-worker` only | Not canonical for orchestrated waves in this repo |
| `/codex:review` | reviewer lanes only | Interactive convenience only |
| `/codex:adversarial-review` | reviewer lanes only | Interactive convenience only |
| `/codex:status` | tracking | Not final proof by itself |
| `/codex:result` | result retrieval | Interactive convenience only |

`lead-strategic` and `strategic-reviewer` are **not** mapped to worker/reviewer slash commands.

Treat the slash surface as optional and locally verifiable only. In this repo it is
not the canonical orchestration path for worker or strategic lanes.

## 3. Thread Continuity

| Flag | Behavior |
|---|---|
| `--resume` | Continue last Codex thread in this repo |
| `--fresh` | Start new thread explicitly |
| no flag | Start a fresh direct companion run; prefer explicit `--fresh` in artifacts |

When to `--resume`:

- iterative review/fix/re-review cycle
- follow-up to an already open plan/report thread
- only when the workspace has no unrelated active Codex job; `--resume` is gated by the workspace active-job registry

When to `--fresh`:

- new task or new plan owner context
- governance-heavy pass when current thread is polluted

If `./scripts/codex-companion.sh task --resume ...` errors with `Task <id> is still running`,
run `./scripts/codex-companion.sh status` first. If the reported PID is already dead, recover
with `./scripts/codex-companion.sh cancel <job-id>`, then retry `--resume`.

## 4. Runtime Verification Contract

Minimum sufficient observable proof of a real canonical Codex run:

1. Role-appropriate launch through `./scripts/codex-companion.sh`
2. Returned Codex thread ID or background job ID recorded against the slice / reviewer role
3. Final foreground output or completed `./scripts/codex-companion.sh result <job-id>` for that same launch

For code-writing worker or strategic slices, the recorded proof must also show that
the launch was write-capable (`--write` or equivalent). A read-only task run proves
Codex execution but does not satisfy a code-writing worker claim.

Rules:

- `./scripts/codex-companion.sh status` is tracking only; not final proof.
- Codex history may corroborate a run only when the same thread/job identity is already known; history alone is not sufficient.
- Record `jobId` and `threadId` as the stable proof handle for each slice/reviewer pass; do not rely on "latest finished" or an unqualified status snapshot.
- A bare Claude-side subagent/helper name or relay acknowledgement is not sufficient proof.
- If the wrapper cannot launch the runtime or return stable thread/job identity, treat that lane as `blocked` or `unverified`.
- Slash-command output may corroborate a locally verified run, but slash launches are not canonical proof in this repo.
- If the surface cannot prove the requested Codex lane, do not claim `opus-orchestrated-codex-workers`; stay on `mixed-claude-workers` or record a per-role/per-slice exception truthfully.
- Do not request `--effort minimal` for Codex worker/reviewer launches. Use the role default effort unless the slice truthfully needs higher.

## 5. Integration Constraints

1. `--resume` saves tokens within one thread but does not replace durable `memory.md`.
2. Codex does not see navigation docs automatically; include needed files in task or prompt.
3. The user remains decision owner for merge, scope changes, and CRITICAL escalations.
4. Long Codex tasks can run in background, but execution ownership stays with `orchestrator`.
5. Runtime-local ambient injections (`CLAUDE.md`, memory reminders, git-status summaries) do not invalidate a profile; they remain non-authoritative unless the packet/request explicitly makes them authoritative.
6. Reviewer-lane tasks (`review`, `adversarial-review`, and read-only `task --fresh` role prompts such as `architecture-reviewer` + `docs-reviewer` on the same diff) are dispatched concurrently by default in the shared checkout; run sequentially only when one reviewer's output must feed the next's prompt. Verified on ST-B integration review (2× `task --fresh --effort xhigh`, ~3m 48s wall time vs ~7m sequential; runtime serializes the first few seconds then runs in parallel). Worker-lane parallelism in the shared checkout remains unproven — use `isolated` mode per `docs/agents/git-protocol.md` §4 if parallel worker dispatch is required. `--effort xhigh` is valid for reviewer-lane `task` launches when integration confidence is the goal; standard `review` / `adversarial-review` lanes use runtime-managed effort and do not accept `--effort`.

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
3. direct-fix только если change соответствует `workflow.md` §2.1 и §3.1; иначе 1 isolated worker
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
