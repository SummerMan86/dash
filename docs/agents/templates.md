# Agent Communication Templates

Hub-index шаблонов коммуникации между агентами.
Шаблоны разделены по потребителям — каждый агент читает только свой файл.

## Routing: кто что читает

| Роль | Файл | Что там |
| --- | --- | --- |
| **Worker** | [`templates-handoff.md`](./templates-handoff.md) | Worker Handoff, Micro-Worker Handoff |
| **Orchestrator** | [`templates-orchestration.md`](./templates-orchestration.md) | Plan, Task Packet, Reports, Review Request/Result, Governance, Telemetry, Transparency |
| **Lead-strategic** | [`templates-orchestration.md`](./templates-orchestration.md) | Plan (§1), Strategic Review (§6-§7), Governance (§8-§10) |
| **Reviewer** | свой `instructions.md` | Output format уже inline в instructions каждого ревьюера |

## 0. Правила заполнения

### Required vs Optional

- `Required` означает: секция должна присутствовать.
- `Optional` означает: секцию можно опустить целиком, если skip condition не сработал.
- Если нужен truthful negative signal по конкретной проверке, используй `not run`.
- Если целый блок не применим к задаче, не заполняй его `none/not applicable` построчно; опусти блок и зафиксируй причину в краткой секции-disposition.

### Report Types

У `orchestrator` есть три canonical формата `last_report.md`:

| Report type | Когда использовать | Что обязательно |
| --- | --- | --- |
| `full` | multi-slice, cross-layer, risky implementation | plan sync, review findings/disposition, checks evidence, readiness |
| `lightweight` | docs-only, direct-fix или one-slice low-risk worker-owned change | status, done summary, checks evidence, review disposition, readiness |
| `governance-closeout` | verification/docs/baseline closure slice без нового product implementation | status, closure summary, baseline/architecture disposition, checks evidence, readiness |

Жёсткое правило:

- `file count < N` сам по себе не определяет формат.
- Выбирай формат по risk profile, а не по размеру diff.

### Verdict Artifacts

Отдельные `Baseline Verdict` и `Architecture Pass Decision` нужны только если решение должно жить дольше текущего `last_report.md`:

- открывает/закрывает wave;
- вводит или закрывает exception/waiver;
- меняет allowed next work;
- нужен durable governance trail.

Во всех остальных случаях достаточно короткого summary внутри `last_report.md`.

## Содержание дочерних файлов

### [`templates-handoff.md`](./templates-handoff.md)

1. Worker Handoff (worker → orchestrator)
2. Micro-Worker Handoff (micro-worker → orchestrator)

### [`templates-orchestration.md`](./templates-orchestration.md)

1. План задачи (lead-strategic → orchestrator)
2. Задача worker'у (orchestrator → worker) + Micro-Task
3. Report: Full / Lightweight / Governance Closeout (orchestrator → lead-strategic)
4. Review Request (orchestrator → reviewer)
5. Review Result (reviewer → orchestrator)
6. Strategic Review Request (lead-strategic → strategic-reviewer)
7. Strategic Review Result (strategic-reviewer → lead-strategic)
8. Baseline Verdict (baseline pass → lead-strategic / user)
9. Architecture Pass Decision (architecture pass → lead-strategic / orchestrator)
10. Plan Change Request (orchestrator → lead-strategic / Codex)
11. Usage Log Entry (orchestrator → runtime/agents/usage-log.ndjson)
12. Transparency Request (orchestrator → worker / reviewer)
