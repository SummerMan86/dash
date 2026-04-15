# Execution Profiles

Canonical place for runtime/model/effort/fallback mapping in the agent workflow.

Role semantics, ownership boundaries, execution shape, Review Gate, git protocol,
and memory ownership stay canonical in:

- `docs/agents/roles.md`
- `docs/agents/workflow.md`
- `docs/agents/review-gate.md`
- `docs/agents/git-protocol.md`
- `docs/agents/memory-protocol.md`

This file answers only this question:

> Which runtime, model, effort, and fallback lane should each existing role use for this profile?

It does **not**:

- create or remove roles;
- change execution shape or ownership boundaries;
- waive mandatory review or governance passes;
- redefine `worker`, `reviewer`, `orchestrator`, or `lead-strategic` semantics;
- document transport or relay mechanics beyond the mapping itself.

If another doc uses runtime examples that conflict with this file, this file is
canonical for supported-profile mapping.

## Supported Profiles

| Profile                           | Status                               | Purpose                                                                                                                                         |
| --------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `mixed-claude-workers`            | supported; current practical default | Keep `orchestrator` user-facing in Claude while strategic work stays in GPT-5.4 and worker/reviewer execution remains primarily on Claude lanes |
| `opus-orchestrated-codex-workers` | supported; not default               | Keep `orchestrator` user-facing in Claude while moving worker/reviewer execution to GPT-5.4 lanes where that fit is appropriate                 |

## Selection Rules

- Choose one execution profile for a wave or explicitly record per-role or per-slice exceptions in the plan/report.
- Full profile switch mid-wave is allowed only at a slice boundary after open worker/reviewer tasks are closed; record the switch and rationale in the plan/report.
- Runtime substitution never changes role ownership.
- Use the profile default first. If risk exceeds the default lane, apply the listed escalation rule and record it truthfully.
- A profile that depends on Codex worker/reviewer lanes may be selected only on a runtime surface that can truthfully launch or verify that lane; a codex-labeled relay/helper name alone is not enough.
- If the selected surface cannot prove the requested Codex worker/reviewer lane, do not claim `opus-orchestrated-codex-workers` success for that run; stay on `mixed-claude-workers` or record a per-role/per-slice exception or blocker truthfully.
- Runtime-local ambient injections (for example `CLAUDE.md`, memory reminders, git-status summaries, or similar system-reminder bootstrap) do not by themselves invalidate a profile; they remain non-authoritative unless the packet/request explicitly makes them authoritative.
- If a role has no safe fallback in the selected profile, pause and escalate instead of inventing an ad hoc binding.
- `ui-reviewer` stays the role name in every profile; deep UI review is a stronger lane, not a new reviewer role.

## Profile: `mixed-claude-workers`

Status: supported; current practical default until another default is announced.

| Role                    | Runtime | Default model                                                        | Effort                                                                 | Fallback / escalation                                                                                                                 |
| ----------------------- | ------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `lead-strategic`        | Codex   | `gpt-5.4`                                                            | `high` for planning/acceptance; `medium` allowed for bounded follow-up | Keep plan ownership on `gpt-5.4`; use `strategic-reviewer` as a bounded second pass instead of silently downgrading the owner role    |
| `strategic-reviewer`    | Codex   | `gpt-5.4-mini` by default; `gpt-5.4` when the pass widens materially | `medium` by default; `high` when reframe/acceptance risk is high       | Advisory only; unresolved ambiguity returns to `lead-strategic`                                                                       |
| `orchestrator`          | Claude  | `Opus`                                                               | runtime-managed                                                        | No silent fallback. If orchestration-critical work cannot run on `Opus`, pause new slice dispatch and escalate                        |
| `worker`                | Claude  | `Opus` by default; `Sonnet` for simpler bounded slices               | runtime-managed                                                        | If slice risk outgrows `Sonnet`, rerun or reassign on the stronger default lane; do not collapse worker ownership into `orchestrator` |
| `micro-worker`          | Claude  | `Sonnet`                                                             | runtime-managed                                                        | Escalate to full `worker` when the task is no longer trivial or bounded                                                               |
| `code-reviewer`         | Claude  | `Sonnet`                                                             | runtime-managed                                                        | Escalate to `Opus` only when a bounded review stays ambiguous after a truthful first pass                                             |
| `docs-reviewer`         | Claude  | `Sonnet`                                                             | runtime-managed                                                        | Escalate to `Opus` when the doc diff changes active contracts and the first pass cannot resolve the contradiction                     |
| `security-reviewer`     | Claude  | `Sonnet`                                                             | runtime-managed                                                        | Escalate to `Opus` on auth/SQL/secret-handling ambiguity or high-impact data-flow risk                                                |
| `architecture-reviewer` | Claude  | `Sonnet`                                                             | runtime-managed                                                        | Escalate to `Opus` when the review surface becomes boundary/schema/package-risk heavy or needs broader synthesis                      |
| `ui-reviewer`           | Claude  | `Sonnet` for smoke; `Opus` preferred for the deep lane               | runtime-managed                                                        | If visual confidence is low or the issue spans multiple flows, rerun the deep lane on `Opus` via `ui-reviewer-deep/instructions.md`   |

## Profile: `opus-orchestrated-codex-workers`

Status: supported; not default.

This profile keeps the role model unchanged while moving worker/reviewer
execution to the GPT-5.4 family where the slice is a good fit.

Profile-readiness note:

- This profile is supported as a contract target, but the actual runtime surface must still be able to launch or verify the Codex lane truthfully.
- If the active orchestrator runtime cannot verify that worker/reviewer launches really reached the requested Codex lane, treat that as an orchestration/runtime blocker rather than silently counting the run as validated Codex execution.
- Keep `mixed-claude-workers` as the practical default on surfaces where this verification is not yet available.
- In Claude Code, `codex-plugin-cc` is the mandatory operational surface for plugin-mapped Codex lanes in this profile.
- Plugin command mapping in Claude Code:
  - `/codex:setup` — preflight
  - `/codex:rescue` — `worker` / `micro-worker` only
  - `/codex:review` / `/codex:adversarial-review` — reviewer lanes only
  - `/codex:status` / `/codex:result` — logical tracking/result surfaces, but on the current observed runtime the reliable operational path for proof retrieval is companion CLI (`status --json`, `result`)
- For code-writing worker slices on that surface, the requested worker launch must be `/codex:rescue --fresh --write`, not a bare `/codex:rescue`.
- If the active `/codex:rescue --fresh --write` surface still resolves to `write: false` or rejects/ignores the flags, treat that as a surface constraint and use the documented companion fallback `task --write --fresh` only as an explicit per-slice exception recorded in report/telemetry.
- On the current Claude Code surface for this profile, do not request `--effort minimal` for Codex worker/reviewer launches. Use the role default `medium` effort unless the slice truthfully needs `high` or higher.
- On the current Claude Code surface for this profile, use companion CLI for `status/result` retrieval when you need proof, recovery, or stable machine-readable tracking; do not rely on skill-surface `status/result` availability.
- `lead-strategic` and `strategic-reviewer` are not implicitly mapped to worker/reviewer slash commands. If no dedicated strategic plugin lane is documented on the active surface, do not silently remap them; use an explicit per-role exception, another documented Codex runtime path, or truthful fallback/blocker handling.
- On that surface, `/codex:result` and the returned Codex session ID are stronger runtime evidence than a codex-labeled helper name alone; use them when you need to show that a Codex run actually happened.

Runtime verification contract for Claude Code:

- Minimum sufficient observable proof of a real plugin-mapped Codex run on the plugin-first surface = role-appropriate slash launch (`/codex:rescue` for workers, `/codex:review` or `/codex:adversarial-review` for reviewers) + completed `/codex:result` for that same launch + returned Codex session ID or another stable Codex run ID recorded against the slice/reviewer role.
- For code-writing worker slices, the recorded proof must also show that the launch was write-capable (`write: true` or an equivalent artifact). A verified read-only rescue run proves Codex execution, but it does not satisfy a code-writing worker claim.
- `/codex:status` is tracking only; use it to follow pending work or recover the matching run before `/codex:result`, but do not treat it as final proof by itself.
- On the current observed Claude Code surface, the practical retrieval path for that tracking/result evidence is companion CLI (`status --json`, `result`), not skill-surface `status/result`.
- Codex history may corroborate a run only when the same session ID/run ID is already known; history alone is not sufficient because it does not bind the run to the orchestrated slice/review request.
- A bare session ID, codex-labeled subagent/helper name, or Claude-side relay acknowledgement is not sufficient proof.
- If the active plugin/runtime surface cannot expose `/codex:result` plus a stable Codex run identifier, treat that lane as `unverified` for this profile.
- For direct wrapper/debug runs outside plugin surface, `scripts/codex-exec-prompt.sh --json-file ...` is the fallback proof artifact; record the JSONL path plus the run identifier in report/telemetry if you rely on that path.
- Operationally critical duplication of this rule is allowed only in docs that choose the profile, launch the lane, or record acceptance evidence: `orchestrator/instructions.md`, `templates-orchestration.md`, `usage-telemetry.md`, `autonomous-protocol.md`, `user-guide.md`, and `scripts/AGENTS.md`. Elsewhere refer back here.

| Role                    | Runtime                                       | Default model                                                        | Effort                                                           | Fallback / escalation                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lead-strategic`        | Codex                                         | `gpt-5.4`                                                            | `high`                                                           | If the wave exceeds normal planning depth, keep the same role and raise the pass depth instead of remapping ownership                                                                                                                                                                                                                                                                     |
| `strategic-reviewer`    | Codex                                         | `gpt-5.4-mini` by default; `gpt-5.4` when the pass widens materially | `medium` by default; `high` when reframe/acceptance risk is high | Advisory only; unresolved ambiguity returns to `lead-strategic`                                                                                                                                                                                                                                                                                                                           |
| `orchestrator`          | Claude                                        | `Opus`                                                               | runtime-managed                                                  | No silent fallback. If orchestration-critical work cannot run on `Opus`, pause new slice dispatch and escalate                                                                                                                                                                                                                                                                            |
| `worker`                | Codex                                         | `gpt-5.4`                                                            | `medium`                                                         | For code-writing slices in Claude Code, request `/codex:rescue --fresh --write` by default. If the active surface still dispatches `write: false` or ignores/rejects the flags, use companion `task --write --fresh` only as an explicit per-slice exception; otherwise escalate to `high` effort or strategic reframe when the slice stops being an ordinary bounded implementation task |
| `micro-worker`          | Codex                                         | `gpt-5.4-mini`                                                       | `medium`                                                         | Escalate to full `worker` on `gpt-5.4` when the task stops being trivial or bounded                                                                                                                                                                                                                                                                                                       |
| `code-reviewer`         | Codex                                         | `gpt-5.4-mini`                                                       | `medium`                                                         | Escalate to `gpt-5.4` when the first pass reports low confidence or the diff is materially broader than expected                                                                                                                                                                                                                                                                          |
| `docs-reviewer`         | Codex                                         | `gpt-5.4-mini`                                                       | `medium`                                                         | Escalate to `gpt-5.4` when active contracts or cross-doc contradictions need broader synthesis                                                                                                                                                                                                                                                                                            |
| `security-reviewer`     | Codex                                         | `gpt-5.4-mini`                                                       | `medium`                                                         | Escalate to `gpt-5.4` on risk-heavy slices                                                                                                                                                                                                                                                                                                                                                |
| `architecture-reviewer` | Codex                                         | `gpt-5.4-mini`                                                       | `medium`                                                         | Escalate to `gpt-5.4` for boundary/schema/package-risk slices                                                                                                                                                                                                                                                                                                                             |
| `ui-reviewer`           | `Codex` for smoke; `Claude` for the deep lane | `gpt-5.4-mini` for smoke; `Opus` preferred for the deep lane         | `medium` in Codex lane; runtime-managed in Claude deep lane      | If smoke review finds a likely UX issue or confidence is low, rerun a deep pass on `Opus` via `ui-reviewer-deep/instructions.md`                                                                                                                                                                                                                                                          |

## Escalation Rules

- Fallbacks change runtime/model/effort, not role identity.
- A stronger fallback lane is for ambiguity or risk increase, not for convenience.
- If a fallback would violate ownership or hide missing guaranteed context, stop and escalate.
- Profile selection and any role-level deviations should stay reviewable from the docs and artifacts alone.
