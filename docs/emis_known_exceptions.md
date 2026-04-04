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

- canonical EMIS docs are not fully aligned with current package reality
- `pnpm lint:boundaries` is still red because of a pre-existing platform/FSD gap
- architecture governance and exception handling are not yet fully codified in the active docs

## Live Exceptions

| ID | Layer | Summary | Owner | Why allowed now | Target wave / expiry | Removal condition |
|---|---|---|---|---|---|---|
| `EXC-ARCH-001` | docs / ownership | Canonical EMIS docs mix current package-state with legacy pre-package wording. | `lead-strategic` | Architecture concept is usable, but doc truthfulness is not yet clean enough to call the baseline stable. | `A1-A2` of `EMIS Architecture Stabilization And Governance Freeze` | `docs/emis_architecture_baseline.md`, `docs/emis_working_contract.md`, `docs/emis_session_bootstrap.md`, `docs/emis_freeze_note.md` and `docs/emis_implementation_spec_v1.md` no longer contradict each other on current ownership. |
| `EXC-ARCH-002` | platform boundary gate | `pnpm lint:boundaries` fails because `apps/web/src/lib/shared/api/fetchDataset.ts` imports from `$entities/dataset` and `$entities/filter`. | `platform/shared owner` | This is a pre-existing platform-level gap outside the EMIS package split itself, but it blocks a truthful green baseline. | Phase 2 boundary enforcement wave after `A5` | `pnpm lint:boundaries` is green, either by code fix or by an explicitly redefined and documented rule. |
| `EXC-ARCH-003` | process / role model | `architecture-reviewer` checks are still too FSD/alias-centric and do not fully reflect current package-level EMIS boundaries. | `lead-strategic` | Review role exists, but its contract lags behind the actual package architecture. | `A4` of `EMIS Architecture Stabilization And Governance Freeze` | Reviewer instructions and role map explicitly cover package boundaries, `apps/web` leaf rules, BI vs operational separation and complexity waiver policy. |
| `EXC-ARCH-004` | complexity waiver | `packages/emis-ui/src/emis-map/EmisMap.svelte` remains at `903` lines after the accepted hardening wave. | `EMIS UI owner` | The file was already reduced substantially and is not the first blocker for architecture stabilization; immediate further split is deferred. | Phase 2 bounded refactor / EMIS UI hardening wave | Widget is decomposed further or a documented long-term waiver is accepted in canonical architecture/process docs. |

## Notes

- This registry is for live exceptions only.
- Historical resolved issues should not stay here forever; move them to memory or archive once closed.
- New exceptions should be added in the same slice where they are introduced, not retroactively.
