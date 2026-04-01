# Scripts Navigation

`scripts/` - это operational entrypoints проекта: snapshot/export, загрузчики, smoke и dev utilities.

Для Strategy DWH/BI текущего контура здесь важнее всего:

- `db.mjs` (snapshot apply/reference seed/demo/reset/status)
- `db-export-current-schema.sh` (export live DB -> `db/current_schema.sql`)
- `db-verify-current-schema.sh` (verify snapshot against `db/schema_catalog.md`)
- `strategy-agent-queue.mjs` (очередь задач)
- `strategy-agent-intake.mjs` (загрузка intake в staging)
- `strategy-registry-overlay-load.py` (загрузка overlay реестра)

Старый migration-flow намеренно убран из рабочего дерева; historical SQL расследуется через `git history`.
Legacy loader'ы Strategy v1 по-прежнему лежат в `archive/strategy-v1/scripts/`.

## Как читать strategy scripts

1. `db.mjs`
2. `db-export-current-schema.sh`
3. `db-verify-current-schema.sh`
4. `strategy-agent-queue.mjs`
5. `strategy-agent-intake.mjs`
6. `strategy-registry-overlay-load.py`
