# Project Navigation Guide

Этот `AGENTS.md` нужен как быстрый навигатор по проекту. Он не заменяет код и локальные `CLAUDE.md`, а помогает быстро понять:

- что в репозитории реально активно;
- где лежит platform/shared слой;
- где демо, а где прикладная логика;
- в каком порядке читать проект.

## 1. Что это за проект

`dashboard-builder` уже не просто demo-конструктор. Сейчас это единое SvelteKit-приложение, в котором есть:

- design system и reusable UI;
- BFF/data layer для датасетов;
- система фильтров;
- редактор дашбордов;
- прикладные аналитические страницы на PostgreSQL;
- server-side alerts;
- документы по развитию EMIS.

## 2. Что сейчас важнее всего

Если нужно быстро понять проект, читай в таком порядке:

1. `README.md`
2. `CLAUDE.md`
3. `docs/current-project-analysis.md`
4. `docs/emis_mve_tz_v_2.md`
5. `docs/emis_implementation_spec_v1.md`
6. локальный `AGENTS.md` в нужной папке
7. локальный `CLAUDE.md`, если он есть

## 3. Главные зоны проекта

- `docs/` - архитектурные и продуктовые документы
- `src/lib/shared/` - shared UI, styles, utils, API facade
- `src/lib/entities/` - contracts и domain-like primitives
- `src/lib/server/` - BFF, providers, DB, alerts
- `src/lib/features/` - крупные пользовательские функции
- `src/lib/widgets/` - готовые composite widgets
- `src/routes/` - страницы и API endpoints

## 4. Что считать активным кодом

Сейчас основной активный контур находится здесь:

- `src/lib/shared/*`
- `src/lib/entities/dataset/*`
- `src/lib/entities/filter/*`
- `src/lib/server/*`
- `src/lib/features/dashboard-edit/*`
- `src/lib/widgets/filters/*`
- `src/lib/widgets/stock-alerts/*`
- `src/routes/dashboard/wildberries/*`
- `src/routes/api/datasets/[id]/+server.ts`
- `src/routes/api/wb/prices/+server.ts`

## 5. Что выглядит как legacy / placeholders

Ниже есть папки, которые сейчас не формируют рабочий активный контур и выглядят как задел или остатки ранней структуры:

- `src/lib/entities/dashboard/`
- `src/lib/entities/widget/`
- `src/lib/features/dashboard-builder/`
- `src/lib/widgets/chart/`
- `src/lib/widgets/dashboard-container/`
- `src/lib/widgets/kpi/`
- `src/lib/widgets/table/`

Их стоит воспринимать как пустые/неактуальные пространства, пока там не появится код.

## 6. Практическая карта чтения

### Если нужен UI/platform слой

Иди в:

- `src/lib/shared/AGENTS.md`
- `src/lib/widgets/AGENTS.md`

### Если нужен data/BFF слой

Иди в:

- `src/lib/entities/AGENTS.md`
- `src/lib/server/AGENTS.md`

### Если нужен dashboard editor

Иди в:

- `src/lib/features/AGENTS.md`

### Если нужен прикладной аналитический слой

Иди в:

- `src/routes/AGENTS.md`
- `src/routes/dashboard/wildberries/AGENTS.md`

### Если нужен EMIS-контекст

Иди в:

- `docs/AGENTS.md`

## 7. Важный контекст по развитию

Сейчас проект остается одним SvelteKit-приложением. Для EMIS принята стратегия:

- единое приложение сейчас;
- monorepo-ready границы в коде;
- возможный физический split позже.

Это означает, что при чтении проекта полезно отличать:

- текущий platform/shared слой;
- текущий BI/analytics контур;
- будущий EMIS-домен, который пока описан документами, а не отдельным кодовым деревом.

## 8. Git Checkpoints

Для работ по EMIS фиксируем рабочее правило:

- после каждого законченного смыслового этапа делать локальный git commit;
- минимальный ритм checkpoint-коммитов:
  - docs / architecture alignment
  - DB foundation
  - server write/query slice
  - первый рабочий `/emis` workspace
  - интеграция с BI/read-models

Идея простая: лучше больше небольших локальных опорных точек, чем один большой неразборчивый коммит в конце.

## 9. EMIS Architecture Rules

Для EMIS принимаем адаптированный FSD-подход, совместимый с текущим проектом:

- `src/lib/entities/emis-*` - контракты, DTO, базовые доменные типы, Zod schemas
- `src/lib/server/emis/infra/*` - server infrastructure
- `src/lib/server/emis/modules/*` - семантические backend-модули
- `src/routes/api/emis/*` - тонкий HTTP transport
- `src/routes/emis/*` - UI/workspace слой

### Что это означает на практике

- FSD сохраняется для client/shared части проекта.
- Server write/query logic не нужно насильно раскладывать по `features/` и `widgets/`.
- `server/emis` считается допустимым и правильным отклонением от "чистого" FSD, потому что это server-only слой модульного монолита.

### Правила разработки

- не писать SQL в `routes/api/emis/*`
- не писать HTTP-логику в `services/*`
- не класть Zod-схемы EMIS в random route files, если это reusable contract
- не смешивать CRUD и BI/dataset layer без причины
- для аналитических read-models использовать отдельные queries или dataset layer
- все изменения схемы EMIS только через `db/migrations/*`
