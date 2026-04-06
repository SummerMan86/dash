# Memory Protocol

Canonical protocol для `memory.md` и восстановления контекста.

`workflow.md` описывает lifecycle.
Этот документ фиксирует, кто и когда обязан сохранять durable state.
Usage telemetry вынесена отдельно в `docs/agents/usage-telemetry.md`.

## 1. Кто и когда пишет `memory.md`

| Роль | Файл | Кто обновляет | Когда |
| --- | --- | --- | --- |
| `lead-strategic` | `docs/agents/lead-strategic/memory.md` | `lead-strategic`; `lead-tactical` только как fallback/backfill | после plan decisions, acceptance, reframe, strategic review |
| `lead-tactical` | `docs/agents/lead-tactical/memory.md` | `lead-tactical` | после каждого slice, перед auto-compact, перед завершением сессии |
| `worker` | — | не ведёт отдельный durable memory | session context only |

`strategic-reviewer` не ведёт отдельный `memory.md`: он живёт внутри session-level контекста `lead-strategic`.
`architecture pass` и `baseline pass` тоже не ведут отдельный `memory.md`: их durable state живёт в `lead-strategic/memory.md` или в отдельном governance artifact, если решение должно пережить текущий `last_report.md`.

Ключевое разграничение:

- `memory.md` хранит context и decisions;
- `last_report.md` хранит текущий canonical report;
- `runtime/agents/usage-log.ndjson` хранит append-only usage history и optimization signals.

Ключевое правило:

- `lead-strategic` сам пишет свою память до завершения iteration, пока reasoning ещё свежий;
- backfill от `lead-tactical` допустим только как fallback, а не как default ownership.

## 2. Что должно быть в памяти

### `lead-strategic/memory.md`

- принятые и отклонённые стратегические решения
- корректировки плана и их reasoning
- findings, влияющие на следующие slices
- контекст, который нужен следующему `--fresh`

### `lead-tactical/memory.md`

- текущий статус работы
- активная ветка и base branch
- cross-slice tactical decisions
- проблемы, workarounds и Codex thread id

### Worker handoff вместо memory

Worker возвращает через handoff:

- summary
- findings
- review results
- checks evidence
- вопросы и эскалации

## 3. Backfill и timing

`lead-tactical` делает backfill в `lead-strategic/memory.md`, если:

- strategic pass завершился без записи;
- есть риск потерять свежий strategic context до следующего `--fresh`;
- Codex/GPT временно недоступен, а важное решение уже принято.

Писать память нужно:

- после каждого завершённого slice;
- после каждого значимого strategic decision;
- перед завершением сессии;
- превентивно, если контекст быстро растёт и возможен auto-compact.

Не жди конца сессии: `memory.md` должен обновляться инкрементально.

## 4. Формат

- свободный markdown;
- кратко и по делу;
- не дублировать то, что и так видно из `git log` или `last_report.md`.

## 5. Восстановление после auto-compact

После auto-compact Claude теряет детальный разговорный контекст, но navigation docs доступны снова.

Порядок восстановления:

1. Определить роль из текущего контекста.
2. Прочитать `lead-tactical/memory.md`.
3. Прочитать `lead-strategic/memory.md`.
4. Прочитать role instructions.
5. Прочитать `current_plan.md`.
6. Продолжить execution loop.

Поэтому оба `memory.md` должны оставаться актуальными: это мост между auto-compact, fallback path и новыми Codex threads.
