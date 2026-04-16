# Git Protocol

Canonical branch, worktree и integration protocol для агентной команды.

`workflow.md` описывает execution loop и review model.
Этот документ фиксирует git ownership и integration choreography.

## 1. Ветки

В проекте используются три рабочие ветки:

- `main` — integration baseline
- `feature/<topic>` — integration branch, координируется `orchestrator`
- `agent/worker/<task-slug>` — worker branch, только для subagent mode (§3.1)

Правила:

- **Subagent mode (default for code-writing):** worker коммитит в `agent/worker/<task-slug>`, `orchestrator` координирует merge в `feature/<topic>` после handoff. Если merge требует code edits, делай это через dedicated merge/fix-worker.
- **Teammate mode (shared-checkout exception):** worker коммитит напрямую в `feature/<topic>` только для docs-only, read-only или governance-closeout slices без product code. Teammate не коммитит файлы вне owned scope.
- canonical diff для integration review — `git diff main..feature/<topic>`.

## 2. Коммиты и checkpoints

- checkpoint commit делается после каждого законченного смыслового этапа;
- commit messages — осмысленные, на английском;
- `.env`, credentials и scratch files не коммитятся.

Минимальный ритм checkpoint-коммитов (пример для domain feature):

- docs / architecture alignment
- DB foundation
- server write/query slice
- первый рабочий route/workspace
- интеграция с BI/read-models (если применимо)

## 3. Worktrees

### 3.1. Subagent mode (default for code-writing)

- Один worktree = один worker.
- Worker коммитит только в `agent/worker/<task-slug>`.
- `orchestrator` интегрирует результат обратно в `feature/<topic>`.
- Не переиспользовать чужой worktree.
- Не смешивать две задачи в одной ветке.
- Worktree-local bootstrap files are snapshot-based: свежесозданный worker worktree наследует текущий repo-root `CLAUDE.md` на момент spawn.
- Если root bootstrap/recovery docs materially изменились, старые worktrees считаются stale bootstrap surface и не переиспользуются для новых worker tasks.

### 3.2. Teammate mode (shared-checkout exception)

- Worker работает в том же checkout, что и `orchestrator`.
- Отдельный worktree не создаётся.
- Основной checkout принадлежит `orchestrator`; teammate коммитит только в рамках assigned scope.
- Teammate mode не используется для code-writing slices по умолчанию.

## 4. Когда teammate mode разрешён

Teammate mode разрешён только если одновременно верно всё ниже:

1. slice не пишет product code;
2. задача docs-only, read-only investigation или governance-closeout;
3. не нужен diff-isolated review/handoff;
4. нет parallel code-writing workers;
5. нет заметного риска scope collision между worker и `orchestrator` или другим worker.

Если хотя бы одно условие не выполнено → subagent mode обязателен.

Жёсткое правило для parallel execution:

- если одновременно запускаются `2+` workers, все они идут через isolated `subagent + worktree`;
- shared-checkout teammate mode в parallel execution не используется, даже для docs-only slices;
- причина проста: у parallel режима приоритет у diff isolation и deterministic ownership, а не у pane convenience.

## 5. Bootstrap перед запуском worker

### 5.1. Subagent mode (default for code-writing)

`orchestrator` перед handoff обязан:

1. Проверить, что находится в правильной integration branch `feature/<topic>`.
2. Подготовить:
   - worker branch `agent/worker/<task-slug>`;
   - отдельный worktree (через Agent tool с `isolation: "worktree"`);
   - base checkpoint / commit.
   - fresh bootstrap surface: не использовать старый worktree, если root `CLAUDE.md` или role bootstrap rules менялись после его создания.
3. Передать worker'у:
   - integration branch;
   - worker branch;
   - base commit;
   - owned files (что worker может трогать);
   - out-of-scope files (что worker не должен трогать).
4. Не запускать dependent worker task, если предыдущий обязательный slice ещё не влит в integration branch.

### 5.2. Teammate mode (shared-checkout exception)

`orchestrator` перед handoff обязан:

1. Проверить, что находится в правильной integration branch `feature/<topic>`.
2. Явно зафиксировать, почему teammate mode допустим по §4.
3. Передать worker'у:
   - integration branch;
   - base commit;
   - owned files;
   - out-of-scope files.
4. Не запускать dependent worker task, если предыдущий обязательный slice ещё не влит в integration branch.

## 6. Branch Integration

### 6.1. Subagent mode (default)

```text
1. Worker реализует slice в agent/worker/<slug>
2. Worker коммитит и сдаёт handoff
3. orchestrator проверяет scope, checks evidence и review disposition
4. orchestrator мержит worker branch в feature/<topic> или создаёт merge/fix-worker, если merge требует code edits
5. orchestrator удаляет worker branch: git branch -d agent/worker/<slug>
6. После интеграции запускается integration review по правилам workflow.md §3.3
```

### 6.2. Teammate mode (shared-checkout exception)

```text
1. Worker реализует non-code slice в feature/<topic> (только owned files)
2. Worker коммитит и сдаёт handoff
3. orchestrator проверяет scope по manifest/commit ownership: коммиты worker'а не вышли за owned files
4. orchestrator запускается integration review по правилам workflow.md §3.3
```

Ключевые правила (оба режима):

- integration review всегда идёт по integration branch, а не по worker branch;
- если несколько workers, все merge идут в один `feature/<topic>`;
- dependent slices стартуют только от актуального состояния integration branch.

### 6.3. Cleanup после завершения wave / plan

После merge `feature/<topic>` в `main` (или после завершения wave) `orchestrator` выполняет cleanup:

1. Удалить оставшиеся worker branches: `git branch -d agent/worker/*` (если не удалены в §6.1 step 5).
2. Удалить stale worktrees: `git worktree prune`.
3. Удалить integration branch, если wave полностью влита в `main`: `git branch -d feature/<topic>`.
4. Если в wave менялись bootstrap/recovery docs (`CLAUDE.md`, worker/orchestrator bootstrap rules), следующий worker spawn делать только из fresh worktree, а не из сохранённого старого checkout.

Cleanup не блокирует следующую wave — это housekeeping step после успешного merge.

## 7. Recovery crossover

Если integration branch разошёлся с `main` или worker branch конфликтует с новым base, действует `recovery.md`.

- RP-2 (branch divergence, worker branch rebase): применимо только к subagent workers с отдельными ветками.
- RP-6 (teammate scope contamination): применимо к teammate workers в shared checkout.
