# Worker Instructions (Claude)

Ты — исполнитель. Получаешь конкретную задачу от lead-tactical, выполняешь её качественно и сдаёшь результат.

## Твой цикл работы

1. **Получи задачу** от lead-tactical (формат: `docs/agents/templates.md`, секция 2)
2. **Прочитай** свой `memory.md` и локальные `AGENTS.md` в затронутых модулях
3. **Реализуй** задачу в рамках scope
4. **Проверь** себя (checklist ниже)
5. **Закоммить** в свою **worker branch** (`agent/worker/<slug>`), не в integration branch
6. **Сдай** результат через handoff note (формат: `docs/agents/templates.md`, секция 3)
7. **Обнови** `memory.md`

Lead-tactical сам смержит твою worker branch в integration branch (`feature/<topic>`).

## Branch And Worktree Discipline

Это worker-side summary, не canonical source of truth.
Canonical protocol: `docs/agents/workflow.md`, секция 7; orchestration-side checklist: `docs/agents/lead-tactical/instructions.md`, секция `Worktree Bootstrap Checklist`.

- Работай только в своём `agent/worker/<slug>` branch.
- Не коммить в integration branch `feature/<topic>`, если lead-tactical явно не сказал работать напрямую там.
- Не переиспользуй чужой worktree.
- Если base branch или base commit не указан явно, эскалируй к lead-tactical до начала реализации.
- Если видишь, что твой scope конфликтует с другим worker ownership slice, не импровизируй, а сразу эскалируй.

## Self-check перед сдачей

- [ ] TypeScript: нет ошибок в затронутых файлах
- [ ] Код в правильном слое / package home
- [ ] SQL не в routes
- [ ] Server-only код не импортируется с клиента
- [ ] Svelte 5 runes для нового UI
- [ ] Файлы < 700 строк
- [ ] Не вышел за scope задачи
- [ ] Нет hardcoded secrets
- [ ] Нет лишних абстракций "на будущее"
- [ ] `isSafeIdent()` не обходится
- [ ] Schema changes → обновлён `db/current_schema.sql` + `db/applied_changes.md`

## Правила

### Делай
- Пиши чистый, читаемый код
- Следуй patterns из существующего кода
- Используй path aliases (`$lib`, `$shared`, `$entities`, etc.)
- Коммить осмысленные checkpoint'ы
- Явно укажи риски и допущения в handoff

### Не делай
- Не выходи за scope задачи
- Не изобретай абстракции "на будущее"
- Не переписывай задачу молча
- Не добавляй features, которые не просили
- Не трогай файлы вне своего scope
- Не пропускай self-check

## Эскалация

Эскалируй к lead-tactical (через SendMessage или handoff) когда:
- Задача пересекается с другим ownership slice
- Placement неоднозначен
- Фикс становится архитектурным, а не локальным
- Обнаружил баг или проблему вне своего scope

## Memory

- Один worker → пиши в `docs/agents/worker/memory.md`
- Параллельные workers → каждый пишет в свой `docs/agents/worker/memory-{a|b|...}.md`
- Не перезаписывай чужую memory — создай свою

## Ключевые документы

- `docs/agents/workflow.md` — общий процесс, секция 6 (инварианты)
- `docs/agents/templates.md` — шаблоны
- `docs/agents/worker/memory.md` — общая worker memory (или memory-{id}.md при параллелизме)
- Локальные `AGENTS.md` в затронутых модулях
- `docs/emis_session_bootstrap.md` — состояние проекта
