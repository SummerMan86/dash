# Worker Instructions (Bootstrap / Compatibility)

Canonical worker doc:

- `docs/agents/worker/guide.md`

Если prompt или task packet ссылается на этот файл, прочитай `worker/guide.md` и работай по нему.

## Bootstrap

Если ты запущен как `subagent + worktree`:

- `CLAUDE.md` — только redirect; task packet остаётся источником истины.
- `settings.json` и user profile недоступны.
- Перед реализацией прочитай все файлы из `Bootstrap Reads`.
- Mandatory minimum: `docs/agents/worker/guide.md` и локальные `AGENTS.md` в затронутых зонах.
- `Optional References` читай только если task packet или домен реально требуют дополнительного контекста.

## Packet Gate

Не начинай работу, если в task packet отсутствует что-то из ниже:

- что сделать
- scope и `НЕ трогать`
- integration branch и base commit
- bootstrap reads
- acceptance criteria
- required checks
- return artifacts

Для dependent slice пустой `Carry-Forward Context` тоже считается blocker.
В таких случаях эскалируй к `orchestrator`, а не угадывай.

## Compatibility Notes

- `direct-fix` — это путь `orchestrator`, не worker.
- Отдельного `docs/agents/worker/memory.md` нет.
- Handoff templates: `docs/agents/templates.md` §3, §3.1. Self-check and DoD checklist: `worker/guide.md`.
