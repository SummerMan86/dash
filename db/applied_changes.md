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

## Post-Baseline Changes

| Дата         | Тип             | Изменение                                                                                                                                                                                                                                                                                                                                   | Источник                                                                |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `2026-04-04` | `schema change` | AUTH-2: добавлены таблицы `emis.users` (id, username, password_hash, role, created_at, updated_at) и `emis.sessions` (id, user_id, role, created_at, expires_at) для production auth. Индексы: `idx_sessions_expires_at`, `idx_sessions_user_id`. FK: `sessions.user_id → users.id ON DELETE CASCADE`. Seed: `db/seeds/004_admin_user.sql`. | `db/current_schema.sql`, `docs/emis_access_model.md` section 5 (AUTH-2) |

## Rule

- Добавлять запись сюда только если меняется DDL или published SQL contract.
- При каждой такой записи одновременно обновлять `db/current_schema.sql`.
- Если меняется рабочая карта объектов/схем, синхронно обновлять `db/schema_catalog.md`.
- Если existing DB требует промежуточный delta до следующего snapshot export, класть executable SQL в `db/pending_changes.sql`.
- `data patch` и `documentation change` сюда не писать.
