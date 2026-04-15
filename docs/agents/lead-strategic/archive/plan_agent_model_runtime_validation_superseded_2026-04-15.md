# Plan: Agent Model Runtime Validation — `opus-orchestrated-codex-workers`

## Archive Status

- archived on `2026-04-15`
- archive reason: superseded by the agent-doc simplification wave opened on `2026-04-15`
- source: previous contents of `docs/agents/lead-strategic/current_plan.md`
- original wave status at archive time: completed on `2026-04-15`
- closeout verdict at archive time: `usable with known exceptions`

## Original Plan Snapshot

# Plan: Agent Model Runtime Validation — `opus-orchestrated-codex-workers`

## Status

- opened on `2026-04-15`
- wave status: completed on `2026-04-15`
- goal: validate truthful runtime behavior for plugin-first Codex worker/reviewer lanes in Claude Code without growing the role model or docs surface
- scope: runtime validation, artifact verification, and only minimal evidence-driven docs fixes if the runtime disproves the current contract
- selected execution profile: `opus-orchestrated-codex-workers`
- operating mode: `high-risk iterative / unstable wave`
- default fallback policy: per-slice truthful fallback to `mixed-claude-workers` only after the requested Codex lane is classified `blocked` or `unverified`
- closeout verdict: `usable with known exceptions`

## Guardrails

- Do not add new roles, aliases, relay layers, or long-form docs during this wave.
- Keep runtime/model binding canonical in `docs/agents/execution-profiles.md`.
- Treat `/codex:status`, history, helper names, or a bare session ID as insufficient proof.
- Do not silently map `lead-strategic` or `strategic-reviewer` onto worker/reviewer slash commands in ordinary orchestrated mode.
- Use one real bounded slice at a time; if the plugin surface fails without a recoverable run ID, stop the hanging path and classify it truthfully instead of inventing a success.

## Validation Targets

1. Plugin micro-diagnostic on the current surface
2. Worker lane happy path
3. Reviewer lane happy path
4. Failure semantics and truthful recovery
5. Closeout decision on whether the profile is operationally usable, usable with known exceptions, or still blocked

## Execution Order

1. ST-0 — run a micro-diagnostic on `/codex:rescue` with a trivial prompt and verify that the plugin surface can produce a recoverable run.
2. ST-1 — validate worker lane on one bounded real implementation slice, but only if ST-0 is verified.
3. ST-2 — validate reviewer lane on the resulting diff, but only if ST-1 is verified.
4. ST-3 — validate blocked/unverified behavior and truthful recovery semantics.
5. ST-4 — decide keep / constrain / suspend the profile, and apply only minimal canonical doc adjustments if runtime evidence requires them.

## ST-0: Plugin Surface Micro-Diagnostic

**Scope**

- Minimal trivial `/codex:rescue` prompt.
- Not a real implementation slice.
- Goal: isolate plugin/runtime viability from task-packet or repo-specific complexity.

**Required runtime path**

- `/codex:setup` preflight
- `/codex:rescue` with a trivial prompt

**Required artifacts**

- stable session ID or run ID
- matching `/codex:result`

**Acceptance**

- Claim `verified` only if the proof tuple exists:
  - launch surface
  - matching `/codex:result`
  - stable session/run ID bound to ST-0
- If ST-0 also fails with internal error, no run ID, no result artifact, or hanging initialization, classify the current plugin surface as runtime-blocked for `opus-orchestrated-codex-workers`.
- If ST-0 is blocked, do not dispatch a real worker or reviewer slice on this surface in this wave; proceed directly to ST-3 and ST-4.

## ST-1: Worker Lane Validation

**Scope**

- One bounded real repo slice.
- Current preferred candidate: route-level tests for `apps/web/src/routes/api/datasets/[id]/+server.ts`.
- Strategic reframe may choose another bounded slice only if it is materially better for runtime observability.
- Start only after ST-0 is verified.

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
- Do not retry ST-1 repeatedly on the same surface after a blocked ST-0 or repeated blocked ST-1 without a new runtime signal.

## ST-2: Reviewer Lane Validation

**Scope**

- One reviewer pass on the ST-1 diff.
- Start only after ST-1 is verified.

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
- Explicit gating behavior when ST-0 blocks the surface before any real slice starts.

**Acceptance**

- No silent fallback.
- No silent success.
- If fallback to `mixed-claude-workers` is used, it must be explicit, per-slice, and justified in report/telemetry.
- A hanging Codex dispatch without proof must be closed as `blocked` or `unverified`, not left as indefinite `in_progress`.
- If ST-0 is blocked, the truthful next step is profile-level runtime diagnosis or profile suspension, not another real slice dispatch on the same path.

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
- A separate ST-0 verdict that distinguishes plugin/runtime failure from task-specific failure.
- `last_report.md` and `runtime/agents/usage-log.ndjson` entries that record selected profile, lane verification status, proof refs, and any explicit exception/fallback.
- A keep / constrain / suspend decision for `opus-orchestrated-codex-workers` on the current surface.
