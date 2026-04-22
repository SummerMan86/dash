# EMIS Domain Invariants

Domain overlay для EMIS-specific project invariants.
Generic repo-wide guardrails и severity rules живут в `invariants.md`.

## 2. EMIS boundaries

### Canonical reusable homes

- `packages/emis-contracts/*` — reusable contracts, DTO, Zod schemas
- `packages/emis-server/src/*` — reusable server infra, queries, services, repositories
- `packages/emis-ui/*` — reusable map/status UI

### App leaf rules

- `apps/web/src/routes/api/emis/*` — thin HTTP transport, без SQL и бизнес-логики
- `apps/web/src/routes/emis/*` — workspace/UI orchestration
- `apps/web/src/routes/dashboard/emis/*` — BI/read-side routes
- `apps/web/src/lib/server/emis/infra/http.ts`, `apps/web/src/lib/emis-manual-entry/*`, `apps/web/src/routes/dashboard/emis/vessel-positions/EmisDrawer.svelte` — app-local composition

### Additional rules

- compatibility shims under old app paths не считаются новым canonical home
- `packages/emis-server/src/modules/*/service.ts` не содержит HTTP-логики
- SQL живёт в `packages/emis-server/*`, не в route files
- operational flows не проталкиваются в dataset/IR abstraction без documented read-model
- BI/read-side идёт через published read-model + dataset path, а не через backdoor в operational SQL

## 3e. EMIS data invariants

- identity выражена в DB constraints / partial unique indexes
- soft delete единообразен: `deleted_at IS NULL` в базовых queries
- audit trail и actor attribution обязательны для write-side
- FK behavior и vocabulary boundaries зафиксированы явно

## 5e. EMIS complexity exceptions

- long-lived waiver отражается в report и в `docs/emis/change_policy.md` (Exception policy)

## 7e. EMIS technologies

- Svelte 5 runes для нового EMIS UI
- PostgreSQL + PostGIS
