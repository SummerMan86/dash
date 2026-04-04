# Plan: EMIS Phase 2 Baseline Truthfulness And Boundary Enforcement

## Цель

Открыть post-freeze phase 2 не с общего refactor, а с truthfulness baseline:

- сначала зафиксировать один canonical baseline routine и честный verdict;
- затем убрать live blocker `EXC-ARCH-002`;
- затем подтянуть package-aware guardrails;
- затем закрыть или осознанно продлить bounded UI waiver `EXC-ARCH-004`;
- только после этого идти в более механический cleanup.

## Почему эта wave активна сейчас

- `A0-A5` architecture/docs freeze уже закрыта на `2026-04-04`.
- Архив закрытого плана хранится в:
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_04_architecture_stabilization_and_governance_freeze.md`
- `current_plan.md` больше не должен выглядеть так, как будто freeze wave всё ещё active.
- `EXC-ARCH-002` is closed in `P3.2`; it no longer keeps `pnpm lint:boundaries` red.
- `EXC-ARCH-004` is closed in `P3.4`; no live architecture blocker remains.

## Стратегические решения этой wave

- topology and package ownership remain frozen:
  - no new topology discussion without runtime/ops pressure
- default order is fixed:
  - `P3.1` → `P3.2` → `P3.3` → `P3.4` → baseline rerun → `P3.5` → `P3.6`
- `P3.1` is docs-only:
  - no code changes
  - goal is truthful baseline routine and verdict alignment
- canonical post-freeze baseline routine is currently an ordered root-command set, not an imaginary single script:
  - `pnpm check`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm emis:smoke`
  - `pnpm emis:offline-smoke`
  - `pnpm emis:write-smoke` when write-side relevant
- if a slice does not rerun some checks, the verdict must say `not run`, not silently inherit green
- baseline is now:
  - `Green`
  - `baseline closed`
- do not jump to shim cleanup before the baseline truth is documented as green

## Подзадачи

### P3.1: Baseline command and truthful checks hardening
- status: completed on `2026-04-04` (docs-only)
- scope:
  - `docs/agents/lead-strategic/current_plan.md`
  - `docs/agents/lead-strategic/memory.md`
  - `docs/emis_next_tasks_2026_03_22.md`
  - `docs/emis_session_bootstrap.md`
  - `docs/emis_known_exceptions.md`
  - `docs/agents/workflow.md`
  - `docs/agents/baseline-governor/*`
- depends on:
  - archived `A0-A5` freeze wave
- размер: S
- accepted output:
  - closed freeze-wave plan moved to archive
  - new active `current_plan.md` opened for phase 2
  - canonical post-freeze baseline routine documented in one consistent form
  - docs explicitly say baseline is not green while `EXC-ARCH-002` and `EXC-ARCH-004` remain live
  - next default slice is `P3.2`, not a rerun of `A5` or generic cleanup

#### P3.1 Acceptance Checklist
- another agent can run the baseline routine without guessing command order
- docs do not imply a fully green architecture baseline
- `current_plan.md` no longer presents the closed freeze wave as active
- `lead-strategic` memory resumes from phase 2

### P3.2: Boundary gate repair for `EXC-ARCH-002` / `fetchDataset.ts`
- status: completed on `2026-04-04`
- scope:
  - platform-side boundary repair in `apps/web/src/lib/shared/api/fetchDataset.ts`
  - adjacent dataset/filter composition only if required by the fix
- depends on: `P3.1`
- размер: M
- notes:
  - primary target is truthful green `pnpm lint:boundaries`
  - remove or justify the remaining cross-boundary composition
  - close `EXC-ARCH-002` or replace it with an explicit accepted rule change
  - completed by moving `fetchDataset.ts` to direct package imports and removing redundant `cacheKeyQuery`

#### P3.2 Acceptance Checklist
- `pnpm lint:boundaries` no longer reports the known `fetchDataset.ts` violations
- boundary ownership remains explicit, not hidden behind a temporary shim
- `docs/emis_known_exceptions.md` is updated truthfully if the exception status changes

### P3.3: Package-aware enforcement / lint guardrails
- status: completed on `2026-04-04`
- scope:
  - `eslint.config.js`
  - `scripts/lint-boundaries.mjs`
  - package/app ownership enforcement docs only if the rule surface changes
  - `docs/emis_known_exceptions.md` only if a new bounded exception is explicitly accepted
- depends on: `P3.2` preferred
- размер: M
- notes:
  - current `lint:boundaries` still enforces mostly app-local rails and two EMIS route cases; the repo-wide package graph from `docs/architecture.md` is not yet mechanically covered
  - target the accepted package-era non-negotiables first:
    - `platform-*` does not import `emis-*`
    - `emis-server` does not import `emis-ui`
    - `packages/*` do not import from `apps/web`
    - BI EMIS routes do not import operational `@dashboard-builder/emis-server/modules/*`
    - truthful infra carve-outs such as `@dashboard-builder/emis-server/infra/mapConfig` stay allowed unless architecture is explicitly corrected
  - do not expand this slice into broad cleanup or general app-layer redesign
  - specifically, do not silently pull the known `stock-alerts -> routes` issue into this slice unless it is taken as a tiny explicit fix or registered as a separate bounded exception

#### P3.3 Acceptance Checklist
- main package/app boundaries are mechanically enforced
- `lint:boundaries` coverage includes the relevant `packages/*` surfaces, not only app-local rails
- guardrails match current ownership truth, not pre-package assumptions
- newly exposed violations are either fixed in-slice or documented truthfully as explicit exceptions
- no silent reopening of unrelated cleanup

### P3.4: Bounded `EXC-ARCH-004` / `EmisMap.svelte` follow-up
- status: completed on `2026-04-04`
- scope:
  - one bounded EMIS UI decomposition follow-up or explicit waiver renewal
- depends on: `P3.3` preferred
- размер: M
- notes:
  - this is intentionally later than baseline truthfulness and boundary closure
  - no UX redesign
  - completed by extracting `map-interactions.ts` and `map-bounds.ts`, reducing `EmisMap.svelte` from `903` to `695` lines and closing `EXC-ARCH-004`

#### P3.4 Acceptance Checklist
- `EXC-ARCH-004` is either closed or explicitly renewed with owner + expiry
- widget behavior remains unchanged
- the slice stays bounded

### P3.5: Baseline rerun fallout / `platform-datasets` dev-SSR repair
- status: completed on `2026-04-04`
- scope:
  - `@dashboard-builder/platform-datasets` dev-SSR / workspace package resolution repair
  - affected dataset runtime only:
    - `apps/web/src/routes/api/datasets/[id]/+server.ts`
    - `/dashboard/emis`
    - `/dashboard/emis/ship-routes`
    - `/dashboard/emis/provenance`
  - minimal app/vite wiring where needed to keep Vite SSR responsible for workspace packages
- depends on:
  - full baseline rerun after `P3.4`
- размер: M
- notes:
  - the full canonical baseline routine was rerun on `2026-04-04`
  - current verified status:
    - `pnpm check` — green
    - `pnpm build` — green
    - `pnpm lint:boundaries` — green
    - `pnpm emis:offline-smoke` — green
    - `pnpm emis:write-smoke` — green
    - `pnpm emis:smoke` — green
  - root smoke/runtime repair:
    - root `package.json` now declares `dotenv` and `pg` for root smoke scripts
    - `scripts/emis-offline-smoke.mjs` and `scripts/emis-write-smoke.mjs` now start Vite from `apps/web`
    - `scripts/emis-offline-smoke.mjs` now reads offline assets from `apps/web/static/emis-map/offline`
  - dataset/runtime resolution repair:
    - `apps/web/vite.config.ts` now keeps `@dashboard-builder/platform-datasets` and `@dashboard-builder/db` inside the Vite SSR transform path
  - `P3.4` SSR fallout was also repaired:
    - `map-interactions.ts` and `map-bounds.ts` now use default runtime imports from `maplibre-gl`
  - smoke runtime result:
    - dataset error contracts now return expected `400/404`
    - dataset responses now return `200`
    - `/dashboard/emis*` pages now return `200`
  - keep this slice bounded:
    - no generic dataset redesign
    - no shim cleanup
    - no broad package export migration outside the failing path

#### P3.5 Acceptance Checklist
- `pnpm emis:smoke` is green again
- dataset endpoint error contracts return the expected `400/404` responses
- `/dashboard/emis`, `/dashboard/emis/ship-routes`, and `/dashboard/emis/provenance` no longer return `500` in smoke
- `pnpm check`, `pnpm build`, `pnpm lint:boundaries`, `pnpm emis:offline-smoke`, and `pnpm emis:write-smoke` stay green

### P3.6: Later shim cleanup and residual mechanical cleanup
- status: completed on `2026-04-04`
- scope:
  - `// MIGRATION` re-export cleanup
  - other residual mechanical cleanup that is not a live blocker
- depends on:
  - `P3.2`
  - `P3.3`
  - `P3.4`
  - `P3.5`
- размер: M
- notes:
  - completed as a bounded server-only cleanup without reopening accepted `P3.1-P3.5` work
  - removed dead app-side server shims:
    - `apps/web/src/lib/server/datasets/compile.ts`
    - `apps/web/src/lib/server/providers/postgresProvider.ts`
    - `apps/web/src/lib/server/db/pg.ts`
  - moved live consumers to canonical packages:
    - `routes/api/datasets/[id]/+server.ts` now imports dataset runtime directly from `@dashboard-builder/platform-datasets` / `@dashboard-builder/platform-datasets/server`
    - alert repositories/services now import pg pool directly from `@dashboard-builder/db`
  - active server/navigation docs were aligned to the new direct-import rule
  - verification after cleanup:
    - `pnpm check` — green
    - `pnpm build` — green
    - `pnpm lint:boundaries` — green
    - `pnpm emis:smoke` — green
    - `pnpm emis:offline-smoke` — green
    - `pnpm emis:write-smoke` — green

#### P3.6 Acceptance Checklist
- cleanup does not obscure ownership truth
- cleanup stays later than baseline hardening, boundary repair and waiver handling
- no reopening of accepted slices without concrete regression

## Recommended Execution Order
1. `P3.1` — baseline routine and verdict alignment.
2. `P3.2` — close the remaining boundary gate blocker.
3. `P3.3` — harden package-aware enforcement.
4. `P3.4` — resolve or renew the bounded UI waiver.
5. full baseline rerun.
6. `P3.5` — repair the remaining dataset/runtime blocker.
7. `P3.6` — perform later cleanup.

## Current Status On 2026-04-04

- archived:
  - `A0-A5` freeze wave
- completed:
  - `P3.1`
  - `P3.2`
  - `P3.3`
  - `P3.4`
  - `P3.5`
  - `P3.6`
- phase 2 exit criteria:
  - met on `2026-04-04`
- completed:
  - repo-wide doc sync follow-up (`DS-1`..`DS-4`) on `2026-04-04`
- current baseline verdict:
  - `Green`
  - `baseline closed`
- current live blockers:
  - none

## Default Next Dialogue

If the next chat opens the next strategic-tactical execution wave, start from `NW-1`:

- use the already rerun baseline results as input, not guesswork
- do not reopen accepted `P3.*` or `DS-*` work
- ordinary bounded feature work is open again because the baseline is closed
- default priority is MVE closeout and production-shaped guardrails before post-MVE feature expansion

Do not resume from `A5`, `P3.4`, or repo-wide doc sync.

## Scope Boundaries

### In scope
- truthful baseline routine and verdict alignment
- bounded boundary repairs
- package-aware machine enforcement
- bounded waiver follow-up for `EmisMap.svelte`
- bounded dataset/runtime baseline repair
- later mechanical cleanup only after the blockers above

### Out of scope
- new EMIS product features
- separate EMIS deployable/app discussion
- broad cross-repo refactor
- generic cleanup-first work
- large BI/UI expansion unrelated to the live blockers

## Exit Criteria For This Wave

Wave is considered complete only when all of the following are true:

- phase 2 no longer resumes from archived freeze-wave docs
- baseline routine and verdict are documented truthfully
- `EXC-ARCH-002` no longer keeps `pnpm lint:boundaries` red, or the rule is explicitly redefined and documented
- package-aware enforcement matches the accepted package topology
- `EXC-ARCH-004` is closed or explicitly renewed through the documented waiver path
- `pnpm emis:smoke` is green again after the post-rerun dataset/runtime repair
- later cleanup remains later, not the opening move

Status:

- satisfied on `2026-04-04` after `P3.5`

## After Phase 2

После закрытия `P3.1-P3.6` допустим отдельный bounded follow-up по repo-wide doc consistency.
Это не reopening phase 2 и не blocker для текущего execution order.

## Repo-Wide Doc Sync Follow-up

Это отдельный docs-only пакет для handoff в `lead-tactical`.

Цель:

- довести active docs layer до полного соответствия `docs/architecture.md`;
- убрать остаточный drift в agent/reviewer memory и active navigation docs;
- не переписывать historical corpus и не открывать новый architecture redesign.

### DS-1: Active doc inventory and drift classification
- status: completed on `2026-04-04`
- scope:
  - root entry docs:
    - `README.md`
    - `AGENTS.md`
    - `docs/AGENTS.md`
    - `docs/architecture.md`
  - active agent/reviewer docs:
    - `docs/agents/*`
    - `.claude/agents/*`
    - `.claude/agent-memory/*`
  - active local navigation docs only where they are current entry points
- depends on:
  - phase 2 exit criteria already met
- размер: S
- deliver:
  - one bounded inventory of active docs that still drift from the canonical architecture contract
  - classify each hit as:
    - `must-fix now` — active misleading guidance
    - `acceptable historical` — may stay as-is if clearly historical
    - `index-only note` — content may stay, but top-level docs must label it correctly
- notes:
  - do not expand into a repo-wide rewrite of every markdown file
  - prioritize documents that shape agent behavior or newcomer reading order

#### DS-1 Acceptance Checklist
- another agent can tell which docs are in-scope for sync without guessing
- the remaining patch set is limited to active source-of-truth and active workflow docs
- historical docs are explicitly separated from active docs in the inventory

### DS-2: Agent and reviewer memory truth sync
- status: completed on `2026-04-04`
- scope:
  - `.claude/agent-memory/architecture-reviewer/project_emis_monorepo.md`
  - `.claude/agent-memory/architecture-reviewer/MEMORY.md`
  - `docs/agents/lead-tactical/memory.md`
  - `docs/agents/lead-tactical/last_report.md`
  - adjacent active role docs only if the same stale wording appears there
- depends on:
  - `DS-1`
- размер: S
- deliver:
  - remove stale wording that still says:
    - architecture is `FSD`
    - `fetchDataset` remains a live blocker
    - baseline is still blocked by pre-`P3` conditions
  - where a document is intentionally historical, add or preserve a clear historical framing instead of silently rewriting history
  - keep reviewer memory aligned with current architecture vocabulary:
    - `layer/import boundaries`
    - package/app ownership
    - `baseline closed`
- notes:
  - `last_report.md` may stay a report of its own session, but it must not mislead a new tactical lead about current baseline truth

#### DS-2 Acceptance Checklist
- active agent/reviewer memory no longer carries stale FSD-as-architecture guidance
- no active memory file still claims `fetchDataset` or `EXC-ARCH-004` is live
- historical reports remain historical rather than pretending to be current state

### DS-3: Navigation and ownership wording sweep
- status: completed on `2026-04-04`
- scope:
  - active `AGENTS.md` / local navigation docs that still drift from:
    - package ownership
    - canonical import homes
    - execution paths
    - current baseline truth
  - likely touch points:
    - `apps/web/src/lib/**/AGENTS.md`
    - `packages/**/AGENTS.md`
    - active route-level `AGENTS.md`
    - `docs/strategy/bi_strategy.md` only where it is still used as active guidance
- depends on:
  - `DS-1`
  - `DS-2` preferred
- размер: M
- deliver:
  - patch active navigation docs so they no longer point readers to removed shim paths or pre-package ownership
  - ensure repo-wide wording is consistent:
    - `single-deployable modular monolith`
    - `FSD-inspired` only for client/app-local layering
    - direct package imports where canonical homes are already established
- notes:
  - do not reopen code slices just because a doc mentions a removed shim; fix the doc only
  - do not rewrite historical analysis docs unless an active index currently misclassifies them

#### DS-3 Acceptance Checklist
- active local navigation docs use the same ownership/boundary language as `docs/architecture.md`
- no active AGENTS doc points readers at deleted shim files as if they were canonical
- current entry-point docs agree on which files are canonical vs historical

### DS-4: Final consistency verification and handoff closeout
- status: completed on `2026-04-04`
- scope:
  - `docs/agents/lead-tactical/last_report.md`
  - `docs/agents/lead-tactical/memory.md`
  - `docs/agents/lead-strategic/memory.md` only if the follow-up status changes
  - repo-wide search-based verification across active docs
- depends on:
  - `DS-2`
  - `DS-3`
- размер: S
- deliver:
  - final verification sweep on active docs for stale patterns such as:
    - `FSD` as repo-wide architecture name
    - live `fetchDataset` blocker wording
    - deleted shim paths presented as canonical
    - baseline-not-closed wording in active docs
  - a short tactical closeout note that says what was intentionally left historical
- recommended checks:
  - `rg` over active docs for:
    - `FSD`
    - `fetchDataset`
    - removed shim paths
    - `baseline not closed`
    - `current-project-analysis`
  - no code/build rerun required unless a doc change exposes a real code/doc contradiction

#### DS-4 Acceptance Checklist
- active repo-wide docs do not contradict `docs/architecture.md`
- active workflow/reviewer docs do not carry stale pre-`P3.6` blockers
- lead-tactical can hand off a final doc-sync report without reopening architecture design

## Repo-Wide Doc Sync Execution Order

1. `DS-1` — inventory and classify the remaining drift.
2. `DS-2` — sync agent/reviewer memory and tactical status docs.
3. `DS-3` — sweep active navigation docs for ownership/import-language drift.
4. `DS-4` — run final search-based verification and close out the docs-only package.

## Repo-Wide Doc Sync Constraints

- docs-only package; no code changes by default
- no architecture redesign
- no broad historical markdown rewrite
- if a stale statement lives in a historical file, prefer explicit historical framing over content replacement
- review gate can stay light:
  - `docs-reviewer` required
  - `architecture-reviewer` recommended
  - no `security` / `ui-reviewer` unless scope changes beyond markdown

## Next Strategic-Tactical Wave

Теперь, когда `P3.1-P3.6` и repo-wide doc sync закрыты, наиболее логичный следующий приоритет — не новый feature wave, а **MVE closeout + production-shaped guardrails**.

Причины:

- baseline и architecture/docs layer уже стабилизированы, значит снова можно двигаться в прикладную сторону;
- главный remaining ambiguity теперь не structural, а product/operating-model:
  - кто и как имеет право писать в EMIS;
  - что именно входит в MVE по dictionaries/admin;
  - какой readiness/health contract считается production-shaped;
- если сейчас прыгнуть в `P1`/`P2`, acceptance boundary снова размоется и MVE sign-off станет менее ясным.

### NW-1: Access model freeze and write-policy design
- status: **completed** on `2026-04-04`
- backlog mapping:
  - `M1.1`
  - `M1.2`
- scope:
  - `docs/emis_access_model.md` (create new)
  - `docs/emis_session_bootstrap.md` (update)
  - `docs/emis_mve_product_contract.md` (read-only input)
  - `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` (update)
- deliver:
  - explicit trusted/internal operating model
  - precise meanings of `viewer`, `editor`, `admin` for MVE
  - one agreed write-policy note:
    - actor requirement in production-shaped mode
    - dev/local behavior
    - target helper signature and failure shape
- why first:
  - all later write-side guardrails depend on this policy being frozen
  - this is docs/design-heavy and cheap compared to route fan-out
- size: S (docs/design only, no code changes)
- workers: none needed — lead-tactical executes directly

#### NW-1 Tactical Breakdown

1. **NW-1a: Analyze current write-side state** (read-only)
   - read `docs/emis_mve_product_contract.md` — what the MVE contract expects
   - read `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md` — current runtime contract
   - read `docs/emis_session_bootstrap.md` — current state summary
   - grep existing write routes/actions for current actor attribution pattern
   - output: understanding of what exists vs what is missing

2. **NW-1b: Draft `docs/emis_access_model.md`** (M1.1)
   - explicit trusted/internal operating model statement
   - MVE-level role semantics: `viewer` (read-only), `editor` (writes with actor), `admin` (deferred beyond MVE)
   - what is enforced now: actor attribution header on writes
   - what is explicitly deferred: full auth, RBAC, session management
   - deployment contour: trusted internal network, no anonymous access

3. **NW-1c: Design write-policy helper contract** (M1.2)
   - target helper signature: `assertWriteContext(request): { actor: string }` or similar
   - failure shape: `403` with structured error body
   - dev/local behavior: configurable fallback actor or strict mode
   - add policy section to `RUNTIME_CONTRACT.md`

4. **NW-1d: Update bootstrap and run review**
   - update `docs/emis_session_bootstrap.md` to reflect access model status
   - run `docs-reviewer` on the diff
   - write `last_report.md`

#### NW-1 Acceptance Checklist
- docs no longer imply a hidden full auth/RBAC system
- the team can describe write authorization rules in one paragraph without reopening policy debate
- `lead-tactical` can hand off implementation of a single shared write-policy helper without guessing behavior
- `docs/emis_access_model.md` exists as a canonical reference for the operating model
- `RUNTIME_CONTRACT.md` includes the write-policy helper contract

### NW-2: Centralized write guardrails rollout
- status: **completed** on `2026-04-04`
- backlog mapping:
  - `M1.3`
  - `M1.4`
  - `M1.5`
- depends on:
  - `NW-1` (completed)
- scope:
  - `apps/web/src/lib/server/emis/infra/writePolicy.ts` (new file, home approved by architecture-steward)
  - EMIS write API routes (`apps/web/src/routes/api/emis/*/+server.ts`)
  - EMIS manual-entry form actions (`apps/web/src/routes/emis/*/new/+page.server.ts`, `*/edit/+page.server.ts`)
  - smoke additions for negative write-path checks
- deliver:
  - `assertWriteContext()` helper per contract in `docs/emis_access_model.md` §4
  - consistent `403 WRITE_NOT_ALLOWED` failure for disallowed writes in strict mode
  - all EMIS write entry points wired to the shared helper (replacing direct `resolveEmisWriteContext()`)
  - at least one negative smoke case: `EMIS_WRITE_POLICY=strict`, no actor header → expect `403` + `WRITE_NOT_ALLOWED`
- why second:
  - this converts the newly frozen operating model into enforceable code
- size: M (1 new infra file + 12 route touch points + smoke additions)
- workers: recommended — split infra+smoke from route wiring
- architecture-steward: not needed (helper stays in approved home)
- review gate: architecture-reviewer, security-reviewer, docs-reviewer, code-reviewer

#### NW-2 Acceptance Checklist
- `writePolicy.ts` exists at `apps/web/src/lib/server/emis/infra/writePolicy.ts`
- route code no longer carries ad hoc write authorization logic (all use `assertWriteContext()`)
- API writes and manual UI actions fail consistently when write context is invalid
- negative smoke: `EMIS_WRITE_POLICY=strict` + no actor header → `403 WRITE_NOT_ALLOWED`
- `pnpm check`, `pnpm build`, `pnpm lint:boundaries` stay green
- `pnpm emis:write-smoke` stays green in permissive mode

### NW-3: Dictionary/admin scope freeze
- status: **completed** on `2026-04-04`
- backlog mapping:
  - `M2.1`
  - then either `M2.2` or `M2.3`
- depends on:
  - `NW-2`
- scope:
  - decision + docs package only:
    - decide MVE scope for `countries`, `object_types`, `sources`
    - if decision is `seed-managed`, align active docs and acceptance language
    - if decision is `admin CRUD in MVE`, define only the narrowest follow-up admin surface and explicit non-goals
  - no CRUD implementation in `NW-3`
- decision:
  - **seed-managed for MVE**
  - no admin CRUD UI in MVE scope
  - dictionary data managed through `db/seeds/` (001_countries, 002_object_types, 003_sources)
  - admin role explicitly deferred beyond MVE
- docs aligned:
  - `emis_mve_product_contract.md`: screen #6 and admin role marked as deferred beyond MVE
  - `emis_session_bootstrap.md`: dictionary scope decision marked as done
  - `emis_access_model.md`: already correct (admin deferred, seed-managed)
- review gate:
  - `docs-reviewer` required
  - `architecture-steward` only if the decision reopens admin surface or changes active access/ownership docs

#### NW-3 Acceptance Checklist
- the team has one explicit answer: **seed-managed** ~~or `admin CRUD in MVE`~~
- MVE docs stop implying both models at once — deferral notes added to MVE spec
- active docs stop implying unfinished admin CRUD pages — screen #6 and admin role explicitly deferred

### NW-4: Health/readiness and API error logging hardening
- status: ready for handoff
- backlog mapping:
  - `M3.1`
  - `M3.2`
  - `M3.3`
  - `M3.4`
- depends on:
  - `NW-1`
  - `NW-2` preferred
- scope:
  - readiness/health contract
  - `/api/emis/health` live DB readiness
  - centralized EMIS API error logging
  - smoke coverage for readiness contract
- why fourth:
  - once write policy is explicit and enforced, the next production-shaped gap is observability and readiness truth
  - this is still MVE closeout, not feature expansion

#### NW-4 Acceptance Checklist
- `/api/emis/health` distinguishes service readiness from mere route liveness
- EMIS API failures are logged centrally with useful correlation context
- smoke verifies the readiness contract rather than relying on manual checks

### NW-5: MVE acceptance audit and sign-off
- status: ready for handoff
- backlog mapping:
  - `M4.1`
  - `M4.2`
  - `M4.3`
- depends on:
  - `NW-2`
  - `NW-3`
  - `NW-4`
- scope:
  - acceptance audit against `docs/emis_mve_product_contract.md`
  - backlog/bootstrap alignment
  - final verification pass
- why fifth:
  - sign-off only makes sense after access model, dictionary scope and observability gaps are resolved or explicitly accepted

#### NW-5 Acceptance Checklist
- MVE acceptance is audited against one explicit document set
- bootstrap/backlog no longer overstate or understate the current implementation
- the team has a truthful `accepted / accepted with explicit deferrals / not yet accepted` verdict

## Post-MVE Opening Order

Only after `NW-5`:

1. `P1` — vessel historical track integration
2. `P2` — offline maps ops hardening

Why this order:

- `P1` gives the highest user-facing value after MVE closeout
- `P2` is important, but it is ops hardening around an already working offline/maps slice, not the main remaining acceptance ambiguity

## Recommended Next Handoff To Lead-Tactical

Continue the current wave in this order:

1. `NW-3` — scope decision package (`M2.1` + branch)
2. `NW-4` — observability package (`M3.1-M3.4`)
3. `NW-5` — acceptance/sign-off package (`M4.1-M4.3`)
