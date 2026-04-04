# EMIS — Active Backlog

Live backlog for the next EMIS sessions.
Read [docs/emis_session_bootstrap.md](./emis_session_bootstrap.md) first for current repository state.

This file contains only open work.
Closed waves, resolved decisions and historical rollout notes do not belong here.

## Working Rules

- Pick exactly one bounded subtask for one dialog.
- Do not mix `MVE closeout` and `post-MVE next wave` work in the same session unless the task explicitly says so.
- Finish each slice with a local checkpoint:
  code/docs updated, verification run when practical, bootstrap/backlog adjusted if the status changed.
- If a task changes DB contract, also update:
  - `db/current_schema.sql`
  - `db/applied_changes.md`
  - related docs

## Active Order

Current default order:

1. `M1` — access model and write guardrails closeout
2. `M3` — health/readiness and API diagnostics
3. `M4` — MVE acceptance audit and sign-off
4. `P1` — vessel historical track
5. `P2` — offline maps ops hardening

Start with `M1.1` unless a session explicitly chooses another bounded open slice.

## MVE Closeout

### M1. Access Model And Write Guardrails

Status:

- access model is documented
- dictionary scope is already frozen as `seed-managed for MVE`
- remaining work is to finish implementation hardening and verification around write policy

#### M1.1. Confirm the live write-policy contract against current code

Session scope: read-only audit.

Read:

- `docs/emis_access_model.md`
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`
- EMIS write routes/actions

Deliver:

- explicit verdict: what is already enforced
- explicit residual gap list if any write entry point still diverges

Done when:

- the next implementation slice can target one concrete residual gap instead of re-reading the whole policy discussion

#### M1.2. Close any remaining shared-helper wiring gaps

Session scope: bounded transport/infra repair only.

Deliver:

- all EMIS write entry points use the shared helper consistently
- no ad hoc route-local write-policy logic remains

Done when:

- API and manual UI writes follow one policy path

#### M1.3. Negative-path verification for strict mode

Session scope: smoke/tests only.

Deliver:

- at least one negative verification for strict mode with missing actor identity

Done when:

- `WRITE_NOT_ALLOWED` behavior is enforced automatically, not only described in docs

### M3. Health, Readiness And API Error Logging

Goal:

- turn diagnostics into a real operational contract instead of a snapshot-file presence check only

#### M3.1. Implement DB-backed readiness endpoint

Session scope: endpoint + contract only.

Deliver:

- `GET /api/emis/readyz` or equivalent documented readiness contract
- DB connectivity and required schema/view checks

Done when:

- runtime readiness is distinguishable from repo/snapshot readiness

#### M3.2. Add request correlation and centralized EMIS error logging

Session scope: app-owned transport glue only.

Suggested ownership:

- `apps/web/src/lib/server/emis/infra/*`

Deliver:

- request id propagation
- one centralized structured error logging point for EMIS routes

Done when:

- route handlers do not need ad hoc logging
- logs include enough context for tracing without leaking secrets

#### M3.3. Add verification for the readiness/logging contract

Session scope: smoke/targeted checks only.

Deliver:

- automated check for readiness contract
- targeted verification for error/logging path when practical

Done when:

- diagnostics behavior is checked automatically

### M4. MVE Acceptance Closeout And Sign-Off

#### M4.1. Acceptance audit against the product contract

Session scope: docs/audit only.

Read:

- `docs/emis_mve_product_contract.md`
- `docs/emis_session_bootstrap.md`

Deliver:

- checklist with `done`, `partial`, or `explicitly deferred` per acceptance item

Done when:

- there is one unambiguous MVE status snapshot

#### M4.2. Align bootstrap and backlog with the audit result

Session scope: docs only.

Deliver:

- `docs/emis_session_bootstrap.md` updated
- this backlog updated

Done when:

- current focus in docs matches actual remaining work

#### M4.3. Final verification pass

Session scope: verification only.

Run when environment is available:

- `pnpm db:reset`
- `pnpm db:seed`
- `pnpm emis:smoke`
- `pnpm emis:write-smoke`
- `pnpm emis:offline-smoke`

Done when:

- MVE sign-off is backed by actual checks, not doc review only

## Post-MVE Next Wave

### P1. Vessel Historical Track Integration

Goal:

- extend vessel mode from `current positions only` to `selected vessel + historical track`

#### P1.1. Freeze selected-vessel track UX/API contract

Session scope: contract only.

Answer:

- when track loads
- whether points, segments, or both load by default
- what the default route mode should be

Done when:

- UI and API follow one explicit behavior contract

#### P1.2. Load historical track on vessel selection

Session scope: one behavior only.

Deliver:

- selecting a vessel triggers historical track fetch

Done when:

- vessel mode shows current position plus selected-vessel history

#### P1.3. Add `flyTo` on vessel selection

Session scope: map interaction only.

Done when:

- selecting a vessel from the catalog moves the viewport to the vessel context

#### P1.4. Make vessel catalog viewport-aware

Session scope: catalog behavior only.

Done when:

- vessel list reflects current viewport or another explicitly documented alternative

#### P1.5. Add regression coverage

Session scope: smoke/verification only.

Done when:

- historical-track behavior is exercised automatically

### P2. Offline Maps Ops Hardening

Goal:

- harden deployment behavior for offline PMTiles beyond local/dev success

#### P2.1. Verify Range support in production-shaped adapter-node path

Session scope: verification only.

Done when:

- Range behavior is confirmed against the actual production runtime path

#### P2.2. Encode post-deploy checks in ops docs

Session scope: docs only.

Deliver:

- exact post-deploy verification steps
- expected success/failure signals

Done when:

- deploy verification is repeatable by another operator or agent

#### P2.3. Define region-expansion workflow for offline assets

Session scope: docs first, code only if broken.

Answer:

- how a new PMTiles region is added
- how manifest freshness is updated
- how old assets are replaced safely

Done when:

- region expansion is a documented recipe, not tribal knowledge

## Locked Decisions

- dictionaries remain `seed-managed for MVE`
- admin CRUD for dictionaries is deferred beyond MVE

See:

- `docs/emis_access_model.md`
- `docs/emis_freeze_note.md`
