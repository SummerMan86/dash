# Testing Strategy

Three-mode testing strategy for choosing the right verification approach per slice.

## Modes

### 1. Test-First

Use for:

- pure logic (compilers, planners, validators)
- bugfixes with a reproducible failure
- data/runtime contracts with isolated behavior

Rule:

- add or update a failing test first when the behavior is stable enough to specify
- implement the fix or feature
- rerun the test and relevant checks before claiming completion

### 2. Prototype -> Pin -> Refactor

Use for:

- exploratory work
- UI/layout-heavy work
- new feature slices where requirements are still moving

Rule:

- produce the smallest working prototype
- pin the accepted behavior with tests or an explicit verification artifact as soon as the behavior stabilizes
- refactor only after the behavior is pinned

### 3. Verification-First

Use for:

- DB/schema changes
- ops runbooks
- structural contract publication
- snapshot-first DB work

Rule:

- prioritize snapshot/contract/integration verification over forced unit-test-first ceremony
- completion requires truthful verification evidence for the relevant schema/runtime/docs contract

## Choosing a mode

Pick the mode that matches the nature of the work, not a blanket default. When in doubt:

- If the behavior is stable and specifiable -> Test-First
- If the behavior is still forming -> Prototype-Pin-Refactor
- If the artifact is structural (schema, contract, docs) -> Verification-First

## Test harness

The repo has a Vitest-based test harness at the workspace root:

- `pnpm test` — run all package-level tests (exit 0 even with no test files)
- `pnpm test:watch` — watch mode for development
- Test files: `packages/*/src/**/*.test.ts`
- Config: `vitest.config.ts`

For test-first slices, use `pnpm test` as the primary check command. Report it as fresh evidence in handoff.

## Pre-existing test utilities

Some packages export test-only helpers (e.g. `clearRegistry()` in platform-filters). These are acceptable if:

- they existed before the current wave (not added solely for test convenience)
- they are clearly marked as test-only in the source
- they do not leak production internals into the public API surface

New test-only exports that expose production internals require an explicit waiver with rationale.

## Per-slice fields

Every non-trivial slice should carry:

- **verification intent**: what you plan to verify (e.g. "compile dispatch routes correctly", "schema applied cleanly")
- **verification mode**: `test-first` | `prototype-pin` | `verification-first`
- **waiver rationale**: if verification is skipped or deferred, explain why
