# EMIS Architecture Baseline

Этот документ фиксирует текущую EMIS architecture story на 4 апреля 2026.
Он отвечает только за current state и placement rules.
Future migration описывается отдельно, а frozen decisions и historical rollout context вынесены в другие документы.

## 1. Topology

- один deployable `SvelteKit` app: `apps/web`
- архитектурный стиль: `modular monolith`
- три контура:
  - `platform/shared`
  - `EMIS operational`
  - `EMIS BI/read-side`
- reusable EMIS contracts/server/ui живут в packages; app держит routes и app-local composition

## 2. Три контура

### Platform / shared

Canonical reusable homes:

- `packages/platform-core/`
- `packages/platform-ui/`
- `packages/platform-datasets/`
- `packages/platform-filters/`
- `packages/db/`

App-local platform glue по-прежнему живет в:

- `apps/web/src/lib/shared/*`
- `apps/web/src/lib/entities/dataset/*`
- `apps/web/src/lib/entities/filter/*`
- `apps/web/src/lib/server/datasets/*`
- `apps/web/src/lib/server/providers/*`

Этот контур можно использовать из EMIS, но он не владеет EMIS business logic.

### EMIS operational

Canonical reusable homes:

- `packages/emis-contracts/` — entity contracts, DTO, Zod schemas
- `packages/emis-server/` — server infra и backend modules
- `packages/emis-ui/` — reusable map/status UI

App-owned EMIS composition остается в:

- `apps/web/src/lib/server/emis/infra/http.ts`
- `apps/web/src/lib/features/emis-manual-entry/`
- `apps/web/src/lib/widgets/emis-drawer/`
- `apps/web/src/routes/api/emis/*`
- `apps/web/src/routes/emis/*`

Compatibility shims остаются на старых app-paths и не считаются canonical ownership:

- `apps/web/src/lib/entities/emis-*`
- `apps/web/src/lib/server/emis/*`
- `apps/web/src/lib/widgets/emis-map/*`
- `apps/web/src/lib/widgets/emis-status-bar/*`

### EMIS BI / read-side

App-owned BI route layer:

- `apps/web/src/routes/dashboard/emis/*`

Platform dataset/runtime path:

- `packages/platform-datasets/`
- `apps/web/src/lib/server/datasets/definitions/emisMart.ts`
- `/api/datasets/:id` для `emis.*`

Published DB contracts:

- `mart.emis_*`
- `mart_emis.*`

## 3. Два канонических execution path

### Operational path

Использовать для CRUD, search, map, ship-routes, dictionaries, audit:

`routes/api/emis/* -> packages/emis-server/src/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`

### BI path

Использовать для dashboard, KPI, charts, tables и стабильных read-models:

`fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`

## 4. Главная граница

- operational EMIS не тащим в dataset/IR слой "на вырост"
- dataset layer используем только там, где реально нужен BI/read-model contract
- `/dashboard/emis/*` не становится backdoor в operational SQL
- `/emis` не становится местом для server business logic

Практическое правило:

- карта, поиск, карточка, create/edit, link management, ship-route runtime:
  `packages/emis-server/` + `routes/api/emis/*` + `routes/emis/*`
- устойчивый BI/dashboard slice:
  published view/read-model + dataset definition + `routes/dashboard/emis/*`

## 5. Placement Rules

### Куда класть новый код

- новые DTO, reusable entity contracts, Zod schemas: `packages/emis-contracts/`
- server-only infra/helpers: `packages/emis-server/src/infra/*`
- domain backend logic: `packages/emis-server/src/modules/*`
- reusable EMIS map/status widgets: `packages/emis-ui/`
- EMIS forms с зависимостью на `$app/forms`: `apps/web/src/lib/features/emis-manual-entry/`
- app-local widgets с зависимостью на app widgets: `apps/web/src/lib/widgets/emis-drawer/`
- HTTP transport: `apps/web/src/routes/api/emis/*`
- workspace/orchestration UI: `apps/web/src/routes/emis/*`
- BI pages: `apps/web/src/routes/dashboard/emis/*`

### Чего не делать

- не писать SQL в `apps/web/src/routes/api/emis/*`
- не писать HTTP-логику в `packages/emis-server/src/modules/*/service.ts`
- не писать client/UI code в `packages/emis-server/*`
- не добавлять EMIS CRUD/query logic в dataset compiler без published read-model причины
- не смешивать `/emis` workspace и `/dashboard/emis` BI ownership
- не складывать reusable EMIS contracts в route files

## 6. Что уже подтверждено кодом

- `apps/web/src/routes/api/emis/*` — тонкий transport поверх package-owned contracts/modules и app-owned HTTP glue
- operational SQL и domain logic живут в `packages/emis-server/`
- reusable map/status runtime живет в `packages/emis-ui/`
- `/emis` — рабочий workspace layer, а не foundation page
- `/dashboard/emis/*` идет через dataset/read-model path
- DB source of truth для EMIS ведется snapshot-first через `db/current_schema.sql`

Поэтому базовый ответ на вопрос "разошлись ли мы с dashboard-builder?" такой:

- да, на уровне домена и ownership EMIS уже отдельный контур
- нет, на уровне deploy/runtime это все еще единое приложение

## 7. Current Pressure Points

- большие EMIS route/widget файлы должны расти только через extraction
- compatibility shims остаются временным слоем, а не ownership truth
- известный `fetchDataset.ts` boundary gap — platform-level проблема и не повод переоткрывать EMIS topology

## 8. Relationship To Other Docs

- `emis_session_bootstrap.md` — текущее состояние, doc map и reading order
- `emis_working_contract.md` — короткие рабочие правила и review triggers
- `emis_monorepo_target_layout.md` — future target layout и migration policy, не current ownership map
- `emis_implementation_spec_v1.md` — retained implementation decisions и historical rollout context
- `emis_freeze_note.md` — frozen decisions, которые не нужно переоткрывать

## 9. Reading Order

1. `emis_session_bootstrap.md`
2. этот документ
3. `emis_working_contract.md`
4. `../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
5. `emis_mve_tz_v_2.md` — если нужен product scope
6. `emis_monorepo_target_layout.md` — если задача про structural migration
7. `emis_implementation_spec_v1.md` — если нужен rollout/history context
8. `emis_freeze_note.md` — если нужно проверить frozen decisions
