# Execution Profiles

Canonical place for runtime/model/effort/fallback mapping in the agent workflow.

Role semantics, ownership boundaries, execution shape, Review Gate, git protocol,
and memory ownership stay canonical in:

- `docs/agents/workflow.md`
- `docs/agents/git-protocol.md`

Plugin command mapping, proof tuples, companion CLI guidance, and runtime
verification contract: `docs/codex-integration.md`.

This file answers only this question:

> Which runtime, model, effort, and fallback lane should each existing role use for this profile?

It does **not**:

- create or remove roles;
- change execution shape or ownership boundaries;
- waive mandatory review or governance passes;
- redefine `worker`, `reviewer`, `orchestrator`, or `lead-strategic` semantics;
- document transport, relay, or plugin mechanics beyond the mapping itself.

If another doc uses runtime examples that conflict with this file, this file is
canonical for supported-profile mapping.

## Supported Profiles

| Profile | Status | Purpose |
|---|---|---|
| `mixed-claude-workers` | supported; current practical default | `orchestrator` user-facing in Claude; strategic work in GPT-5.4; worker/reviewer execution primarily on Claude lanes |
| `opus-orchestrated-codex-workers` | supported; not default | `orchestrator` user-facing in Claude; worker/reviewer execution moves to GPT-5.4 lanes where fit is appropriate |

## Selection Rules

- Runtime substitution never changes role ownership.
- A profile that depends on Codex worker/reviewer lanes may be selected only on a runtime surface that can truthfully launch or verify that lane; runtime verification contract: `docs/codex-integration.md` §4.

## Profile: `mixed-claude-workers`

Status: supported; current practical default.

| Role | Runtime | Default model | Effort | Fallback / escalation |
|---|---|---|---|---|
| `lead-strategic` | Codex | `gpt-5.4` | `high` for planning/acceptance; `medium` for bounded follow-up | Keep plan ownership on `gpt-5.4`; use `strategic-reviewer` as bounded second pass |
| `strategic-reviewer` | Codex | `gpt-5.4` default; `gpt-5.4` when pass widens | `medium` default; `high` when risk is high | Advisory only; unresolved ambiguity returns to `lead-strategic` |
| `orchestrator` | Claude | `Opus` | runtime-managed | No silent fallback. If work cannot run on `Opus`, pause and escalate |
| `worker` | Claude | `Opus` default; `Sonnet` for simpler slices | runtime-managed | If risk outgrows `Opus`, rerun on stronger default lane |
| `micro-worker` | Claude | `Opus` | runtime-managed | Escalate to full `worker` when task is no longer trivial |
| `code-reviewer` | Claude | `Opus` | runtime-managed | Escalate to `Opus` when bounded review stays ambiguous |
| `docs-reviewer` | Claude | `Opus` | runtime-managed | Escalate to `Opus` when doc diff changes active contracts |
| `security-reviewer` | Claude | `Opus` | runtime-managed | Escalate to `Opus` on auth/SQL/secret-handling ambiguity |
| `architecture-reviewer` | Claude | `Opus` | runtime-managed | Escalate to `Opus` on boundary/schema/package-risk |
| `ui-reviewer` | Claude | `Opus` smoke; `Opus` deep mode | runtime-managed | If confidence low, rerun deep mode on `Opus` |

## Profile: `opus-orchestrated-codex-workers`

Status: supported; not default.

This profile keeps the role model unchanged while moving worker/reviewer execution to the GPT-5.4 family where the slice is a good fit.

Profile-readiness: the actual runtime surface must be able to launch or verify the Codex lane truthfully. In this repo, use the canonical companion runtime path from `docs/codex-integration.md`. Runtime verification contract: `docs/codex-integration.md` §4. If verification is not available, keep `mixed-claude-workers` as practical default.

Operational default in this repo: this profile changes runtime/model binding, not worker execution shape. Codex workers and micro-workers still run sequentially in the shared checkout (`in-place` per `docs/agents/git-protocol.md` §3); do not treat `opus-orchestrated-codex-workers` as automatic parallel fan-out or separate-worktree-by-default profile.

| Role | Runtime | Default model | Effort | Fallback / escalation |
|---|---|---|---|---|
| `lead-strategic` | Codex | `gpt-5.4` | `high` | Raise pass depth instead of remapping ownership |
| `strategic-reviewer` | Codex | `gpt-5.4-mini` default; `gpt-5.4` when pass widens | `medium` default; `high` when risk is high | Advisory only; unresolved ambiguity returns to `lead-strategic` |
| `orchestrator` | Claude | `Opus` | runtime-managed | No silent fallback |
| `worker` | Codex | `gpt-5.4` | `medium` | If the requested write-capable lane cannot be proven through the canonical companion path, record a truthful per-slice exception (`docs/codex-integration.md` §4) |
| `micro-worker` | Codex | `gpt-5.4-mini` | `medium` | Escalate to full `worker` on `gpt-5.4` when task stops being trivial |
| `code-reviewer` | Codex | `gpt-5.4-mini` | `medium` | Escalate to `gpt-5.4` on low confidence or broader diff |
| `docs-reviewer` | Codex | `gpt-5.4-mini` | `medium` | Escalate to `gpt-5.4` on active contracts or cross-doc contradictions |
| `security-reviewer` | Codex | `gpt-5.4-mini` | `medium` | Escalate to `gpt-5.4` on risk-heavy slices |
| `architecture-reviewer` | Codex | `gpt-5.4-mini` | `medium` | Escalate to `gpt-5.4` for boundary/schema/package-risk |
| `ui-reviewer` | Codex smoke; Claude deep | `gpt-5.4-mini` smoke; `Opus` deep | `medium` Codex; runtime-managed Claude | Rerun deep mode on `Opus` if smoke finds likely issue |

## Escalation Rules

- Fallbacks change runtime/model/effort, not role identity.
- A stronger fallback lane is for ambiguity or risk increase, not for convenience.
- If a fallback would violate ownership or hide missing guaranteed context, stop and escalate.
- Profile selection and any role-level deviations should stay reviewable from the docs and artifacts alone.
