# App DB Applied Schema Changes

Этот файл хранит только короткий журнал структурных изменений после baseline.
Он не заменяет snapshot и не должен разрастаться до длинной migration-ленты.

## Baseline

| Дата         | Тип                 | Изменение                                                                                                                                                                                                                                                                                          | Источник                                                                                                                        |
| ------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `2026-03-23` | `baseline`          | Зафиксирован snapshot-first baseline активного app DB-контура в схемах `emis`, `stg_emis`, `mart_emis`, `mart`; новым техническим source of truth становится `db/current_schema.sql`.                                                                                                              | Live DB `dashboard`, `scripts/db-export-current-schema.sh`                                                                      |
| `2026-03-23` | `scope cleanup`     | Из snapshot intentionally excluded legacy bookkeeping `emis.schema_migrations`, archive schemas и backup-only объекты, не входящие в текущий published runtime contract.                                                                                                                           | `db/schema_catalog.md`, `scripts/db-verify-current-schema.sh`                                                                   |
| `2026-03-23` | `context cleanup`   | Историческая migration-лента удалена из рабочего дерева репозитория; historical SQL расследуется через `git history`, а не через папку `db/migrations/`.                                                                                                                                           | repo cleanup                                                                                                                    |
| `2026-03-23` | `live delta`        | Для strategy dashboards опубликован app-facing wrapper layer `mart_strategy.slobi_*` в live DB через `db/pending_changes.sql`; локальный app runtime читает эти views как Postgres-backed datasets, при том что полный Strategy/BSC DWH source of truth по-прежнему живет во внешнем `agent_pack`. | `db/pending_changes.sql`, `src/lib/server/providers/postgresProvider.ts`, `src/lib/server/datasets/definitions/strategyMart.ts` |
| `2026-03-23` | `view optimization` | `mart_strategy.slobi_entity_overview` переведен на легкий entity-grain wrapper поверх `strategy_entity_binding_bridge`, `bsc_gap_fact` и `bsc_performance_pivot`, чтобы убрать тяжелую client-side переагрегацию и ускорить `/dashboard/strategy/overview`.                                        | `db/pending_changes.sql`, `src/routes/dashboard/strategy/overview/+page.svelte`                                                 |

## Rule

- Добавлять запись сюда только если меняется DDL или published SQL contract.
- При каждой такой записи одновременно обновлять `db/current_schema.sql`.
- Если меняется рабочая карта объектов/схем, синхронно обновлять `db/schema_catalog.md`.
- Если existing DB требует промежуточный delta до следующего snapshot export, класть executable SQL в `db/pending_changes.sql`.
- `data patch` и `documentation change` сюда не писать.
