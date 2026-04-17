# Git Protocol

Canonical branch, worktree и integration protocol для агентной команды.

`workflow.md` описывает execution loop и review model.
Этот документ — **единственный source of truth** для worker mode selection, worktree usage и integration choreography.

## 1. Ветки

В проекте используются три рабочие ветки:

- `main` — integration baseline
- `feature/<topic>` — integration branch, координируется `orchestrator`
- `agent/worker/<task-slug>` — worker branch, создаётся только для `isolated` mode (§3)

Правила:

- **In-place mode (default):** worker коммитит напрямую в `feature/<topic>` внутри owned scope. Применяется для всех sequential workers, всех Codex workers/micro-workers и всех Claude micro-workers.
- **Isolated mode (opt-in):** worker коммитит в отдельный `agent/worker/<task-slug>`; `orchestrator` мержит в `feature/<topic>` после handoff. Применяется только для Claude subagent workers, когда сработал trigger из §4.
- Canonical diff для integration review — `git diff main..feature/<topic>`.

## 2. Коммиты и checkpoints

- Checkpoint commit — после каждого законченного смыслового этапа.
- Commit messages — осмысленные, на английском.
- `.env`, credentials, scratch files не коммитятся.

Минимальный ритм checkpoint-коммитов (пример для domain feature):

- docs / architecture alignment
- DB foundation
- server write/query slice
- первый рабочий route/workspace
- интеграция с BI/read-models (если применимо)

## 3. Worker modes

Два канонических mode'а.

### 3.1. In-place (default)

- Default для всех workers и micro-workers.
- Worker работает в том же checkout, что и `orchestrator`.
- Отдельный worktree не создаётся.
- Commit идёт напрямую в `feature/<topic>`; только в рамках owned files из task packet.
- Если scope расползается или появляется collision с другим worker — worker останавливается и эскалирует, не расширяет scope молча.

### 3.2. Isolated (opt-in)

- Применяется только при срабатывании trigger из §4 и только для Claude subagent workers.
- Один worktree = один worker; branch `agent/worker/<task-slug>`.
- Worker коммитит только в свою ветку; `orchestrator` интегрирует в `feature/<topic>` после handoff.
- Не переиспользовать чужой worktree; не смешивать две задачи в одной ветке.
- Worktree-local bootstrap files are snapshot-based: свежесозданный worker worktree наследует текущий repo-root `CLAUDE.md` на момент spawn.
- Если root bootstrap/recovery docs materially изменились, старые worktrees считаются stale bootstrap surface и не переиспользуются.

## 4. Когда нужен isolated mode

Isolated mode — единственный путь, если выполняется хотя бы одно:

1. **Parallel execution** — одновременно запускаются `2+` code-writing workers. Все они обязаны идти через isolated.
2. **Schema / cross-layer touch** — slice трогает `db/*.sql`, меняет contract в нескольких packages или пересекает package/app boundary.
3. **Explicit isolation rationale** — task packet содержит явную причину diff isolation (например, experimental slice, который может быть отброшен целиком).

Если ни один trigger не сработал — используется in-place mode по умолчанию.

Для Codex workers/micro-workers isolated mode не входит в текущий default model: используем sequential `in-place` execution в общем checkout. Companion runtime concurrency верифицирована, но parallel Codex code-writing workers в shared checkout остаются unproven и не считаются supported default.

## 5. Bootstrap перед запуском worker

### 5.1. In-place mode

`orchestrator` перед handoff обязан:

1. Проверить, что находится в правильной `feature/<topic>`.
2. Передать worker'у:
   - integration branch;
   - base commit;
   - owned files;
   - out-of-scope files.
3. Не запускать dependent worker task, пока предыдущий обязательный slice не закоммичен в `feature/<topic>`.

### 5.2. Isolated mode

`orchestrator` перед handoff обязан:

1. Проверить integration branch.
2. Подготовить:
   - worker branch `agent/worker/<task-slug>`;
   - отдельный worktree (через Agent tool с `isolation: "worktree"`);
   - base checkpoint / commit;
   - fresh bootstrap surface (не использовать старый worktree, если root `CLAUDE.md` или role bootstrap rules менялись после его создания).
3. Передать worker'у те же поля, что в §5.1, плюс worker branch.
4. Зафиксировать в task packet trigger из §4, по которому выбран isolated mode.

## 6. Branch Integration

### 6.1. In-place mode

```text
1. Worker реализует slice в feature/<topic> (owned files)
2. Worker коммитит и сдаёт handoff
3. orchestrator проверяет scope по manifest/commit ownership: коммиты не вышли за owned files
4. integration review по правилам workflow.md §3.3
```

### 6.2. Isolated mode

```text
1. Worker реализует slice в agent/worker/<slug>
2. Worker коммитит и сдаёт handoff
3. orchestrator проверяет scope, checks evidence и review disposition
4. orchestrator мержит worker branch в feature/<topic> или создаёт merge/fix-worker, если merge требует code edits
5. orchestrator удаляет worker branch: git branch -d agent/worker/<slug>
6. integration review по правилам workflow.md §3.3
```

Ключевые правила (оба режима):

- Integration review всегда идёт по integration branch, а не по worker branch.
- Если несколько workers, все merge идут в один `feature/<topic>`.
- Dependent slices стартуют только от актуального состояния integration branch.

### 6.3. Cleanup после завершения wave / plan

После merge `feature/<topic>` в `main` (или после завершения wave):

1. Удалить оставшиеся worker branches: `git branch -d agent/worker/*` (если не удалены в §6.2 step 5).
2. Удалить stale worktrees: `git worktree prune`.
3. Удалить integration branch, если wave полностью влита в `main`: `git branch -d feature/<topic>`.
4. Если в wave менялись bootstrap/recovery docs (`CLAUDE.md`, worker/orchestrator bootstrap rules), следующий worker spawn делать только из fresh worktree/checkout.

Cleanup не блокирует следующую wave.

## 7. Recovery crossover

Если integration branch разошёлся с `main` или worker branch конфликтует с новым base — действует `recovery.md`.

- RP-2 (branch divergence, worker branch rebase): применимо только к isolated workers.
- RP-6 (in-place scope contamination): применимо к in-place workers в shared checkout.
- RP-8 (parallel worker merge conflict): применимо только к isolated workers в parallel execution.
