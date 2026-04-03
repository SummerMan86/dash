# EMIS Working Contract

Короткий operational contract для всех новых задач по EMIS.
Если возникает спор по placement, ownership или path, по умолчанию следуем этому документу.

## 1. Статус EMIS

- EMIS - отдельный доменный контур внутри текущего `SvelteKit` приложения.
- Это не отдельный deployable и не отдельный repo на текущем этапе.
- Базовый стиль: `modular monolith` с monorepo-ready границами.

## 2. Два канонических path

### Operational path

Использовать для CRUD, search, map, detail, ship-routes, dictionaries, audit:

`routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`

### BI path

Использовать для dashboard, KPI, charts, tabular read-models, стабильных marts/views:

`fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

## 3. Главный decision rule

- если задача про operational behavior EMIS, не идем в dataset layer;
- если задача про BI/read-model, не идем напрямую в operational SQL из route;
- если есть сомнение, default choice: сначала operational slice, потом отдельный published read-model.

## 4. Ownership

- `src/lib/entities/emis-*` - EMIS entity contracts, DTO, Zod schemas
- `src/lib/features/emis-*` - bounded EMIS forms and interactions
- `src/lib/widgets/emis-*` - reusable EMIS widgets
- `src/lib/server/emis/infra/*` - server infra/helpers
- `src/lib/server/emis/modules/*` - domain backend logic
- `src/routes/api/emis/*` - thin HTTP transport
- `src/routes/emis/*` - workspace/UI orchestration
- `src/routes/dashboard/emis/*` - BI/read-side routes

## 5. Non-negotiables

- не писать SQL в `src/routes/api/emis/*`
- не писать HTTP-логику в `src/lib/server/emis/modules/*`
- не писать client/UI code в `src/lib/server/emis/*`
- не тянуть EMIS operational logic в dataset compiler без явной BI причины
- не использовать `/dashboard/emis/*` как backdoor для operational fetch logic
- не складывать reusable EMIS contracts в route files

## 6. DB Truth

- active DB truth читается по `db/current_schema.sql`
- краткая карта - `db/schema_catalog.md`
- structural delta лог - `db/applied_changes.md`
- промежуточный patch для live DB - `db/pending_changes.sql`

## 7. Required invariants

- canonical identity должна быть выражена в DB constraints / partial unique indexes
- soft delete semantics должны быть едиными для API, views и restore flows
- audit trail и actor attribution входят в обязательный контракт
- FK behavior и vocabulary boundaries должны быть задокументированы явно

## 8. Review triggers

Нужен явный architectural review, если change затрагивает хотя бы одно:

- новый API endpoint
- новый EMIS module slice
- DB schema / published view
- новый shared contract
- рост `/emis` workspace или `EmisMap`
- любой cross-layer change

## 9. Default implementation stance

- prefer bounded placement over clever abstraction
- prefer extraction over growth в уже больших route/widget файлах
- prefer Postgres-first implementation over premature genericity
- prefer documented read-model over ad-hoc reuse of operational query

## 10. Migration Discipline

Для structural migration (monorepo-style split) действуют отдельные правила:

→ [`emis_monorepo_target_layout.md`](./emis_monorepo_target_layout.md) — canonical target layout и полная migration policy

Ключевые ограничения для рабочих задач:

- structural move не должен менять domain/API logic в том же PR
- если boundary перемещается, docs и runtime contracts обновляются в том же slice
- compatibility re-exports допускаются временно и помечаются `// MIGRATION: remove after ...`
- baseline blocker (`Select.svelte` parse error) должен быть resolved до или в ST-4, не маскируется structural migration

Import direction rules и alias policy зафиксированы в target layout doc и обязательны с момента начала physical moves.

## 11. Definition Of Done For Big EMIS Tasks

- change лежит в правильном слое
- runtime/docs contracts обновлены, если поведение изменилось
- DB docs обновлены, если менялась схема
- smoke/targeted verification указаны явно
- после завершенного смыслового этапа делается локальный git checkpoint

## 12. Reading Order

1. `emis_session_bootstrap.md`
2. `emis_architecture_baseline.md`
3. `emis_monorepo_target_layout.md`
4. этот документ
5. `emis_implementation_spec_v1.md`
6. `emis_freeze_note.md`
7. `../src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
