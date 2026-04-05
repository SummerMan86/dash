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
3. `P1` — vessel historical track
4. ~~`P2` — offline maps ops hardening~~ **completed** (`2026-04-05`)

Start with `P1.1` unless a session explicitly chooses another bounded open slice.

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
