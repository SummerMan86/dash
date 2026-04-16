# Recovery Protocols

Canonical failure-path protocol для агентной команды.

`workflow.md` описывает normal execution loop, review model и governance.
Этот документ описывает, что делать, когда happy path уже нарушен.

Общее правило recovery:

- сначала фиксируй truthful state;
- потом восстанавливай execution flow;
- recovery не должен стирать следы проблемы молча.

## RP-1. Irreversible side effect before REJECT

Примеры:

- worker применил DB change в локальной или shared среде;
- изменил внешнее состояние, которое не откатывается обычным `git revert`;
- после этого slice получил `REJECT`.

Действия:

1. Немедленно остановить следующий dependent work по этому slice.
2. Зафиксировать side effect:
   - что именно применено;
   - где применено;
   - какой командой;
   - reversible ли это;
   - затронута ли только disposable local env или shared/dev environment.
3. Не пытаться скрыть проблему через force-push, silent reset среды или переписывание report.
4. Если среда disposable и есть approved recreate/reset routine:
   - восстановить её только явным recovery шагом;
   - затем заново прогнать минимальные checks для подтверждения clean state.
5. Если среда shared или side effect неочевидно обратим:
   - эскалировать пользователю;
   - подготовить compensating change, delta patch или rollback plan вместо ad hoc ручного отката.
6. В report и memory зафиксировать outcome:
   - `recovered locally`;
   - `compensating patch required`;
   - `user decision required`.

Жёсткие правила:

- destructive recovery требует явного user approval;
- для DB truth нельзя притворяться, что applied change "не было";
- если side effect пережил rejected slice, следующий slice не стартует, пока состояние снова не truthful.

## RP-2. Integration branch diverged from `main`

> Worker branch conflict и rebase rules (шаги 5-6) применимы к default subagent workers с отдельными ветками. Teammate workers — exception path в shared checkout и не имеют отдельных веток.

Примеры:

- `main` ушёл вперёд;
- rebase вызывает конфликты;
- active subagent workers уже отданы на старый base.

Действия:

1. Заморозить запуск новых workers до фикса branch state.
2. Объявить текущий `feature/<topic>` canonical integration branch для волны восстановления.
3. По умолчанию предпочесть `merge main -> feature/<topic>`, а не history rewrite, если work уже in progress.
4. Разрешить конфликты только в integration branch под orchestration owner'ом `orchestrator`.
5. Не заставлять существующих workers самостоятельно rebasing-ить свои ветки поверх нового состояния.
6. Если worker handoff ещё не влит и теперь конфликтует:
   - либо создаётся dedicated merge/fix-worker для merge/replay от обновлённого integration branch;
   - либо создаётся новый worker от обновлённого integration branch с узкой задачей conflict resolution.
7. После восстановления branch state:
   - обновить memory;
   - заново прогнать canonical checks (`pnpm check`, `pnpm build`, `pnpm lint:boundaries`);
   - при необходимости повторить integration review (`workflow.md` §3.3).

Практическое правило:

- mid-wave merge предпочтительнее rebase;
- rebase допустим только когда нет active worker handoffs и нет риска потерять review context.

## RP-3. Codex / lead-strategic runtime unavailable mid-iterative cycle

Примеры:

- strategic review недоступен;
- `--resume` временно не работает;
- iterative loop уже дошёл до slice `N`.

Действия:

1. Не терять текущий orchestration state:
   - сразу обновить `docs/agents/orchestrator/memory.md`;
   - если есть свежие strategic decisions в контексте, сделать backfill в `lead-strategic/memory.md`.
2. Включить degraded mode только если одновременно верно:
   - acceptance для него уже понятен;
   - не нужен new exception/waiver;
   - не нужен semantic reframe plan;
   - нет unresolved `CRITICAL`.
3. Довести до конца только уже начатый локальный slice и принять его по обычным правилам evidence/review.
4. После этого разрешено продолжить только следующий **независимый** slice из уже зафиксированного canonical plan:
   - `orchestrator` может принять текущий slice и пойти дальше без strategic review;
   - `orchestrator` не может re-sequence, re-scope или skip slices;
   - любой dependent slice остаётся заблокирован до возврата `lead-strategic`.
5. Каждое degraded-mode решение логируется в `docs/agents/orchestrator/decision-log.md`:
   - какой slice принят;
   - почему он считался independent;
   - почему continuation без strategic review допустим;
   - на каком slice execution обязан остановиться.
6. Threshold для user notification:
   - после `2` принятых slices без strategic review `orchestrator` обязан остановиться и уведомить пользователя;
   - продолжать третьим slice без user-visible pause нельзя.
7. Подготовить один из recovery outputs:
   - draft `Plan Change Request`;
   - `last_report.md` со статусом `частично` / `blocked`;
   - список открытых вопросов для strategic review.
8. Переключиться на fallback/manual strategic path, если он доступен.
9. После возвращения Codex продолжить с `--resume`, если thread жив, иначе с `--fresh` + актуальные `memory.md`.
10. Перед wave closure degraded mode должен быть закрыт полным strategic review:
    - без этого wave не закрывается;
    - финальный merge-ready verdict не выносится.

Жёсткое правило:

- отсутствие strategic tooling не даёт `orchestrator` права молча менять canonical plan.

## RP-4. Earlier accepted slice breaks during integration review

Примеры:

- slice-level review был green;
- integration review нашёл cross-slice conflict, architecture drift или auth/data-flow regression.

Действия:

1. Считать integration verdict приоритетнее slice-level acceptance.
2. Не переписывать историю так, будто earlier slice "никогда не был принят".
3. Зафиксировать, какой именно combination slices дал regression.
4. Выбрать bounded recovery path:
   - fix in place в integration branch;
   - новый worker на conflict-resolution slice;
   - `Plan Change Request`, если проблема означает semantic gap в плане.
5. После фикса повторить тот review/check set, который подтверждает устранение regression, плюс integration review при затронутом cross-slice behavior.

Практическое правило:

- slice acceptance локален;
- integration review может переоткрыть уже принятый slice, если сломалась система целиком.

## RP-5. Repeated slice rejection / re-review loop

Примеры:

- slice получил 3+ rejection или `needs follow-up` verdict подряд;
- iterative reframe loop не сходится: каждый fix порождает новый finding.

Действия:

1. Остановить текущий slice execution после третьего цикла.
2. Эскалировать к пользователю с:
   - что именно не проходит review;
   - какие findings повторяются;
   - что уже пробовали исправить.
3. Не начинать 4-й цикл исправлений без пользовательского решения.
4. Варианты recovery:
   - пользователь принимает текущий state с known limitation;
   - пользователь переформулирует scope;
   - пользователь решает отменить slice.

Жёсткое правило:

- 3 rejection cycles на один slice — автоматическая эскалация к пользователю.

## RP-6. Teammate exception загрязнил integration branch за пределами scope

Примеры:

- teammate закоммитил файлы вне owned scope из handoff;
- teammate случайно изменил файлы `orchestrator` scope или другого slice.

Действия (ownership у `orchestrator`; code changes делает cleanup-worker, а не teammate):

1. `orchestrator` делает triage внутри integration branch (не discard/recreate).
2. Определить: какие коммиты вне scope, какие в scope.
3. Если вне-scope изменения безвредны — `orchestrator` создаёт cleanup-worker на targeted revert/fix конкретных коммитов или hunks.
4. Если вне-scope изменения конфликтуют с другой работой — `orchestrator` эскалирует к пользователю или создаёт bounded conflict-resolution worker.
5. `orchestrator` фиксирует в memory и report: что загрязнено, как восстановлено.

Recovery ownership: `orchestrator`, не teammate.
Teammate не делает revert самостоятельно — это может усугубить scope contamination.

Жёсткое правило:

- Recovery идёт через targeted revert/fix в integration branch, не через branch discard/recreate (это уничтожит работу `orchestrator` и других workers).

## RP-7. Worker crash / death mid-slice

Примеры:

- worker context overflow (контекстное окно исчерпано);
- process kill, timeout, network disconnect;
- worktree осталась в partial state с незакоммиченными изменениями.

Действия:

1. Не пытаться "продолжить" упавший worker; всегда создавать нового.
2. Проверить state worker branch:
   - есть ли коммиты;
   - консистентен ли partial state (checks passable или нет).
3. Если worker оставил осмысленные коммиты и state консистентен:
   - создать нового worker на тот же slice;
   - передать carry-forward context из partial branch: коммиты, diff summary, что было сделано и что осталось;
   - новый worker продолжает от partial state, а не с нуля.
4. Если worker не оставил коммитов или state неконсистентный:
   - чистый retry: новый worker от того же base commit;
   - partial worktree можно удалить.
5. Если slice дважды крашит worker'а:
   - эскалировать к пользователю;
   - вероятная причина: slice слишком большой для одного worker'а и нужна дальнейшая декомпозиция.
6. В memory и report зафиксировать: какой worker упал, на каком этапе, сколько retry потребовалось.

Жёсткое правило:

- retry на один slice ограничен двумя попытками; после второго crash — автоматическая эскалация к пользователю.

## RP-8. Merge conflict between parallel worker branches

Примеры:

- два parallel isolated worker'а оба succeeded;
- при merge их веток в integration branch возник конфликт (оба добавили export в один index file, оба тронули shared type и т.д.).

Действия:

1. Merge первый worker branch, который был принят раньше (или по порядку в плане, если приняты одновременно).
2. Для второго worker branch создать conflict-resolution worker от обновлённого integration branch с задачей:
   - replay / merge второй worker branch;
   - разрешить конфликты;
   - прогнать canonical checks;
   - вернуть handoff.
3. Если конфликт чисто текстовый (merge markers) — conflict-resolution worker резолвит и возвращает handoff.
4. Если конфликт semantic (несовместимые design decisions, overlapping logic) — `orchestrator` запрашивает re-review на integrated diff и при необходимости эскалирует к `lead-strategic`.
5. В report зафиксировать: какие branches конфликтовали, как resolved, потребовался ли re-review.

Жёсткое правило:

- оригинальные worker'ы не делают rebase/merge сами; conflict resolution — отдельный bounded worker или `orchestrator` scope (если подпадает под `direct-fix`).
