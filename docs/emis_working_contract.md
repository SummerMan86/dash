# EMIS Working Contract

Короткий governance-layer для активной EMIS-разработки.
Этот документ не владеет current-state ownership map и не повторяет target layout.

Если нужен start-here / current focus, читать:

- `emis_session_bootstrap.md`

Если нужен current placement truth, читать:

- `architecture.md`

Если нужен structural migration policy, читать:

- `emis_monorepo_target_layout.md`

## 1. What This Document Decides

Этот документ отвечает только за:

- decision path между operational, BI и structural задачами;
- рабочие non-negotiables;
- review triggers;
- delivery discipline и Definition of Done для крупных EMIS slices.

## 2. Default Decision Path

### Operational change

Использовать для CRUD, search, map, detail, ship-routes, dictionaries, audit:

`routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`

### BI / read-model change

Использовать для dashboard, KPI, charts, tables и published marts/views:

`fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

### Structural migration change

Использовать только когда задача реально про extraction, import boundaries или alias removal:

`current zone -> target package -> compatibility shim -> shim removal`

Главное правило выбора:

- если задача про operational behavior EMIS, не идти в dataset layer;
- если задача про BI/read-model, не идти напрямую в operational SQL из route;
- если есть сомнение, default choice: сначала operational slice, потом отдельный published read-model;
- если change одновременно двигает файлы и меняет domain behavior, сначала разрезать на отдельные slices.

## 3. Working Non-Negotiables

- не писать SQL в `apps/web/src/routes/api/emis/*`;
- не писать HTTP-логику в `packages/emis-server/src/modules/*/service.ts`;
- не писать client/UI code в `packages/emis-server/*`;
- не тянуть EMIS operational logic в dataset compiler без явной BI причины;
- не использовать `/dashboard/emis/*` как backdoor для operational fetch logic;
- не складывать reusable EMIS contracts в route files;
- compatibility shims не считать ownership truth;
- structural move не смешивать с domain/API rewrite в том же slice.

## 4. Required Invariants

- canonical identity должна быть выражена в DB constraints / partial unique indexes;
- soft delete semantics должны быть едиными для API, views и restore flows;
- audit trail, actor attribution и provenance входят в обязательный контракт;
- FK behavior и vocabulary boundaries должны быть задокументированы явно.

## 5. Review Triggers

Нужен явный architectural review, если change затрагивает хотя бы одно:

- новый API endpoint;
- новый EMIS module slice;
- DB schema или published view;
- новый shared contract;
- рост `/emis` workspace или `EmisMap`;
- любой cross-layer change;
- любой structural move с compatibility shim или alias impact.

## 6. Default Delivery Stance

- prefer bounded placement over clever abstraction;
- prefer extraction over growth в уже больших route/widget файлах;
- prefer Postgres-first implementation over premature genericity;
- prefer documented read-model over ad-hoc reuse of operational query;
- prefer one meaningful slice per commit checkpoint.

## 7. Definition Of Done For Big EMIS Tasks

- change лежит в правильном execution path;
- runtime/docs contracts обновлены, если поведение изменилось;
- DB docs обновлены, если менялась схема;
- verification path указан явно;
- после завершенного смыслового этапа делается локальный git checkpoint.

## 8. Related Docs

- `architecture.md` — repo-wide boundaries и current EMIS placement;
- `emis_session_bootstrap.md` — start-here, current focus и reading order;
- `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — runtime/API conventions;
- `emis_mve_product_contract.md` — product scope и acceptance;
- `emis_monorepo_target_layout.md` — future structural migration policy;
- `archive/emis/emis_implementation_reference_v1.md` — historical rollout context и retained rationale;
- `emis_freeze_note.md` — frozen decisions, которые не нужно переоткрывать без причины.
