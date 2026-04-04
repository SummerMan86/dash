# EMIS Published Read-Models & Datasets Contract

Этот документ фиксирует, как в EMIS появляются и эволюционируют published read-models (views/marts) и как они подключаются в dataset layer и BI routes.
Цель: не смешивать operational EMIS и BI/read-side, и чтобы добавление нового BI slice было механическим и проверяемым процессом.

## 1. Термины и границы

- **Operational EMIS**: CRUD/search/map/runtime queries. Canonical path:
  `routes/api/emis/* -> @dashboard-builder/emis-server/modules/* -> PostgreSQL/PostGIS`
- **BI/read-side EMIS**: dashboards/KPI/charts. Canonical path:
  `fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`
- **Published read-model**: SQL контракт (обычно view) в schema `mart` или `mart_emis`, который потребляет приложение.
- **DB truth**: snapshot-first source of truth в `db/current_schema.sql` + `db/schema_catalog.md` + `db/applied_changes.md`.

## 2. Текущие EMIS datasets и их SQL-контракты

App-facing dataset ids (namespace `emis.*`) и mapping:

- `emis.news_flat` -> `mart.emis_news_flat`
- `emis.object_news_facts` -> `mart.emis_object_news_facts`
- `emis.objects_dim` -> `mart.emis_objects_dim`
- `emis.ship_route_vessels` -> `mart.emis_ship_route_vessels`

Где это описано:

- Dataset runtime entrypoint: `packages/platform-datasets/AGENTS.md`
- Dataset compiler: `packages/platform-datasets/src/server/definitions/emisMart.ts`
- Provider relation mapping + column typing: `packages/platform-datasets/src/server/providers/postgresProvider.ts`
- DB published views: `db/current_schema.sql` и кратко `db/schema_catalog.md`

## 3. Как добавлять новый BI/read-side slice

Если нужна новая BI страница или новый dataset:

1. Сперва создаем/фиксируем **published SQL contract** (view/table) в правильной schema (`mart` или `mart_emis`).
2. Обновляем snapshot-first DB docs:
   - `db/current_schema.sql`
   - `db/applied_changes.md`
   - при необходимости `db/schema_catalog.md`
3. Добавляем новый dataset id и IR definition в dataset compiler:
   - `packages/platform-datasets/src/server/definitions/*`
4. Обновляем provider mapping (relation + columns) в:
   - `packages/platform-datasets/src/server/providers/postgresProvider.ts`
5. Добавляем/обновляем BI route в:
   - `apps/web/src/routes/dashboard/emis/*`
6. Обновляем docs discoverability (bootstrap/doc map), если появился новый активный slice.

Важно: BI route не должен становиться "data-service layer" с прямыми operational fetches.

## 4. Breaking change policy для published read-models

Published views в `mart*` считаются контрактом.

Разрешено без отдельного migration plan:

- additive изменения (новые колонки) при сохранении старых

Требует явного migration plan и согласования:

- rename/remove колонок
- смена semantics/grain (например "one row = one entity" перестало быть правдой)
- изменения, которые ломают сортировки/фильтры dataset contract

## 5. Review и проверки

Если change затрагивает published read-models или datasets, это всегда architectural review trigger:

- DB change -> обновить snapshot docs в том же change set
- dataset change -> smoke/targeted verification обязателен

Минимальные проверки:

- `pnpm emis:smoke` (read-side)
- при write-side changes: `pnpm emis:write-smoke`

## 6. Связанные документы

- Boundary map (operational vs BI): `docs/emis_architecture_baseline.md`
- Runtime conventions (error/meta): `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- BI route layer rules: `apps/web/src/routes/dashboard/emis/AGENTS.md`
