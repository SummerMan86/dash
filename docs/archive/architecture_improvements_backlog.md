# Architecture Improvements Backlog

Deferred improvements to `docs/architecture.md` and repo-wide architectural surface. Items here are **not blocking current work**; they are tracked so they surface when their trigger arrives or when a doc polish wave is scheduled.

Canonical root: [architecture.md](./architecture.md).
Companion verticals: [architecture_dashboard_bi.md](./architecture_dashboard_bi.md), [architecture_emis.md](./architecture_emis.md).

## Priority model

- **P1 — trigger-driven blocker**: becomes blocking when a specific condition arrives (new tenant, HA deploy, external onboarding).
- **P2 — low-cost, high-value on touch**: do opportunistically when the surrounding section is opened for any reason.
- **P3 — polish**: nice to have, no compelling trigger.

---

## P1. Trigger-driven blockers

### P1.1. Multi-tenancy model is undeclared

- **What.** `ServerContext.tenantId` exists in the BI contract, but `architecture.md` does not declare whether the system is single-tenant, multi-tenant, or multi-tenant-ready. `assertDatasetAccess()` is a placeholder (BI debt #5).
- **Why it matters.** §1.7 Security claims auth/authz are server gates; tenancy is the gap beneath that. Silent assumption leaks into access checks, cache keys, and row-level visibility.
- **Trigger.** First external user, second tenant, or any `access.requiredScopes` enforcement work.
- **Durable target.** Explicit §1.7 subsection: tenancy model, `tenantId` participation in cache identity, row-level visibility boundary (provider vs view vs app).

### P1.2. Scheduler lock vs "one deployable process" contradiction

- **What.** §1.9 declares "one deployable process". `apps/web/src/lib/server/alerts/` uses `alerts.scheduler_locks` as a distributed lock. One of the two statements is wrong.
- **Why it matters.** Next HA / blue-green / canary deploy discussion hits this immediately. Either architecture tolerates N>1 processes (and §1.9 must soften), or the lock is paranoia (and rationale should say so).
- **Trigger.** Any HA / scale-out / deploy-concurrency discussion.
- **Durable target.** One of: (a) restate §1.9 as "normally one process, but components must be safe for brief overlap during deploy transitions"; (b) document the lock as deploy-window paranoia with a named rationale; (c) explicitly declare multi-instance support.

---

## P2. Low-cost, high-value on next touch

### P2.1. System summary + context diagram at the top

- **What.** Insert a 2-paragraph system summary and a context diagram (C4-L1 style) between `Scope` and `§1`. Summary: "single-deployable SvelteKit modular monolith hosting a BI read-side platform and an EMIS operational domain; EMIS-split-ready by package boundaries". Diagram: `browser → nginx → SvelteKit(Node) → {pg, Oracle, ClickHouse, Cube, WB API, Telegram, MapTiler}`.
- **Why.** New reader / new agent lands on `architecture.md` and gets principles before a description.
- **Cost.** ~15 minutes.

### P2.2. Table of contents

- **What.** Add a TOC at the top, mirroring `architecture_dashboard_bi.md:25-36` style.
- **Why.** §1 has 10 subsections + 10 top-level sections; TOC halves scroll cost for reviewers.
- **Cost.** ~5 minutes.

### P2.3. External dependencies catalog

- **What.** Add a section (probably §7 or §11) listing external systems the app depends on at runtime: Telegram Bot API, MapTiler, PMTiles CDN, WB Prices API, Oracle DWH, ClickHouse, Cube, external DWHs (`mart_marketplace`, `mart_strategy`). Each row: auth model, failure semantics, owner, what breaks if unavailable.
- **Why.** Today this knowledge is split across README, env vars, BI doc, and EMIS doc. A consolidated table is the first thing an ops discussion needs.
- **Cost.** ~30 minutes, one-time.

### P2.4. Unify §8 Verification Hooks and §8.1 Lint Governance

- **What.** Merge the policy column from §8.1 directly into the §8 table (mandatory vs monitored per row). Avoid reader having to cross-reference two tables.
- **Why.** A contributor running `pnpm lint:eslint` and seeing existing baseline errors currently panics before reading §8.1.
- **Cost.** ~10 minutes.

### P2.5. Minor accuracy fixes

- `§1.2` — `platform-*` "domain-agnostic" → "business-domain-agnostic". Platform packages depend on Node/pg/ECharts stack; the intent is to exclude business domains, not all context.
- `§1.7` — `assertWriteContext()` referenced without path. Add `[apps/web/src/lib/server/emis/infra/writePolicy.ts]`. Same for `isSafeIdent()` → `[packages/platform-datasets/src/server/providers/shared.ts]`.
- `§4 Alerts / ops` — add a one-line rationale for "why app-local, not package" to prevent future promotion pressure.
- `§1.10` — the "URL kebab-case / JSON camelCase" rule should have a concrete example row to prevent drift.
- `§9 New Domain Overlay` — add a trigger: when is overlay pattern mandatory vs when is "just add to existing packages" fine.

---

## P3. Polish (no compelling trigger)

### P3.1. Repo-wide observability conventions

- **What.** Section on: log format, levels, `x-request-id` propagation repo-wide (today scoped to EMIS only), health/readyz convention, structured telemetry minimum fields (the BI doc has a good template at `architecture_dashboard_bi.md:512-536`).
- **Why.** Today cross-cutting observability lives per vertical; a repo-wide baseline would prevent drift.

### P3.2. Time/timezone policy

- **What.** Repo-wide rule: all DB timestamps UTC, all cron in a named timezone (`ALERT_TIMEZONE`), rendering localized at presentation layer.
- **Why.** `ALERT_TIMEZONE` env var exists without a backing rule; future cron-sensitive features will re-litigate.

### P3.3. Performance budgets

- **What.** Per-request latency target, page-load budget, "N+1 query is a bug" statement, connection pool sizing rationale.
- **Why.** Today only memory budget is stated; latency/throughput have no documented floor.

### P3.4. Contract versioning policy

- **What.** `contractVersion` appears in BI contracts. Define repo-wide: how versions bump, deprecation window, migration expectations.
- **Why.** Contract honesty (§1.3) requires version discipline; today it is implicit.

### P3.5. CI pipeline description

- **What.** What runs on PR, what's blocking, release/branch/env promotion model.
- **Why.** §6 covers runtime deploy; CI is the other half.

### P3.6. Error taxonomy

- **What.** Repo-wide catalog of error codes and rule for introducing new ones. BI has `DatasetError`, EMIS has `EmisError`; policy for future domains is absent.
- **Why.** §1.6 says "{error, code} is standard"; the standard itself is undocumented.

### P3.7. Secrets management

- **What.** Where secrets live (`.env`, `.env.production.example`, deploy secrets), rotation, never-log policy.
- **Why.** Today env vars are in README only.

### P3.8. Frontend architecture subsection

- **What.** SvelteKit load cascade, layout hierarchy, auth-UX flow, Svelte 5 runes usage expectations. Route-first principle is stated but implementation shape is undocumented.
- **Why.** New BI page authors today learn by reading existing routes.

---

## Not backlog — done 2026-04-17 preemptive cleanup

The following items were applied as preemptive cleanup before the Phase 1 audit in `lead-strategic/current_plan.md` (cross-model architectural audit wave, opened 2026-04-17):

- §1 Known Transitional Debt → replaced with pointer to per-vertical debt registers (was duplicating BI debt)
- §1.9 Deployment & Runtime → principle separated from concrete infra numbers (moved rationale to §6)
- §5 Package dependency graph → ASCII art replaced with layered text (was missing `emis-server → platform-datasets` edge; new form matches the authoritative table)
- §8 `pnpm test` row → removed stale "127 tests across 10 files" count (plan already tracks 309 tests); point to wave plan instead
