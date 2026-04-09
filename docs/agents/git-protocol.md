# Git Protocol

Canonical branch, worktree и integration protocol для агентной команды.

`workflow.md` описывает execution loop.
Этот документ фиксирует git ownership и integration choreography.

## 1. Ветки

В проекте используются два типа feature-веток:

- `main` — integration baseline
- `feature/<topic>` — integration branch, координируется `lead-tactical`
- `agent/worker/<task-slug>` — worker branch, только для subagent mode (§3.2)

Правила:

- **Teammate mode (default):** worker коммитит напрямую в `feature/<topic>` в рамках assigned scope из handoff. Lead-tactical координирует branch, acceptance и merge choreography. Teammate не коммитит файлы вне owned scope.
- **Subagent mode (isolated):** worker коммитит в `agent/worker/<task-slug>`, lead-tactical мержит в `feature/<topic>` после handoff.
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

### 3.1. Teammate mode (default)

- Worker работает в том же checkout, что и lead-tactical.
- Отдельный worktree не создаётся.
- Основной checkout принадлежит lead-tactical; teammate коммитит только в рамках assigned scope.
- Не смешивать две задачи в одной сессии.

### 3.2. Subagent mode (isolated)

- Один worktree = один subagent.
- Не переиспользовать чужой worktree.
- Не смешивать две задачи в одной ветке.
- Subagent worktree создаётся через Agent tool с `isolation: "worktree"`.

## 4. Trigger criteria для subagent mode

Переключение на subagent mode обязательно, если верно **хотя бы одно**:

1. 2+ workers запускаются одновременно;
2. ожидаются независимые коммиты до интеграции;
3. нужен diff-isolated review/handoff (отдельный `git diff` для worker branch);
4. есть риск scope collision между worker и lead-tactical или другим worker;
5. long-running worker, который не должен загрязнять checkout lead-tactical.

Если ни один trigger не сработал → teammate mode.

## 5. Bootstrap перед запуском worker

### 5.1. Teammate mode

`lead-tactical` перед handoff обязан:

1. Проверить, что находится в правильной integration branch `feature/<topic>`.
2. Передать worker'у:
   - integration branch;
   - base commit;
   - owned files (что worker может трогать);
   - out-of-scope files (что worker не должен трогать).
3. Не запускать dependent worker task, если предыдущий обязательный slice ещё не закоммичен.

### 5.2. Subagent mode

`lead-tactical` перед handoff обязан:

1. Проверить, что находится в правильной integration branch `feature/<topic>`.
2. Подготовить:
   - worker branch `agent/worker/<task-slug>`;
   - отдельный worktree (через Agent tool с `isolation: "worktree"`);
   - base checkpoint / commit.
3. Передать worker'у:
   - integration branch;
   - worker branch;
   - base commit;
   - owned files;
   - out-of-scope files.
4. Не запускать dependent worker task, если предыдущий обязательный slice ещё не влит в integration branch.

## 6. Branch integration и Review Gate

### 6.1. Teammate mode

```text
1. Worker реализует slice в feature/<topic> (только owned files)
2. Worker коммитит и сдаёт handoff
3. Lead-tactical проверяет scope: коммиты worker'а не вышли за owned files
4. Lead-tactical запускает integration review, если он нужен
```

### 6.2. Subagent mode

```text
1. Worker реализует slice в agent/worker/<slug>
2. Worker коммитит и сдаёт handoff
3. Lead-tactical проверяет scope, checks evidence и review disposition
4. Lead-tactical мержит worker branch в feature/<topic>
5. После интеграции запускается integration review, если он нужен
```

Ключевые правила (оба режима):

- integration Review Gate всегда идёт по integration branch, а не по worker branch;
- если несколько workers, все merge идут в один `feature/<topic>`;
- dependent slices стартуют только от актуального состояния integration branch.

## 7. Merge policy during stabilization waves

- не смешивать structural cleanup и product feature в одном slice;
- новый exception нельзя вводить без owner и expiry;
- новый architecture exception или long-lived complexity waiver требует `architecture pass` decision и записи в registry до merge;
- рост oversized files требует extraction или явного waiver в report;
- `baseline pass` может заблокировать merge large feature slice, если baseline status остаётся `Red`.

## 8. Recovery crossover

Если integration branch разошёлся с `main` или worker branch конфликтует с новым base, действует `docs/agents/recovery.md`.

- RP-2 (branch divergence, worker branch rebase): применимо только к subagent workers с отдельными ветками.
- RP-6 (teammate scope contamination): применимо к teammate workers в shared checkout.
