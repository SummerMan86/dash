# EMIS Known Exceptions

Canonical registry of live EMIS architecture and baseline exceptions.

Created on `2026-04-04` during the architecture review / stabilization prep wave.

## Purpose

- keep baseline truthfulness explicit
- avoid “temporary” exceptions without owner
- separate live exceptions from historical notes in memory/report files

## Rules

Each live exception must have:

- `id`
- `owner`
- `why allowed`
- `target wave` or expiry
- `removal condition`

If one of these fields is missing, the exception is not considered approved.

## Current Baseline Status

As of `2026-04-04` after the full post-`P3.5` baseline rerun, baseline verdict should be treated as:

- status: `Green`
- `baseline closed`

Reason:

- no live architecture exceptions remain after `P3.4`
- root smoke harness drift was repaired:
  - root `package.json` now declares `dotenv` and `pg` for root scripts
  - `emis-offline-smoke` and `emis-write-smoke` now start Vite from `apps/web`
  - `emis-offline-smoke` now reads offline assets from `apps/web/static/emis-map/offline`
- the rerun results are now explicit:
  - `pnpm check` — green
  - `pnpm build` — green
  - `pnpm lint:boundaries` — green
  - `pnpm emis:offline-smoke` — green
  - `pnpm emis:write-smoke` — green
  - `pnpm emis:smoke` — green

Canonical post-freeze baseline routine is:

- `pnpm check`
- `pnpm build`
- `pnpm lint:boundaries`
- `pnpm emis:smoke`
- `pnpm emis:offline-smoke`
- `pnpm emis:write-smoke` when write-side relevant

## Live Exceptions

No live architecture exceptions are currently registered.

## Current Baseline Blocker

None.

## Notes

- This registry is for live exceptions only.
- Historical resolved issues should not stay here forever; move them to memory or archive once closed.
- New exceptions should be added in the same slice where they are introduced, not retroactively.
- `architecture-steward` approves new architecture exceptions / waivers and ensures they are documented here.
- `baseline-governor` validates that this registry stays truthful before baseline verdicts.
