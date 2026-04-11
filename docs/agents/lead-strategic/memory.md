# Lead-Strategic Memory

## Active Strategic Context

- Active wave:
  - `BI Clean Architecture — Audit-Driven Remediation`
- Active plan:
  - `docs/agents/lead-strategic/current_plan.md` (created 2026-04-11)
- Previous completed plans archived:
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_10_oracle_cache_foundation.md`
  - `docs/archive/agents/lead_strategic_current_plan_2026_04_10_bi_refactor_wave1_complete.md`
- This wave is remediation-focused:
  - god component decomposition on BI pages (Wave 1)
  - filter path migration to useFlatParams (Wave 2)
  - contract hardening: typed custom compile + explicit paramsSchema + cache middleware (Wave 3)
  - cleanup: duplicate definitions, access control, route-local tests (Wave 4)
  - no new functionality — strictly refactoring and contract hardening

## Accepted Decisions (2026-04-11)

- Architecture audit identified 5 problem classes: god components, incomplete filter migration, looseParams bypass, implicit filter runtime, weak test coverage.
- All architectural decisions pre-documented in `architecture_dashboard_bi.md` §8 (guardrails) and §9 (migration debt register).
- Readiness: `CLEAR` — no new architectural decisions needed before implementation.
- CA-0 (ESLint governance baseline) is a precondition for all later waves — establishes lint policy.
- Wire contract (`DatasetQuery`/`DatasetResponse`) must not change until CA-7 (coordinated `.filters` removal).
- Scope limited to BI vertical — EMIS datasets/routes and strategy dashboard are out of scope.
- 127 green tests as baseline; every slice must end with ≥ 127 green tests.
- `pnpm lint:eslint` not green repo-wide; slices must not increase lint debt in touched files.

## Operating Mode

- Active mode:
  - `ordinary iterative`
- Escalate immediately to `high-risk iterative / unstable wave` if implementation:
  - changes public wire contract (`DatasetQuery`, `DatasetResponse`)
  - requires coordinated changes in 3+ packages
  - breaks existing tests (127 green tests as baseline)

## Resume Point For The Next Chat

- Start from `CA-0` (ESLint governance baseline).
- First tactical target:
  - separate lint commands: `pnpm lint:format`, `pnpm lint:eslint`, `pnpm lint:boundaries`
  - establish lint policy in `docs/architecture.md` §8
  - add rule-introduction policy to `docs/agents/invariants.md`
  - bring `eslint.config.js` to low-noise baseline
- Expected wave-close evidence (per-slice):
  - `pnpm check`
  - `pnpm check:packages`
  - `pnpm build`
  - `pnpm lint:boundaries`
  - `pnpm test`

## Historical Note

- OC Wave (Oracle-First LRU Cache Foundation) completed 2026-04-10 — providerCache.ts in platform-datasets, oracleProvider adopted.
- Prior EMIS waves, BI Refactor Wave 1, and older material are archival context, not active strategic state.
- If work re-enters EMIS governance or historical BI rationale, consult the archived plan/doc set explicitly.
