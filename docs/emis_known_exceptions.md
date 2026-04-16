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

As of `2026-04-05` after AUTH-8 governance closure (Phase 5 production auth hardening complete), baseline verdict:

- status: `Green`
- `baseline closed`

Reason:

- no live architecture exceptions remain
- All Phase 5 auth hardening slices completed (AUTH-1 through AUTH-8)
- All MVE deferrals resolved (DF-1 through DF-5)
- all canonical checks green:
  - `pnpm check` — green (0 errors, 0 warnings)
  - `pnpm build` — green
  - `pnpm lint:boundaries` — green (zero violations)
  - `EMIS_AUTH_MODE=none pnpm emis:smoke` — green (40/40)
  - `EMIS_AUTH_MODE=none pnpm emis:offline-smoke` — green (9/9)
  - `EMIS_AUTH_MODE=none pnpm emis:write-smoke` — green (7/7)
  - `pnpm emis:auth-smoke` — green (10/10)
  - `npx prettier --check .` — green

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
- `lead-strategic` approves new architecture exceptions / waivers and ensures they are documented here.
- `orchestrator` keeps this registry truthful in the active plan/report flow before baseline verdicts.
