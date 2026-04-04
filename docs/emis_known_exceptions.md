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

As of `2026-04-04`, baseline verdict should still be treated as:

- `baseline not closed`

Reason:

- `pnpm lint:boundaries` is still red because of a pre-existing platform/FSD gap
- a bounded complexity waiver still remains live for one oversized EMIS UI file

## Live Exceptions

| ID | Layer | Summary | Owner | Why allowed now | Target wave / expiry | Removal condition |
|---|---|---|---|---|---|---|
| `EXC-ARCH-002` | platform boundary gate | `pnpm lint:boundaries` fails because `apps/web/src/lib/shared/api/fetchDataset.ts` imports from `$entities/dataset` and `$entities/filter`. | `platform/shared owner` | This is a pre-existing platform-level gap outside the EMIS package split itself, but it blocks a truthful green baseline. | Phase 2 boundary enforcement wave after `A5` | `pnpm lint:boundaries` is green, either by code fix or by an explicitly redefined and documented rule. |
| `EXC-ARCH-004` | complexity waiver | `packages/emis-ui/src/emis-map/EmisMap.svelte` remains at `903` lines after the accepted hardening wave. | `EMIS UI owner` | The file was already reduced substantially and is not the first blocker for architecture stabilization; immediate further split is deferred. | Phase 2 bounded refactor / EMIS UI hardening wave | Widget is decomposed further or the waiver is explicitly renewed by `architecture-steward` with updated owner + expiry. |

## Notes

- This registry is for live exceptions only.
- Historical resolved issues should not stay here forever; move them to memory or archive once closed.
- New exceptions should be added in the same slice where they are introduced, not retroactively.
- `architecture-steward` approves new architecture exceptions / waivers and ensures they are documented here.
- `baseline-governor` validates that this registry stays truthful before baseline verdicts.
