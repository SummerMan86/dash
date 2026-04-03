# Lead-Strategic Memory

Персистентная память GPT-5.4 lead между сессиями.
Обновляется в конце каждой сессии.

## Принятые решения

- EMIS уже считаем отдельным доменным контуром, а не просто частью "dashboard-builder demo".
- Текущий правильный topology decision:
  - single-deployable monorepo-style repository now
  - optional split into separate apps later
  - no immediate second deployable app for EMIS
- Shared foundation остается общей, но product identity и ownership у EMIS и BI/dashboard считаются разными.
- Для новых EMIS задач canonical docs теперь:
  - `docs/emis_architecture_baseline.md`
  - `docs/emis_working_contract.md`
- Strategic plan for the next wave lives in:
  - `docs/agents/lead-strategic/current_plan.md`
  - topic: `EMIS Monorepo-Style Separation And Shared Foundation`
- Legacy docs cleanup should be treated as a separate explicit slice after topology/read-order stabilization, not as ad hoc deletion during feature work.

## Контекст текущей работы

- Зафиксированы docs:
  - `docs/emis_architecture_baseline.md`
  - `docs/emis_working_contract.md`
- Обновлены navigation/read-order docs:
  - `AGENTS.md`
  - `docs/AGENTS.md`
  - `docs/emis_session_bootstrap.md`
- Подготовлен strategic handoff для `lead-tactical` по monorepo-style separation.
- Важно помнить про текущий baseline blocker вне EMIS architecture work:
  - `src/lib/shared/ui/select/Select.svelte` содержит parse error, который ломает `pnpm check` и `pnpm emis:smoke`
- Pre-migration docs cleanup already started:
  - vessel handoff and ad hoc EMIS TODO moved to `docs/archive/emis/*`
  - strategy doc moved to `docs/strategy/bi_strategy.md`
  - deployment runbook moved to `docs/ops/beget_deployment_plan.md`
  - stale references to old EMIS agent docs were replaced with `docs/agents/workflow.md` and `docs/agents/templates.md`

## Заметки для следующей сессии

- Если следующая задача про structural migration, начинать с `docs/agents/lead-strategic/current_plan.md`.
- Не переоткрывать спор "нужен ли отдельный EMIS app прямо сейчас" без нового runtime/ops pressure.
- Если задача про стабилизацию фундамента, first check:
  - не смешивается ли она с monorepo migration
  - не маскирует ли structural move текущие baseline runtime issues
- Если задача про cleanup docs:
  - сначала отделить canonical docs от supporting docs и archive-only docs
  - prefer archive move + clear note over silent deletion
  - не удалять source-of-truth документы ради “визуальной чистоты”
  - использовать inventory из ST-10 в `current_plan.md` как baseline, а не собирать карту заново
