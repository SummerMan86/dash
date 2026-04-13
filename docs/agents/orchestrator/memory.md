# Orchestrator Memory

Canonical durable memory для top-level execution роли `orchestrator`.

`lead-tactical` — legacy alias; `docs/agents/lead-tactical/memory.md` — wrapper only.

Writing rules:

- новые записи должны быть state-oriented и orchestration-only;
- подробный implementation log должен жить в worker handoff, `last_report.md` и `git log`, а не здесь.

## Closed Waves (compact summary)

Подробные implementation logs по closed waves удалены — они доступны в `git log` и archived reports. Здесь только orchestration-relevant state.

| Wave | Date | Branch | Verdict | Key outcome |
|---|---|---|---|---|
| ST-1..ST-10 | 2026-04-03 | `feature/emis-foundation-stabilization` | accepted | 8 packages extracted, BI kept in app |
| H (H-1..H-5) | 2026-04-03 | `feature/emis-post-split-hardening` | accepted | emis-server transport-agnostic, boundary gaps closed |
| P3 (P3.1..P3.6) | 2026-04-04 | main | Green / baseline closed | fetchDataset boundary closed, enforcement tooling |
| DS (DS-1..DS-4) | 2026-04-04 | main | accepted | docs-only sync with architecture canon |
| NW (NW-1..NW-5) | 2026-04-04..05 | main | MVE accepted with deferrals | access model frozen, write guardrails, health/readyz, MVE sign-off |
| P1 (P1.1..P1.5) | 2026-04-04 | main | accepted | vessel historical track integration |
| Phase 3 (TD-1..TD-5) | 2026-04-05 | `feature/emis-phase3-tech-debt-cleanup` | Green / baseline closed | 72 shims removed, -2507 lines net |
| Phase 4 (DF-1..DF-5) | 2026-04-05 | `feature/emis-phase3-tech-debt-cleanup` | MVE accepted, no remaining deferrals | soft-delete, admin CRUD, session auth |
| Phase 5 (AUTH-1..AUTH-8) | 2026-04-05 | `feature/emis-phase5-auth-hardening` | accepted | bcrypt, DB sessions, admin users, change password |
| S Phase 2 (S-3..S-5) | 2026-04-09 | main | accepted | per-package tsconfig, CI workflow, baseline Green |
| OC (OC-1..OC-3) | 2026-04-10 | main | accepted | shared LRU providerCache, Oracle provider migrated |

## Durable operational knowledge

- `pnpm lint` (Prettier) not green (pre-existing drift) — not blocking
- ESLint `no-restricted-imports` flat config — each scope needs ONE combined block
- `lint-boundaries.mjs` must use temp file (`-o`) for stdout buffer reliability
- `export { X } from 'Y'` does NOT bring X into local scope — both `export from` and `import from` are needed when used locally
- 16 server-side MIGRATION re-export shims remain in `apps/web/src/lib/server/emis/` — active re-exports, not dead code
- `EMIS_USERS` env var deprecated but still functional (transition fallback)
- Auth on by default (`EMIS_AUTH_MODE` defaults to `session`); smoke scripts use `EMIS_AUTH_MODE=none`
- `providerCache.ts` internal to platform-datasets — future providers can adopt when needed

## Active Wave: CA — BI Clean Architecture (2026-04-11)

17 slices (CA-0..CA-16) across 5 waves. Plan: `docs/agents/lead-strategic/current_plan.md`.

Integration branch: `feature/bi-clean-architecture`

### Progress

- **Wave 0: ✅ DONE** — CA-0: ESLint governance baseline, lint commands separated
- **Wave 1: ✅ DONE** — CA-1: product-analytics decomposed (256 lines, +56 tests); CA-2: stock-alerts decomposed (281 lines, +45 tests)
- **Wave 2: ✅ DONE** — CA-3..CA-6: all 4 BI pages migrated to useFlatParams; CA-7: legacy flag removed, canonical flat-params default
- **Wave 3: ✅ DONE** — CA-8: typed compile contract (e9fd861); CA-12: cache middleware (d180c87); CA-9: WB paramsSchema (c38a727); CA-10: payment paramsSchema (d1b75e8); CA-11: IFTS paramsSchema (31512ef). +65 tests, +7 cache tests = 300 total
- **Wave 4: ⏳ NEXT** — CA-13..CA-16: cleanup, access control, route-local tests, wave closure

### Key constraints

- No new functionality — strictly refactoring and contract hardening
- BI vertical scope only (no EMIS, no strategy dashboard)
- 300 green tests (228 baseline from Waves 0-2 + 72 new from Wave 3)
- Architecture readiness: CLEAR (decisions pre-documented in §8/§9)

### Key decisions during CA

- Svelte 5 migration rules downgraded to `warn` (CA-0) — documented in `architecture.md` §8.1
- Legacy filter path isolated, not removed (CA-7) — EMIS/strategy pages still use `filterContext`, out of scope
- Custom compile backward-compat (CA-7) — `dateRangeWhere` reads from `{ ...query.filters, ...query.params }` merge
- Compile contract (CA-8): `compile(datasetId, typedParams)` — executeDatasetQuery merges filters+params then parses
- Cache middleware (CA-12): pre-compile cache in executeDatasetQuery, oracleProvider is now pure executor
- All WB/payment/IFTS datasets have explicit Zod paramsSchema (CA-9/10/11), looseParams usage eliminated for BI

## Заметки для следующей сессии

- **CA Wave active** — Waves 0–3 done (11 commits), **start from Wave 4: CA-13** (remove duplicate definitions)
- CA-13 depends on CA-9..CA-11 ✅ — ready immediately
- CA-14 (assertDatasetAccess) — independent, can start anytime
- CA-15 (route-local tests) — depends on CA-1/CA-2 ✅ — ready immediately
- CA-16 (wave closure) — depends on all
- Operating mode: `ordinary iterative`
- Canonical checks: 5 (check, check:packages, build, lint:boundaries, test)
- Branch: `feature/bi-clean-architecture` (11 commits ahead of `main`)
- **Orchestrator model active** — role separated from implementation; all slices through workers
- Review for Waves 0-2 done (commit `4dcae2f`)
- Review for Wave 3 — pending (code-reviewer + architecture-reviewer dispatched)
