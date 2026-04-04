# EMIS — Active Backlog (4 April 2026)

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

## Previously closed implementation slices

These remain closed unless there is a concrete regression.

Important:

- the post-freeze architecture baseline is green and closed
- `EXC-ARCH-002` is closed in `P3.2`, and `EXC-ARCH-004` is closed in `P3.4`
- `P3.1` baseline truthfulness hardening is closed as a docs-only slice on `2026-04-04`
- the full canonical routine was rerun on `2026-04-04`
- `P3.5` closed the remaining dataset/runtime blocker and made `pnpm emis:smoke` green again
- `P3.6` later cleanup is also closed on `2026-04-04`
- the default next work should not reopen `P3.*`; continue with repo-wide doc sync only if needed or with regular bounded backlog work

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

## Post-freeze default opening order

The architecture/docs freeze wave `A0-A5` is now closed.
If the next session continues the architecture/governance line, use this order first:

1. `P3.1` — baseline command / truthful checks hardening `completed 2026-04-04`
2. `P3.2` — boundary gate repair for `EXC-ARCH-002` / `fetchDataset.ts` `completed 2026-04-04`
3. `P3.3` — package-aware enforcement / lint guardrails `completed 2026-04-04`
4. `P3.4` — bounded `EXC-ARCH-004` / `EmisMap.svelte` waiver follow-up `completed 2026-04-04`
5. full baseline rerun `completed 2026-04-04`
6. `P3.5` — bounded `platform-datasets` dev-SSR / dataset-runtime repair `completed 2026-04-04`
7. `P3.6` — shim cleanup and other residual cleanup `completed 2026-04-04`

Do not start post-freeze phase 2 with shim cleanup or with a broad mixed refactor slice.

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
- `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`

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

- `apps/web/src/lib/server/emis/infra/*`

Deliver:

- one reusable guard/policy helper
- stable failure code for disallowed writes

Done when:

- route code no longer needs ad hoc access checks
- the helper is ready to be wired into both API writes and manual UI actions

### M1.4. Wire policy into EMIS write entry points

**Session scope:** transport/action integration only.

Suggested ownership:

- `apps/web/src/routes/api/emis/*`
- `apps/web/src/routes/emis/*/new`
- `apps/web/src/routes/emis/*/edit`

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

- `apps/web/src/lib/server/emis/infra/*`

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

## Track P3: Post-Freeze Enforcement And Refactor Opening Order

**Layer:** post-freeze phase 2.

**Goal**

Open implementation work after the architecture/docs freeze in one explicit order:
first restore truthful baseline checks, then repair the remaining boundary gate blocker,
then tighten package-aware enforcement, then handle the bounded EMIS UI waiver.

Scope note:

- this track is the canonical post-freeze opening order from the active phase-2 plan
- do not start this track with shim cleanup
- keep platform-level prerequisites explicit when they are required for a truthful EMIS baseline
- broader EMIS or BI product work can still be scheduled separately, but it does not override this order by default

### P3.1. Baseline command and truthful checks hardening

**Status:** completed on `2026-04-04` as docs-only slice.

**Session scope:** verification/docs/tooling hardening only.

Current concern:

- canonical verification and baseline-governor workflow are documented, but the repo still needs one truthful post-freeze baseline routine
- active docs must clearly distinguish:
  - what is already green
  - what is blocked by live exceptions
  - what counts as the canonical baseline command / verdict set

Deliver:

- one canonical post-freeze baseline command / check routine
- explicit baseline verdict wording aligned across backlog/docs
- a truthful checklist showing which known exceptions still block full closure

Accepted output:

- closed `A0-A5` plan archived to `docs/archive/agents/lead_strategic_current_plan_2026_04_04_architecture_stabilization_and_governance_freeze.md`
- active `docs/agents/lead-strategic/current_plan.md` replaced with a phase-2 plan
- canonical routine documented as:
  - `pnpm check`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm emis:smoke`
  - `pnpm emis:offline-smoke`
  - `pnpm emis:write-smoke` when write-side relevant
- current truthful verdict aligned as:
  - status: `Red`
  - verdict: `baseline not closed`
- next default slice moved to `P3.2`

Done when:

- another agent can run the baseline routine without guessing the command set
- docs no longer imply a fully green architecture baseline while known exceptions remain live
- `P3.2` becomes the next bounded implementation slice to remove the remaining boundary blocker

### P3.2. Boundary gate repair for `EXC-ARCH-002` / `fetchDataset.ts`

**Status:** completed on `2026-04-04`.

**Session scope:** platform-side boundary repair only.

Current concern:

- `apps/web/src/lib/shared/api/fetchDataset.ts` used to keep `pnpm lint:boundaries` red
- the pre-existing shared -> entities coupling blocked a truthful boundary baseline
- the helper also carried local tech debt around redundant query-copying

Deliver:

- repair or relocate the remaining `fetchDataset.ts` cross-boundary composition
- remove the redundant local query-copying (`cacheKeyQuery`) if it is still unnecessary after the boundary fix
- close `EXC-ARCH-002` or replace it with an explicitly documented and accepted rule change

Accepted output:

- `fetchDataset.ts` now imports dataset/filter contracts directly from workspace packages instead of `$entities/*`
- redundant `cacheKeyQuery` removed
- `pnpm lint:boundaries` is green again
- `EXC-ARCH-002` removed from live exceptions

Done when:

- `pnpm lint:boundaries` no longer reports the known `fetchDataset.ts` violations
- dataset/filter boundary stays explicit rather than hidden behind a new temporary shim
- the boundary gate can be treated as green or intentionally redefined with truthful docs

### P3.3. Package-aware enforcement / lint guardrails

**Status:** completed on `2026-04-04`.

**Session scope:** guardrails/lint/config hardening only.

Current concern:

- package-era architecture is now documented clearly, but machine-enforced guardrails still need to match that topology
- after `P3.2`, the next risk is leaving package/app boundaries under-enforced or documented only in prose
- current `lint:boundaries` coverage is still concentrated on app-local rails and a small EMIS route subset; `packages/*` non-negotiables are mostly unchecked
- current `lint:boundaries` coverage is now expanded to `packages/*/src/` and the accepted package-era non-negotiables are enforced

Deliver:

- tightened package-aware boundary rules for the accepted package graph
- lint/verification guardrails aligned with the current package ownership model
- explicit documentation for any intentionally allowed package/app leaf exceptions that remain
- keep the slice bounded: do not accidentally convert it into general app-layer cleanup just because a newly-enforced rule reveals old drift

Done when:

- the main package/app architectural boundaries are enforced mechanically, not only socially
- boundary verification covers the relevant package surfaces in addition to app-local rails
- the guardrails reflect current ownership truth instead of older pre-package assumptions
- any newly surfaced violation is either fixed in-slice or recorded as an explicit bounded exception
- this slice does not silently expand into broad cleanup or shim removal
- truthful BI carve-outs such as `@dashboard-builder/emis-server/infra/mapConfig` remain allowed

### P3.4. Bounded `EmisMap.svelte` waiver follow-up for `EXC-ARCH-004`

**Status:** completed on `2026-04-04`.

**Session scope:** bounded EMIS UI refactor only, no UX redesign.

Current concern:

- `packages/emis-ui/src/emis-map/EmisMap.svelte` still had a live complexity waiver after the accepted hardening wave
- this slice closed that waiver through bounded package-local extraction

Deliver:

- one bounded follow-up decomposition pass for the remaining oversized map widget
- waiver closure or an explicitly renewed waiver with updated owner + expiry if further split is still deferred for a justified reason

Accepted output:

- extracted `map-interactions.ts` and `map-bounds.ts` under `packages/emis-ui/src/emis-map/`
- `EmisMap.svelte` reduced from `903` to `695` lines
- `EXC-ARCH-004` closed in the live exception registry
- `pnpm check`, `pnpm lint:boundaries`, and `pnpm build` green in the slice

Done when:

- map behavior remains unchanged
- `EXC-ARCH-004` is either closed or explicitly renewed through the documented waiver path
- the work stays bounded and does not turn into a general EMIS UI redesign

### P3.5. Baseline rerun fallout / `platform-datasets` dev-SSR repair

**Session scope:** bounded dataset/runtime repair only.

Current concern:

- the bounded dataset/runtime repair has been completed
- the full post-freeze baseline routine reran successfully
- verified current results:
  - `pnpm check` — green
  - `pnpm build` — green
  - `pnpm lint:boundaries` — green
  - `pnpm emis:offline-smoke` — green
  - `pnpm emis:write-smoke` — green
  - `pnpm emis:smoke` — green
- the remaining focus is later cleanup only

Deliver:

- keep the slice bounded to `@dashboard-builder/platform-datasets`, affected dataset routes and only the minimal app/vite wiring needed to keep Vite SSR responsible for workspace packages
- do not reopen accepted `P3.4` work

Done when:

- `pnpm emis:smoke` is green
- dataset endpoint error contracts return the expected `400/404` responses
- `/dashboard/emis*` pages return `200` in smoke
- `pnpm check`, `pnpm build`, `pnpm lint:boundaries`, `pnpm emis:offline-smoke`, and `pnpm emis:write-smoke` stay green

### P3.6. Shim cleanup and residual mechanical cleanup

**Status:** completed on `2026-04-04`.

**Session scope:** bounded cleanup only after `P3.1` through `P3.5`.

Accepted output:

- removed dead app-side server shims:
  - `apps/web/src/lib/server/datasets/compile.ts`
  - `apps/web/src/lib/server/providers/postgresProvider.ts`
  - `apps/web/src/lib/server/db/pg.ts`
- moved live consumers to canonical packages:
  - `routes/api/datasets/[id]/+server.ts` now imports from `@dashboard-builder/platform-datasets` / `@dashboard-builder/platform-datasets/server`
  - alert repositories/services now import `getPgPool` directly from `@dashboard-builder/db`
- active server/navigation docs aligned to the new direct-import rule
- verification remained green:
  - `pnpm check`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm emis:smoke`
  - `pnpm emis:offline-smoke`
  - `pnpm emis:write-smoke`

Done when:

- shims are removed or reduced without breaking current ownership clarity
- cleanup stays later than baseline hardening, boundary repair, package-aware enforcement and dataset/runtime repair
- this work does not jump ahead of live-exception closure

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
P3.1 → P3.2 → P3.3 → P3.4 → full baseline rerun → P3.5 → P3.6
M1.1 → M1.2 → M1.3 → M1.4 → M1.5
M2.1 → (M2.2 or M2.3 → M2.4 → M2.5 → M2.6)
M3.1 → M3.2 → M3.3 → M3.4
M4.1 → M4.2 → M4.3
P1.1 → P1.2 → P1.3 → P1.4 → P1.5
P2.1 → P2.2 → P2.3
```

## Suggested next dialog

Start with `M1.1`, another bounded backlog slice, or repo-wide doc sync if architecture docs still need a final pass.

Why this one:

- `P3.1-P3.6` are already closed
- the post-freeze architecture baseline is green and closed
- the next useful work should move back to bounded backlog slices instead of reopening cleanup

## Environment caveats

- `CHOKIDAR_USEPOLLING=1` for `pnpm emis:smoke`, `pnpm emis:write-smoke`, `pnpm emis:offline-smoke` on shared-folder mounts
- `DATABASE_URL=postgresql://postgres:SSYS@localhost:5435/dashboard` for DB-backed EMIS checks
- Docker Compose (`pnpm db:up`) must be running for DB-dependent verification
