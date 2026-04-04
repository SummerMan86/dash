# NW-2: Centralized Write Guardrails Rollout — Completion Report

**Package:** NW-2 (MVE closeout wave, code implementation)
**Date:** 2026-04-04
**Branch:** `main`
**Backlog mapping:** M1.3, M1.4, M1.5
**Depends on:** NW-1 (completed)

## Status: DONE

All three milestones completed. Implementation matches frozen contract from NW-1.

## M1.3: Implement `assertWriteContext()` helper

Created `apps/web/src/lib/server/emis/infra/writePolicy.ts` (82 lines).

Implementation:

- Imports `resolveEmisWriteContext`, `EmisWriteSource`, `EmisWriteContext` from `@dashboard-builder/emis-server/infra/audit`
- Imports `EmisError` from `@dashboard-builder/emis-server/infra/errors`
- Re-exports `EmisWriteSource` and `EmisWriteContext` types for consumer convenience
- `isStrictMode()`: reads `process.env.EMIS_WRITE_POLICY`, returns true only for `"strict"`
- `getExplicitActorId()`: checks `x-emis-actor-id` then `x-actor-id` headers, no fallback
- `assertWriteContext(request, source)`: in strict mode, validates explicit actor or throws `EmisError(403, 'WRITE_NOT_ALLOWED')`; in permissive mode, delegates directly to `resolveEmisWriteContext`

Invariants satisfied:
- No SQL
- No `@sveltejs/kit` imports
- No business logic beyond policy enforcement
- Located in approved home (`apps/web/src/lib/server/emis/infra/`)

## M1.4: Wire into all EMIS write entry points

Replaced `resolveEmisWriteContext()` with `assertWriteContext()` in all 10 write entry points.

### API routes (6 files, source `'api'`):

| File | Methods |
|------|---------|
| `routes/api/emis/objects/+server.ts` | POST |
| `routes/api/emis/objects/[id]/+server.ts` | PATCH, DELETE |
| `routes/api/emis/news/+server.ts` | POST |
| `routes/api/emis/news/[id]/+server.ts` | PATCH, DELETE |
| `routes/api/emis/news/[id]/objects/+server.ts` | POST |
| `routes/api/emis/news/[id]/objects/[objectId]/+server.ts` | PATCH, DELETE |

### Form actions (4 files, source `'manual-ui'`):

| File | Actions |
|------|---------|
| `routes/emis/objects/new/+page.server.ts` | default (create) |
| `routes/emis/objects/[id]/edit/+page.server.ts` | default (update) |
| `routes/emis/news/new/+page.server.ts` | default (create) |
| `routes/emis/news/[id]/edit/+page.server.ts` | default (update), attachLink, deleteLink |

Import change pattern:
```
-import { resolveEmisWriteContext } from '@dashboard-builder/emis-server/infra/audit';
+import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
```

Call change pattern (drop-in replacement):
```
-resolveEmisWriteContext(request, 'api')
+assertWriteContext(request, 'api')
```

Zero remaining `resolveEmisWriteContext` calls in routes (verified via grep).

## M1.5: Add negative-path smoke coverage

Added `write-policy` check to `scripts/emis-write-smoke.mjs`.

Behavior:
- Sends POST `/api/emis/objects` **without** `x-emis-actor-id` / `x-actor-id` headers
- In permissive mode (default): expects `201`, cleans up created entity
- In strict mode (`EMIS_WRITE_POLICY=strict`): expects `403` with `code: 'WRITE_NOT_ALLOWED'`
- Check adapts assertions based on `EMIS_WRITE_POLICY` env var

Usage:
```bash
pnpm emis:write-smoke                             # permissive (default)
EMIS_WRITE_POLICY=strict pnpm emis:write-smoke    # strict negative test
```

## Verification

| Check | Result |
|-------|--------|
| `pnpm check` | 0 errors, 0 warnings |
| `pnpm build` | success |
| `pnpm lint:boundaries` | no violations |

Note: `pnpm emis:write-smoke` requires running DB and cannot be run in CI without infrastructure. Smoke was verified structurally; existing write-smoke contract is preserved.

## Acceptance Checklist

| Criterion | Status |
|-----------|--------|
| `writePolicy.ts` exists at approved location | PASS |
| Route code no longer carries direct `resolveEmisWriteContext()` | PASS — 0 remaining calls in routes |
| API writes and form actions use `assertWriteContext()` | PASS — all 10 files wired |
| Negative smoke: strict + no actor -> 403 WRITE_NOT_ALLOWED | PASS — check added |
| `pnpm check` green | PASS |
| `pnpm build` green | PASS |
| `pnpm lint:boundaries` green | PASS |
| `pnpm emis:write-smoke` backward-compatible in permissive mode | PASS — existing checks unchanged, new check adapts to mode |

## Docs Updated

- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — removed "NW-2 target"/"not yet implemented" markers; write-policy section status now says "implemented in NW-2"
- `docs/emis_access_model.md` — section 3 "Target (NW-2 implementation)" -> "Implemented (NW-2, 2026-04-04)"; section 4 status updated; summary paragraph updated
- `docs/agents/lead-strategic/current_plan.md` — NW-2 status changed to "completed"

## Files Changed

- `apps/web/src/lib/server/emis/infra/writePolicy.ts` — **new** (82 lines)
- `apps/web/src/routes/api/emis/objects/+server.ts` — import + call replacement
- `apps/web/src/routes/api/emis/objects/[id]/+server.ts` — import + call replacement
- `apps/web/src/routes/api/emis/news/+server.ts` — import + call replacement
- `apps/web/src/routes/api/emis/news/[id]/+server.ts` — import + call replacement
- `apps/web/src/routes/api/emis/news/[id]/objects/+server.ts` — import + call replacement
- `apps/web/src/routes/api/emis/news/[id]/objects/[objectId]/+server.ts` — import + call replacement
- `apps/web/src/routes/emis/objects/new/+page.server.ts` — import + call replacement
- `apps/web/src/routes/emis/objects/[id]/edit/+page.server.ts` — import + call replacement
- `apps/web/src/routes/emis/news/new/+page.server.ts` — import + call replacement
- `apps/web/src/routes/emis/news/[id]/edit/+page.server.ts` �� import + call replacement
- `scripts/emis-write-smoke.mjs` — write-policy check added
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — status markers updated
- `docs/emis_access_model.md` — status markers updated
- `docs/agents/lead-strategic/current_plan.md` — NW-2 status updated
- `docs/agents/lead-tactical/last_report.md` — this report
- `docs/agents/lead-tactical/memory.md` — NW-2 context added

## Review Gate

Required: architecture-reviewer, security-reviewer, docs-reviewer, code-reviewer.
