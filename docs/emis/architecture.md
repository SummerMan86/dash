# EMIS Architecture

Текущий current-state контракт для архитектуры EMIS.  
Документ отвечает на вопросы:

- где проходит граница модуля EMIS;
- какие execution paths считаются каноническими;
- какие storage/contract surfaces считаются owned;
- через что EMIS связан с BI и платформой.

## 1. Scope

Покрывает:

- EMIS operational routes и UI under `/emis/*` и `/api/emis/*`;
- `emis-contracts`, `emis-server`, `emis-ui`;
- auth, ingestion, map/runtime integration;
- EMIS-owned storage и EMIS-facing published read-models.

Не покрывает:

- repo-wide platform rules;
- generic dataset runtime details;
- исторические rollout notes;
- пошаговые ops runbooks.

## 2. Module boundary

EMIS — self-contained domain внутри одного deployable приложения.

Внутрь EMIS входят:

- domain DTO и schemas — `packages/emis-contracts/`;
- backend/domain services — `packages/emis-server/`;
- reusable UI slices — `packages/emis-ui/`;
- app-level composition и transport glue — `apps/web/src/routes/emis/*`, `apps/web/src/routes/api/emis/*`, `apps/web/src/lib/server/emis/infra/*`.

Аналитические dashboards под `/dashboard/emis/*` не являются operational частью EMIS.  
Они относятся к BI platform-layer и читают данные через published read-models, а не через `emis-server`.

## 3. Canonical execution paths

### 3.1. Operational path

```text
/emis/* или /api/emis/*
  -> SvelteKit route handler / page
  -> app-owned HTTP/auth glue
  -> packages/emis-server/src/modules/*
  -> parameterized SQL via pg
  -> PostgreSQL / PostGIS
```

Правила:

- route handlers остаются thin transport;
- business logic живёт в `emis-server`;
- SQL не должен попадать в route files;
- SvelteKit-specific glue остаётся в app layer.

### 3.2. BI / read-side path

```text
/dashboard/emis/*
  -> fetchDataset(...)
  -> /api/datasets/:id
  -> compileDataset(...)
  -> DatasetIr
  -> Provider
  -> published view / mart
```

Правила:

- BI не ходит напрямую в operational SQL через route layer;
- published read-model считается отдельным контрактом;
- EMIS operational code и BI code эволюционируют независимо, пока published contract стабилен.

### 3.3. Structural migration path

```text
current zone
  -> target package
  -> temporary compatibility shim
  -> shim removal
```

Структурные перемещения описаны детально в `structural_migration.md`.  
Они не должны смешиваться с поведенческим переписыванием домена.

## 4. Storage ownership

### 4.1. App-owned schemas

| Schema | Назначение | Примеры объектов |
|---|---|---|
| `emis` | write-side operational tables | `objects`, `news_items`, `news_object_links`, `audit_log`, `countries`, `object_types`, `sources`, `users`, `sessions`, `object_source_refs` |
| `stg_emis` | staging для ingestion | `vsl_load_batch`, `vsl_position_raw`, `vsl_position_latest`, `vsl_ships_hbk`, `obj_import_run`, `obj_import_candidate`, `obj_candidate_match` |
| `mart_emis` | derived read-models для ship routes | `vsl_route_point_hist`, `vsl_route_segment_hist` |

### 4.2. DB truth

Active DDL truth остаётся snapshot-first:

- `db/current_schema.sql`
- `db/schema_catalog.md`
- `db/applied_changes.md`
- `db/pending_changes.sql` — только как live delta при необходимости

EMIS-документы не дублируют полный DDL; они фиксируют только смысловые границы.

## 5. Contract surfaces

| Контракт | Где живёт | Для чего нужен |
|---|---|---|
| EMIS Zod schemas | `packages/emis-contracts/src/*` | request/response validation, shared DTOs |
| Runtime/API conventions | `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` | error shape, list meta, audit/correlation conventions |
| Route/BFF boundary | `apps/web/src/routes/api/emis/*` | thin HTTP transport, без business logic |
| Dataset/read-model contracts | dataset definitions + DB views | BI integration без direct coupling к operational code |

## 6. Published read-models and datasets

Текущие app-facing dataset ids и соответствующие SQL contracts:

| Dataset id | SQL contract |
|---|---|
| `emis.news_flat` | `mart.emis_news_flat` |
| `emis.object_news_facts` | `mart.emis_object_news_facts` |
| `emis.objects_dim` | `mart.emis_objects_dim` |
| `emis.ship_route_vessels` | `mart.emis_ship_route_vessels` |

Правила для новых BI/read-side slices:

1. Сначала фиксируется published SQL contract в `mart` или `mart_emis`.
2. Затем обновляются snapshot-first DB документы.
3. Затем добавляется dataset definition и provider mapping.
4. Затем строится BI route под `/dashboard/emis/*`.
5. Если изменился discoverability map — обновляется `README.md`.

Breaking changes для published read-models требуют явного migration plan, если меняются:

- имена или удаление колонок;
- grain/semantics набора;
- сортировки/фильтры, которые ломают dataset contract.

## 7. Extension points

### 7.1. Ingestion adapters

`emis-server/modules/ingestion/adapters/` использует registry pattern.  
Новый источник добавляется через новый adapter + регистрацию в registry.

### 7.2. Auth integration

Auth остаётся app-integrated, но EMIS-owned:

- основной режим — session-based;
- session storage — `emis.sessions`;
- user store — `emis.users` с transition fallback;
- route/page enforcement — app layer;
- actor attribution и audit остаются обязательными.

Подробности — в `access_model.md`.

### 7.3. Maps

Basemap modes:

- `online`
- `offline`
- `auto`

Локальный offline контур построен вокруг `PMTiles` bundle.  
Runtime/ops детали вынесены в `operations.md`.

## 8. Fixed architectural defaults

Ниже — решения, которые считаются текущим default и не переоткрываются без причины:

- EMIS остаётся внутри текущего `SvelteKit` приложения.
- High-level style — `modular monolith`.
- Reusable EMIS code живёт в `packages/*`, app composition — в `apps/web`.
- BI consumes EMIS only through published read-models.
- `PostgreSQL + PostGIS` являются базовым фундаментом.
- `packages/emis-server` не импортирует UI.
- `packages/emis-ui` не импортирует server.
- `apps/web` остаётся leaf consumer и не является library.

## 9. Boundary rules

- `apps/web/src/routes/api/emis/*` — transport only.
- `packages/emis-server/*` — без HTTP и без client/UI code.
- `packages/emis-ui/*` — reusable UI, без server imports.
- `platform-*` не знает о `emis-*`.
- `bi-*` не импортирует `emis-*`; связь идёт через DB contracts.
- Compatibility shims временные и не считаются ownership truth.

## 10. Что не должно жить в этом документе

Не стоит снова превращать этот документ в смесь разных осей:

- backlog/waves/status closure;
- review-process details;
- auth flow pseudocode;
- offline maps пошаговые runbooks;
- feature-specific frozen behavior contracts.

Для этого есть отдельные документы.
