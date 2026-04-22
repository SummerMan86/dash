# EMIS Change Policy

Короткий governance-layer для активной работы по EMIS.  
Документ отвечает на вопросы:

- как выбирать правильный execution path;
- когда обязателен architectural review;
- какие изменения считаются fast path;
- какой минимум должен быть сделан до закрытия slice.

## 1. Как выбирать path

### Operational change

Использовать для CRUD, search, map, detail, ship-routes, dictionaries, audit:

```text
routes/api/emis/*
  -> packages/emis-server/src/modules/*
  -> queries/service/repository
  -> PostgreSQL/PostGIS
```

### BI / read-side change

Использовать для dashboards, KPI, charts, published marts/views:

```text
fetchDataset(...)
  -> /api/datasets/:id
  -> compileDataset(...)
  -> DatasetIr
  -> Provider
  -> DatasetResponse
```

### Structural change

Использовать только для extraction, import boundaries, alias cleanup, package moves.  
Структурный slice не должен одновременно переписывать domain behavior.

### Правило по умолчанию

- Если задача про operational behavior EMIS — не идти в dataset layer.
- Если задача про BI/read-side — не тянуть operational SQL в route.
- Если задача двигает и файлы, и поведение — сначала разделить на два change set.

## 2. Non-negotiables

- не писать SQL в `apps/web/src/routes/api/emis/*`;
- не писать HTTP-логику в `packages/emis-server/*`;
- не писать client/UI code в `packages/emis-server/*`;
- не использовать `/dashboard/emis/*` как backdoor для operational fetch logic;
- не складывать reusable contracts в route files;
- не считать compatibility shims canonical home;
- не смешивать structural move и domain/API rewrite в одном slice.

## 3. Required invariants

- canonical identity выражается не только в prose, но и в DB constraints / partial unique indexes;
- soft delete semantics едины для API, views и restore/recreate flows;
- audit trail, actor attribution и provenance входят в обязательный контракт;
- FK behavior и vocabulary boundaries должны быть задокументированы явно;
- любые изменения DB contracts обновляют snapshot-first DB docs.

## 4. Когда review обязателен

Architectural review обязателен, если change затрагивает хотя бы один пункт:

- новый API endpoint или новый route;
- новый EMIS module slice;
- DB schema или published view;
- новый shared contract, schema или dataset contract;
- рост больших orchestration файлов вроде `/emis/+page` или `EmisMap`;
- любой cross-layer change;
- любое новое исключение/waiver;
- любое structural move с compatibility shim или alias impact.

## 5. Fast path

Упрощённый review допустим, если change:

- локален внутри уже существующего bounded модуля;
- не меняет контракт слоя;
- не создаёт новый shared abstraction;
- не увеличивает ownership slice.

Типичные fast-path случаи:

- локальный UI polish;
- copy/text/style правки;
- маленький bugfix внутри существующего модуля.

## 6. Exception policy

Каждое живое исключение должно иметь:

- `id`;
- `owner`;
- `why allowed`;
- `expiry` или `target wave`;
- `removal condition`.

Без этих полей исключение не считается согласованным.

### Current status

По предоставленному набору документов active baseline был закрыт без живых архитектурных исключений.  
Поэтому отдельный top-level “known exceptions” файл не нужен, пока исключений снова не появится.

## 7. Delivery definition of done

Для meaningful EMIS slice минимум такой:

- change лежит в правильном execution path;
- обновлены runtime/docs contracts, если изменилось поведение;
- обновлены DB docs, если менялась схема;
- указан verification path;
- перечислены реально прогнанные проверки;
- зафиксировано, почему placement выбран именно такой.

## 8. Minimum checks

### Базовый набор

```bash
pnpm check
pnpm build
pnpm lint:boundaries
pnpm emis:smoke
```

### Дополнительно по типу изменений

- write-side: `pnpm emis:write-smoke`
- auth/session/rbac: `pnpm emis:auth-smoke`
- offline maps/runtime assets: `pnpm emis:offline-smoke`

## 9. Suggested review handoff format

```md
What changed:
- ...

Why this placement:
- ...

Contracts/docs touched:
- ...

Checks run:
- ...

Risks / follow-ups:
- none
```

## 10. Default stance

- Prefer bounded placement over clever abstraction.
- Prefer extraction over inline growth в уже больших файлах.
- Prefer Postgres-first implementation over premature genericity.
- Prefer documented contracts over implicit tribal knowledge.
- Prefer explicit waiver over silent architectural drift.
