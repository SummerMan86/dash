# NW-4: Health/Readiness and API Error Logging Hardening — Completion Report

**Package:** NW-4 (MVE closeout wave, observability)
**Date:** 2026-04-05
**Branch:** `main`
**Backlog mapping:** M3.1, M3.2, M3.3, M3.4
**Depends on:** NW-2 (completed), NW-3 (completed)

## Status: DONE

All four milestones completed. EMIS operational routes now have DB-backed readiness, request correlation, and structured error logging.

## M3.1: `/api/emis/readyz` DB-backed readiness endpoint

Created `apps/web/src/routes/api/emis/readyz/+server.ts` (170 lines).

Checks (executed in order, early-exit on critical failure):
1. `DATABASE_URL` is set
2. PostgreSQL connectivity (`SELECT 1`)
3. Required schemas: `emis`, `stg_emis`, `mart_emis`, `mart`
4. Published views: `mart.emis_news_flat`, `mart.emis_objects_dim`, `mart.emis_object_news_facts`, `mart.emis_ship_route_vessels`, `mart_emis.ship_route_points`, `mart_emis.ship_route_segments`

Security: published-view identifiers validated at module load via `SAFE_VIEW_RE` regex guard.

Returns:
- `200 { status: 'ready', checks: {...}, durationMs }` — all critical checks pass
- `503 { status: 'not_ready', checks: {...}, failures: [...], durationMs }` — any critical check fails

Canonical contract: `docs/emis_observability_contract.md` section 3.2.

## M3.2: Request correlation (`x-request-id`)

Enhanced `handleEmisRoute()` in `apps/web/src/lib/server/emis/infra/http.ts`:

- Accepts `x-request-id` from incoming request headers (truncated to 128 chars)
- Generates UUID via `crypto.randomUUID()` if header is missing
- Returns `x-request-id` in response headers on both success and error paths
- Success path: sets header directly on the response object
- Error path: passes correlation headers through `jsonEmisError()`

`jsonEmisError()` updated to accept optional `headers` parameter.

## M3.3: Structured error logging

Added `logEmisError()` to `handleEmisRoute()`:

On every 4xx/5xx response, emits a JSON structured log:
- `service: 'emis'`
- `level: 'error'` (5xx) or `'warn'` (4xx)
- `requestId`, `method`, `path`, `status`, `code`, `durationMs`
- `actorId` — included when present (tracing only, not auth)
- `message` — included when available

Output: `console.error` for 5xx, `console.warn` for 4xx.

NOT logged: request bodies, PII, large GeoJSON payloads.

## M3.4: Smoke coverage

Added 4 checks to `scripts/emis-smoke.mjs`:

| Check | What it verifies |
|-------|-----------------|
| `api:readyz` | Endpoint responds with valid shape (200 or 503 accepted) |
| `contract:request-id:generated` | Server generates `x-request-id` when not sent |
| `contract:request-id:echo` | Server echoes back client-sent `x-request-id` |
| `contract:error-correlation` | Error responses (400) include echoed `x-request-id` |

## Verification

| Check | Result |
|-------|--------|
| `pnpm check` | 0 errors, 0 warnings |
| `pnpm build` | success |
| `pnpm lint:boundaries` | no violations |
| `pnpm emis:smoke` | green (all checks including new ones) |

## Acceptance Checklist

| Criterion | Status |
|-----------|--------|
| `/api/emis/readyz` exists and returns structured readiness | PASS |
| Published-view identifiers validated at module load | PASS |
| `handleEmisRoute()` adds `x-request-id` to all responses | PASS |
| Missing `x-request-id` generates UUID | PASS |
| Incoming `x-request-id` echoed and truncated to 128 chars | PASS |
| Error responses include structured JSON log | PASS |
| Correlation headers constructed only in error path | PASS |
| 4 new smoke checks pass | PASS |
| `pnpm check` green | PASS |
| `pnpm build` green | PASS |
| `pnpm lint:boundaries` green | PASS |
| `pnpm emis:smoke` green | PASS |

## Docs Updated

- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — added request correlation, structured error logging, health/readiness endpoint sections; updated `handleEmisRoute()` description
- `docs/emis_observability_contract.md` — upgraded sections 3.2, 4.1, 4.2, 4.3 from target to implemented; added response shape examples
- `docs/agents/lead-strategic/current_plan.md` — NW-4 status changed to completed; next steps updated to NW-5 only

## Files Changed

- `apps/web/src/routes/api/emis/readyz/+server.ts` — **new** (170 lines)
- `apps/web/src/lib/server/emis/infra/http.ts` — request correlation, structured error logging, `jsonEmisError` headers param
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — new sections added
- `docs/emis_observability_contract.md` — target -> implemented status
- `docs/agents/lead-strategic/current_plan.md` — NW-4 completed, next steps
- `scripts/emis-smoke.mjs` — 4 new smoke checks
- `docs/agents/lead-tactical/last_report.md` — this report
- `docs/agents/lead-tactical/memory.md` — NW-4 context added

## Review Gate

Required: architecture-reviewer, security-reviewer, docs-reviewer, code-reviewer.
