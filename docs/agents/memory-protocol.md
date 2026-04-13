# Memory Protocol

Canonical protocol для `memory.md` и восстановления контекста.

`workflow.md` описывает lifecycle.
Этот документ фиксирует, кто и когда обязан сохранять durable state.
Usage telemetry вынесена отдельно в `docs/agents/usage-telemetry.md`.

## 1. Кто и когда пишет `memory.md`

| Роль | Файл | Кто обновляет | Когда |
| --- | --- | --- | --- |
| `lead-strategic` | `docs/agents/lead-strategic/memory.md` | `lead-strategic`; `orchestrator` только как fallback/backfill | после plan decisions, acceptance, reframe, strategic review |
| `orchestrator` | `docs/agents/orchestrator/memory.md` | `orchestrator` | после каждого accepted slice, перед auto-compact, перед завершением сессии |
| `worker` | — | не ведёт отдельный durable memory | session context only |

`strategic-reviewer` не ведёт отдельный `memory.md`: он живёт внутри session-level контекста `lead-strategic`.
`architecture pass` и `baseline pass` тоже не ведут отдельный `memory.md`: их durable state живёт в `lead-strategic/memory.md` или в отдельном governance artifact, если решение должно пережить текущий `last_report.md`.

Compatibility note:

Compatibility note: `lead-tactical` — legacy alias `orchestrator`; см. `docs/agents/roles.md`.

Ключевое разграничение:

- `memory.md` хранит context и decisions;
- `last_report.md` хранит текущий canonical report;
- `runtime/agents/usage-log.ndjson` хранит append-only usage history и optimization signals.

Ключевое правило:

- `lead-strategic` сам пишет свою память до завершения iteration, пока reasoning ещё свежий;
- backfill от `orchestrator` допустим только как fallback, а не как default ownership.

## 2. Что должно быть в памяти

### `lead-strategic/memory.md`

- принятые и отклонённые стратегические решения
- корректировки плана и их reasoning
- findings, влияющие на следующие slices
- контекст, который нужен следующему `--fresh`

### `docs/agents/orchestrator/memory.md`

- текущий статус работы
- активная ветка и base checkpoint
- открытые slices, pending reviews, эскалации
- cross-slice orchestration decisions
- recurring reviewer/evidence patterns
- проблемы, workarounds и Codex thread id

Туда **не** кладутся:

- file-by-file implementation logs;
- длинные diff summaries;
- подробный журнал "что именно поменялось в коде" по завершённым slices.

Это должно жить в worker handoff, `last_report.md` и `git log`, а не в durable orchestration memory.

### Worker handoff вместо memory

Worker возвращает через handoff:

- summary
- change manifest
- review results
- checks evidence
- continuation notes (для dependent slices)
- вопросы и эскалации

### Inter-worker continuity

Workers не имеют shared memory и не общаются между собой напрямую. Continuity между dependent workers — ответственность `orchestrator`.

Механизм:

1. Worker A завершает slice и оставляет `Continuation Notes` в handoff: decisions, gotchas, deferred items.
2. `orchestrator` собирает `Carry-Forward Context` для Worker B из handoff A: summary, decisions/patterns, open findings, continuation notes.
3. Worker B получает `Carry-Forward Context` как секцию task packet и не должен реконструировать контекст предыдущего slice самостоятельно.

Принцип: orchestrator — единственный мост между isolated workers. Никакого shared worker state, shared memory или cross-worker file protocol.

## 3. Backfill и timing

`orchestrator` делает backfill в `lead-strategic/memory.md`, если:

- strategic pass завершился без записи;
- есть риск потерять свежий strategic context до следующего `--fresh`;
- Codex/GPT временно недоступен, а важное решение уже принято.

Писать память нужно:

- после каждого принятого slice;
- после каждого значимого strategic decision;
- перед завершением сессии;
- превентивно, если контекст быстро растёт и возможен auto-compact.

Не жди конца сессии: `memory.md` должен обновляться инкрементально.

## 4. Формат

- свободный markdown;
- кратко и по делу;
- не дублировать то, что и так видно из `git log` или `last_report.md`;
- для `orchestrator` писать state-oriented заметки, а не implementation chronicle.

## 5. Восстановление после auto-compact

После auto-compact Claude теряет детальный разговорный контекст, но navigation docs доступны снова.

Порядок восстановления:

1. Определить роль из текущего контекста.
2. Прочитать `docs/agents/orchestrator/memory.md`.
3. Прочитать `docs/agents/lead-strategic/memory.md`.
4. Прочитать role instructions.
5. Прочитать `current_plan.md`.
6. Продолжить execution loop.

Поэтому оба `memory.md` должны оставаться актуальными: это мост между auto-compact, fallback path и новыми Codex threads.
