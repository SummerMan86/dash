# EMIS Access Model

Текущий access/auth/write контракт для EMIS.  
Документ отвечает на вопросы:

- какие режимы доступа поддерживаются;
- какие роли существуют и что они могут делать;
- как устроены сессии, write-policy и route protection;
- какие env vars считаются частью operating model.

Исторические migration slices и DDL drafts вынесены из active top-level текста.  
DB truth остаётся в snapshot-first DB документах.

## 1. Supported modes

EMIS поддерживает два режима:

| Mode | Назначение | Поведение |
|---|---|---|
| `EMIS_AUTH_MODE=session` | production и обычный team runtime | cookie-based sessions, login, runtime RBAC |
| `EMIS_AUTH_MODE=none` | dev/local/smoke | reads открыты, writes регулируются write-policy helper |

### Current default

Если `EMIS_AUTH_MODE` не задан, по предоставленным документам default — **`session`**.  
`none` используется только как явный opt-out для dev/smoke.

## 2. Roles

### `viewer`

- read-only доступ к EMIS pages и API;
- может читать каталоги, детали, поиск, карту, BI dashboards;
- не может выполнять write operations.

### `editor`

- всё, что умеет `viewer`;
- может создавать, изменять и мягко удалять:
  - `objects`
  - `news`
  - `links`
- не управляет словарями и админ-функциями.

### `admin`

- всё, что умеет `editor`;
- управляет словарями;
- управляет EMIS-пользователями;
- имеет доступ к `/emis/admin/*` и admin-only API routes.

Role hierarchy:

```text
admin > editor > viewer
```

## 3. Enforcement model

### In `session` mode

| Что защищаем | Как |
|---|---|
| `/emis/*` pages | session required, unauthenticated user идёт на `/emis/login` |
| `GET /api/emis/*` | session required, viewer+ |
| `POST/PATCH/DELETE /api/emis/*` | editor+ через session + write context |
| `/emis/admin/*` и `/api/emis/admin/*` | admin only |

### In `none` mode

- reads остаются открытыми;
- admin session concept отсутствует;
- write access определяется `assertWriteContext()` и write-policy режимом.

## 4. Session model

### 4.1. Cookie contract

| Property | Value |
|---|---|
| Name | `emis_session` |
| Content | opaque session ID |
| Path | `/` |
| HttpOnly | `true` |
| SameSite | `Lax` |
| Secure | `true` in production, `false` in dev |
| Max-Age | 24h by default |

Session TTL настраивается через `EMIS_SESSION_TTL_HOURS`.

### 4.2. Session resolution

SvelteKit hook:

1. читает cookie `emis_session`;
2. ищет session в session store;
3. кладёт сессию в `event.locals`;
4. при отсутствии валидной session:
   - `/emis/login` и `/emis/logout` пропускаются;
   - `/api/emis/*` возвращает `401`;
   - `/emis/*` редиректит на login;
   - non-EMIS routes не защищаются этим механизмом.

### 4.3. User and session stores

Primary stores:

- users: `emis.users`
- sessions: `emis.sessions`

Transition / graceful fallback:

- `EMIS_USERS` — legacy fallback, если DB users недоступны или пусты;
- in-memory session store — fallback, если DB session store недоступен.

Для текущего operating model DB stores являются canonical truth; fallback нужен для безопасного transition/degraded runtime.

## 5. Write-policy helper

`assertWriteContext()` — единая точка входа для всех write-операций.

### In `session` mode

- actor определяется из authenticated session;
- `viewer` получает отказ на write;
- `editor` и `admin` получают write context;
- произвольные actor headers не являются source of truth.

### In `none` mode

Поведение зависит от `EMIS_WRITE_POLICY`:

| Policy | Если actor header отсутствует | Если actor header присутствует |
|---|---|---|
| `strict` | `403 WRITE_NOT_ALLOWED` | write context разрешён |
| `permissive` | используется source-based default actor | write context разрешён |

Поддерживаемые headers для none-mode:

- `x-emis-actor-id`
- `x-actor-id`

## 6. Actor, role, audit

Нужно различать:

| Term | Что означает |
|---|---|
| `actorId` | идентичность для audit trail |
| `role` | authorization level: `viewer`, `editor`, `admin` |

Правила:

- в `session` mode `actorId` выводится из session user;
- в `none` mode actor может прийти из header или default policy;
- audit trail обязателен для каждой create/update/delete операции;
- actor attribution не заменяет role enforcement.

## 7. Auth flows

### Login / logout

| Route | Method | Назначение |
|---|---|---|
| `/emis/login` | `GET` | форма логина |
| `/emis/login` | `POST` | аутентификация и установка cookie |
| `/emis/logout` | `POST` | удаление session cookie |

### Change password

| Route | Method | Назначение |
|---|---|---|
| `/api/emis/auth/change-password` | `POST` | смена собственного пароля |

Требования:

- проверка текущего пароля;
- минимальная валидация нового пароля;
- инвалидировать остальные session данного пользователя после смены пароля.

### Admin user management

| Route | Method | Назначение |
|---|---|---|
| `/api/emis/admin/users` | `GET` | list users |
| `/api/emis/admin/users` | `POST` | create user |
| `/api/emis/admin/users/:id` | `PATCH` | update role / reset password |
| `/api/emis/admin/users/:id` | `DELETE` | delete user |

Инварианты:

- `password_hash` не возвращается наружу;
- admin не удаляет собственную учётную запись;
- admin mutations проходят через audit + role enforcement.

## 8. Dictionary and admin policy

По текущему набору документов словари не считаются больше deferred/seeds-only зоной.  
Актуальная правда:

- seeds остаются bootstrap-механизмом;
- словари доступны через admin CRUD;
- admin-only pages и routes реально входят в operating model.

Это решение важнее старых freeze notes, где словари были описаны как deferred.

## 9. Environment variables

| Variable | Purpose | Typical default |
|---|---|---|
| `EMIS_AUTH_MODE` | `session` или `none` | `session` |
| `EMIS_WRITE_POLICY` | strict/permissive для none-mode writes | `permissive` |
| `EMIS_SESSION_TTL_HOURS` | session TTL | `24` |
| `EMIS_USERS` | legacy env-based user fallback | unset |
| `EMIS_ADMIN_PASSWORD` | bootstrap admin for fresh deployment | unset |
| `EMIS_BCRYPT_ROUNDS` | bcrypt cost factor | `12` |

## 10. Verification

Если менялся access/auth слой, минимум проверить:

```bash
pnpm emis:auth-smoke
pnpm emis:write-smoke
pnpm emis:smoke
```

Если менялся только none-mode write behavior, особенно важен `pnpm emis:write-smoke`.

## 11. Out of scope for this document

Здесь больше не живут:

- DDL drafts для `emis.users` и `emis.sessions`;
- пошаговая история AUTH-1..AUTH-8;
- псевдокод migration plan;
- длинные implementation notes, уже подтверждённые кодом или DB snapshot.

Эти детали должны жить в DB truth, code comments или archive, а не в основном access contract.

## 12. Related sources

- `architecture.md` — границы модуля и execution paths;
- `change_policy.md` — review triggers и invariants;
- `operations.md` — readiness, logs, verification;
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — error/meta conventions;
- `db/current_schema.sql` — canonical DDL truth.
