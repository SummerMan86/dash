# EMIS Access Model (Viewer / Editor / Admin)

Этот документ фиксирует минимальную модель доступа для EMIS и правила write-guardrails перед новой большой волной разработки.
Цель: чтобы обсуждение "кто что может" и "где это enforce" не происходило заново в каждой задаче.

## 1. Текущее состояние (на 4 апреля 2026)

- В репозитории нет аутентификации/сессий/ролей на уровне SvelteKit (`hooks.server.ts` не делает auth middleware).
- EMIS write endpoints технически доступны так же, как read endpoints.
- `x-emis-actor-id` / `x-actor-id` используются **только для audit attribution**, а не для authorization.

Следствие: текущий runtime предполагает trusted environment. Перед любым публичным доступом нужны guardrails.

## 2. Роли и полномочия

Роли здесь описывают **authorization**, не UI/UX.

### `viewer`

- Может: read-only доступ ко всем EMIS reads (catalog/detail/search/map).
- Не может: любые writes (create/update/delete/attach/detach).

### `editor`

- Может: все `viewer` плюс writes по доменным сущностям EMIS:
  - `objects` (create/update/soft-delete)
  - `news` (create/update/soft-delete)
  - `links` (attach/update/detach)
- Не может: управлять dictionaries (если они остаются seed-managed) и выполнять admin-only ops.

### `admin`

- Может: все `editor` плюс admin-only операции:
  - dictionary management (если принято решение делать CRUD, а не seed-managed only)
  - restore/undelete flows (если вводим)
  - ops/maintenance endpoints (если появятся)

## 3. Non-negotiables (контракт)

- **Server не доверяет UI**: write access должен блокироваться server-side, а не через "спрятали кнопку".
- **Audit attribution не является auth**: `actorId` в `audit_log` полезен для трассировки, но не должен быть единственным механизмом контроля доступа.
- **Единая точка проверки**: все writes должны проходить через одно место (policy function), а не через условные if'ы в каждом route.
- Любая новая write surface (API route или form action) должна явно указать требуемую роль (`editor`/`admin`).

## 4. Где enforce (placement)

### 4.1. API writes (`/api/emis/*`)

- Route layer: `apps/web/src/routes/api/emis/*` (transport-only) вызывает:
  - `@dashboard-builder/emis-server` services/repositories (domain logic)
  - app-owned transport glue: `$lib/server/emis/infra/http.ts`

Policy enforcement по ролям должен жить на app boundary рядом с transport glue (потому что интеграция с сессией/куками/SSO будет app-specific).

### 4.2. Manual UI writes (`/emis/*` form actions)

Form actions в `apps/web/src/routes/emis/*/+page.server.ts` и соседних server files тоже должны использовать тот же policy helper (не дублировать правила).

### 4.3. DB-level invariants

Некоторые "нельзя" должны быть выражены в БД, а не только в коде:

- identity и уникальности (partial unique индексы для soft delete)
- append-only audit log (уже закреплено триггерами)
- FK behavior (explicit)

Это не заменяет role-based access, но убирает часть классов ошибок.

## 5. Actor vs Role

Термины:

- `actorId`: строковый идентификатор для audit trail (может быть не UUID). Сейчас приходит из заголовков.
- `role`: `viewer|editor|admin` (authorization).

Рекомендация для стабилизации:

- пока нет auth: `actorId` можно оставлять как diagnostics, но не использовать для authorization;
- при появлении auth: `actorId` должен вычисляться из session identity, а не из произвольного header.

## 6. Минимальный план стабилизации (без выбора SSO)

Этот документ задает target contract. Технический rollout можно сделать в 2 шага:

1. Coarse guardrail: kill-switch для writes (например `EMIS_WRITES=disabled|enabled`) с дефолтом "disabled" в production.
2. Role-based: `requireEmisRole(event, 'editor'|'admin')` для writes + единая роль для manual-ui actions.

Конкретный механизм auth (SSO, basic auth, API key) остаётся отдельным design decision.

## 7. Связанные документы

- Runtime/API conventions: `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Working rules (placement, review triggers): `docs/emis_working_contract.md`
- Boundary map: `docs/emis_architecture_baseline.md`
- Observability/readiness контракт: `docs/emis_observability_contract.md`
