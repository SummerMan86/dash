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
4. `P2` — offline maps ops hardening

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
