# Plan: Agent Docs Dedup Pass 2 (Medium Priority)

## Status

- reviewed on `2026-04-13`
- scope: agent-doc dedup only
- goal: reduce maintenance drift without breaking worker bootstrap or root navigation

## Canonical ownership decisions

- `workflow.md` owns lifecycle, execution-path selection, operating-mode definitions, and cost-aware defaults.
- `review-gate.md` owns review mechanics, strategic-reviewer cadence/risk signals, reframe protocol, and governance passes.
- `invariants.md` remains the source of truth for guardrails.
- `worker/guide.md` stays self-contained, but only through explicit derived excerpts.
- root `AGENTS.md` stays navigation-first.
- `autonomous-protocol.md` keeps examples as short scenario selectors, not as a second prompt-template doc.

## Execution order

1. Resolve canonical ownership between `workflow.md` and `review-gate.md`.
2. Convert `worker/guide.md` guardrails and review triggers into sourced excerpts.
3. Shrink root `AGENTS.md` §8 into a navigation pointer section.
4. Slim `autonomous-protocol.md` §12 last.

This order avoids pruning derivative docs before their source-of-truth boundaries are clear.

## MP-1: Operating-mode ownership cleanup

**Scope:** `docs/agents/workflow.md`, `docs/agents/review-gate.md`

**Decision**

- Keep mode definitions, mode-selection heuristic, and cost-aware defaults in `workflow.md` (`§2.4`, `§2.8`).
- In `review-gate.md` keep only:
  - mapping from operating mode to strategic-reviewer cadence;
  - canonical risk signals that force a slice-level strategic-reviewer pass;
  - reframe policy after acceptance.
- Add an explicit pointer in `review-gate.md` that mode definitions and selection rules live in `workflow.md §2.4`.
- Remove or collapse `review-gate.md §2.3` if it only repeats `workflow.md §2.8`.

**Acceptance**

- the three operating modes are defined only once;
- risk signals are listed once and referenced from `workflow.md`;
- cost-aware defaults are listed only in `workflow.md`.

## MP-2: Worker guide stays self-contained via sourced excerpts

**Scope:** `docs/agents/worker/guide.md`

**Decision**

- Choose **Option C**, but in compressed form.
- Keep the worker-facing guardrail table and review-trigger table because default worker bootstrap includes `worker/guide.md`, not `invariants.md` or `review-gate.md`.
- Mark them explicitly as derived excerpts:
  - `Guardrails` → derived from `docs/agents/invariants.md` §1-5, §9
  - `Review Trigger Table` → derived from `docs/agents/review-gate.md` §1.1
- Add one conflict rule: if excerpt and canonical source diverge, canonical source wins.
- Add one escalation rule: if a slice appears to require changing or waiving one of these rules, worker must stop and escalate.

**Companion adjustment**

- Do **not** make `invariants.md` a mandatory Bootstrap Read in this pass.
- Optional follow-up if needed: nudge `orchestrator` to include `invariants.md` as an `Optional Reference` for architectural or BI-sensitive slices.

**Acceptance**

- worker can still operate from the default bootstrap packet;
- drift becomes visible because excerpt sections carry source attribution;
- `worker/guide.md` does not attempt to mirror enforcement/path-to-automation details from `invariants.md`.

## MP-3: Root `AGENTS.md` §8 becomes a pointer section

**Scope:** `AGENTS.md`

**Decision**

- Keep the ASCII diagram as a quick-orientation aid.
- Remove the bullets that restate role semantics, memory ownership, and `strategic-reviewer` behavior.
- Replace them with a short pointer list:
  - `workflow.md` — lifecycle and operating model
  - `roles.md` — role semantics and instructions
  - `review-gate.md` — review/governance model
  - `memory-protocol.md` — durable memory ownership
  - `templates.md` — communication artifacts
- Add a note that `AGENTS.md` is orientation-only here and canonical definitions live in `docs/agents/*`.
- Optional rename: `## 8. Agent Docs Map` or similar, so the section stops reading like a mini workflow spec.

**Acceptance**

- outside the diagram, the section is roughly `10-20` lines;
- no restated role definitions;
- no restated memory-ownership rules.

## MP-4: Slim `autonomous-protocol.md` by fixing the examples section properly

**Scope:** `docs/agents/autonomous-protocol.md`

**Decision**

- Keep only **two concise scenario examples** in `§12`:
  - `Пример 4: Bug fix — Lightweight`
  - `Пример 2: Новый ingestion source с нестандартным API — Full`
- Remove `Пример 1`, `Пример 3`, and `Пример 5`.
- Reason:
  - `Пример 1` is not just an example; it is a second embedded prompt/template block and repeats material already covered by `§2 Entry Protocol` and `§8 Codex Prompting`.
  - `Пример 3` and `Пример 5` add little new mode-selection value once one lightweight and one full example remain.
- If the headless CLI snippet from `Пример 1` is considered valuable, move a shortened version to `templates.md` or reduce it to a short pointer block. Do not keep the full long prompt in `§12`.
- Keep `§10 Recovery Protocols (autonomous-specific)` and `§11 Ограничения и риски` unchanged in this pass. They are overlays on `recovery.md`, not a redundant second recovery doc.

**Line-count reality check**

- Keeping `Пример 1` as-is and deleting only three examples will not reach `630-650` lines.
- The large outlier is `Пример 1`; if it stays, the file will likely remain around `720-735` lines.
- Removing `Пример 1` and keeping two concise examples should land closer to `665-680` before any minor copy tightening.

**Acceptance**

- `§12` still demonstrates both autonomy levels;
- `§12` no longer duplicates full prompt boilerplate already covered earlier in the document;
- medium-pass target is framed as "remove the large example outlier and keep one concise lightweight + one concise full example", not as an unrealistic fixed line count.

## Out of scope for this pass

- rewriting `invariants.md` itself;
- changing worker bootstrap so `invariants.md` becomes mandatory;
- touching `autonomous-protocol.md §10-11` unless a separate pass later proves real overlap with `recovery.md`;
- broad role-model edits in `roles.md`.

## Summary verdict on the proposed plan

- Item 7: **agree with the goal, correct the execution**. Keep 2 examples, but not the long detailed lightweight example if the goal is real reduction.
- Item 8: **keep the diagram**, remove the explanatory duplication around it.
- Item 9: **choose C**, explicitly sourced excerpts, not pure references-only.
- Item 10: **the split is correct**, but also remove the duplicated cost-aware defaults from `review-gate.md`.
