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
9. Ближайшие волны реализации: `Wave A -> Wave B -> Wave C -> Wave D -> Wave E -> Wave F`.
10. Если вопрос спорный, сначала сверять `freeze note`, потом `ТЗ v2`, потом `implementation spec`, а не принимать новое решение “с нуля”.
