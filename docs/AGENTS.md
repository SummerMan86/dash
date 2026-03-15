# Docs Navigation

Папка `docs/` хранит не API reference, а документы уровня анализа, архитектуры и roadmap.

## Что читать и когда

- `current-project-analysis.md`
  Читать, если нужно понять текущее состояние проекта, сильные стороны, риски и что готово для переиспользования.

- `emis_mve_tz_v_2.md`
  Читать, если нужен обновленный scope EMIS: цели, границы MVE, архитектурные решения, модель данных и критерии приемки.

- `emis_implementation_spec_v1.md`
  Читать, если нужен уже рабочий план внедрения EMIS в текущий репозиторий: структура папок, миграции, API, этапы и DoD.

## Что считать source of truth для EMIS

Если вопрос про продуктовые рамки, данные, ограничения и acceptance:

- главным документом считать `emis_mve_tz_v_2.md`

Если вопрос про порядок реализации и технические решения внутри текущего репозитория:

- главным документом считать `emis_implementation_spec_v1.md`

Для обоих документов считать обязательными следующие инварианты:

- canonical identity должна доходить до DB constraints
- soft delete semantics не должны трактоваться по-разному между API, views и BI
- audit/provenance/actor attribution входят в target contract
- FK behavior и vocabulary boundaries должны быть зафиксированы явно

## Рекомендуемый порядок

1. `current-project-analysis.md`
2. `emis_mve_tz_v_2.md`
3. `emis_implementation_spec_v1.md`

## Как использовать вместе с кодом

- Если анализируешь текущую платформу, после документов переходи в `src/lib/` и `src/routes/`.
- Если планируешь EMIS, после документов смотри `src/lib/shared/`, `src/lib/entities/`, `src/lib/server/` и `src/routes/`.
- Если хочешь понять, что уже реально реализовано, документы нужно читать вместе с `README.md`, а не вместо него.
