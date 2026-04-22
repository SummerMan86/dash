# EMIS Documentation

Оптимизированный комплект документации для модуля EMIS.  
Цель этого набора — дать **короткий стартовый вход**, **актуальную архитектурную правду**, **понятные правила изменений** и **отдельные специализированные контракты** без смешения текущего состояния, исторических волн и feature-specific заметок.

## 1. Что считать текущей правдой

На основе предоставленного набора документов текущим состоянием EMIS следует считать:

- EMIS живёт внутри текущего `SvelteKit` приложения как **single deployable app**.
- Архитектурный стиль: **modular monolith**.
- Reusable EMIS-код имеет canonical home в:
  - `packages/emis-contracts/`
  - `packages/emis-server/`
  - `packages/emis-ui/`
- Operational path и BI/read-side path остаются разными execution paths.
- Production auth включён **по умолчанию**:
  - `EMIS_AUTH_MODE=session` — основной режим;
  - `EMIS_AUTH_MODE=none` — только dev/smoke.
- Admin CRUD для словарей и пользователей уже считается **живой частью системы**, а не deferred scope.
- По предоставленным документам baseline закрыт, активных архитектурных исключений нет.

## 2. Границы модуля

EMIS-модуль включает:

- operational routes под `/emis/*` и `/api/emis/*`;
- domain packages `emis-contracts`, `emis-server`, `emis-ui`;
- operational storage в `emis`, staging в `stg_emis`, derived read-models в `mart_emis`.

Не входит в модуль EMIS в узком смысле:

- аналитические маршруты `/dashboard/emis/*`;
- dataset runtime как platform-layer;
- repo-wide правила, не специфичные для EMIS.

BI-маршруты потребляют EMIS только через published read-models и dataset pipeline.

## 3. Какие документы читать

| Если нужен ответ на вопрос | Документ |
|---|---|
| Что сейчас считается правдой, где искать дальше | `README.md` |
| Как устроен EMIS, где проходят границы, как идут operational/BI потоки | `architecture.md` |
| Как изменять EMIS без архитектурного дрейфа | `change_policy.md` |
| Что входит в продуктовый scope, что не входит, какие инварианты обязательны | `product_scope.md` |
| Кто и как получает доступ, какие роли и write-правила действуют | `access_model.md` |
| Как проверять readiness, логи, offline maps и post-deploy состояние | `operations.md` |
| Как делать structural migration и не ломать зависимости | `structural_migration.md` |

Исторические и feature-specific материалы вынесены в `archive/`.

## 4. Короткая карта архитектуры

### Operational path

```text
/emis/* или /api/emis/*
  -> SvelteKit route / page
  -> app-owned HTTP glue
  -> packages/emis-server/src/modules/*
  -> queries.ts / repository.ts / service.ts
  -> PostgreSQL / PostGIS
```

### BI / read-side path

```text
/dashboard/emis/*
  -> fetchDataset(...)
  -> /api/datasets/:id
  -> compileDataset(...)
  -> DatasetIr
  -> Provider
  -> published mart / view
```

### Structural path

Структурные перемещения файлов и extraction в packages описаны отдельно в `structural_migration.md`.  
Их нельзя смешивать с domain rewrite в одном slice.

## 5. Базовые правила, которые нельзя нарушать

- Не писать SQL в `apps/web/src/routes/api/emis/*`.
- Не писать HTTP-логику в `packages/emis-server/*`.
- Не тянуть EMIS operational behavior в BI dataset layer без явной BI-причины.
- Не использовать `/dashboard/emis/*` как backdoor для operational fetch logic.
- Не считать compatibility shims “новым каноническим домом”.
- Не смешивать structural move и API/domain rewrite в одном change set.
- Любое изменение DB truth должно обновлять snapshot-first DB документы.

## 6. Минимальный набор проверок

Базовые команды:

```bash
pnpm check
pnpm build
pnpm lint:boundaries
pnpm emis:smoke
pnpm emis:offline-smoke
pnpm emis:write-smoke   # если затронут write-side
pnpm emis:auth-smoke    # если затронут auth/session/rbac
```

На shared-folder mounts:

```bash
CHOKIDAR_USEPOLLING=1 pnpm emis:smoke
CHOKIDAR_USEPOLLING=1 pnpm emis:offline-smoke
CHOKIDAR_USEPOLLING=1 pnpm emis:write-smoke
```

## 7. Что сознательно убрано из top-level active docs

В активном наборе больше не живут как самостоятельные top-level документы:

- backlog/status wave notes;
- freeze notes с уже устаревшими решениями;
- отдельный реестр исключений при нулевом количестве live exceptions;
- feature-specific frozen contract, который не определяет весь модуль.

Они перемещены в `archive/` или свернуты в более короткие разделы текущих документов.

## 8. Внешние опорные источники

Этот набор не заменяет:

- `docs/architecture.md` — repo-wide architecture;
- `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md` — активная DB truth;
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — runtime/API conventions.

EMIS-документы должны дополнять эти источники, а не дублировать их.
