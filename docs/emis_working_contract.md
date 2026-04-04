# EMIS Working Contract

Короткий рабочий contract для всех новых задач по EMIS.
Если возникает спор по placement, ownership или path, по умолчанию следуем этому документу.

## 1. Current Framing

- EMIS - отдельный доменный контур внутри текущего `SvelteKit` приложения
- topology остается такой:
  - один deployable app
  - `modular monolith`
  - три контура: `platform/shared`, `EMIS operational`, `EMIS BI/read-side`
- reusable EMIS contracts/server/ui живут в packages
- app держит routes и app-local composition

## 2. Current Ownership

Package-owned reusable code:

- `packages/emis-contracts/` — EMIS entity contracts, DTO, Zod schemas
- `packages/emis-server/` — server infra и domain backend modules
- `packages/emis-ui/` — reusable map/status UI

App-level code (stays in `apps/web/`):

- `apps/web/src/lib/server/emis/infra/http.ts` — app-owned SvelteKit transport glue
- `apps/web/src/lib/features/emis-manual-entry/` — bounded EMIS forms (depends on `$app/forms`)
- `apps/web/src/lib/widgets/emis-drawer/` — drawer widget (depends on `$widgets/filters`)
- `apps/web/src/routes/api/emis/*` — thin HTTP transport
- `apps/web/src/routes/emis/*` — workspace/UI orchestration
- `apps/web/src/routes/dashboard/emis/*` — BI/read-side routes

Compatibility shims (marked `// MIGRATION`) remain temporary and are not ownership truth:

- `apps/web/src/lib/entities/emis-*` → re-exports from `packages/emis-contracts`
- `apps/web/src/lib/server/emis/*` → re-exports from `packages/emis-server`
- `apps/web/src/lib/widgets/emis-map/*` and `apps/web/src/lib/widgets/emis-status-bar/*` → re-exports from `packages/emis-ui`

## 3. Два канонических path

### Operational path

Использовать для CRUD, search, map, detail, ship-routes, dictionaries, audit:

`routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`

### BI path

Использовать для dashboard, KPI, charts, tabular read-models, стабильных marts/views:

`fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

## 4. Главный decision rule

- если задача про operational behavior EMIS, не идем в dataset layer
- если задача про BI/read-model, не идем напрямую в operational SQL из route
- если есть сомнение, default choice: сначала operational slice, потом отдельный published read-model

## 5. Non-Negotiables

- не писать SQL в `apps/web/src/routes/api/emis/*`
- не писать HTTP-логику в `packages/emis-server/src/modules/*/service.ts`
- не писать client/UI code в `packages/emis-server/*`
- не тянуть EMIS operational logic в dataset compiler без явной BI причины
- не использовать `/dashboard/emis/*` как backdoor для operational fetch logic
- не складывать reusable EMIS contracts в route files

## 6. DB Truth

- active DB truth читается по `db/current_schema.sql`
- краткая карта - `db/schema_catalog.md`
- structural delta лог - `db/applied_changes.md`
- промежуточный patch для live DB - `db/pending_changes.sql`

## 7. Required Invariants

- canonical identity должна быть выражена в DB constraints / partial unique indexes
- soft delete semantics должны быть едиными для API, views и restore flows
- audit trail и actor attribution входят в обязательный контракт
- FK behavior и vocabulary boundaries должны быть задокументированы явно

## 8. Review Triggers

Нужен явный architectural review, если change затрагивает хотя бы одно:

- новый API endpoint
- новый EMIS module slice
- DB schema / published view
- новый shared contract
- рост `/emis` workspace или `EmisMap`
- любой cross-layer change

## 9. Default Implementation Stance

- prefer bounded placement over clever abstraction
- prefer extraction over growth в уже больших route/widget файлах
- prefer Postgres-first implementation over premature genericity
- prefer documented read-model over ad-hoc reuse of operational query

## 10. Structural Migration Is Separate

Для future structural migration действуют отдельные правила:

→ [`emis_monorepo_target_layout.md`](./emis_monorepo_target_layout.md)

Ключевое:

- target layout не заменяет current ownership
- structural move не должен менять domain/API logic в том же slice
- если boundary перемещается, docs и runtime contracts обновляются в том же slice
- compatibility re-exports допускаются временно и явно маркируются

## 11. Definition Of Done For Big EMIS Tasks

- change лежит в правильном слое
- runtime/docs contracts обновлены, если поведение изменилось
- DB docs обновлены, если менялась схема
- smoke/targeted verification указаны явно
- после завершенного смыслового этапа делается локальный git checkpoint

## 12. Reading Order

1. `emis_session_bootstrap.md`
2. `emis_architecture_baseline.md`
3. этот документ
4. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
5. `emis_mve_tz_v_2.md` — если нужен product scope
6. `emis_monorepo_target_layout.md` — если задача про structural migration
7. `emis_implementation_spec_v1.md` — если нужен rollout/history context
8. `emis_freeze_note.md` — если нужно проверить frozen decisions
