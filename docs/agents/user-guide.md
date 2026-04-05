# User Guide — Работа с командой агентов

Практические инструкции для пользователя. Копипаст-готовые промпты для типовых задач.

## Быстрый старт

### Что нужно

| Компонент                   | Где           | Как запустить                                                                      |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| GPT-5.4 (lead-strategic)    | ChatGPT / API | Новый чат, вставить `docs/agents/lead-strategic/instructions.md` как system prompt |
| Claude Opus (lead-tactical) | tmux pane #0  | `tmux` → `claude`                                                                  |
| Claude Worker (teammate)    | tmux pane #1+ | Lead создаёт через Agent Teams, или вручную                                        |

### Предусловия

1. Agent Teams включён (один раз):

   ```json
   // ~/.claude.json
   { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   ```

2. GPT-5.4 настроен: скопируй `docs/agents/lead-strategic/instructions.md` как
   - Custom Instructions (ChatGPT), или
   - System prompt (API), или
   - Первое сообщение в чате

### Короткие шаблоны старта

**Для новой нетривиальной задачи → GPT-5.4:**

```
Задача: <что сделать>
Контекст: <зачем>
Scope: <что затрагивает>
Ограничения: <что нельзя трогать>
```

Для новой большой задачи по умолчанию считай, что работа идёт в отдельной `feature/<topic>` ветке от `main`.
Детали branch setup, workers и `agent/worker/<slug>` организует lead-tactical по workflow.

**Потом → Claude lead-tactical:**

```
Выполняй план из docs/agents/lead-strategic/current_plan.md
```

Если хочешь сказать это явно:

```
Новая задача. Создай отдельную feature-ветку от main, составь и выполни план.
Если задача делится, создай workers и используй worker branches по workflow.
```

**Для простой локальной задачи → сразу Claude:**

```
Исправь <проблема>. Файл/зона: <путь>.
Если нужно — создай worker. После этого запусти Review Gate.
```

---

## Типовые сценарии

### A. Новая задача (полный цикл)

**Шаг 1 → GPT-5.4:**

```
Задача: <описание>
Контекст: <зачем это нужно>
Scope: <какие части системы затрагивает>
Ограничения: <что нельзя трогать, сроки>
```

GPT-5.4 выдаст план. Проверь его, попроси уточнить если нужно.
Для новой большой задачи отдельную `feature/<topic>` ветку создаёт lead-tactical, если ты явно не задал другое.

**Шаг 2 → Claude (tmux #0):**

```
Прочитай план задачи: docs/agents/lead-strategic/current_plan.md
Выполни его по инструкциям из docs/agents/lead-tactical/instructions.md
```

Или короче, если Claude уже знает процесс:

```
Выполняй план из docs/agents/lead-strategic/current_plan.md
```

**Шаг 3 → подожди, Claude работает.** Он:

- сам раздаст задачи workers (если нужно)
- сам запустит Review Gate
- сам напишет report в `docs/agents/lead-tactical/last_report.md`

**Шаг 4 → GPT-5.4:**

```
Вот report от Claude: <скопировать содержимое last_report.md>
```

GPT-5.4 выдаст: принято / замечания / переделка.

**Шаг 5 → если принято:**

```
Мерж подтверждён. Мержи в main.
```

---

### B. Простая задача (без GPT-5.4)

Для мелких задач (баг, стиль, typo) GPT-5.4 не нужен. Напрямую Claude:

```
Исправь <описание проблемы>. Файл: <путь>
```

Claude сам классифицирует, выполнит, запустит review.

---

### C. Продолжение работы (новая сессия)

Если предыдущая сессия закончилась с незаконченной работой:

**Claude (tmux #0):**

```
Продолжи работу. Прочитай:
- docs/agents/lead-tactical/memory.md
- docs/agents/lead-strategic/current_plan.md
```

**GPT-5.4 (новый чат):**

```
Прочитай мой memory: <скопировать docs/agents/lead-strategic/memory.md>
Текущий план: <скопировать current_plan.md>
Статус: <что было сделано, что осталось>
```

---

### D. После auto-compact Claude

Если Claude потерял контекст (ответы стали generic, не помнит что делал):

```
Ты — lead-tactical. Восстановись:
1. Прочитай docs/agents/lead-tactical/memory.md
2. Прочитай docs/agents/lead-tactical/instructions.md
3. Прочитай docs/agents/lead-strategic/current_plan.md
Продолжи работу.
```

---

### E. Эскалация от Claude

Если Claude эскалирует решение тебе — передай GPT-5.4:

```
Claude эскалирует: <скопировать текст эскалации>
Контекст: <что сейчас делается>
```

GPT-5.4 принимает решение → ты передаёшь Claude:

```
Решение по эскалации: <вариант N>. Продолжай.
```

---

### F. Запуск Review Gate вручную

Если хочешь запустить ревью отдельно:

```
Запусти Review Gate по текущим изменениям
```

Или только часть:

```
Проверь только безопасность
Только architecture review
Запусти code review
Проверь качество реализации
```

UI (нужен dev server):

```
Проверь UI на /emis
Глубокий UI-ревью новой страницы
```

### F2. Strategic sidecar review

Если не хочешь открывать новый GPT-диалог на каждую подзадачу, можно использовать optional `strategic-reviewer` как узкий второй проход.

Что ему давать:

- `docs/agents/lead-strategic/current_plan.md`
- `docs/agents/lead-tactical/last_report.md`
- diff или список changed files
- 2-4 canonical docs по теме

Что просить:

```
Сделай strategic sidecar review.
Проверь:
- соответствует ли результат плану
- есть ли scope drift
- все ли acceptance items закрыты
- нужен ли strategic decision или можно принимать
```

Когда это лучше нового чата:

- идёт одна и та же wave, но задач несколько
- нужен second opinion без полного re-bootstrap
- основной `lead-strategic` контекст уже хороший и терять его не хочется

Когда лучше новый чат:

- началась новая wave
- слишком много старого контекста и нужен clean reset
- ключевые решения уже перенесены в `memory.md`, `current_plan.md`, `last_report.md`

---

### G. Создание worker-teammate

**Вариант 1 — попросить lead-tactical создать:**

```
Создай worker-teammate для задачи: <описание>
```

Lead сам создаст teammate в новом tmux-pane, передаст задачу.

**Вариант 2 — создать Agent Team целиком:**

```
Создай agent team:
- worker на Opus — реализация <описание задачи>
```

**Вариант 3 — вручную (если Agent Teams не работает):**

1. Создай tmux-окно: `Ctrl+B, C`
2. Запусти: `claude`
3. Дай задачу:

```
Ты — worker. Прочитай docs/agents/worker/instructions.md
Задача: <описание>
Scope: <файлы>
Integration branch: feature/<topic> (lead-tactical смержит твой результат сюда)
Worker branch: agent/worker/<slug> (коммить сюда)
Не трогать: <что за пределами scope>
```

### H. Прямое общение с worker

Ты можешь зайти в tmux-pane worker'а (`Shift+Down/Up`) и общаться напрямую:

```
Покажи что ты сделал
Объясни почему ты выбрал этот подход
Переделай <конкретный файл> — <что не так>
```

Worker видит весь проект (это teammate, не subagent), поэтому может отвечать с полным контекстом.

---

## Шпаргалка tmux

### Базовые команды

| Действие        | Клавиша       |
| --------------- | ------------- |
| Новое окно      | `Ctrl+B, C`   |
| Следующее окно  | `Ctrl+B, N`   |
| Предыдущее окно | `Ctrl+B, P`   |
| Список окон     | `Ctrl+B, W`   |
| Отсоединиться   | `Ctrl+B, D`   |
| Вернуться       | `tmux attach` |

### Agent Teams в tmux

| Действие                   | Клавиша                 |
| -------------------------- | ----------------------- |
| Следующий pane (teammate)  | `Shift+Down`            |
| Предыдущий pane (teammate) | `Shift+Up`              |
| Список всех teammates      | Видно в tmux status bar |

---

## Чеклист перед мержем

- [ ] Все подзадачи плана выполнены
- [ ] Review Gate пройден (нет CRITICAL)
- [ ] WARNING исправлены или обоснованы
- [ ] GPT-5.4 принял report (если был задействован)
- [ ] Ветка up-to-date с main
- [ ] Коммиты чистые и осмысленные

---

## FAQ

**Q: Когда нужен GPT-5.4, а когда хватит Claude?**

- GPT-5.4: новая фича, архитектурное решение, cross-module change
- Только Claude: баг, стиль, рефакторинг в одном модуле, typo

**Q: Сколько workers запускать?**

- На первом этапе — один teammate-worker. Параллелизм добавим позже.

**Q: Worker — teammate или subagent?**

- **Worker = teammate** (Agent Teams, tmux-pane). Полный контекст проекта, видит все docs.
- **Reviewer = subagent** (Agent tool, session-persistent). Дешёвый (Sonnet), получает только diff, reuse через SendMessage.

**Q: Что если Claude завис / не отвечает?**

- Проверь tmux-pane (`Shift+Down/Up` или `Ctrl+B, W`)
- Если completion прервался: нажми Enter, скажи "продолжай"
- Если совсем завис: `Ctrl+C`, потом "продолжи работу, прочитай memory.md"

**Q: Что если GPT-5.4 и Claude расходятся во мнении?**

- GPT-5.4 — стратегический lead, его решение приоритетнее
- Если Claude обоснованно несогласен (security, инварианты) — ты решаешь

**Q: Как обновить memory агента вручную?**

- Просто отредактируй `docs/agents/{role}/memory.md` — это обычный markdown

**Q: Могу ли я общаться с worker напрямую?**

- Да, зайди в его tmux-pane (`Shift+Down`). Он teammate с полным контекстом.
- С subagent-reviewer — напрямую нет. Он session-persistent в рамках текущей сессии и переиспользуется lead-tactical через `SendMessage`, но не живёт как отдельный tmux-teammate для ручного диалога.

**Q: Agent Teams не работает?**

- Проверь `~/.claude.json`: `{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }`
- Нужен tmux (не просто terminal tabs)
- Fallback: создай worker вручную (сценарий G, вариант 3)
