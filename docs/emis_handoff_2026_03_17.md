# EMIS Handoff 2026-03-17

Этот документ нужен как короткий handoff для нового диалога или новой сессии.

Важно:

- это не новый source of truth;
- требования брать из [EMIS MVE TZ v2](./emis_mve_tz_v_2.md);
- техрешения и порядок работ брать из [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md);
- краткую стабилизированную картину смотреть в [EMIS Freeze Note](./emis_freeze_note.md).

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
  - `emis.ship_route_points`
  - `emis.ship_route_segments`
- route datasets читают данные из `mart_emis` без переименования внешней схемы.

### `/emis` workspace

- `/emis` уже рабочий workspace;
- map и results list сидят на общем filter runtime;
- `layer=all|objects|news` уже работает;
- thin search transports уже есть:
  - `GET /api/emis/search/objects`
  - `GET /api/emis/search/news`
- ship-route slice уже встроен в UI:
  - карта рисует route points и route segments;
  - есть summary panel и latest points;
  - selector судов идет не из raw points, а из стабильного catalog view.

### Ship-route filter state

- `shipHbkId` уже поднят в workspace filter runtime;
- `shipHbkId` уже синхронизируется с URL;
- есть dictionary endpoint:
  - `GET /api/emis/dictionaries/vessels`.

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

- audit hooks на write-side пока не подключены полностью;
- catalogs/detail pages для objects/news не закрыты;
- ship-route slice пока остается thin vertical slice, а не отдельным map API;
- route-specific UX еще можно усилить:
  - `routeMode=points|segments|both`;
  - deep-link на selected map feature;
  - отдельный route transport, если payload станет тяжелым.

## 4. Что логично делать следующим

Варианты следующего шага:

1. Дожать `/emis` UX:
   - `routeMode=points|segments|both`
   - shareable deep-linking
2. Перейти в catalogs/detail pages:
   - `/emis/objects`
   - `/emis/objects/[id]`
   - `/emis/news`
   - `/emis/news/[id]`
3. Подключить реальные audit hooks для write-side.

Рекомендация по умолчанию:

- сначала дожать `/emis` как рабочий экран;
- потом идти в catalogs/detail;
- затем добивать write-side audit hooks.

## 5. Полезные артефакты для следующего диалога

- [EMIS Session Bootstrap](./emis_session_bootstrap.md)
- [EMIS Freeze Note](./emis_freeze_note.md)
- [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md)
