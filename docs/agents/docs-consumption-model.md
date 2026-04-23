# Docs Consumption Model

## Status

`draft` — proposed input for `current_plan.md` ST-2 (topology locking). Not yet accepted as policy. If ST-2 rejects, delete this file.

## Purpose

How agents (`worker`, `orchestrator`, reviewers) discover and load documentation without bloating context, duplicating content, or drifting from truth.

This doc defines the reading contract. It does not introduce runtime mechanisms — it describes **what to read, when, and where it lives**.

## Three tiers

### Tier 1 — Always-on (≤1 screen each)

Read before starting any work:

- root `AGENTS.md`
- nearest local `AGENTS.md` / `CLAUDE.md` in the code path being changed
- task packet (orchestrator-provided, for worker)
- role guide (`worker/guide.md`, `orchestrator/instructions.md`, `<name>-reviewer/instructions.md`)

Tier 1 provides orientation, not deep content. If an item here grows past one screen, it belongs in Tier 3 behind a trigger.

### Tier 2 — Index

Read to navigate, not end-to-end:

- `docs/AGENTS.md` — catalogue of every other doc in the repo

Each entry MUST carry a one-line `Load when:` trigger so the agent can decide without opening the target.

### Tier 3 — On-demand content

Loaded only when Tier 2 or the task packet points to it:

- `docs/agents/skills/*.md` — procedural playbooks (debugging, testing-strategy, brainstorming)
- `docs/architecture.md`, `docs/bi/architecture.md`, `docs/emis/**` — domain reference
- local `AGENTS.md` in `packages/*`, `apps/web/src/**` beyond the always-on nearest one
- plan documents, runbooks, migration guides, invariants overlays

## Colocation policy

**Lives next to code (local `AGENTS.md` / `CLAUDE.md`):**

- rules specific to one folder or package
- vocabulary used only within that module
- "don't do X in this file" guardrails
- local conventions that can change without touching other modules

**Lives in central `docs/`:**

- cross-module vocabulary (`DatasetQuery`, `SelectIr`, planner API, filter scopes)
- shared runtime contracts
- topology and ownership maps
- policies and invariants that apply repo-wide

**Rule of thumb:** if the doc can be deleted when the folder is deleted — colocate. If it must survive any single folder — centralize.

## `Load when:` triggers

Every Tier 2 index entry and every Tier 3 doc MUST declare its own trigger. Canonical forms:

- `Load when: task touches <path glob>` — e.g. `packages/platform-datasets/**`
- `Load when: task involves <concern>` — e.g. "dataset runtime", "EMIS ingestion", "filter planner"
- `Load when: <symptom>` — for skills only, e.g. "bug with no obvious cause" (already used in `docs/agents/skills/debugging.md`)

A doc without a trigger is dead weight in the catalogue. Index maintenance checks for missing triggers.

## Top-of-file summary

Every doc ≥200 lines MUST open with a ≤20-line summary block answering:

- What does this doc own?
- What vocabulary / claims does it establish?
- When is it safe to stop reading vs. read deeper?

Agent reads summary first, decides if deep-dive is needed. Avoids all-or-nothing reads of 1000-line files.

## Atomicity / splitting criterion

Split a doc when any of:

- ownership boundary fractures (two owners, two release cadences)
- a single reader needs only one section >90% of the time
- length exceeds ~600 lines **and** table of contents has >1 Tier-2-style subtopic with distinct triggers

Do **not** split purely on size. Do **not** split if cross-references will become heavier than current bloat.

## Relationship to existing docs (as-is snapshot)

| Doc                            | Lines  | Verdict under this model                                                                          |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| `docs/AGENTS.md`               | 210    | already Tier 2 index; needs `Load when:` field added to each row                                  |
| `docs/agents/skills/*.md`      | small  | already Tier 3 skills with `When to use`; pattern canonicalized by this doc                       |
| `docs/architecture.md`         | 375    | within budget; needs summary block; stays canonical foundation                                    |
| `docs/bi/architecture.md`      | 1154   | exceeds budget; ST-2/ST-4 must evaluate split vs. companion doc vs. summary-gated read            |
| `docs/emis/**`                 | small × many | already decomposed into ownership-sized files; aligns with this model                       |
| `docs/agents/workflow.md`      | 736    | exceeds budget; ST-6 or follow-up wave should evaluate whether to split into skills by concern    |
| local `AGENTS.md` in `packages/*`, `apps/web/src/**` | varies | already the colocation model; needs index cross-link verification |

## Non-goals

- Не делать "everything is a skill" — reference docs и playbooks — разные жанры с разным life cycle.
- Не мигрировать контент в новое место, пока ST-2 не закрепил topology.
- Не вводить runtime-loading механизм (tool-injection, lazy-load и т.п.) — это про read-order, не про технику загрузки.
- Не пересобирать `docs/agents/workflow.md` в этой волне; только зафиксировать, что он — кандидат.

## Implications for the current wave

If ST-2 accepts this model:

1. ST-2 locks topology *as a function of this model*, not independently — three-doc default stays only if each doc fits the tiers without forced split.
2. ST-3/4/5 acceptance criteria get one additional item: doc has a top-of-file summary and each entry it owns in `docs/AGENTS.md` carries `Load when:`.
3. OQ-2 (worker visibility of architecture) is largely answered: workers get always-on Tier 1 + trigger-driven Tier 3 pulls from the task packet; they don't read foundation docs blindly.
4. OQ-3 (conventions doc placement) simplifies: conventions live in Tier 3 with a trigger, not inline in foundation doc.
