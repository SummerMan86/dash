# NW-1: Access Model Freeze and Write-Policy Design — Completion Report

**Package:** NW-1 (MVE closeout wave, docs/design only)
**Date:** 2026-04-04
**Branch:** `main`
**Backlog mapping:** M1.1, M1.2

## Status: DONE

All four tactical sub-slices completed. No code changes.

## NW-1a: Analyze Current Write-Side State

Read-only analysis of current actor attribution and write authorization state.

Findings:

| Area | Current state |
|------|---------------|
| Actor resolution | `resolveEmisWriteContext()` resolves actor from `x-emis-actor-id` / `x-actor-id` headers with auto-defaults per source |
| API write routes | All 8 call `resolveEmisWriteContext(request, 'api')` |
| Form actions | All 4 call `resolveEmisWriteContext(request, 'manual-ui')` |
| Authorization | None. No 403 path. Writes open to anyone who can reach the endpoint |
| Authentication | None. No sessions, no login, no middleware |
| Audit trail | Full. Every write produces `emis.audit_log` row in same transaction |

Key gap: `resolveEmisWriteContext()` is audit-only (never rejects). There is no write authorization check anywhere.

## NW-1b: Draft `docs/emis_access_model.md`

Rewrote the existing preliminary document to serve as canonical access model reference.

Key design decisions frozen:

- **Operating model:** trusted internal network, explicit accepted limitation
- **Role semantics:** viewer (read-only, implicit), editor (writes with actor, implicit in MVE), admin (deferred)
- **Enforced now vs deferred:** actor attribution + audit trail + DB invariants enforced; auth/sessions/RBAC/per-entity permissions deferred
- **One-paragraph summary:** included for quick reference

Previous version implied future `requireEmisRole()` RBAC system. New version explicitly defers RBAC and focuses on the production-shaped write-policy helper instead.

## NW-1c: Design Write-Policy Helper Contract

Designed `assertWriteContext()` helper contract:

- **Signature:** `assertWriteContext(request: Request, source: EmisWriteSource): EmisWriteContext`
- **Strict mode** (`EMIS_WRITE_POLICY=strict` or production): 403 `WRITE_NOT_ALLOWED` if no actor header
- **Permissive mode** (dev/local default): backward-compatible auto-default actor
- **Ownership:** `apps/web/src/lib/server/emis/infra/writePolicy.ts` (app-level, will integrate with future auth)
- **Integration:** drop-in replacement for `resolveEmisWriteContext()` in routes; same return type

Added write-policy contract section and helper table to `RUNTIME_CONTRACT.md`.

## NW-1d: Update Bootstrap and Review

- Updated `docs/emis_session_bootstrap.md`:
  - Added "Access model and write-policy status" subsection
  - Marked operating model fixation as done in practical focus section
  - NW-2 as next step for implementation
- Self-reviewed diff against acceptance checklist (see below)

## Acceptance Checklist

| Criterion | Status |
|-----------|--------|
| docs no longer imply a hidden full auth/RBAC system | PASS — RBAC explicitly deferred, no `requireEmisRole` references |
| team can describe write authorization rules in one paragraph | PASS — section 6 of `emis_access_model.md` |
| lead-tactical can hand off write-policy helper implementation without guessing | PASS — signature, modes, failure shape, ownership all specified |
| `docs/emis_access_model.md` exists as canonical reference | PASS — rewritten with full contract |
| `RUNTIME_CONTRACT.md` includes write-policy helper contract | PASS — new section with helper, behavior, error code, integration rule |

## Files Changed

- `docs/emis_access_model.md` — rewritten (canonical access model)
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — write-policy contract section + helper table added
- `docs/emis_session_bootstrap.md` — access model status section added
- `docs/agents/lead-tactical/last_report.md` — this report
- `docs/agents/lead-tactical/memory.md` — NW-1 context added

## Review Gate

Required: `docs-reviewer` (docs-only scope). No code/architecture/security/UI review needed.
