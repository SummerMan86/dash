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

### Explicitly deferred beyond MVE

| Mechanism                                  | Why deferred                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Authentication (SSO, API keys, basic auth) | No requirement for user identity beyond actor headers in trusted contour          |
| Session management                         | No login/logout flow needed in trusted contour                                    |
| Role-based access control (RBAC)           | Roles are semantic intent, not runtime enforcement; all trusted users are editors |
| Per-entity permission model                | All editors can write all entities; no row-level or entity-scoped restrictions    |
| Admin role enforcement                     | No admin-only operations exist yet                                                |

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

## 5. Actor vs Role Clarification

| Term      | What it is                                                   | MVE status                         |
| --------- | ------------------------------------------------------------ | ---------------------------------- |
| `actorId` | Opaque string for audit trail (from headers or auto-default) | Enforced via audit contract        |
| `role`    | `viewer` / `editor` / `admin` (authorization intent)         | Semantic only, no runtime resolver |

When auth is introduced post-MVE:

- `actorId` should be derived from session identity, not from arbitrary headers.
- `role` should be resolved from a session/token, not assumed.
- The write-policy helper should be extended, not replaced.

## 6. One-Paragraph Summary

EMIS MVE runs in a trusted internal network where all users can read freely. Write operations require actor identification via the `x-emis-actor-id` or `x-actor-id` header. All write entry points (API routes and form actions) call `assertWriteContext()` from `apps/web/src/lib/server/emis/infra/writePolicy.ts`, which wraps `resolveEmisWriteContext()` with policy enforcement: in production-shaped (strict) mode (`EMIS_WRITE_POLICY=strict`), missing actor identity results in a 403 `WRITE_NOT_ALLOWED` rejection; in dev/local (permissive) mode (default), a source-based default actor is used for convenience. Full authentication, sessions, and RBAC are explicitly deferred beyond MVE.

## 7. Related Documents

- Runtime/API conventions: `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- Working rules: `docs/emis_working_contract.md`
- Architecture and placement baseline: `docs/architecture.md`
- MVE scope and invariants: `docs/emis_mve_product_contract.md`
- Observability contract: `docs/emis_observability_contract.md`
