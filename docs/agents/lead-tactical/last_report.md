# Report: AUTH-8 — Governance Closure After Production Auth Hardening

## Статус

Выполнено.

## Что сделано

- AUTH-1: completed — contract freeze for production auth design in `docs/emis_access_model.md` section 5
- AUTH-2: completed — DB schema: `emis.users` + `emis.sessions` tables in `db/current_schema.sql`
- AUTH-3: completed — bcrypt password hashing (bcryptjs, cost 12) + DB user store with env fallback
- AUTH-4: completed — DB session persistence with in-memory fallback, lazy expiry cleanup
- AUTH-5: completed — admin user management at `/emis/admin/users` (UI + 4 API endpoints)
- AUTH-6: completed — change password at `/emis/settings` + `/api/emis/auth/change-password`
- AUTH-7: completed — default auth mode switched to `session`, `pnpm emis:auth-smoke` added
- AUTH-8: completed — governance closure: all checks green, docs updated, baseline closed

## Baseline Verification

All 7 checks green:

- `pnpm check`: green (0 errors, 0 warnings)
- `pnpm build`: green (success)
- `pnpm lint:boundaries`: green (no violations)
- `EMIS_AUTH_MODE=none pnpm emis:smoke`: green (40/40 pass)
- `EMIS_AUTH_MODE=none pnpm emis:offline-smoke`: green (9/9 pass)
- `EMIS_AUTH_MODE=none pnpm emis:write-smoke`: green (7/7 pass)
- `pnpm emis:auth-smoke`: green (10/10 pass)
- `npx prettier --check .`: green (all files formatted)

## Fixes During AUTH-8

1. **auth.ts safety-net fix**: `getAuthMode()` now skips the safety-net fallback when `EMIS_AUTH_MODE=session` is explicitly set. Previously, the safety-net checked synchronously for DB users (always `null` at startup) and could incorrectly fall back to `none` even with explicit `session` mode.
2. **auth-smoke bcrypt import fix**: `scripts/emis-auth-smoke.mjs` was importing `bcrypt` (not installed); changed to use `bcryptjs` via `createRequire` from `packages/emis-server/node_modules/`.
3. **auth-smoke SvelteKit form action handling**: Updated login checks to handle SvelteKit's JSON envelope format (`{"type":"redirect","status":303,...}`) instead of expecting raw 303 HTTP responses.
4. **auth-smoke page redirect fix**: Fixed destructuring bug where `fetch()` Response was incorrectly destructured as `{ response }`.
5. **Prettier ignore**: Added `.svelte-kit/` and `.claude/` to `.prettierignore` to exclude build output and tool config from formatting checks.

## AUTH Slices Audit

| Slice  | Evidence                                                                     |
| ------ | ---------------------------------------------------------------------------- |
| AUTH-1 | `docs/emis_access_model.md` section 5 — contract frozen                      |
| AUTH-2 | `db/current_schema.sql` — `emis.users` + `emis.sessions` tables              |
| AUTH-3 | `packages/emis-server/src/modules/users/password.ts` — bcryptjs              |
| AUTH-4 | `packages/emis-server/src/modules/sessions/repository.ts` — DB session store |
| AUTH-5 | `apps/web/src/routes/emis/admin/users/` — page + page.server                 |
| AUTH-6 | `apps/web/src/routes/emis/settings/` — page + page.server                    |
| AUTH-7 | `auth.ts` getAuthMode() defaults to session; `scripts/emis-auth-smoke.mjs`   |

## Review Gate

Not applicable for AUTH-8 (governance closure is a verification + docs + fixes slice).

### Architecture / exceptions

- architecture-steward: not needed (no new placement decisions)
- known exceptions / waivers touched: `none`
- Known exceptions registry: zero live exceptions

## Doc Updates

- `docs/agents/lead-strategic/current_plan.md` — all AUTH-1..AUTH-8 marked completed
- `docs/emis_session_bootstrap.md` — Phase 5 added to completed waves, verification status updated
- `docs/emis_next_tasks_2026_03_22.md` — Phase 5 added as completed, locked decisions updated
- `docs/emis_access_model.md` — section 6 updated (stale "when auth is introduced" wording replaced)
- `RUNTIME_CONTRACT.md` — auth endpoints section added (login, logout, change-password, admin users, settings)
- `docs/agents/lead-tactical/memory.md` — Phase 5 context added
- `docs/agents/lead-tactical/last_report.md` — this report

## Ветки

- integration branch: `feature/emis-phase5-auth-hardening`
- worker branches merged: none (AUTH-8 is governance-only)

## Готовность

Готово к merge. All Phase 5 auth hardening slices implemented and verified. Baseline Green / closed.

## Вопросы к lead-strategic

Нет.
