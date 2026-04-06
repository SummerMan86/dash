# Agent Usage Telemetry

Canonical protocol для durable истории использования агентной команды и последующей оптимизации модели.

`workflow.md` описывает execution lifecycle.
`templates.md` описывает human-readable reports.
Этот документ фиксирует, как сохранять append-only usage history, чтобы потом видеть:

- кто реально запускался;
- зачем его запускали;
- принёс ли он новую ценность;
- где orchestration оказалось избыточным;
- что можно оптимизировать в следующей wave.

## 1. Storage Model

V1 использует `hybrid file-first`:

- primary source: `runtime/agents/usage-log.ndjson`
- human-readable current report: `docs/agents/lead-tactical/last_report.md`
- durable context: `docs/agents/lead-strategic/memory.md` и `docs/agents/lead-tactical/memory.md`

Ключевые правила:

- `usage-log.ndjson` — append-only local artifact для optimization analytics;
- `last_report.md` не является historical log: он хранит только текущий canonical report;
- `memory.md` не является usage telemetry: оно хранит context и decisions, а не статистику использования;
- import в локальную БД допустим как v2, но не является primary source в v1.

## 2. Event Granularity And Ownership

Единица telemetry — meaningful orchestration event, а не каждый tool call.

По умолчанию `lead-tactical` пишет usage entry:

- после accepted slice в iterative mode;
- после final task acceptance;
- после governance-closeout, если он materially полезен для оптимизации модели.

Не нужно писать отдельную usage entry для:

- каждого reviewer запуска по отдельности;
- каждого shell/tool call;
- каждого trivial internal retry.

`lead-strategic` не является primary writer usage log, но его acceptance verdict и reframe должны отражаться в usage entry.

## 3. Usage Log Schema

Каждая строка в `runtime/agents/usage-log.ndjson` — отдельный JSON object.

Core fields (always required):

- `timestamp`
- `task_id`
- `wave_id`
- `stage`
- `report_type`
- `operating_mode`
- `status`

Extended fields (recommended; optional for lightweight/trivial tasks):

- `workers_spawned`
- `review_passes_total`
- `review_passes_by_type`
- `codex_calls_total`
- `strategic_reviewer_run`
- `strategic_reviewer_model`
- `strategic_reviewer_reason`
- `findings_summary`
- `next_slice_impact`
- `mode_change`
- `agent_value`
- `agent_value_reason`
- `orchestration_value`
- `optimization_note`

Optional fields:

- `slice_id`
- `branch`
- `review_diff`
- `cross_model_value`
- `checks_summary`

Recommended enums:

- `status`: `accept` | `accept_with_adjustments` | `reject` | `re_slice`
- `strategic_reviewer_model`: `gpt-5.4-mini` | `gpt-5.4` | `not_run`
- `agent_value`: `meaningful` | `neutral` | `excessive`
- `orchestration_value`: `efficient` | `acceptable` | `overbuilt`
- `cross_model_value`: `found_likely_missed_bug` | `found_acceptance_or_reframe_signal` | `no_additional_value` | `not_applicable`

Minimal example:

```json
{
  "timestamp": "2026-04-06T14:25:00+03:00",
  "task_id": "NW-4",
  "wave_id": "phase-2-closeout",
  "stage": "slice-acceptance",
  "slice_id": "ST-2",
  "report_type": "full",
  "operating_mode": "high-risk iterative / unstable wave",
  "status": "accept",
  "workers_spawned": 1,
  "review_passes_total": 4,
  "review_passes_by_type": {
    "slice": 3,
    "integration": 1,
    "strategic": 1
  },
  "codex_calls_total": 2,
  "strategic_reviewer_run": true,
  "strategic_reviewer_model": "gpt-5.4-mini",
  "strategic_reviewer_reason": "green Sonnet review but low confidence in acceptance",
  "findings_summary": {
    "critical": 0,
    "warning": 1,
    "info": 2
  },
  "next_slice_impact": "local reframe",
  "mode_change": "none",
  "agent_value": "meaningful",
  "agent_value_reason": "mini-pass found likely regression not surfaced by prior review",
  "orchestration_value": "acceptable",
  "optimization_note": "keep mini-pass for risky slices, but not for stable docs-only slices",
  "cross_model_value": "found_likely_missed_bug"
}
```

## 4. Evaluation Rubric

### `agent_value`

`meaningful`:

- агент нашёл новый bug/regression;
- агент изменил acceptance decision;
- агент изменил next-slice reframe;
- агент поднял новый strategic risk;
- без этого pass confidence в risky acceptance был бы недостаточным.

`neutral`:

- агент не нашёл нового, но запуск был оправдан risk profile;
- агент подтвердил, что escalation не нужна;
- pass не изменил решение, но не выглядел лишним в текущем execution context.

`excessive`:

- агент не добавил новых сигналов;
- запуск был вне risk signals;
- несколько похожих passes подряд дали `no_additional_value`;
- cadence можно было снизить без потери acceptance confidence.

### `orchestration_value`

`efficient`:

- orchestration shape была минимально достаточной;
- затраты на workers/reviews/Codex calls окупились.

`acceptable`:

- execution не был минимальным, но cost/benefit выглядел разумно.

`overbuilt`:

- orchestration loop оказался тяжелее, чем требовал реальный risk profile;
- usage history указывает на возможность simplification в следующих задачах.

`excessive` не означает process failure.
Это normal optimization signal для будущей настройки agent model.

## 5. Relationship To Existing Reports

Usage log не живёт отдельно от current report model.
Он собирается из `last_report.md` и orchestration state.

`lead-tactical` обязан отражать в report данные, достаточные для extraction:

- `Agent Effort`
- `Strategic Cadence`
- `Review Disposition`
- `Findings`
- usefulness summary (`agent_value`, `orchestration_value`)

Если usage entry не может быть truthfully собрана из report + orchestration state, это defect report discipline.

## 6. V2: Local DB Import

V2 может импортировать `runtime/agents/usage-log.ndjson` в локальную Postgres БД для analytics/dashboards.

Потенциальные агрегаты:

- yield by agent type;
- yield by operating mode;
- `gpt-5.4-mini` effectiveness against Sonnet-only path;
- overbuilt-task patterns;
- cost vs usefulness trends.

Но в v1:

- локальная БД не является primary storage;
- schema/migrations для telemetry не обязательны;
- сначала команда учится на реальном usage log, потом стабилизирует DB schema.
