# EMIS Session Bootstrap

Использовать как быстрый старт для новой сессии по EMIS.

1. Source of truth по scope, invariants и acceptance: [EMIS MVE TZ v2](./emis_mve_tz_v_2.md).
2. Source of truth по порядку реализации и техрешениям: [EMIS Implementation Spec v1](./emis_implementation_spec_v1.md).
3. Быстрый summary без перечитывания всего: [EMIS Freeze Note](./emis_freeze_note.md).
4. EMIS развивается внутри текущего SvelteKit-приложения как `single deployable app`, без немедленного split в монорепо.
5. Архитектурный стиль: modular monolith, PostGIS входит в базовый фундамент.
6. Обязательные invariants: canonical identity через DB constraints, единый soft delete contract, audit/provenance/actor attribution, явный FK behavior.
7. Новый EMIS UI писать сразу на Svelte 5 runes.
8. Naming default для ранних этапов: плоский namespace `emis-*`.
9. Исторический roadmap в docs остаётся таким: `Wave A -> Wave B -> Wave C -> Wave D -> Wave E -> Wave F`.
10. Фактический статус репозитория уже впереди этой очереди: минимальный slice Wave B и Wave C реализован, а offline basemap slice из Wave F частично вытянут раньше.
11. Что уже считать фактом в коде:
    - `/emis` уже рабочий workspace;
    - map/list используют shared filters;
    - thin search transports `/api/emis/search/objects` и `/api/emis/search/news` уже существуют;
    - cross-workspace filter MVE уже сделан;
    - ship-route slice уже встроен в `/emis` поверх `mart_emis`;
    - `shipHbkId` уже живет в workspace filter runtime и синхронизируется с URL.
12. Что уже считать фактом в БД:
    - локальный PostGIS runtime работает через Docker Compose на `localhost:5435`;
    - migration state дошел до `011`;
    - `008` закрывает identity/provenance foundation;
    - `009` создает append-only `audit_log`;
    - `010` фиксирует `mart.emis_*` BI contracts;
    - `011` фиксирует `mart.emis_ship_route_vessels`.
13. Canonical architectural rule: existing dataset/IR abstraction сохраняем для BI/read-side, а новые EMIS operational flows по умолчанию делаем прямыми Postgres-first queries через `/api/emis/* -> server/emis/modules/*`.
14. `oracle`/`cube` и новые `IR/Provider` capabilities не проектируем заранее; рефакторинг к multi-backend делаем только по факту реального use case.
15. Текущий basemap contract для EMIS уже активный: `online (MapTiler/custom style) + offline (local PMTiles) + auto fallback`; `/emis/pmtiles-spike` остаётся техмаршрутом для проверок и наблюдаемости.
16. Ближайший практический фокус теперь такой:
    - добить UX-hardening `/emis`;
    - решить, нужен ли `routeMode=points|segments|both` как следующий filter/URL шаг;
    - затем идти в catalogs/detail pages;
    - затем подключать реальные audit hooks на write-side.
17. После этого идти в Wave E: BI wiring, smoke tests, production-shape hardening.
18. Offline/maps сейчас считать не новой будущей волной, а задачей hardening: расширять offline coverage и дожимать production ops/runbook вокруг MapTiler + PMTiles.
19. Для нового диалога сначала читать:
    - этот bootstrap;
    - затем [EMIS Freeze Note](./emis_freeze_note.md);
    - затем [EMIS Handoff 2026-03-17](./emis_handoff_2026_03_17.md).
20. Если вопрос спорный, сначала сверять `freeze note`, потом `ТЗ v2`, потом `implementation spec`, а не принимать новое решение “с нуля”.
