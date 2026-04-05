# Plan: EMIS Phase 5 — Production-Ready Auth Hardening

## Цель

Превратить текущую базовую auth (DF-3: env-based users, plaintext passwords, in-memory sessions, opt-in mode) в production-ready систему:
- Auth обязателен по умолчанию
- Пароли в bcrypt
- Users в БД с admin UI
- Sessions persistent в БД
- Смена пароля, seed начального admin

Результат: EMIS можно безопасно выставить для команды без рисков unauthorized access.

## Контекст

- Phase 4 (DF-3) реализовала базовую auth: `EMIS_AUTH_MODE=none|session`, env-based users, plaintext password comparison, in-memory sessions, login/logout pages, role enforcement
- Текущие файлы:
  - `apps/web/src/lib/server/emis/infra/auth.ts` — session/user store, role helpers
  - `apps/web/src/hooks.server.ts` — middleware
  - `apps/web/src/routes/emis/login/` — login page
  - `apps/web/src/routes/emis/logout/` — logout
  - `apps/web/src/lib/server/emis/infra/writePolicy.ts` — `assertWriteContext()` с session support
- Contract: `docs/emis_access_model.md` section 5
- DB: `db/current_schema.sql` — `emis` schema, нет таблицы users/sessions

## Scope

Только auth hardening. Никаких новых фич, UI изменений за пределами auth/admin.

## Slices

### AUTH-1: Contract freeze — production auth design (docs only)
- status: ready for handoff
- scope:
  - Обновить `docs/emis_access_model.md` section 5 с новым контрактом
  - Зафиксировать решения:
    - `EMIS_AUTH_MODE` default меняется с `none` на `session`
    - `EMIS_AUTH_MODE=none` остаётся для dev/smoke (backward compat)
    - Users таблица: `emis.users` (id, username, password_hash, role, created_at, updated_at)
    - Sessions таблица: `emis.sessions` (id, user_id, role, created_at, expires_at)
    - Password hashing: bcrypt (cost factor 12)
    - Initial admin seed: via `db/seeds/` или env fallback `EMIS_ADMIN_PASSWORD`
    - Smoke tests: `EMIS_AUTH_MODE=none` для dev, отдельный auth smoke для session mode
  - Зафиксировать migration plan: добавить таблицы без breaking change для текущего env-based mode
- done when: контракт заморожен, migration plan ясен

### AUTH-2: DB schema — users and sessions tables
- status: depends on AUTH-1
- scope:
  - Создать таблицу `emis.users`:
    ```sql
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
    username      TEXT NOT NULL UNIQUE
    password_hash TEXT NOT NULL
    role          TEXT NOT NULL CHECK (role IN ('viewer','editor','admin'))
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    ```
  - Создать таблицу `emis.sessions`:
    ```sql
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
    user_id       UUID NOT NULL REFERENCES emis.users(id)
    role          TEXT NOT NULL
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    expires_at    TIMESTAMPTZ NOT NULL
    ```
  - Index: `emis.sessions(expires_at)` для cleanup
  - Seed initial admin user (bcrypt hash)
  - Обновить `db/current_schema.sql`, `db/schema_catalog.md`, `db/applied_changes.md`
- constraints:
  - Не ломать существующую `emis` schema
  - SQL migration в `db/` по convention
- done when:
  - Tables created and seeded
  - `pnpm check`, `pnpm build` green

### AUTH-3: Bcrypt password hashing + DB user store
- status: depends on AUTH-2
- scope:
  - Добавить `bcrypt` dependency (или `@node-rs/bcrypt` для performance)
  - Рефакторить `auth.ts`:
    - `authenticateUser()`: bcrypt.compare вместо plaintext
    - `getConfiguredUsers()`: читать из DB (primary), fallback на env var (migration period)
    - Добавить `createUser()`, `updateUser()`, `listUsers()`, `getUserById()`
  - User repository в `packages/emis-server/src/modules/users/` (SQL queries)
  - User contracts в `packages/emis-contracts/src/emis-user/`
- constraints:
  - Backward compat: если `EMIS_USERS` env задан И DB users пуста, использовать env (с warning)
  - Если DB users есть, env fallback игнорируется
  - bcrypt cost factor 12 (configurable через env `EMIS_BCRYPT_ROUNDS`)
- done when:
  - Password verification через bcrypt
  - Users из DB
  - Env fallback работает для migration
  - `pnpm check`, `pnpm build`, `pnpm lint:boundaries` green

### AUTH-4: DB session persistence
- status: depends on AUTH-2
- scope:
  - Рефакторить session store из in-memory Map в DB-backed:
    - `createSession()`: INSERT в `emis.sessions`
    - `getSession()`: SELECT + expiry check
    - `deleteSession()`: DELETE
    - Expired session cleanup: периодический DELETE или lazy на read
  - Sessions переживают restart сервера
  - Session repository в `packages/emis-server/src/modules/sessions/` или в users module
- constraints:
  - Fallback на in-memory если нет DB connection (graceful degradation)
  - Session TTL: 24h (configurable через env `EMIS_SESSION_TTL_HOURS`)
- done when:
  - Sessions persist across server restart
  - Expired sessions cleaned up
  - `pnpm check`, `pnpm build` green

### AUTH-5: Admin user management UI
- status: depends on AUTH-3
- scope:
  - API endpoints:
    - `GET /api/emis/admin/users` — list users (admin only)
    - `POST /api/emis/admin/users` — create user (admin only)
    - `PATCH /api/emis/admin/users/:id` — update user (admin only, role/password change)
    - `DELETE /api/emis/admin/users/:id` — deactivate user (admin only, soft or hard delete)
  - UI page: `/emis/admin/users`
    - List all users (username, role, created_at)
    - Create new user form (username, password, role)
    - Edit user (change role, reset password)
    - Delete/deactivate user
    - Admin cannot delete own account
  - Wired through `assertWriteContext()` + admin role enforcement
- constraints:
  - Follow EMIS API conventions from RUNTIME_CONTRACT
  - Admin only — enforce in hooks + route handlers
  - Password не возвращается в API responses
  - SQL в `packages/emis-server/` only
- done when:
  - Users manageable через admin UI
  - API endpoints работают с audit
  - `pnpm check`, `pnpm build`, `pnpm lint:boundaries` green
  - Smoke checks для user management API

### AUTH-6: Change password flow
- status: depends on AUTH-3
- scope:
  - API: `POST /api/emis/auth/change-password` (any authenticated user)
    - Body: `{ currentPassword, newPassword }`
    - Verify current password via bcrypt
    - Hash new password, update DB
    - Invalidate all other sessions for this user
  - UI: `/emis/settings` или modal на profile dropdown
    - Current password field
    - New password + confirm
    - Success feedback
  - Password requirements: minimum 8 characters (configurable)
- constraints:
  - Любой authenticated user может менять свой пароль
  - Admin может reset пароль другого user через AUTH-5
  - Не требовать current password при admin reset
- done when:
  - Users can change own password
  - Old sessions invalidated after change
  - `pnpm check`, `pnpm build` green

### AUTH-7: Default auth mode switch + smoke coverage
- status: depends on AUTH-3, AUTH-4
- scope:
  - Переключить `EMIS_AUTH_MODE` default с `none` на `session`
  - Обновить auth.ts: `getAuthMode()` returns `session` when env not set
  - При `session` mode без DB users И без `EMIS_USERS` env:
    - Auto-create admin from `EMIS_ADMIN_PASSWORD` env (если задан)
    - Или fallback на `none` с warning (safety net)
  - Обновить smoke scripts:
    - `pnpm emis:smoke` — добавить `EMIS_AUTH_MODE=none` в env (explicit opt-out)
    - Новый `pnpm emis:auth-smoke` — тестирует auth flows в session mode:
      - Login with valid credentials → 200 + session cookie
      - Login with invalid credentials → fail
      - Access protected route without session → 401/redirect
      - Access admin route as editor → 403
      - Change password flow
  - Обновить `.env.example` с auth-related переменными
- done when:
  - Auth enabled by default
  - Existing smoke tests still pass (explicit `EMIS_AUTH_MODE=none`)
  - New auth smoke tests pass
  - `pnpm check`, `pnpm build` green

### AUTH-8: Governance closure and final baseline
- status: depends on all above
- scope:
  - Full baseline: all 6 canonical checks + auth smoke
  - Update docs:
    - `docs/emis_access_model.md` — reflect production auth
    - `docs/emis_session_bootstrap.md`
    - `docs/emis_next_tasks_2026_03_22.md`
    - `RUNTIME_CONTRACT.md` — add user/session endpoints
  - Update agent docs: `last_report.md`, `memory.md`, this plan
- done when:
  - All checks green
  - Docs consistent
  - Baseline closed

## Execution Order

```
AUTH-1 (contract) → AUTH-2 (DB schema)
                     ├→ AUTH-3 (bcrypt + DB users) → AUTH-5 (admin UI)
                     │                              → AUTH-6 (change password)
                     └→ AUTH-4 (DB sessions)
                                                      ↓
                     AUTH-7 (default switch + smoke) ←─┘
                                                      ↓
                     AUTH-8 (governance closure)
```

- AUTH-1 first (contract freeze)
- AUTH-2 depends on AUTH-1 (schema from contract)
- AUTH-3 and AUTH-4 can run in parallel after AUTH-2
- AUTH-5 and AUTH-6 depend on AUTH-3
- AUTH-7 depends on AUTH-3 + AUTH-4
- AUTH-8 after all

## Recommended Handoff To Lead-Tactical

1. AUTH-1 (docs only, quick)
2. AUTH-2 (DB schema, quick)
3. AUTH-3 + AUTH-4 in parallel (main implementation)
4. AUTH-5 + AUTH-6 in parallel (UI + flows)
5. AUTH-7 (integration, switch default)
6. AUTH-8 (governance)

## Risk Notes

- AUTH-7 (default switch) — changing default auth mode is a breaking change for local dev. Mitigation: clear documentation, `.env.example` update, smoke scripts explicitly set `EMIS_AUTH_MODE=none`.
- bcrypt is CPU-intensive — use async `bcrypt.compare()` to not block event loop.
- DB sessions add DB dependency to auth path — ensure graceful fallback if DB is down.
- Password storage — never log passwords, never return `password_hash` in API responses.
