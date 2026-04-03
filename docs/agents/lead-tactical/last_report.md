# Report: ST-4 — Workspace Foundation And Baseline Cleanup

## Статус
Выполнено

## Что сделано

### Workspace foundation
- `pnpm-workspace.yaml`: added `packages/*` and `apps/*` workspace globs (alongside existing `onlyBuiltDependencies`)
- `package.json`: scripts reorganized into annotated groups with migration notes:
  - **App-local** (dev, build, check, lint, format) → move to `apps/web/package.json` in ST-5
  - **EMIS smoke/ops** (emis:smoke, map:*) → move to `apps/web` in ST-5
  - **DB scripts** (db:up/down/reset/seed/snapshot) → stay at root or move to `packages/db` in ST-6
  - **Strategy/intake** → stay at root or archive

### Baseline blocker — resolved
- `src/lib/shared/ui/select/Select.svelte`: fixed two issues:
  1. Garbled template (lines 38-43): restored proper `{#if children}{@render children()}{/if}`
  2. Unescaped single quotes in SVG data URL: URL-encoded as `%27`
- **`pnpm check` now passes: 0 errors, 0 warnings**

### Architecture lint baseline
- `eslint.config.js`: added 6 `no-restricted-imports` blocks covering:
  1. **shared** → no entities, features, widgets, server (FSD + client isolation)
  2. **entities** → no features, widgets, server (FSD + client isolation)
  3. **features** → no widgets, server (FSD + client isolation)
  4. **widgets** → no server (client isolation)
  5. **routes/api/emis** → no UI/client code (transport-only)
  6. **routes/dashboard/emis** → no EMIS operational server modules (dataset path only)
- Each file scope has ONE combined `no-restricted-imports` block (ESLint flat config override semantics)

### Verification commands
- `pnpm check` — svelte-check type/parse verification (now green)
- `pnpm lint:boundaries` — **canonical boundary-only verification**: runs ESLint, filters only `no-restricted-imports` violations, no legacy lint noise. Currently shows 3 expected gaps in `fetchDataset.ts` (resolves at ST-6).
- `pnpm lint` — full lint (not boundary verification, contains legacy Prettier drift)

### Known non-enforced gaps (explicitly listed)
1. `src/lib/shared/api/fetchDataset.ts` imports from `$entities/dataset` and `$entities/filter` — **expected**: fetchDataset belongs in `platform-datasets` package (which CAN import entities/dataset). Resolves at ST-6.
2. `src/routes/dashboard/emis/vessel-positions/+page.server.ts` imports `$lib/server/emis/infra/mapConfig` — **expected**: mapConfig is shared map infrastructure. Resolves when map config extracts to platform or emis-contracts.

## Review Gate

### Findings по severity

**CRITICAL** (исправлено):
- code-reviewer: `.svelte.ts`/`.svelte.js` не покрыты boundary rules — добавлены во все 6 blocks
- architecture-reviewer: `dashboard/emis` rule ловит `+page.server.ts` без suppress — добавлен inline eslint-disable для known gap (mapConfig)

**WARNING** (исправлено / отклонено):
- code-reviewer: EMIS API route rule только для EMIS UI, не для всех — расширено на все `$features/*`/`$widgets/*`
- code-reviewer: `_comment:*` script keys non-standard — принято как convention (readability > clean completions)
- code-reviewer: alias resolution note — добавлен inline comment
- architecture-reviewer: добавить `$lib/server/*` restriction для `routes/api/emis` — **отклонено**: canonical EMIS path `routes/api/emis/* → server/emis/modules/*`, API routes ДОЛЖНЫ импортировать из server

**INFO** (отмечено):
- architecture-reviewer: relative imports (`../../entities/`) могут обойти boundary rules — known ESLint limitation, deferrable
- architecture-reviewer: workspace globs reference non-existent dirs — expected, activates at ST-5
- docs-reviewer: DB/smoke script locations not explicit enough — добавлено в report

### Вердикты ревьюеров
- architecture-reviewer: request changes → исправлено → OK
- docs-reviewer: OK
- code-reviewer: request changes → исправлено → OK
- security-reviewer: не запускался (minimal runtime change)
- ui-reviewer: не запускался (no behavior change)

## Ветки
- integration branch: `feature/emis-foundation-stabilization`
- worker branches merged: нет (lead-tactical напрямую)
- review diff: `git diff main..feature/emis-foundation-stabilization`

## Handoff readiness

### What closed workspace foundation
- `pnpm-workspace.yaml` has target globs
- `package.json` scripts annotated with migration destinations
- Script locations before and after ST-5:
  - **App scripts** (dev, build, check, lint): currently at root, move to `apps/web/package.json` in ST-5
  - **EMIS smoke/ops scripts**: currently at root, move to `apps/web` in ST-5
  - **DB scripts** (db:up/down/reset/seed/snapshot): stay at root through ST-5, move to `packages/db` no earlier than ST-6
  - **Strategy/intake scripts**: stay at root or archive

### What closed architecture lint baseline
- ESLint flat config with 6 boundary rule blocks
- Covers all required guardrails from ST-4 acceptance checklist
- 2 known gaps explicitly documented, both resolve during package extraction

### What risks remain before ST-5
- Pre-existing `pnpm lint` drift (Prettier formatting) — not introduced by ST-4, not blocking
- Known boundary gaps (2) are expected and resolve at extraction time
- No runtime behavior was changed beyond Select.svelte template fix

### Why ST-5 is now safe to start
1. `pnpm check` is green (baseline blocker resolved)
2. Workspace globs ready for `apps/*` and `packages/*`
3. Script migration destinations annotated
4. Architecture boundary lint catches violations during moves
5. All known gaps are documented, not hidden

## Вопросы к lead-strategic
- нет
