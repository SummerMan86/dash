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

1. ~~`M3` — health/readiness and API diagnostics~~ **completed** (`2026-04-05`, NW-4)
2. ~~`M4` — MVE acceptance audit and sign-off~~ **completed** (`2026-04-05`, NW-5)
3. ~~`P1` — vessel historical track~~ **completed** (`2026-04-04`)
4. ~~`P2` — offline maps ops hardening~~ **completed** (`2026-04-05`)

All current backlog items are completed. Next priorities to be defined.

## MVE Closeout

### M3. Health, Readiness And API Error Logging — COMPLETED (`2026-04-05`, NW-4)

All M3 subtasks delivered:
- `M3.1` — `/api/emis/readyz` with DB-backed runtime readiness (schemas + published views)
- `M3.2` — request correlation (`x-request-id`) and structured error logging in `handleEmisRoute()`
- `M3.3` — 4 smoke checks for readiness + correlation contract

### M4. MVE Acceptance Closeout And Sign-Off — COMPLETED (`2026-04-05`, NW-5)

All M4 subtasks delivered:
- `M4.1` — acceptance audit: all Section 7 criteria met, explicit deferrals documented
- `M4.2` — bootstrap and backlog aligned with audit result
- `M4.3` — full verification pass: 6/6 canonical checks green

MVE verdict: **accepted with explicit deferrals**.

## Post-MVE Next Wave

### P1. Vessel Historical Track Integration — COMPLETED (`2026-04-04`)

All P1 subtasks delivered:
- `P1.1` — Behavior contract frozen in `docs/emis_vessel_track_contract.md`
- `P1.2` — Historical track renders on map in vessel mode
- `P1.3` — FlyTo on vessel selection via `vesselFlyToTarget`
- `P1.4` — Viewport-aware vessel catalog with optional `bbox` parameter
- `P1.5` — 2 smoke checks for bbox behavior (34/34 total smoke checks)

### P2. Offline Maps Ops Hardening — COMPLETED (`2026-04-05`)

All P2 subtasks delivered:
- `P2.1` — Range support verified against production adapter-node (206 Partial Content confirmed via `sirv` embedded in `@sveltejs/adapter-node`)
- `P2.2` — Post-deploy verification checklist added to `docs/emis_offline_maps_ops.md` (section 11): 5-step checklist with success/failure signals and failure decision tree
- `P2.3` — Region-expansion workflow documented as repeatable recipe in `docs/emis_offline_maps_ops.md` (section 7): extract, place, manifest update, verify, rebuild, deploy; plus safe replacement and removal procedures; freshness checking expanded (section 8)

Canonical reference: `docs/emis_offline_maps_ops.md`

## Locked Decisions

- dictionaries remain `seed-managed for MVE`
- admin CRUD for dictionaries is deferred beyond MVE

See:

- `docs/emis_access_model.md`
- `docs/emis_freeze_note.md`
