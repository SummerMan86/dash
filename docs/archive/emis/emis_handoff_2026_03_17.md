# EMIS Handoff 2026-03-17

Архивный snapshot.
Не обновлять как рабочий документ; актуальное состояние смотреть в [EMIS Session Bootstrap](../../emis_session_bootstrap.md).

Этот документ нужен как короткий handoff для нового диалога или новой сессии.

Важно:

- это не новый source of truth;
- требования брать из [EMIS MVE TZ v2](../../emis_mve_tz_v_2.md);
- техрешения и порядок работ брать из [EMIS Implementation Spec v1](../../emis_implementation_spec_v1.md);
- краткую стабилизированную картину смотреть в [EMIS Freeze Note](../../emis_freeze_note.md).

## 1. Что уже реально сделано

### Platform / DB

- локальный PostGIS dev runtime поднят через `docker compose`;
- локальная БД работает на `localhost:5435`;
- dev credentials лежат в `.env`, пароль для dev-контура: `SSYS`;
- есть удобные команды:
  - `pnpm db:up`
  - `pnpm db:down`
  - `pnpm db:logs`
  - `pnpm db:init`

### EMIS schema / migrations

- migration state уже дошел до `011`;
- `008_emis_identity_and_provenance.sql`:
  - partial unique indexes для canonical identity;
  - `source_origin`;
  - `created_by / updated_by / deleted_by`;
  - DB checks для status/source_origin;
- `009_emis_audit_log.sql`:
  - append-only `emis.audit_log`;
- `010_emis_mart_views.sql`:
  - `mart.emis_news_flat`;
  - `mart.emis_object_news_facts`;
  - `mart.emis_objects_dim`;
- `011_emis_ship_route_vessels.sql`:
  - `mart.emis_ship_route_vessels`.

### Dataset / BFF layer

- есть стабильные dataset IDs:
  - `emis.news_flat`
  - `emis.object_news_facts`
  - `emis.objects_dim`
  - `emis.ship_route_vessels`
- route datasets читают данные из `mart_emis` без переименования внешней схемы.
- ship-route points и segments сейчас остаются operational endpoints, а не dataset IDs:
  - `GET /api/emis/ship-routes/points`
  - `GET /api/emis/ship-routes/segments`

### `/emis` workspace

- `/emis` уже рабочий workspace;
- map и results list сидят на общем filter runtime;
- `layer=all|objects|news` уже работает;
- catalogs/detail routes для objects/news уже есть;
- manual create/edit entry points для objects/news уже есть;
- thin search transports уже есть:
  - `GET /api/emis/search/objects`
  - `GET /api/emis/search/news`
- ship-route slice уже встроен в UI:
  - карта рисует route points и route segments;
  - есть summary panel и latest points;
  - selector судов идет не из raw points, а из стабильного catalog view;
  - `routeMode=points|segments|both` уже есть в URL/runtime;
  - deep-link на selected route point/segment уже работает.

### Ship-route filter state

- `shipHbkId` уже поднят в workspace filter runtime;
- `shipHbkId` уже синхронизируется с URL;
- есть прямые operational endpoints:
  - `GET /api/emis/ship-routes/vessels`
  - `GET /api/emis/ship-routes/points`
  - `GET /api/emis/ship-routes/segments`

### Write-side / audit

- write-side actor attribution и audit hooks уже подключены для:
  - objects
  - news
  - news-object links
- `pnpm emis:write-smoke` — repeatable write-side smoke (6/6):
  - db:connectivity, api:health, smoke:refs
  - object create → update → soft delete + audit_log verification
  - news create → update → soft delete + audit_log verification
  - link attach → update → detach + audit_log verification
- каждый run изолирован по `runId`, cleanup в `finally` удаляет только свои записи;
- `emis.audit_log` уже получает `create/update/delete` и `attach/update/detach` события с `actor_id`;
- environment caveat: в средах с shared folder mount нужен `CHOKIDAR_USEPOLLING=1 pnpm emis:write-smoke`.

### BI / smoke

- BI/read-side уже выведен в три route-level screens:
  - `/dashboard/emis`
  - `/dashboard/emis/ship-routes`
  - `/dashboard/emis/provenance`
- локальная smoke matrix уже закреплена командой `pnpm emis:smoke`;
- `pnpm check` и `pnpm emis:smoke` на текущем worktree проходили зелёно после последних доработок.
- runtime contract теперь вынесен в отдельный reference:
  - `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- `pnpm emis:smoke` теперь дополнительно проверяет:
  - operational list/search meta shape;
  - error shape `{ error, code }` на invalid params;
  - dataset BI error shape и applied `limit/sort` meta.

## 2. Что считать текущим архитектурным решением

- operational EMIS flows по умолчанию идут через:
  - `routes/api/emis/*`
  - `server/emis/modules/*`
  - PostgreSQL/PostGIS;
- dataset/IR слой сохраняется для BI/read-side и стабильных read-model contracts;
- полноценный persistent `stg` пока не делаем;
- текущая read-side модель ближе к `emis -> mart`, без отдельного `stg`;
- `mart_emis` пока не переименовываем;
- если понадобится более чистый platform contract, позже можно дать совместимые `mart.emis_*` views поверх него.

## 3. Что еще не закрыто

- ship-route slice пока остается thin vertical slice, а не отдельным map API;
- query/runtime hardening уже закрыт как отдельный pass:
  - limits/sorts/error shapes выровнены;
  - operational и dataset-backed BI read-side теперь держат documented runtime contract;
  - remaining UX edge cases по `/emis` и BI routes не считать частью этого закрытого slice.
- offline/maps core implementation уже закрыта:
  - PMTiles runtime (`online|offline|auto` + auto fallback) работает;
  - assets установлены (237 MB: world-z7 + moscow region);
  - validation wave пройдена, ops guide — `../../emis_offline_maps_ops.md`;
  - ~~automated `pnpm emis:offline-smoke`~~ — закрыто 22 марта 2026: 9/9 checks (asset inventory, manifest, bundle readiness, Range support, spike page);
  - оставшийся хвост: production Range verification в adapter-node, asset update pipeline для новых регионов.
- ~~write-side smoke еще не оформлен как repeatable local command с audit_log verification~~ — закрыто 22 марта 2026: `pnpm emis:write-smoke` (6/6).

## 4. Что логично делать следующим

Варианты следующего шага:

1. ~~Расширить smoke coverage — offline/no-internet checks~~ — закрыто (`pnpm emis:offline-smoke`, 9/9)
2. Довести offline/maps production hardening:
   - Range support в adapter-node — задокументировано в `../../emis_offline_maps_ops.md`
   - Asset update pipeline для новых регионов — задокументировано в ops guide
3. `/emis` edge-case UX polish — закрыто 22 марта 2026 (C1-C4):
   - Skeleton loaders вместо текстовых "Загружаем..."
   - Animated spinner на map startup
   - "(max)" badge при достижении лимита 5000 для route points/segments
   - Disabled state на tab buttons при активном layer filter

Рекомендация по умолчанию:

- ~~сначала делать write-side smoke~~ — закрыто;
- ~~расширять offline/no-internet coverage~~ — закрыто;
- следующий focus — production ops hardening (adapter-node Range, asset pipeline);
- потом добивать offline/maps production-shape hardening и оставшийся UX polish.

## 5. Dev note для VS Code

- если `pnpm check` зелёный, а VS Code показывает stale `.svelte` diagnostics, сначала проверить workspace TypeScript и Svelte language server;
- в workspace уже зафиксированы:
  - `typescript.tsdk = node_modules/typescript/lib`
  - `svelte.enable-ts-plugin = true`
- обычно достаточно:
  - `Developer: Reload Window`
  - `TypeScript: Restart TS Server`
  - `Svelte: Restart Language Server`

## 6. Полезные артефакты для следующего диалога

- [EMIS Session Bootstrap](../../emis_session_bootstrap.md)
- [EMIS Freeze Note](../../emis_freeze_note.md)
- [EMIS Implementation Spec v1](../../emis_implementation_spec_v1.md)
- [EMIS Runtime Contract](../../../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md)
