---
name: EMIS monorepo separation project context
description: Key facts about the EMIS monorepo-style split effort (ST-N slices, single-deployable, FSD, baseline blocker) — load when reviewing EMIS or ST-* diffs
type: project
---

Topology decision frozen: single-deployable monorepo, no immediate multi-app split. Target layout is `apps/web` + `packages/*`. Physical moves begin after ST-4.

**Why:** EMIS is architecturally a separate domain inside one SvelteKit app. The separation is monorepo-ready but not a runtime split.

**How to apply:** When reviewing ST-* slices, verify that structural moves do not mix domain/API logic changes in the same PR (migration policy rule). Flag any attempt to skip the slice order (ST-5 → ST-6 → ST-7 → ST-8).

Baseline blocker: `src/lib/shared/ui/select/Select.svelte` parse error breaks `pnpm check` and `pnpm emis:smoke`. Must be resolved in ST-4 or earlier; must not be masked by structural migration.

Active zone coverage: routes not mapped to any target package include `src/routes/dashboard/wildberries/*`, `src/routes/api/wb/*`, `src/routes/dashboard/analytics/*`, `src/routes/dashboard/demo/*`, `src/routes/dashboard/test/*` — these stay in `apps/web/` as app-level pages (not called out explicitly in the zone mapping table, but consistent with the "Routes — app-level composition" rule).
