# Plan: EMIS Phase 4 — MVE Deferrals Implementation

## Цель

Реализовать три явных deferral из MVE acceptance audit (NW-5):
1. Soft-delete UI для объектов и новостей
2. Admin CRUD для справочников (countries, object_types, sources)
3. Базовая auth/access control

Результат: EMIS переходит из "accepted with explicit deferrals" в "accepted, no deferrals".

## Контекст

- MVE accepted with explicit deferrals (NW-5, 2026-04-05)
- Post-MVE features P1/P2 done
- Phase 3 tech debt cleanup done — baseline green, zero carry-forward
- Branch: `feature/emis-phase4-mve-deferrals` (от `feature/emis-phase3-tech-debt-cleanup`)
- Current access model: trusted internal network, `assertWriteContext()` enforces actor identity
- Dictionaries: seed-managed, 3 tables (`countries`, `object_types`, `sources`)
- Soft-delete: API DELETE endpoints exist for objects and news, no UI buttons anywhere

## Scope

Только закрытие MVE deferrals. Никаких новых фич, product expansion или BI работы.

## Slices

### DF-1: Soft-delete UI buttons for objects and news
- status: completed (2026-04-05)
- scope:
  - Add delete button to object detail page (`/emis/objects/[id]`)
  - Add delete button to news detail page (`/emis/news/[id]`)
  - Confirmation dialog before delete (prevent accidental clicks)
  - After successful delete — redirect to catalog
  - Show toast/feedback on success
- technical approach:
  - Object detail: `apps/web/src/routes/emis/objects/[id]/+page.svelte` — add button that calls `DELETE /api/emis/objects/:id`
  - News detail: `apps/web/src/routes/emis/news/[id]/+page.svelte` — add button that calls `DELETE /api/emis/news/:id`
  - API endpoints already exist and work (verified by `emis:write-smoke`)
  - Use existing `assertWriteContext()` flow — no auth changes needed
- constraints:
  - UI only — no API changes
  - Use existing UI components from `@dashboard-builder/platform-ui` (Button, dialog if available)
  - Maintain consistent UX with edit pages
- done when:
  - Both detail pages have working delete buttons
  - Confirmation dialog shown before delete
  - `pnpm check`, `pnpm build` green
  - Manual smoke: delete object/news via UI, verify soft-delete in catalog

### DF-2: Admin CRUD for dictionaries
- status: completed (2026-04-05)
- depends on: none (independent of DF-1)
- scope:
  - Admin pages for managing 3 dictionary tables: `countries`, `object_types`, `sources`
  - CRUD: list, create, edit (no delete — dictionaries are reference data)
  - Route: `/emis/admin/dictionaries` (or similar)
  - API: new endpoints `GET/POST/PATCH /api/emis/dictionaries/{table}`
- technical approach:
  - Read current seed files to understand dictionary schema:
    - `db/seeds/001_countries.sql`
    - `db/seeds/002_object_types.sql`
    - `db/seeds/003_sources.sql`
  - Server: add dictionary query/mutation modules in `packages/emis-server/src/modules/dictionaries/`
  - Contracts: add dictionary types in `packages/emis-contracts/src/emis-dictionary/`
  - Routes: add API routes in `apps/web/src/routes/api/emis/dictionaries/`
  - UI: add admin pages in `apps/web/src/routes/emis/admin/dictionaries/`
  - Wire `assertWriteContext()` for write operations
- constraints:
  - Dictionary tables already exist in `emis` schema — no schema changes
  - Seeds remain as bootstrap mechanism — admin CRUD supplements, not replaces seeds
  - No admin role enforcement yet (DF-3 handles access control)
  - Follow existing EMIS API conventions from `RUNTIME_CONTRACT.md`
- done when:
  - All 3 dictionaries manageable via UI
  - API endpoints work with proper audit trail
  - `pnpm check`, `pnpm build`, `pnpm lint:boundaries` green
  - Smoke coverage for dictionary CRUD

### DF-3: Basic auth and access control
- status: completed (2026-04-05)
- depends on: DF-2 (admin pages exist to protect)
- scope:
  - Session-based authentication (simple login flow)
  - Role resolver: map session → role (`viewer`, `editor`, `admin`)
  - Protect write endpoints: only `editor` and `admin` can write
  - Protect admin pages: only `admin` can access `/emis/admin/*`
  - Update `assertWriteContext()` to derive actor from session instead of headers
- technical approach:
  - Read `docs/emis_access_model.md` section 5 "When auth is introduced post-MVE" for guidance
  - Auth mechanism: SvelteKit hooks + server-side sessions (cookie-based)
  - Simple approach: hardcoded user list in env/config for MVE+ (no external identity provider)
  - Or: basic username/password with bcrypt hashes in DB
  - Decision on mechanism should be made in a contract-first slice before implementation
  - Update `docs/emis_access_model.md` to reflect new enforcement
- constraints:
  - Keep it simple — no SSO, OAuth, external IdP
  - Must be backward-compatible with existing trusted network mode (toggle via env)
  - `assertWriteContext()` should be extended, not replaced (per access model guidance)
  - Session management must not break existing smoke tests
- sub-slices:
  - **DF-3.1** — Auth contract freeze (docs only): decide mechanism, session shape, role mapping
  - **DF-3.2** — Implement auth middleware + login page
  - **DF-3.3** — Wire role enforcement into write policy and admin routes
  - **DF-3.4** — Update smoke/verification for auth flows
- done when:
  - Login page works
  - Unauthenticated users can only read
  - Write endpoints require editor+ role
  - Admin pages require admin role
  - Existing smoke tests pass (with auth bypass or test credentials)
  - `docs/emis_access_model.md` updated to reflect enforcement

## Execution Order

```
DF-1 (delete UI) ────────────────────→ DF-5 (governance)
DF-2 (admin CRUD) → DF-3 (auth) ────→ DF-5
```

- DF-1 and DF-2 are independent, can run in parallel
- DF-3 depends on DF-2 (admin pages must exist before protecting them)
- DF-5 (governance closure) runs after all others

### DF-5: Governance closure and final baseline
- status: completed (2026-04-05)
- scope:
  - Full baseline verification (all 6 canonical checks)
  - Update MVE acceptance audit — remove all explicit deferrals
  - Update `docs/emis_access_model.md` — reflect enforcement status
  - Update `docs/emis_mve_product_contract.md` if needed
  - Update `docs/emis_session_bootstrap.md`
  - Update backlog
  - Final verdict: `accepted` (no deferrals)
- done when:
  - Zero MVE deferrals remain
  - Baseline green
  - Docs consistent

## Recommended Handoff To Lead-Tactical

1. Start DF-1 (smallest, independent, quick win) and DF-2 (largest surface area) in parallel.
2. After DF-2 completes, start DF-3 (depends on admin pages).
3. After all complete, run DF-5 governance closure.

## Risk Notes

- DF-3 (auth) is the most complex slice. Contract-first approach (DF-3.1) is critical.
- DF-3 changes how smoke tests authenticate — plan for test credentials.
- DF-2 introduces new API surface — ensure it follows existing conventions strictly.
