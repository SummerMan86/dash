# EMIS Access Model

Canonical reference for EMIS operating model, role semantics and write-policy contract.

This document is the single source of truth for who can write what in EMIS. It is intentionally minimal for MVE and does not introduce a full auth/RBAC system.

## 1. Operating Model

EMIS MVE operates in a **trusted internal network** contour.

What this means concretely:

- The application is deployed on an internal server (currently a VPS accessible only to the team).
- There is no public internet exposure of write endpoints.
- There is no authentication middleware, session management, or login flow.
- Every user who can reach the application is implicitly trusted to read all data.
- Write access is governed by the write-policy helper (see section 4), not by user sessions.

This is an **explicit, accepted limitation of MVE**, not a gap waiting to be silently filled.

## 2. Role Semantics

Roles describe **authorization intent**, not runtime enforcement. MVE does not have a role resolver or session-to-role mapping. The roles below define what the system considers valid behavior for each class of user.

### `viewer`

- Read-only access to all EMIS data: catalogs, detail views, search, map, BI dashboards.
- Cannot perform any write operations.
- In MVE: every user is implicitly a viewer.

### `editor`

- All `viewer` capabilities, plus writes on domain entities:
  - `objects` (create, update, soft-delete)
  - `news` (create, update, soft-delete)
  - `links` (attach, update, detach)
- Cannot manage dictionaries or perform admin-only operations.
- In MVE: any user who provides a valid actor identity via the write-policy helper is implicitly an editor.

### `admin`

- All `editor` capabilities, plus:
  - dictionary management (if dictionaries leave seed-managed mode)
  - restore/undelete flows (if introduced)
  - ops/maintenance endpoints (if introduced)
- In MVE: **deferred**. No admin-only operations exist yet. Dictionary management is seed-managed.

## 3. What Is Enforced Now vs Deferred

### Enforced in MVE (current state)

| Mechanism           | Where                                                                    | What it does                                                                               |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Actor attribution   | `resolveEmisWriteContext()` in `packages/emis-server/src/infra/audit.ts` | Resolves `actorId` from `x-emis-actor-id` / `x-actor-id` headers; auto-defaults per source |
| Audit trail         | `insertAuditLog()` in every write service                                | Append-only `emis.audit_log` row within the same transaction                               |
| DB-level invariants | Partial unique indexes, FK constraints, append-only audit trigger        | Prevents data corruption regardless of application-level checks                            |
| Deployment contour  | Trusted internal network                                                 | No public internet exposure of the application                                             |

### Implemented (NW-2, 2026-04-04)

| Mechanism           | Where                                                                         | What it does                                                                                     |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Write-policy helper | `assertWriteContext()` in `apps/web/src/lib/server/emis/infra/writePolicy.ts` | Validates that write context is present and actor is identified; rejects with 403 in strict mode |

### Implemented (DF-3, 2026-04-05)

| Mechanism                        | Where                                                                     | What it does                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Session-based authentication     | `apps/web/src/lib/server/emis/infra/auth.ts` + `hooks.server.ts`          | Cookie-based sessions; login/logout flow at `/emis/login`; env-configured users via `EMIS_USERS`        |
| Role-based access control (RBAC) | `hooks.server.ts` middleware + `assertWriteContext()` in `writePolicy.ts` | Session role enforcement: viewer (read), editor (write), admin (admin pages + write)                    |
| Admin route protection           | `hooks.server.ts` middleware                                              | `/emis/admin/*` pages require admin role; unauthenticated users redirected to login                     |
| Admin CRUD for dictionaries      | `/api/emis/dictionaries/*` + `/emis/admin/dictionaries`                   | Full CRUD UI for countries, object_types, sources; write endpoints require editor+ role via writePolicy |

### No remaining deferrals

All mechanisms previously listed as "deferred beyond MVE" have been implemented in DF-3 (session-based auth) or resolved through the operating model:

| Mechanism                                  | Status                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Authentication (SSO, API keys, basic auth) | Implemented as session-based auth (DF-3). Toggle: `EMIS_AUTH_MODE=session`. Default: `none`.       |
| Session management                         | Implemented: cookie-based sessions, in-memory store, 24h TTL. See section 5.                       |
| Role-based access control (RBAC)           | Implemented: viewer/editor/admin with role hierarchy. Enforced in hooks + writePolicy.             |
| Per-entity permission model                | Not implemented (not required). All editors can write all entities.                                |
| Admin role enforcement                     | Implemented: `/emis/admin/*` pages require admin role. Dictionary API writes require editor+ role. |

## 4. Write-Policy Helper Contract

This section defines the contract for the centralized write-policy helper that all write entry points must use.

### Status

**Implemented in NW-2 (2026-04-04).** Design frozen in NW-1.

### Purpose

Replace the current pattern where `resolveEmisWriteContext()` is called directly in routes (audit-only, never rejects) with a single policy checkpoint that:

1. Resolves write context (actor + source).
2. Validates that the write is allowed under current policy.
3. Rejects disallowed writes with a structured 403 response.

### Target signature

```typescript
/**
 * Validate write context for an EMIS write operation.
 *
 * In strict mode (production-shaped): requires an explicit actor identity
 * via x-emis-actor-id or x-actor-id header. Rejects with 403 if missing.
 *
 * In permissive mode (dev/local): falls back to source-based default actor
 * (same behavior as current resolveEmisWriteContext).
 *
 * @throws EmisError(403, 'WRITE_NOT_ALLOWED', message) in strict mode when actor is missing
 */
export function assertWriteContext(request: Request, source: EmisWriteSource): EmisWriteContext;
```

### Behavior modes

| Mode           | When active                                           | Actor header missing                                                              | Actor header present                                 |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **strict**     | `EMIS_WRITE_POLICY=strict` or production              | 403 `WRITE_NOT_ALLOWED`                                                           | Resolve actor from header, return `EmisWriteContext` |
| **permissive** | `EMIS_WRITE_POLICY=permissive` or dev/local (default) | Auto-default actor per source (`api-client`, `local-manual-ui`, `server-process`) | Resolve actor from header, return `EmisWriteContext` |

Mode is determined by `EMIS_WRITE_POLICY` env var. If not set, defaults to `permissive` (backward-compatible with current dev workflow).

### Failure shape

```json
{
	"error": "Write operations require actor identification. Set x-emis-actor-id or x-actor-id header.",
	"code": "WRITE_NOT_ALLOWED"
}
```

HTTP status: `403`.

This follows the existing `{ error, code }` convention from the EMIS runtime contract.

### Integration pattern

Every write entry point (API route handler or form action) replaces its current `resolveEmisWriteContext()` call with `assertWriteContext()`:

```typescript
// Before (audit-only, never rejects):
const ctx = resolveEmisWriteContext(request, 'api'); // API routes
const ctx = resolveEmisWriteContext(request, 'manual-ui'); // form actions

// After (policy + audit):
const ctx = assertWriteContext(request, 'api'); // API routes
const ctx = assertWriteContext(request, 'manual-ui'); // form actions
```

The return type is identical (`EmisWriteContext`), so downstream service/repository signatures do not change.

### Ownership

- Canonical home: `apps/web/src/lib/server/emis/infra/writePolicy.ts`
- Rationale: write-policy enforcement is app-level transport glue (403 response construction). The underlying `resolveEmisWriteContext` stays in `packages/emis-server` as a framework-agnostic audit utility.
- **Architecture-steward decision (2026-04-04): approve placement.** 403 response construction = HTTP transport glue → app layer. Peer of `infra/http.ts`. No exception needed.
- Invariants: no SQL in `writePolicy.ts`; policy config (env var) is app-level deployment concern, not package business logic.

## 5. Production Auth Contract (Phase 5)

**Status:** design frozen in AUTH-1 (2026-04-04). Supersedes DF-3 contract.
Implementation plan: AUTH-2 through AUTH-7.

This section is the canonical auth contract for production EMIS. The DF-3 implementation (env-based users, plaintext passwords, in-memory sessions) remains operational during the transition period. Each AUTH-N slice migrates one aspect from DF-3 to production-grade.

### Auth mode toggle

Auth behavior is controlled by `EMIS_AUTH_MODE` env var:

| Value     | When                                         | Behavior                                                                                    |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `none`    | Dev/local, smoke tests (explicit opt-out)    | No session required. Actor resolved from headers (current MVE behavior). No login redirect. |
| `session` | **Default.** Production and all deployments. | Cookie-based sessions. Unauthenticated requests to protected routes redirect to login.      |

**Default change (AUTH-7):** if `EMIS_AUTH_MODE` is not set, defaults to **`session`** (previously `none`). Dev workflows and smoke scripts must explicitly set `EMIS_AUTH_MODE=none` if auth is not desired. This is a **breaking change** from DF-3.

Safety net: if `EMIS_AUTH_MODE` is not set AND there are no DB users AND no `EMIS_USERS` env AND no `EMIS_ADMIN_PASSWORD` env, the system falls back to `none` with a startup warning.

### Session shape

```typescript
type EmisSession = {
	userId: string; // UUID from emis.users.id (or legacy string in env fallback mode)
	username: string; // display name
	role: EmisRole; // 'viewer' | 'editor' | 'admin'
	createdAt: number; // Unix timestamp (ms) when session was created
};

type EmisRole = 'viewer' | 'editor' | 'admin';
```

### Cookie contract

| Property | Value                                |
| -------- | ------------------------------------ |
| Name     | `emis_session`                       |
| Content  | Opaque session ID (UUID)             |
| Path     | `/`                                  |
| HttpOnly | `true`                               |
| SameSite | `Lax`                                |
| Secure   | `true` in production, `false` in dev |
| Max-Age  | 86400 (24 hours, configurable)       |

Session TTL is configurable via `EMIS_SESSION_TTL_HOURS` env var (default: 24).

### User store

**Primary (AUTH-3+):** DB table `emis.users`.

**Fallback (transition period):** env var `EMIS_USERS` (JSON array, same format as DF-3). The env fallback is used only when `emis.users` table is empty or unreachable. When DB users exist, `EMIS_USERS` env is ignored.

Format for env fallback (unchanged from DF-3):

```
EMIS_USERS='[{"id":"admin","username":"Admin","password":"admin123","role":"admin"}]'
```

Resolution order in `getConfiguredUsers()`:

1. Query `emis.users` table. If rows exist, use them (DB is source of truth).
2. If table is empty or DB is unreachable, parse `EMIS_USERS` env var (with deprecation warning).
3. If neither is available and `EMIS_ADMIN_PASSWORD` is set, auto-create admin user (see Initial Admin below).
4. If nothing is available, log warning; safety net may fall back to `none` mode.

### Password hashing

**Algorithm:** bcrypt.

| Parameter    | Value                                 |
| ------------ | ------------------------------------- |
| Algorithm    | bcrypt                                |
| Cost factor  | 12 (default)                          |
| Configurable | `EMIS_BCRYPT_ROUNDS` env var          |
| Min rounds   | 10 (enforced, lower values rejected)  |
| Max rounds   | 14 (enforced, higher values rejected) |

`authenticateUser()` changes from plaintext comparison to `bcrypt.compare()`. The async variant must be used to avoid blocking the event loop.

Passwords in `EMIS_USERS` env var remain plaintext for backward compatibility during transition. When env fallback is active, passwords are compared as plaintext (same as DF-3). When DB users are active, passwords are always bcrypt hashes.

### Session store

**Primary (AUTH-4+):** DB table `emis.sessions`.

**Fallback:** in-memory `Map<sessionId, EmisSession>` if DB is unreachable (graceful degradation). Sessions created in-memory are lost on server restart.

Session lifecycle:

- `createSession()`: INSERT into `emis.sessions`, return session ID.
- `getSession()`: SELECT + expiry check. Expired sessions return null and are lazily deleted.
- `deleteSession()`: DELETE from `emis.sessions`.
- Cleanup: expired sessions are deleted lazily on read. Periodic bulk cleanup is optional (not required for correctness).

### Initial admin user

For fresh deployments without any users in the DB:

1. **Seed file (preferred):** `db/seeds/` contains a seed script that creates an initial admin user with a bcrypt-hashed password.
2. **Env fallback:** if `EMIS_ADMIN_PASSWORD` is set and `emis.users` is empty, auto-create an admin user:
   - username: `admin`
   - password: bcrypt hash of `EMIS_ADMIN_PASSWORD` value
   - role: `admin`
   - This happens once at startup; subsequent startups skip if admin already exists.

### Admin user management (AUTH-5)

API endpoints (admin role required):

| Route                       | Method   | Purpose                                |
| --------------------------- | -------- | -------------------------------------- |
| `/api/emis/admin/users`     | `GET`    | List all users (no password_hash)      |
| `/api/emis/admin/users`     | `POST`   | Create user (username, password, role) |
| `/api/emis/admin/users/:id` | `PATCH`  | Update user (role, reset password)     |
| `/api/emis/admin/users/:id` | `DELETE` | Delete user (hard delete)              |

UI page: `/emis/admin/users` — list, create, edit, delete users.

Constraints:

- Admin cannot delete their own account.
- `password_hash` is never returned in API responses.
- Password field in create/update is optional on PATCH (omit to keep current password).
- All mutations go through `assertWriteContext()` + admin role enforcement.

### Change password (AUTH-6)

API endpoint (any authenticated user):

| Route                            | Method | Purpose             |
| -------------------------------- | ------ | ------------------- |
| `/api/emis/auth/change-password` | `POST` | Change own password |

Request body:

```json
{
	"currentPassword": "string",
	"newPassword": "string"
}
```

Behavior:

1. Verify `currentPassword` against stored bcrypt hash.
2. Validate `newPassword`: minimum 8 characters (configurable via `EMIS_MIN_PASSWORD_LENGTH`, default 8).
3. Hash `newPassword` with bcrypt, update `emis.users.password_hash`.
4. **Invalidate all other sessions** for this user (DELETE from `emis.sessions` WHERE `user_id` = current user AND `id` != current session).
5. Return 200 on success.

Admin password reset (via `/api/emis/admin/users/:id` PATCH): does not require `currentPassword`. Also invalidates all sessions of the target user.

### Login page

| Route          | Method | Purpose                                        |
| -------------- | ------ | ---------------------------------------------- |
| `/emis/login`  | GET    | Render login form                              |
| `/emis/login`  | POST   | Authenticate credentials, set cookie, redirect |
| `/emis/logout` | POST   | Clear session cookie, redirect to login        |

Login form fields: `username`, `password`.

On success: redirect to `/emis` (or to the originally requested URL if available).
On failure: re-render login page with error message.

### Session resolution middleware

SvelteKit `handle` hook in `hooks.server.ts`:

1. Read `emis_session` cookie from request.
2. Look up session in DB (primary) or in-memory store (fallback).
3. If valid and not expired: attach session to `event.locals.emisSession`.
4. If `EMIS_AUTH_MODE=session` and no valid session:
   - For `/emis/login` and `/emis/logout`: allow through (no redirect loop).
   - For `/api/emis/*` endpoints: return 401 `{ error, code: 'UNAUTHORIZED' }`.
   - For `/emis/*` pages: redirect to `/emis/login?redirect={originalPath}`.
   - For non-EMIS routes (`/dashboard/*`, etc.): allow through (not protected).

### Role enforcement rules

| Route pattern                   | Required role | Enforcement point                                    |
| ------------------------------- | ------------- | ---------------------------------------------------- |
| `GET /api/emis/*`               | `viewer+`     | Hook middleware (session required when auth=session) |
| `POST/PATCH/DELETE /api/emis/*` | `editor+`     | `assertWriteContext()` (extended)                    |
| `/emis/admin/*`                 | `admin`       | Hook middleware                                      |
| `/emis/*` (pages)               | `viewer+`     | Hook middleware (session required when auth=session) |

Role hierarchy: `admin` > `editor` > `viewer`.

### Integration with assertWriteContext()

`assertWriteContext()` is extended (not replaced) to support session-based actor resolution:

1. When `EMIS_AUTH_MODE=session`: extract `actorId` and `role` from `event.locals.emisSession`.
   - If no session: throw `EmisError(401, 'UNAUTHORIZED', ...)`.
   - If session role is `viewer`: throw `EmisError(403, 'WRITE_NOT_ALLOWED', 'Insufficient role for write operations')`.
   - Otherwise: use `session.userId` as `actorId`.
2. When `EMIS_AUTH_MODE=none`: current header-based behavior unchanged.

The function signature (unchanged from DF-3):

```typescript
export function assertWriteContext(
	request: Request,
	source: EmisWriteSource,
	locals?: App.Locals
): EmisWriteContext;
```

### Smoke test compatibility

**After AUTH-7 (default switch):** existing smoke scripts (`pnpm emis:smoke`, `pnpm emis:write-smoke`) must explicitly set `EMIS_AUTH_MODE=none` in their env. This is a breaking change from DF-3 where the default was `none`.

Dedicated auth smoke script `pnpm emis:auth-smoke` tests auth flows in session mode:

- Login with valid credentials -> 200 + session cookie
- Login with invalid credentials -> failure
- Access protected route without session -> 401/redirect
- Access admin route as editor -> 403
- Change password flow

### App.Locals type extension

```typescript
// app.d.ts
declare global {
	namespace App {
		interface Locals {
			emisSession?: EmisSession | null;
		}
	}
}
```

### DDL draft: emis.users

```sql
-- AUTH-2: User store table
-- Canonical home: db/migrations/NNNN_create_emis_users.sql

CREATE TABLE emis.users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_username UNIQUE (username)
);

COMMENT ON TABLE emis.users IS 'EMIS user accounts for session-based auth';
COMMENT ON COLUMN emis.users.password_hash IS 'bcrypt hash, cost factor 12+';
COMMENT ON COLUMN emis.users.role IS 'viewer | editor | admin';
```

### DDL draft: emis.sessions

```sql
-- AUTH-2: Session store table
-- Canonical home: db/migrations/NNNN_create_emis_sessions.sql

CREATE TABLE emis.sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES emis.users(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_expires_at ON emis.sessions (expires_at);
CREATE INDEX idx_sessions_user_id    ON emis.sessions (user_id);

COMMENT ON TABLE emis.sessions IS 'EMIS auth sessions, DB-backed for persistence across restarts';
COMMENT ON COLUMN emis.sessions.role IS 'Denormalized from users.role at session creation time';
COMMENT ON COLUMN emis.sessions.expires_at IS 'Session expiry; default TTL 24h, configurable via EMIS_SESSION_TTL_HOURS';
```

### Env var summary

| Variable                   | Default      | Purpose                                                       |
| -------------------------- | ------------ | ------------------------------------------------------------- |
| `EMIS_AUTH_MODE`           | `session`    | Auth mode: `none` (dev/smoke) or `session` (default)          |
| `EMIS_USERS`               | (none)       | Legacy env-based user list (JSON array). Transition fallback. |
| `EMIS_ADMIN_PASSWORD`      | (none)       | Auto-create admin on first start if DB users table is empty   |
| `EMIS_BCRYPT_ROUNDS`       | `12`         | bcrypt cost factor (10..14)                                   |
| `EMIS_SESSION_TTL_HOURS`   | `24`         | Session time-to-live in hours                                 |
| `EMIS_MIN_PASSWORD_LENGTH` | `8`          | Minimum password length for change-password endpoint          |
| `EMIS_WRITE_POLICY`        | `permissive` | Write-policy strictness (see section 4)                       |

### Migration plan (AUTH-2 through AUTH-7)

The migration is non-breaking: each slice adds capability without removing the previous one. Env-based users and in-memory sessions continue to work during the transition period.

| Slice  | What changes                                   | Breaking? | Env fallback active?              |
| ------ | ---------------------------------------------- | --------- | --------------------------------- |
| AUTH-2 | Add `emis.users` + `emis.sessions` tables      | No        | Yes (env still works)             |
| AUTH-3 | bcrypt hashing + DB user store as primary      | No        | Yes (env fallback if DB empty)    |
| AUTH-4 | DB session store as primary                    | No        | Yes (in-memory fallback if no DB) |
| AUTH-5 | Admin user management API + UI                 | No        | N/A                               |
| AUTH-6 | Change password API                            | No        | N/A                               |
| AUTH-7 | Default `EMIS_AUTH_MODE` switches to `session` | **Yes**   | Safety net fallback               |

After AUTH-7, the `EMIS_USERS` env var is deprecated but still functional. It will be removed in a future cleanup slice.

## 6. Actor vs Role Clarification

| Term      | What it is                                                   | MVE status                         |
| --------- | ------------------------------------------------------------ | ---------------------------------- |
| `actorId` | Opaque string for audit trail (from headers or auto-default) | Enforced via audit contract        |
| `role`    | `viewer` / `editor` / `admin` (authorization intent)         | Semantic only, no runtime resolver |

When auth is introduced post-MVE:

- `actorId` should be derived from session identity, not from arbitrary headers.
- `role` should be resolved from a session/token, not assumed.
- The write-policy helper should be extended, not replaced.

## 7. One-Paragraph Summary

EMIS supports two auth modes controlled by `EMIS_AUTH_MODE`. In **session mode** (`EMIS_AUTH_MODE=session`, **default since AUTH-7**): users are stored in the `emis.users` DB table with bcrypt-hashed passwords; sessions are persisted in `emis.sessions` (DB-backed, in-memory fallback); authentication flows through `/emis/login`; unauthenticated requests to EMIS routes receive 401 (API) or redirect to login (pages); write operations require editor+ role; admin pages (`/emis/admin/*`) require admin role; admin user management is available at `/emis/admin/users`; any authenticated user can change their password via `/api/emis/auth/change-password` (invalidates other sessions); all enforcement flows through SvelteKit hooks and `assertWriteContext()`. In **none mode** (`EMIS_AUTH_MODE=none`, explicit opt-in for dev/smoke): the system operates in trusted-network mode where all users can read freely; write operations require actor identification via `x-emis-actor-id` or `x-actor-id` header; in strict write-policy mode, missing actor identity results in 403; in permissive mode (default), a source-based default actor is used. Transition from DF-3 to production auth is non-breaking: env-based user fallback (`EMIS_USERS`) remains active while DB is empty; in-memory session fallback remains active if DB is unreachable.

## 8. Related Documents

- Runtime/API conventions: `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Working rules: `docs/emis_working_contract.md`
- Architecture and placement baseline: `docs/architecture.md`
- MVE scope and invariants: `docs/emis_mve_product_contract.md`
- Observability contract: `docs/emis_observability_contract.md`
