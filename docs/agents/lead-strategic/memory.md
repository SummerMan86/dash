# Lead-Strategic Memory

## Active State
- no active wave; Architecture Docs Alignment — Foundation / BI / EMIS closed on `2026-04-23`
- plan: `docs/agents/lead-strategic/current_plan.md`; branch remained `main`
- close verdict: `WAVE CLOSED`; baseline-governor verdict = `baseline closed / Yellow`
- wave result: foundation / BI / EMIS architecture docs aligned to current-state runtime truth
- next wave not opened yet; awaiting next strategic trigger
- test baseline carried: `309` tests (`19` files)

## Carry Forward
- ST-2 decisions stay locked: three-doc topology, `architecture.md` name preserved, no BI companion doc
- non-target BI surfaces stay demoted: EMIS BI read-side and `strategy/overview`, `strategy/performance`, `strategy/cascade`, `strategy/scorecard_v2` remain transitional; BI maturity criterion stays the strategy.* flat-params migration
- `D-6` remains hard: no backlog-polish additions without an accepted ST-1 trace
- planner-rename residue: 6 ST-6 items triaged; 3 docs follow-ups (`planner.ts`, `planner.test.ts`, `packages/platform-filters/AGENTS.md`) and 3 WB caller renames bundled with next substantive page touches
- `apps/web/src/lib/server/datasets/definitions/emisMart.ts` stays legacy/reference-only; removal trigger = EMIS BI `filterContext` migration wave
- BI §9 debt register is the authoritative code/runtime backlog after this docs-only wave
- EMIS published BI contract home = `mart` only; `mart_emis` stays operational-derived and outside BI registry by default
- baseline carries forward as `Yellow` until the pre-existing ESLint failure mode gets formal EXC handling or is fixed
