# EMIS Architecture Review

Короткий review checklist для `lead-integrator` и архитектурного approve по EMIS.

Использовать вместе с:

- [EMIS Agent Operating Model](./emis_agent_operating_model.md)
- [EMIS MR Template](./emis_mr_template.md)
- [EMIS Runtime Contract](../src/lib/server/emis/infra/RUNTIME_CONTRACT.md)

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
7. `lead-integrator` выносит verdict:
   - `approve`
   - `request changes`
   - `needs design decision`

## 2. When lead approval is mandatory

Тяжелый review обязателен, если change затрагивает хотя бы один пункт:

- новый route или новый API endpoint
- изменение `src/lib/server/emis/modules/*`
- изменение DB schema или published views
- новый shared contract, Zod schema или dataset contract
- рост или переразбиение `/emis` workspace
- любые cross-layer changes

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
- `routes/api/emis/*` остаются transport-only
- SQL не попадает в route files
- client code не тянет `$lib/server/*`
- BI read-side не смешивается с operational flow без причины

### Placement

- change расположен там, где уже живет аналогичная ответственность
- `why this placement` объяснен в handoff / MR summary
- нет нового shared abstraction без доказанного reuse pressure

### Complexity

- change не раздувает и без того большие orchestration files без причины
- для `src/routes/emis/+page.svelte` и `src/lib/widgets/emis-map/EmisMap.svelte` default expectation — extraction, а не дальнейший inline growth
- если файл уже пересек warning threshold, review явно фиксирует, почему это допустимо сейчас

### Contracts and docs

- runtime behavior updates reflected in `src/lib/server/emis/infra/RUNTIME_CONTRACT.md`, если это нужно
- schema changes reflected in `db/current_schema.sql` и `db/applied_changes.md`
- новый активный slice добавлен в navigation docs
- `docs/AGENTS.md` и `docs/emis_session_bootstrap.md` не потеряли discoverability

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
