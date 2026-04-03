# EMIS Vessel Current Positions Handoff Plan

Task-specific handoff-план для weaker AI agent по slice `Vessel Current Positions` в `/emis`.
Это не source of truth по EMIS целиком; за общую архитектуру и текущее состояние отвечают `AGENTS.md` и `docs/emis_session_bootstrap.md`.

## Summary

Цель v1: встроить в текущий /emis новый слой vessels, который показывает текущие позиции судов из локальной PostgreSQL БД, без автоматической загрузки исторического трека.
Канонический public source для v1: mart.emis_ship_route_vessels. stg_emis.vsl_position_latest считаем upstream-источником, но не светим напрямую в EMIS API/UI.
Работать строго по шагам ниже, без побочных рефакторингов. Сначала backend contracts, потом map layer, потом /emis UI, потом smoke/docs.

## Subtasks

Зафиксировать границы v1 и не трогать БД без необходимости. В этом шаге агент не меняет schema/view, если текущего mart.emis_ship_route_vessels хватает; если внезапно не хватает обязательного поля, агент обновляет snapshot-first DB contract через `db/current_schema.sql` + `db/applied_changes.md`, а для live delta при необходимости использует `db/pending_changes.sql` вместо правки старых архивных SQL. Done when: есть явное понимание, что v1 читает только mart.emis_ship_route_vessels и не использует stg_emis.\* в transport/API.

Расширить map entity contracts в types.ts, schema.ts, index.ts. Нужно добавить EmisMapFeatureKind = 'object' | 'news' | 'vessel', EmisMapVesselFeatureProperties, EmisMapVesselFeatureCollection, EmisMapVesselsQueryInput, а также mapVesselsQuerySchema. Для vessel feature использовать id: String(shipHbkId), а numeric shipHbkId держать отдельным полем. Done when: contracts экспортируются из entity layer и не требуют решений “по месту” в UI/server.

Добавить server query и transport для map vessels в queries.ts и новом vessels/+server.ts. Endpoint: GET /api/emis/map/vessels?bbox=...&q=...&limit=..., response shape только raw GeoJSON FeatureCollection<Point>, без { rows, meta }, по аналогии с object/news map endpoints. Фильтры: обязательный bbox, optional q, optional limit; bbox применять через numeric bounds по last_longitude/last_latitude, строки без координат отбрасывать, сортировка last_fetched_at desc, ship_hbk_id asc. Done when: endpoint стабильно возвращает vessel points с shipHbkId, vesselName, imo, mmsi, flag, callsign, lastFetchedAt, lastLatitude, lastLongitude, pointsCount, routeDaysCount.

Расширить vessel catalog endpoint в schema.ts, queries.ts, vessels/+server.ts. Добавить optional q в GET /api/emis/ship-routes/vessels, искать по vessel_name, callsign, текстовым ship_hbk_id, imo, mmsi; shape ответа оставить прежним: { rows, meta } плюс текущий vesselLabel. Done when: правый vessel list можно строить без нового search endpoint и без ломки runtime contract.

Встроить vessel overlay в map widget через layer-config.ts, EmisMap.svelte, popup-renderers.ts. Нужно добавить новый source/layer vessels, отдельный визуальный стиль, click/hover/select pipeline и popup для vessel. В EmisMap.svelte при layer='vessels' нужно запрашивать только /api/emis/map/vessels; object/news overlay fetch в этом режиме не делать. Done when: карта умеет показывать и выделять суда как полноценный новый слой, а overlay diagnostics показывают count по vessels.

Обновить filter/runtime wiring в filters.ts. Добавить EMIS_FILTER_TARGETS.mapVessels, новый option layer='vessels', привязать q к vessel map и vessel catalog, но не привязывать country, dateRange, objectType, status, source, newsType, objectId к vessel mode. Для layer='vessels' в верхнем FilterPanel показывать только [layer, q], чтобы агент не пытался притягивать нерелевантные фильтры к судовому слою. Done when: vessel mode имеет свой минимальный и понятный filter surface.

Перестроить /emis page flow в src/routes/emis/+page.svelte. В layer='vessels' правая колонка больше не рендерит object/news results: вместо этого она показывает vessel catalog из /api/emis/ship-routes/vessels, count, selected row highlight и CTA “центрировать на карте”. Выбор строки должен ставить shipHbkId, выделять vessel на карте и делать map.flyTo на lastLongitude/lastLatitude; выбор vessel на карте должен синхронизировать ту же selection state. Done when: /emis?layer=vessels работает как отдельный рабочий режим, а object/news режимы остаются без функциональных изменений.

Вывести historical track из primary UX, но не удалять код. В src/routes/emis/+page.svelte нужно перестать автоматически вызывать /api/emis/ship-routes/points и /segments в vessel-first сценарии; текущий ship-route блок заменить компактной vessel summary card с note “historical track next step”. Existing point/segment code не выпиливать и не рефакторить глубоко: просто перестать автозагружать и перестать рендерить как главный flow. Done when: v1 current positions не тянет track endpoints без явного будущего шага.

Обновить smoke и docs. В scripts/emis-smoke.mjs добавить проверки для /api/emis/map/vessels, для /api/emis/ship-routes/vessels?q=..., и для страницы /emis?layer=vessels по стабильному маркеру. В docs минимум обновить emis_session_bootstrap.md, чтобы там появился новый current-position vessel slice и было явно сказано, что track остаётся следующей волной. Done when: новый режим закреплён smoke-проверкой и не живёт “только в коде”.

## Public APIs / Interfaces

Новый endpoint: GET /api/emis/map/vessels?bbox=west,south,east,north&q=<string>&limit=<1..500>.
Расширение существующего endpoint: GET /api/emis/ship-routes/vessels теперь поддерживает optional q, но сохраняет текущий { rows, meta } contract.
UI contract: layer в /emis становится all | objects | news | vessels.
Map entity contract: появляется новый feature kind vessel; object/news contracts не меняются.

## Verification

CHOKIDAR_USEPOLLING=1 pnpm emis:smoke
pnpm check
pnpm build
Ручной happy-path: открыть /emis?layer=vessels, увидеть точки судов на карте, выбрать судно из списка, убедиться что карта центрируется и summary card показывает HBK, IMO/MMSI, lastFetchedAt, координаты.
Ручной regression: открыть /emis?layer=objects и /emis?layer=news, убедиться что существующий workspace не деградировал.

## Suggested Checkpoints

Checkpoint 1: contracts + /api/emis/map/vessels + q для vessel catalog.
Checkpoint 2: map widget vessel layer + popup + selection.
Checkpoint 3: /emis vessel mode + отключение auto-track flow.
Checkpoint 4: smoke updates + bootstrap docs.

## Assumptions / Defaults

На первом шаге не делаем DB changes; если они всё же понадобятся, агент обязан обновить snapshot-first артефакты в `db/` и не править старый архивный SQL “задним числом”.
В v1 vessel list является глобальным catalog slice с optional q, а не viewport-synced search results; viewport-sync можно делать отдельной волной.
dateRange не влияет на current positions в v1.
BI/dataset layer в этом шаге не меняется.
stg_emis.vsl_position_latest можно использовать только как reference для сверки логики, но не как прямой public runtime dependency.
