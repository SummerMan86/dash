# Plan: EMIS Architecture Stabilization And Governance Freeze

## Цель

До нового кодового hardening/refactor стабилизировать саму EMIS-архитектуру как концепцию и как набор canonical docs.

Нужно получить архитектуру, которая:

- проста для объяснения новым участникам;
- правдиво описывает текущее package-state, а не phase-0 прошлое;
- явно отделяет `current state`, `target migration` и `historical context`;
- имеет понятный governance-owner и реестр допустимых исключений;
- может стать основой для следующей code stabilization wave, а не спорить с ней.

Эта wave открыта по user decision от `2026-04-04`:

- сначала архитектура и документация;
- потом enforcement и кодовый refactor.

## Почему открываем новую wave

По результатам architecture review на `2026-04-04`:

- core EMIS architecture itself is viable;
- current topology decision remains correct:
  - one deployable `SvelteKit` app
  - `modular monolith`
  - three contours:
    - platform/shared
    - EMIS operational
    - EMIS BI/read-side
- packages `emis-contracts`, `emis-server`, `emis-ui` are already real canonical homes in code.

Проблема сейчас не в том, что архитектура “сломана”.
Проблема в том, что она:

- описана несколькими текстами с разным временем и разным статусом;
- местами всё ещё звучит как pre-package phase;
- плохо разделяет `current` vs `target` vs `legacy`;
- governance-wise держится сильнее на договорённости, чем на одном ясном architectural contract.

Следовательно, первым шагом должен быть **architecture/docs freeze**, а не сразу code refactor.

## Стратегические решения этой wave

- topology remains frozen:
  - no separate EMIS deployable/app discussion without new runtime/ops pressure
- architectural core stays:
  - single deployable app
  - modular monolith
  - three contours
  - packages are the canonical home for reusable EMIS contracts/server/ui
- this wave is docs-first:
  - no broad code refactor while canonical architecture docs are still inconsistent
- `known exceptions` must be explicit and live in one registry
- recommended governance model:
  - `architecture-steward` owns canonical architecture docs, known exceptions and pre-approval for cross-layer changes
  - `architecture-reviewer` remains a bounded review role on diffs
- previous baseline/enforcement plan is deferred to phase 2 after architecture freeze acceptance

## Подзадачи

### A0: Architecture-First Freeze
- scope:
  - `docs/agents/lead-strategic/current_plan.md`
  - `docs/agents/lead-strategic/memory.md`
  - supporting process notes if needed
- depends on: —
- размер: S
- заметки:
  - явно зафиксировать новый порядок:
    - architecture/docs first
    - code stabilization second
  - не смешивать эту wave с feature expansion

#### A0 Acceptance Checklist
- active plan явно говорит `architecture first`
- следующий tactical диалог не стартует с refactor-by-default
- out-of-scope список исключает broad product work

### A1: Simplify Canonical Architecture Contract
- scope:
  - `docs/emis_architecture_baseline.md`
  - `docs/emis_working_contract.md`
  - `docs/emis_session_bootstrap.md`
- depends on: A0
- размер: M
- заметки:
  - сократить архитектурный фрейм до нескольких простых правил
  - сделать одинаковую формулировку для:
    - topology
    - three contours
    - operational path
    - BI path
    - package ownership
    - app-level ownership
  - убрать лишний “целевой шум” из current-state docs

#### A1 Acceptance Checklist
- у EMIS есть один ясный canonical architecture story
- `baseline`, `working contract` и `bootstrap` говорят одно и то же о current ownership
- новый участник может понять placement rules без чтения historical phase docs

### A2: Separate Current State vs Target Layout vs Historical Docs
- scope:
  - `docs/emis_freeze_note.md`
  - `docs/emis_implementation_spec_v1.md`
  - `docs/emis_monorepo_target_layout.md`
  - `docs/AGENTS.md` if doc classification needs alignment
- depends on: A1
- размер: M
- заметки:
  - здесь нужно развести три слоя:
    - what is true now
    - what is frozen as long-term direction
    - what belongs to historical phase-0 / rollout context
  - `implementation_spec_v1` и `freeze_note` не должны contradict package-reality
  - если документ уже не current-canonical, это должно быть видно сразу

#### A2 Acceptance Checklist
- no canonical doc contradicts the current package architecture
- `target layout` remains future/migration doc, not accidental current-state source
- `freeze note` and `implementation spec` no longer mislead a new agent about current ownership

### A3: Create And Wire Known Exceptions Registry
- scope:
  - `docs/emis_known_exceptions.md`
  - `docs/emis_session_bootstrap.md`
  - `docs/agents/workflow.md`
  - other links only if needed
- depends on: A1 preferred, A2 preferred
- размер: S
- заметки:
  - каждая live exception должна иметь:
    - id
    - owner
    - why allowed
    - target wave / expiry
    - removal condition
  - исключения не должны больше жить только в memory/report text

#### A3 Acceptance Checklist
- canonical registry существует
- active architecture/baseline exceptions перечислены в одном месте
- workflow и bootstrap ссылаются на registry как на обязательный источник truth

### A4: Define Architecture Governance Role Model
- scope:
  - `docs/agents/roles.md`
  - `docs/agents/workflow.md`
  - `docs/agents/templates.md`
  - `docs/agents/architecture-reviewer/instructions.md`
  - new role docs if the chosen model requires them
- depends on: A3
- размер: M
- заметки:
  - user explicitly wants an “architect” role for EMIS discipline
  - recommended default:
    - add `architecture-steward` as a governance/design role
    - keep `architecture-reviewer` as diff reviewer
  - fallback if team wants fewer roles:
    - do not add a new role
    - instead strengthen `architecture-reviewer` and document explicit strategic ownership elsewhere
  - reviewer checks must reflect package-level reality, not only legacy FSD alias rules

#### A4 Acceptance Checklist
- role model is explicit and non-overlapping
- there is no accidental “second strategic lead”
- package-boundary review rules are documented
- oversized-file policy and exception handling are coherent with active EMIS docs

### A5: Prepare Phase-2 Enforcement And Refactor Backlog
- scope:
  - `docs/agents/lead-strategic/current_plan.md`
  - `docs/emis_next_tasks_2026_03_22.md`
  - optional small workflow/contract references
- depends on: A4
- размер: S
- заметки:
  - after architecture freeze, phase 2 should address code/system enforcement in bounded slices
  - candidate next items:
    - boundary gate repair
    - package-aware lint guardrails
    - `fetchDataset.ts` boundary fix
    - complexity follow-ups for oversized EMIS files
    - later shim cleanup
  - the point here is sequencing, not full implementation

#### A5 Acceptance Checklist
- next wave order is explicit
- docs-first wave ends without silently expanding into code refactor
- future code stabilization can start from an accepted architecture baseline

## Recommended Execution Order
1. `A0` — freeze architecture-first scope.
2. `A1` — simplify the canonical architecture story.
3. `A2` — separate current / target / historical docs.
4. `A3` — create and wire known exceptions.
5. `A4` — define architect governance role model.
6. `A5` — prepare phase-2 enforcement/refactor backlog.

## Scope Boundaries

### In scope
- EMIS architecture concept clarification
- canonical docs truthfulness
- current vs target vs history separation
- architect/governance role model
- known exceptions management
- sequencing for later enforcement/refactor work

### Out of scope
- new EMIS product features
- broad code refactor
- mass shim removal
- separate EMIS deployable/app discussion
- large BI/UI expansion
- mechanical enforcement rollout, except where minimal doc truthfulness requires it

## Exit Criteria For This Wave

Wave is considered closed only when all of the following are true:

- canonical EMIS docs tell one consistent story about current ownership
- current package reality is not contradicted by `freeze note` or `implementation spec`
- `known exceptions` registry exists and captures live exceptions explicitly
- EMIS architecture governance role model is documented
- phase-2 enforcement/refactor backlog is sequenced after the docs freeze

At that point the next tactical dialogue may open **phase 2**:

- machine-enforced boundary work
- baseline command / checks hardening
- bounded EMIS refactors

Until then, the correct stance remains:

- architecture is viable
- architecture docs are not yet fully stabilized
