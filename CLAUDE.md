# Root Doc Redirect

Главная входная точка по репозиторию теперь находится в [AGENTS.md](./AGENTS.md).

Полный каталог документации и reading order находятся в [docs/AGENTS.md](./docs/AGENTS.md).

Если нужен EMIS-контекст, после этого начинай с [docs/emis_session_bootstrap.md](./docs/emis_session_bootstrap.md).

Если работа идёт через команду агентов (GPT-5.4 lead + Claude workers), читай [docs/agents/workflow.md](./docs/agents/workflow.md).

Если в папке есть и `AGENTS.md`, и `CLAUDE.md`, canonical считать `AGENTS.md`.

Локальные правила по подпапкам по-прежнему лежат в ближайших `AGENTS.md` или `CLAUDE.md`.

## Восстановление после auto-compact

Если в сжатом контексте есть признаки, что ты работаешь как агент в команде (упоминания "lead-tactical", "worker", "план", "подзадача", "ST-N", "Review Gate", или файлы из `docs/agents/`):

1. Определи свою роль из контекста (lead-tactical / worker / reviewer-\*)
2. Прочитай `docs/agents/{role}/memory.md` — твоя персистентная память
3. Прочитай `docs/agents/{role}/instructions.md` — твои вводные
4. Прочитай `docs/agents/lead-strategic/current_plan.md` — текущий план
5. Продолжи работу с того места, где остановился

Если роль неясна из контекста — спроси пользователя: "Какую роль я выполняю?"
