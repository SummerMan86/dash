# EMIS — Active Backlog (1 April 2026)

Working backlog for the next EMIS sessions.
Read [EMIS Session Bootstrap](./emis_session_bootstrap.md) first for current repository state.

This file is no longer a generic dump of "all remaining work".
Its purpose is to split active work into narrow tracks that can be executed one dialog at a time.

## How to use this backlog

- Pick exactly one subtask for one dialog.
- Do not mix MVE closeout and post-MVE feature work in the same session unless the task explicitly says so.
- Finish each subtask with a local checkpoint:
  code/docs updated, smoke/checks run when possible, backlog/bootstrap adjusted if the status changed.
- If a task changes DB contract, also update `db/current_schema.sql`, `db/applied_changes.md`, and related docs.

## Baseline already closed

Do not reopen these without a concrete regression:

- read-side/runtime hardening
- write-side audit trail + actor attribution
- `pnpm emis:smoke`
- `pnpm emis:write-smoke`
- `pnpm emis:offline-smoke`
- `/emis` UX edge-case polish
- BI convention audit
- vessel current positions v1

See [EMIS Session Bootstrap](./emis_session_bootstrap.md) for the current closed-slice summary.

## Backlog structure

Active work is split into two layers:

1. `MVE closeout` — gaps between current implementation and the accepted MVE contract.
2. `Post-MVE next wave` — valuable work that is intentionally outside the original MVE acceptance bar.

---

## Track M1: Access Model And Write Guardrails

**Why this exists**

The current code already has actor attribution and audit log coverage, but the MVE docs still expect an explicit operating model around `viewer/editor/admin`, trusted/internal deployment, and non-anonymous production writes.

**Goal**

Make the minimal access model explicit and production-shaped without turning MVE into a full auth/RBAC project.

### M1.1. Freeze the minimal operating model in docs

**Session scope:** docs only.

Read:

- `docs/emis_mve_tz_v_2.md`
- `docs/emis_session_bootstrap.md`
- `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

Deliver:

- explicit statement whether current MVE runs only in trusted/internal contour
- precise meaning of `viewer`, `editor`, `admin` at MVE level
- explicit statement of what is enforced now vs postponed beyond MVE

Done when:

- docs no longer imply a hidden full auth system
- trusted/internal limitation is written plainly
- actor attribution and write requirements are described consistently

### M1.2. Design the smallest enforceable write policy

**Session scope:** design + small docs update, no route fan-out yet.

Questions to answer:

- do writes require an actor header in production-shaped mode
- what happens in local/dev mode
- what is the single helper that routes/actions should call

Deliver:

- one agreed policy note
- target helper signature and expected error shape

Done when:

- the team can implement route guards without reopening the policy discussion

### M1.3. Implement centralized write-policy helper

**Session scope:** infra helper + focused tests/smoke additions if practical.

Suggested ownership:

- `src/lib/server/emis/infra/*`

Deliver:

- one reusable guard/policy helper
- stable failure code for disallowed writes

Done when:

- route code no longer needs ad hoc access checks
- the helper is ready to be wired into both API writes and manual UI actions

### M1.4. Wire policy into EMIS write entry points

**Session scope:** transport/action integration only.

Suggested ownership:

- `src/routes/api/emis/*`
- `src/routes/emis/*/new`
- `src/routes/emis/*/edit`

Deliver:

- guarded API POST/PATCH/DELETE routes
- guarded manual entry form actions

Done when:

- write entry points use the shared helper
- failure behavior is consistent across API and manual UI

### M1.5. Add negative-path smoke coverage

**Session scope:** smoke only.

Deliver:

- at least one negative case for missing/invalid write context in production-shaped mode

Done when:

- the new guardrail is checked automatically and does not live only in prose

---

## Track M2: Dictionaries And Admin Scope Decision

**Why this exists**

The MVE text mentions admin functions and dictionary management, but the current implementation is strongest around read-only dictionary endpoints plus seed/demo workflow.

**Goal**

Remove ambiguity: either keep dictionaries seed-managed in MVE, or open a narrow CRUD/admin scope intentionally.

### M2.1. Decide the MVE scope for dictionaries

**Session scope:** decision + docs only.

Recommendation:

- keep `countries`, `object_types`, `sources` seed-managed for MVE unless there is a real operator workflow demanding in-app editing right now

Deliver:

- decision note: `seed-managed only` or `admin CRUD in MVE`

Done when:

- the team has a single agreed answer and future sessions stop guessing

### M2.2. If seed-managed: align docs and acceptance language

**Run only if M2.1 chooses seed-managed.**

Deliver:

- docs updated so MVE no longer implies unfinished admin CRUD pages
- health/backlog/bootstrap wording aligned with seed/demo/reset workflow

Done when:

- current implementation and docs say the same thing

### M2.3. If CRUD is required: define the narrowest admin surface

**Run only if M2.1 chooses admin CRUD.**

Deliver:

- exact list of mutable dictionaries in MVE
- API/route plan for those dictionaries
- explicit non-goals

Done when:

- CRUD scope is limited and can be implemented module by module

### M2.4. If CRUD is required: implement sources admin slice

**Run only after M2.3.**

Reason:

- `sources` is the smallest high-value dictionary for news workflow

Deliver:

- DTO/schema/service/repository/API/UI for `sources`
- smoke coverage

Done when:

- one full admin slice is green end-to-end

### M2.5. If CRUD is required: implement object types admin slice

**Run only after M2.4.**

Deliver:

- CRUD/admin flow for `object_types`
- geometry-kind validation remains explicit

Done when:

- object-type changes are manageable without breaking object write-side rules

### M2.6. If CRUD is required: decide whether countries stay immutable

**Run only after M2.5.**

Recommendation:

- keep `countries` immutable/seed-managed unless a concrete operator case appears

Done when:

- countries are explicitly classified as immutable or mutable

---

## Track M3: Health, Readiness And API Error Logging

**Why this exists**

Current `/api/emis/health` is useful for snapshot/docs visibility, but MVE also expects readiness and production-shaped API diagnostics.

**Goal**

Turn diagnostics into a small, explicit operational contract instead of a docs-file presence check only.

### M3.1. Define target health/readiness contract

**Session scope:** docs + endpoint contract design.

Answer:

- what belongs in `health`
- what belongs in `readiness`
- whether one endpoint is enough for MVE

Deliver:

- clear response contract
- explicit DB readiness semantics

Done when:

- later implementation can follow one stable shape

### M3.2. Extend `/api/emis/health` with live DB readiness

**Session scope:** endpoint implementation only.

Deliver:

- DB connectivity/readiness signal
- clear degraded/unavailable states

Done when:

- health tells us more than "snapshot files exist"

### M3.3. Add centralized EMIS API error logging

**Session scope:** infra/logging only.

Suggested ownership:

- `src/lib/server/emis/infra/*`

Deliver:

- one place where route-level EMIS failures are logged
- no credential/token leakage

Done when:

- route handlers do not need ad hoc `console.error`
- error logging format is consistent

### M3.4. Add smoke coverage for readiness contract

**Session scope:** smoke only.

Deliver:

- smoke checks for the new health/readiness fields

Done when:

- diagnostics contract is enforced automatically

---

## Track M4: MVE Acceptance Closeout And Sign-Off

**Why this exists**

After M1-M3, we should close the loop against the actual MVE acceptance criteria instead of letting docs drift.

**Goal**

Produce a clean "MVE accepted" state or a very short residual-gap list.

### M4.1. Acceptance audit against `emis_mve_tz_v_2.md`

**Session scope:** audit only.

Deliver:

- checklist mapped to section 22 acceptance criteria
- each item marked `done`, `partial`, or `out of scope by decision`

Done when:

- there is one unambiguous MVE status snapshot

### M4.2. Align bootstrap and backlog with the audit result

**Session scope:** docs only.

Deliver:

- `docs/emis_session_bootstrap.md` updated
- this backlog updated

Done when:

- "current focus" matches actual remaining work

### M4.3. Final verification pass

**Session scope:** verification only.

Run when environment is available:

- `pnpm db:reset`
- `pnpm db:seed`
- `pnpm emis:smoke`
- `pnpm emis:write-smoke`
- `pnpm emis:offline-smoke`

Done when:

- MVE sign-off is backed by actual checks, not only doc review

---

## Track P1: Vessel Historical Track Integration

**Layer:** post-MVE next wave.

**Goal**

Extend current vessel mode from "current positions" to "selected vessel historical route".

### P1.1. Freeze UX and API contract for selected-vessel track

**Session scope:** contract only.

Answer:

- when track loads
- which route mode is default
- whether points, segments, or both load by default

Done when:

- UI and API changes have one agreed behavioral contract

### P1.2. Load historical track on vessel selection

**Session scope:** one behavior only.

Deliver:

- selecting a vessel triggers points/segments fetch
- current positions mode remains stable

Done when:

- vessel mode shows current position plus historical track for the selected vessel

### P1.3. Add `flyTo` on vessel selection

**Session scope:** map interaction only.

Done when:

- selecting a vessel from the catalog moves the viewport to the vessel context

### P1.4. Make vessel catalog viewport-aware

**Session scope:** search/catalog behavior only.

Done when:

- vessel list reflects current viewport or the chosen documented alternative

### P1.5. Add smoke/regression coverage

**Session scope:** smoke only.

Done when:

- vessel historical track behavior is exercised automatically

---

## Track P2: Offline Maps Ops Hardening

**Layer:** post-MVE next wave.

**Goal**

Harden deployment behavior for offline PMTiles bundle beyond local/dev success.

### P2.1. Verify Range support in production-shaped adapter-node build

**Session scope:** verification only.

Done when:

- Range behavior is confirmed against the actual production adapter/runtime path

### P2.2. Encode post-deploy verification steps in ops docs

**Session scope:** docs only.

Deliver:

- exact post-deploy checks
- expected success/failure signals

Done when:

- deploy verification is repeatable by another agent/operator

### P2.3. Define region-expansion workflow for offline assets

**Session scope:** docs first, code only if broken.

Answer:

- how a new PMTiles region is added
- how manifest freshness is updated
- how old assets are replaced safely

Done when:

- "add new region" is a documented recipe, not tribal knowledge

---

## Deferred / do not pull into current sessions

These are intentionally outside current active backlog unless product priorities change:

- full auth system
- full RBAC
- events domain
- automated ingestion pipelines
- NLP/LLM enrichment
- separate EMIS deployment/repo split

## Recommended execution order

```
M1.1 → M1.2 → M1.3 → M1.4 → M1.5
M2.1 → (M2.2 or M2.3 → M2.4 → M2.5 → M2.6)
M3.1 → M3.2 → M3.3 → M3.4
M4.1 → M4.2 → M4.3
P1.1 → P1.2 → P1.3 → P1.4 → P1.5
P2.1 → P2.2 → P2.3
```

## Suggested next dialog

Start with `M1.1`.

Why this one:

- it is docs-only
- it reduces ambiguity for every later write-side decision
- it keeps the next implementation sessions narrow and predictable

## Environment caveats

- `CHOKIDAR_USEPOLLING=1` for `pnpm emis:smoke`, `pnpm emis:write-smoke`, `pnpm emis:offline-smoke` on shared-folder mounts
- `DATABASE_URL=postgresql://postgres:SSYS@localhost:5435/dashboard` for DB-backed EMIS checks
- Docker Compose (`pnpm db:up`) must be running for DB-dependent verification
