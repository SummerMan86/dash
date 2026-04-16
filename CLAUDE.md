# Root Doc Redirect

> **Subagent guard (worker, reviewer):**
> Если ты запущен как subagent (worker или reviewer) — **СТОП**.
> Не читай корневой `AGENTS.md`. Не следуй ссылкам ниже.
> Твой единственный источник задачи — prompt, который тебе передали при spawn.
> Worker: начинай с секции `Bootstrap Reads` из task packet.
> Reviewer: начинай с review request (changed files, diff, focus) из prompt.
> Если stale worktree-local redirect конфликтует с task packet или role guide, task packet / role guide имеют приоритет.

Главная входная точка по репозиторию теперь находится в [AGENTS.md](./AGENTS.md).

Полный каталог документации и reading order находятся в [docs/AGENTS.md](./docs/AGENTS.md).

Если нужен EMIS-контекст, после этого начинай с [docs/emis_session_bootstrap.md](./docs/emis_session_bootstrap.md).

Если работа идёт через команду агентов (GPT-5.4 lead + Claude workers), читай [docs/agents/workflow.md](./docs/agents/workflow.md). Operator runbook: [docs/QUICKSTART.md](./docs/QUICKSTART.md). Codex integration: [docs/codex-integration.md](./docs/codex-integration.md).

Если в папке есть и `AGENTS.md`, и `CLAUDE.md`, canonical считать `AGENTS.md`.

Локальные правила по подпапкам по-прежнему лежат в ближайших `AGENTS.md` или `CLAUDE.md`.

## Восстановление после auto-compact (только orchestrator)

> Этот раздел — только для `orchestrator` (legacy: `lead-tactical`).
> Worker'ы и reviewer'ы: игнорируйте, следуйте task packet.

Если в сжатом контексте есть признаки, что ты работаешь как orchestrator (упоминания "lead-tactical", "orchestrator", "план", "подзадача", "ST-N", "Review Gate", или файлы из `docs/agents/`):

1. Прочитай `docs/agents/orchestrator/memory.md`
2. Прочитай `docs/agents/lead-strategic/memory.md`
3. Прочитай `docs/agents/orchestrator/instructions.md` — твои вводные
4. Прочитай `docs/agents/lead-strategic/current_plan.md` — текущий план
5. Продолжи работу с того места, где остановился

Если роль неясна из контекста — спроси пользователя: "Какую роль я выполняю?"
