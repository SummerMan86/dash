# Quickstart — Agent Workflow

> **Audience:** human operator.
> Агенты (orchestrator, lead-strategic, workers, reviewers) — не грузи этот файл в контекст.
> Process truth для агентов: [`docs/agents/workflow.md`](./agents/workflow.md).

Operator runbook. Process truth: `docs/agents/workflow.md`. Runtime integration: `./docs/agents/codex-integration.md`.

## How It Works

```text
┌─────────────────────────────────────────────────────────┐
│  lead-strategic (profile-selected Codex lane)           │
│  Plans, decomposes, accepts results. Owns the plan.     │
├─────────────────────────────────────────────────────────┤
│  orchestrator (profile-selected orchestration lane)     │
│  Dispatches workers, runs review, collects report.      │
├─────────────────────────────────────────────────────────┤
│  Workers / Reviewers (profile-selected runtime)         │
│  Implement slices and review diffs per zone.            │
└─────────────────────────────────────────────────────────┘
```

You participate at three points: **plan** (approve), **escalations** (decide), **merge** (confirm). Everything else is autonomous.

## 30-Second Start

```bash
# Full cycle (plan via Codex, workers, review gate):
./scripts/emis-task.sh "добавить фильтр по дате в /emis/map"

# With explicit scope:
./scripts/emis-task.sh "bcrypt migration" --scope "packages/emis-server/src/modules/users/"

# Low-risk hint (does NOT skip strategic ownership):
./scripts/emis-task.sh "fix typo in login page" --low-risk
```

## Primary Path (Manual)

Write directly to `orchestrator`:

```text
Новая задача: <что сделать>
Контекст: <зачем>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
Работай по docs/agents/workflow.md как orchestration-only orchestrator.
```

For a simple local fix:

```text
Исправь <проблема>. Файл/зона: <путь>.
Сначала классифицируй задачу по docs/agents/workflow.md.
```

## Prerequisites

1. Agent Teams enabled:

   ```json
   // ~/.claude.json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

2. Codex plugin configured (check with preflight).

3. Codex runtime smoke test:

   ```bash
   ./scripts/codex-companion.sh setup
   ./scripts/codex-companion.sh task --fresh "Reply with exactly OK."
   ```

For this repo, orchestrated Codex lanes use `./scripts/codex-companion.sh` as the
canonical runtime path. Treat `/codex:rescue` as an optional interactive surface,
not as the primary worker or strategic launch path.

## Common Scenarios

> Recovery после auto-compact и continue-work протокол — в `CLAUDE.md` (§Восстановление после auto-compact).

### Escalation from Claude

Choose a variant and respond:

```text
Решение по эскалации: <вариант N>. Продолжай.
```

### Manual Review Gate

```text
Запусти Review Gate по текущим изменениям
```

Or targeted:

```text
Проверь только безопасность
Только architecture review
Запусти code review
```

### Recovery

Don't fix process issues verbally. Ask `orchestrator` to follow `docs/agents/recovery.md`:

```text
Сработай по Recovery Protocol для rejected slice с applied DB change.
```

```text
Сработай по Recovery Protocol: Codex/GPT недоступен посреди iterative цикла.
```

## Before Merge

- [ ] All plan subtasks completed
- [ ] Minimum independent review floor satisfied for code changes
- [ ] Review Gate passed or truthfully skipped
- [ ] WARNING findings fixed or justified
- [ ] Strategic acceptance obtained
- [ ] Branch up to date with `main`
- [ ] Commits clean and meaningful

## Key Concepts

| Term | Meaning |
|---|---|
| **Slice** | One plan subtask with clear scope and acceptance |
| **Review Gate** | Automatic review passes (security, architecture, code, docs, UI) |
| **Direct-fix** | Inline fast path for `<= 10` line mechanical fix, no architectural surface |
| **Handoff** | Formal result delivery from worker to orchestrator |
| **Escalation** | Agent asks you for a decision |
| **Operating mode** | `high-risk iterative`, `ordinary iterative`, or `batch/low-risk` |
