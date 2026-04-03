# Strategic Reviewer Memory

- Role introduced and documented on `2026-04-03` as optional sidecar for `lead-strategic`.
- Default operating mode:
  - model: `gpt-5.4-mini`
  - reasoning: `medium`
- Escalate to `gpt-5.4` / `high` only for:
  - `needs strategic decision`
  - cross-module or package-boundary-sensitive acceptance
  - schema/runtime-contract-sensitive review
  - contradictory reviewer signals
- The role was exercised successfully on H-2, H-3, H-4 acceptance passes.
- It is a bounded second opinion only; final acceptance remains with `lead-strategic`.
