# EMIS Review Gate

Короткий approve checklist для `lead-tactical`, `architecture-reviewer` и `architecture-steward` по EMIS.

Использовать вместе с:

- [Agent Workflow](./agents/workflow.md)
- [Agent Templates](./agents/templates.md)
- [EMIS Runtime Contract](../apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md)

## 1. Default lifecycle

1. Исполнитель берет bounded task.
2. Перед работой фиксирует touch points:
   - какие файлы меняет
   - какие слои затрагивает
   - нужен ли DB update
   - нужен ли docs/contracts update
3. Делает change в пределах своего ownership slice.
4. Прогоняет обязательные локальные проверки.
5. Передает change на review с короткой сводкой:
   - что изменено
   - почему change живет именно здесь
   - какие риски остаются
6. Reviewers дают findings по diff.
7. Если нужен новый placement/waiver verdict, подключается `architecture-steward`.
8. `lead-tactical` агрегирует findings и выносит tactical recommendation:
   - `approve`
   - `request changes`
   - `needs design decision`
9. `lead-strategic` принимает slice, если он был частью planned wave.

## 2. When lead approval is mandatory

Тяжелый review обязателен, если change затрагивает хотя бы один пункт:

- новый route или новый API endpoint
- изменение public ownership или reusable logic в `packages/emis-contracts/*`, `packages/emis-server/src/*`, `packages/emis-ui/*`
- изменение `apps/web/src/routes/api/emis/*`, `apps/web/src/routes/emis/*`, `apps/web/src/routes/dashboard/emis/*`, которое меняет contour boundaries
- изменение DB schema или published views
- новый shared contract, Zod schema или dataset contract
- рост или переразбиение `/emis` workspace или `packages/emis-ui/src/emis-map/EmisMap.svelte`
- любые cross-layer changes
- любой новый exception или complexity waiver

## 3. Fast path

Можно идти без тяжелого architectural review, если change остается локальным и не меняет поведение слоя:

- локальный UI polish без смены behavior
- copy/text/style-only правки
- маленький bugfix внутри уже существующего bounded модуля

Даже в fast path change не должен:

- протаскивать новый shared abstraction
- менять контракт API / dataset / DB
- увеличивать ownership slice без явного решения

## 4. Approve checklist

### Boundaries

- код живет в правильном слое
- packages остаются canonical reusable homes
- `apps/web` остается app leaf / transport-orchestration layer
- `routes/api/emis/*` остаются transport-only
- SQL не попадает в route files
- client code не тянет `$lib/server/*`
- BI read-side не смешивается с operational flow без причины

### Placement

- change расположен там, где уже живет аналогичная ответственность
- `why this placement` объяснен в handoff / MR summary
- нет нового shared abstraction без доказанного reuse pressure
- compatibility shims не используются как новый canonical home

### Complexity

- change не раздувает и без того большие orchestration files без причины
- для `apps/web/src/routes/emis/+page.svelte` и `packages/emis-ui/src/emis-map/EmisMap.svelte` default expectation — extraction, а не дальнейший inline growth
- если файл уже пересек warning threshold, review явно фиксирует, почему это допустимо сейчас
- long-lived waiver должен ссылаться на `docs/emis_known_exceptions.md`

### Contracts and docs

- runtime behavior updates reflected in `apps/web/src/lib/server/emis/infra/RUNTIME_CONTRACT.md`, если это нужно
- schema changes reflected in `db/current_schema.sql` и `db/applied_changes.md`
- новый активный slice добавлен в navigation docs
- `docs/AGENTS.md` и `docs/emis_session_bootstrap.md` не потеряли discoverability
- если введён exception / waiver, он записан в `docs/emis_known_exceptions.md`

### Checks

- указан список реально прогнанных checks
- для docs-only changes это явно сказано
- для runtime changes есть минимум smoke / targeted verification

## 5. Output format for lead verdict

Минимальный формат:

```md
Verdict: approve | request changes | needs design decision

Why:
- short reason 1
- short reason 2

Required follow-ups:
- item or `none`
```

## 6. Default stance

- Prefer bounded, boring placement over clever cross-layer abstractions.
- Prefer extraction over additional growth in already oversized route/map files.
- Prefer documented contracts over implicit tribal knowledge.
- Prefer explicit steward-approved waiver over silent architectural drift.
