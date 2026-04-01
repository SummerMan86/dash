# Project Navigation Guide

Этот `AGENTS.md` - корневая точка входа по репозиторию.
Он отвечает за развилку "какой контур читать дальше", за архитектурные правила и за конвенцию `AGENTS.md` vs `CLAUDE.md`.

## 1. Что это за проект

`dashboard-builder` уже не demo-конструктор в узком смысле, а единое SvelteKit-приложение, в котором живут:

- platform/shared слой с UI, styles, utils и API facade;
- BI/read-side data layer для датасетов;
- filter runtime и reusable filter widgets;
- dashboard editor;
- прикладные аналитические страницы;
- server-side alerts;
- EMIS как отдельный доменный контур внутри того же приложения.

## 2. Сначала выбери контур

### Dashboard-builder / platform / BI

Стартовая дорожка:

1. `README.md`
2. `docs/current-project-analysis.md`
3. локальный `AGENTS.md` в нужной папке
4. локальный `CLAUDE.md`, если рядом нет `AGENTS.md`

Основные активные зоны:

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

### EMIS

Стартовая дорожка:

1. `docs/emis_session_bootstrap.md`
2. `docs/AGENTS.md` - полный каталог EMIS docs, ownership и reading order
3. локальный `AGENTS.md` в `src/lib/server/emis/`, `src/routes/api/emis/`, `src/routes/emis/` и соседних active зонах

EMIS-активный контур сейчас находится здесь:

- `src/lib/entities/emis-*`
- `src/lib/server/emis/*`
- `src/routes/api/emis/*`
- `src/routes/emis/*`
- `src/routes/dashboard/emis*`
- `db/schema_catalog.md`
- `db/current_schema.sql`
- `db/pending_changes.sql`

## 3. Кто за что отвечает в навигации

- `README.md` - что это за приложение, стек, быстрый старт, env и маршруты
- `AGENTS.md` в корне - выбрать контур, увидеть архитектурные правила и конвенцию навигационных файлов
- `docs/AGENTS.md` - единственный полный каталог документации и reading order
- локальные `AGENTS.md` / `CLAUDE.md` - правила и карта конкретной подсистемы

## 4. Конвенция `AGENTS.md` vs `CLAUDE.md`

- Для новых и обновляемых навигационных документов по умолчанию использовать `AGENTS.md`.
- Если в одной папке есть и `AGENTS.md`, и `CLAUDE.md`, canonical считать `AGENTS.md`.
- `CLAUDE.md` в таких местах оставлять как compatibility-layer для Claude-based агентов.
- Если в папке пока есть только `CLAUDE.md`, читать его как legacy-local note до миграции в `AGENTS.md`.

## 5. Что выглядит как legacy / placeholders

Пока не считать активным рабочим контуром:

- `src/lib/entities/dashboard/`
- `src/lib/entities/widget/`
- `src/lib/features/dashboard-builder/`
- `src/lib/widgets/chart/`
- `src/lib/widgets/dashboard-container/`
- `src/lib/widgets/kpi/`
- `src/lib/widgets/table/`

Их стоит воспринимать как пустые или неактуальные пространства, пока там не появится живой код.

## 6. Важный контекст по развитию

Сейчас проект остается одним SvelteKit-приложением. Для EMIS стратегия такая:

- единое приложение сейчас;
- monorepo-ready границы в коде;
- возможный физический split позже.

Практически это значит, что полезно держать в голове три разных слоя:

- platform/shared слой;
- текущий BI/analytics контур;
- EMIS operational и BI-contour поверх него.

## 7. Архитектурные правила

### Non-EMIS BI read-side

- canonical path:
  `fetchDataset(...) -> /api/datasets/:id -> compileDataset(...) -> DatasetIr -> Provider -> DatasetResponse`
- `DatasetQuery`, `DatasetResponse`, `DatasetIr`, `Provider` считаются platform contract для этого слоя
- правило не распространяется на `routes/api/emis/*`, `server/emis/*`, `server/alerts/*`, `/api/wb/*` и другие operational paths

### EMIS operational side

- default path:
  `routes/api/emis/* -> server/emis/modules/* -> queries/service/repository -> PostgreSQL/PostGIS`
- simple Postgres-first implementation считается нормой
- если нужен BI/read-model поверх EMIS, сначала публикуем documented views/read models и только потом подключаем dataset layer

### EMIS architecture rules

Для EMIS принимаем адаптированный FSD-подход, совместимый с текущим проектом:

- `src/lib/entities/emis-*` - контракты, DTO, базовые доменные типы, Zod schemas
- `src/lib/server/emis/infra/*` - server infrastructure
- `src/lib/server/emis/modules/*` - семантические backend-модули
- `src/routes/api/emis/*` - тонкий HTTP transport
- `src/routes/emis/*` - UI/workspace слой

Что это означает на практике:

- FSD сохраняется для client/shared части проекта.
- Server write/query logic не нужно насильно раскладывать по `features/` и `widgets/`.
- `server/emis` считается нормальным server-only отклонением от "чистого" FSD.

Правила разработки:

- не писать SQL в `routes/api/emis/*`
- не писать HTTP-логику в `services/*`
- не класть Zod-схемы EMIS в random route files, если это reusable contract
- не смешивать CRUD и BI/dataset layer без причины
- для аналитических read-models использовать отдельные queries или dataset layer
- текущую структуру EMIS читать по `db/current_schema.sql`, а не по длинной цепочке migrations
- schema change фиксировать обновлением `db/current_schema.sql` и `db/applied_changes.md`
- если живой БД нужен промежуточный delta-патч до следующего snapshot, использовать `db/pending_changes.sql`

Обязательный EMIS contract для следующих реализаций:

- canonical identity rules должны быть продублированы DB constraints / partial unique indexes
- soft delete semantics должны быть едиными для API, views и recreate/restore сценариев
- audit trail, actor attribution и provenance входят в target contract
- FK behavior и vocabulary boundaries должны фиксироваться явно

## 8. Обязательные проверки после каждой задачи (Review Gate)

После завершения основной работы по задаче, перед тем как показать результат пользователю, выполни Review Gate.

### Субагенты-ревьюеры

Определения субагентов лежат в `.claude/agents/`:

- `security-reviewer.md` — OWASP-проверки, SQL injection, XSS, secrets
- `architecture-reviewer.md` — FSD boundaries, server isolation, IR contract
- `docs-reviewer.md` — актуальность AGENTS.md, CLAUDE.md, schema docs
- `codex-reviewer.md` — second opinion через OpenAI Codex CLI (`codex exec --sandbox read-only`)
- `ui-reviewer.md` — быстрая smoke-проверка UI (Sonnet): страница грузится, console чистый, контент виден
- `ui-reviewer-deep.md` — экспертный UI/UX аудит (Opus): layout, a11y, interaction flows, design system compliance

Первые три используют `model: sonnet` (дешевле, достаточно быстро для review) и `memory: project` (накапливают знания о кодовой базе между сессиями). Codex-reviewer делегирует анализ другой модели — это даёт независимое второе мнение. UI-reviewer использует браузерную автоматизацию через Chrome-расширение — запускается только при изменениях фронтенда (`.svelte`, `.css`, routes).

### Жизненный цикл (Persistent Reviewers)

Субагенты-ревьюеры работают как **persistent сессии внутри разговора**:

**Первая задача в сессии:**

- Spawn 3 субагента параллельно (Agent tool) — они загружают свои `.claude/agents/*.md` определения автоматически

**Последующие задачи:**

- НЕ создавать новых субагентов
- Использовать `SendMessage` к существующим `security-reviewer`, `architecture-reviewer`, `docs-reviewer`
- Передавать только новый diff — субагент уже знает проект

**Результат:** первый Review Gate ~30 сек на контекст, все последующие — мгновенный анализ diff.

**Ограничение:** субагенты живут только в рамках одной сессии (одного разговора). При новой сессии — spawn заново. Это неизбежно, но контекст загружается только 1 раз за сессию, а не на каждую задачу.

### Протокол

1. **Собери scope изменений** (основной агент):

   ```bash
   git diff --name-only   # список изменённых файлов
   git diff               # полный diff для передачи субагентам
   ```

2. **Отправь diff ревьюерам** — если субагенты уже запущены, используй SendMessage; если нет — запусти (Agent) параллельно, передав каждому diff и список файлов:

#### Security Reviewer (`security-reviewer`)

- Проверяет изменённый код на:
  - SQL injection (обход `isSafeIdent`, raw SQL в routes)
  - XSS в Svelte-шаблонах (`{@html}` без санитизации)
  - утечки секретов (hardcoded tokens, .env значения в коде)
  - command injection (непроверенный пользовательский ввод в shell/exec)
  - SSRF (непроверенные URL в fetch на сервере)
- Scope: только изменённые файлы из git diff
- Режим: **read-only**, не редактирует файлы
- Выход: список найденных проблем с severity (critical / warning / info) или "No issues found"

#### Architecture Reviewer (`architecture-reviewer`)

- Проверяет соответствие архитектурным правилам из секции 7:
  - FSD: entities не импортируют features/widgets/routes
  - server-only код (`$lib/server/*`) не импортируется из клиентских модулей
  - IR контракт: UI не видит SQL, routes не содержат SQL
  - EMIS boundaries: HTTP-логика не в services, SQL не в routes
  - import paths используют алиасы (`$lib`, `$shared`, `$entities`, etc.)
- Scope: изменённые файлы + их импорты (1 уровень вглубь)
- Режим: **read-only**
- Выход: список нарушений или "Architecture OK"

#### Docs Reviewer (`docs-reviewer`)

- Проверяет, нужно ли обновить документацию:
  - Изменились экспорты модуля → обновить ближайший `AGENTS.md` / `CLAUDE.md`
  - Добавлен новый route / endpoint → отразить в карте маршрутов
  - Изменился DB schema → обновить `db/current_schema.sql` и `db/applied_changes.md`
  - Изменился контракт (types, Zod schema) → проверить, что downstream docs актуальны
- Scope: изменённые файлы → найти ближайшие навигационные документы
- Режим: **read-only**, формирует список рекомендуемых обновлений
- Выход: список файлов для обновления с описанием что именно обновить, или "Docs up to date"

#### Codex Reviewer (`codex-reviewer`)

- Делегирует анализ diff в OpenAI Codex CLI (`codex exec --sandbox read-only`)
- Даёт независимое второе мнение от другой модели (GPT)
- Scope: тот же diff, что и у остальных ревьюеров
- Режим: **read-only sandbox** (Codex не может модифицировать файлы)
- Выход: находки Codex в формате `[SEVERITY] file:line — description`

#### UI Reviewer — два уровня, условный

Оба запускаются **только если изменены фронтенд-файлы** (`.svelte`, `.css`, routes) и dev server запущен.

**`ui-reviewer` (Sonnet)** — быстрый smoke-test, по умолчанию:

- Страница грузится? Console чистый? Контент виден?
- Клик по основным элементам — ничего не падает?
- Выход: `UI OK` или `[CRITICAL|WARNING] route — описание`

**`ui-reviewer-deep` (Opus)** — экспертный аудит, по запросу:

- Layout quality, spacing, typography hierarchy
- Interaction flows: loading states, empty states, error states
- Accessibility: alt text, labels, contrast, keyboard navigation
- Design system compliance: токены vs hardcoded values
- Используй когда: новая страница, редизайн компонента, важная фича
- Выход: структурированный отчёт по 4 категориям

Выбор уровня: по умолчанию запускается `ui-reviewer` (Sonnet). Для глубокой проверки скажи _"проверь UI на Opus"_ или _"глубокий UI-ревью"_.

3. **Агрегация результатов** (основной агент):
   - Собери отчёты всех субагентов (4 постоянных + UI-reviewer если был фронтенд)
   - Покажи пользователю сводку в формате:

   ```
   ## Review Gate
   - Security (Claude): [OK | N issues found]
   - Architecture: [OK | N violations]
   - Docs: [Up to date | N updates needed]
   - Codex (second opinion): [OK | N issues found]
   - UI (Chrome): [OK | N issues found]  ← только при фронтенд-изменениях
   ```

   - Если есть critical security issues (от любого ревьюера) → исправь сразу, покажи diff
   - Если есть architecture violations или docs updates → предложи исправления, жди подтверждения
   - Если Claude и Codex нашли одну и ту же проблему → повышенный приоритет
   - Если UI-reviewer нашёл blank screen или console errors → приоритетный фикс

### Когда НЕ запускать Review Gate

- Задача была только чтение/анализ (ни один файл не изменён)
- Пользователь явно попросил пропустить проверки
- Изменения только в docs/markdown файлах (запустить только Docs Reviewer)
- UI-reviewer запускается только при изменениях `.svelte`, `.css`, `routes/` файлов и только если dev server запущен

## 9. Git Checkpoints

Для EMIS сохраняем рабочее правило:

- после каждого законченного смыслового этапа делать локальный git commit;
- минимальный ритм checkpoint-коммитов:
  - docs / architecture alignment
  - DB foundation
  - server write/query slice
  - первый рабочий `/emis` workspace
  - интеграция с BI/read-models
