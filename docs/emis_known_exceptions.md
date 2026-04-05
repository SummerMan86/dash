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

As of `2026-04-05` after TD-5 governance closure (Phase 3 tech debt cleanup), baseline verdict:

- status: `Green`
- `baseline closed`

Reason:

- no live architecture exceptions remain
- Phase 3 tech debt cleanup completed (TD-1 through TD-5):
  - `+page.svelte` decomposed to 639 lines (under 700-line threshold)
  - 72 MIGRATION re-export shims removed from entities/shared/widgets
  - stock-alerts boundary violation fixed
  - Prettier drift fixed (cosmetic re-drift from subsequent commits, not in canonical checks)
- all 6 canonical checks green:
  - `pnpm check` — green (0 errors, 0 warnings)
  - `pnpm build` — green
  - `pnpm lint:boundaries` — green (zero violations)
  - `pnpm emis:smoke` — green (33/33)
  - `pnpm emis:offline-smoke` — green (9/9)
  - `pnpm emis:write-smoke` — green (7/7)

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
