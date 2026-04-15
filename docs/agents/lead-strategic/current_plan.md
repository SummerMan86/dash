# Plan: Agent Model Runtime Validation — `opus-orchestrated-codex-workers`

## Status

- opened on `2026-04-15`
- wave status: active
- goal: validate truthful runtime behavior for plugin-first Codex worker/reviewer lanes in Claude Code without growing the role model or docs surface
- scope: runtime validation, artifact verification, and only minimal evidence-driven docs fixes if the runtime disproves the current contract
- selected execution profile: `opus-orchestrated-codex-workers`
- operating mode: `high-risk iterative / unstable wave`
- default fallback policy: per-slice truthful fallback to `mixed-claude-workers` only after the requested Codex lane is classified `blocked` or `unverified`

## Guardrails

- Do not add new roles, aliases, relay layers, or long-form docs during this wave.
- Keep runtime/model binding canonical in `docs/agents/execution-profiles.md`.
- Treat `/codex:status`, history, helper names, or a bare session ID as insufficient proof.
- Do not silently map `lead-strategic` or `strategic-reviewer` onto worker/reviewer slash commands in ordinary orchestrated mode.
- Use one real bounded slice at a time; if the plugin surface fails without a recoverable run ID, stop the hanging path and classify it truthfully instead of inventing a success.

## Validation Targets

1. Worker lane happy path
2. Reviewer lane happy path
3. Failure semantics and truthful recovery
4. Closeout decision on whether the profile is operationally usable, usable with known exceptions, or still blocked

## Execution Order

1. ST-1 — validate worker lane on one bounded real implementation slice.
2. ST-2 — validate reviewer lane on the resulting diff.
3. ST-3 — validate blocked/unverified behavior and truthful recovery semantics.
4. ST-4 — decide keep / constrain / suspend the profile, and apply only minimal canonical doc adjustments if runtime evidence requires them.

## ST-1: Worker Lane Validation

**Scope**

- One bounded real repo slice.
- Current preferred candidate: route-level tests for `apps/web/src/routes/api/datasets/[id]/+server.ts`.
- Strategic reframe may choose another bounded slice only if it is materially better for runtime observability.

**Required runtime path**

- `/codex:setup` preflight
- `/codex:rescue` for the worker lane

**Required artifacts**

- stable session ID or run ID
- matching `/codex:result`
- worker handoff with truthful checks/review disposition

**Acceptance**

- Claim `verified` only if the proof tuple exists:
  - launch surface
  - matching `/codex:result`
  - stable session/run ID bound to ST-1
- If the plugin surface returns internal error, no run ID, or no result artifact, classify ST-1 as `blocked` or `unverified`; do not leave it hanging as nominally in progress.

## ST-2: Reviewer Lane Validation

**Scope**

- One reviewer pass on the ST-1 diff.

**Required runtime path**

- `/codex:review` or `/codex:adversarial-review`

**Required artifacts**

- stable session ID or run ID
- matching `/codex:result`
- reviewer verdict bound to the reviewed diff scope

**Acceptance**

- Same proof rule as ST-1.
- If reviewer execution cannot be verified, classify that reviewer lane as `blocked` or `unverified`, not as silent success.

## ST-3: Failure Semantics And Recovery

**Scope**

- Truthful handling of missing run ID, missing result artifact, internal plugin error, or hanging dispatch.

**Acceptance**

- No silent fallback.
- No silent success.
- If fallback to `mixed-claude-workers` is used, it must be explicit, per-slice, and justified in report/telemetry.
- A hanging Codex dispatch without proof must be closed as `blocked` or `unverified`, not left as indefinite `in_progress`.

## ST-4: Closeout Decision

**Scope**

- Decide whether `opus-orchestrated-codex-workers` is:
  - operationally usable,
  - usable with known exceptions,
  - or still blocked on the current Claude Code plugin surface.

**Acceptance**

- One concise verdict with rationale.
- Minimal follow-up list only if runtime evidence shows a real canonical gap.
- No extra docs beyond canonical owners unless the validation run proves they are necessary.

## Expected Outputs

- Verified runtime evidence for successful Codex worker/reviewer lanes, or a truthful blocked diagnosis.
- `last_report.md` and `runtime/agents/usage-log.ndjson` entries that record selected profile, lane verification status, proof refs, and any explicit exception/fallback.
- A keep / constrain / suspend decision for `opus-orchestrated-codex-workers` on the current surface.
