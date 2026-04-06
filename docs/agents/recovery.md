# Recovery Protocols

Canonical failure-path protocol для агентной команды.

`workflow.md` описывает normal execution loop.
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

> Worker branch conflict и rebase rules (шаги 5-6) применимы только к subagent workers с отдельными ветками. Teammate workers разделяют checkout с lead-tactical и не имеют отдельных веток.

Примеры:

- `main` ушёл вперёд;
- rebase вызывает конфликты;
- active subagent workers уже отданы на старый base.

Действия:

1. Заморозить запуск новых workers до фикса branch state.
2. Объявить текущий `feature/<topic>` canonical integration branch для волны восстановления.
3. По умолчанию предпочесть `merge main -> feature/<topic>`, а не history rewrite, если work уже in progress.
4. Разрешить конфликты только в integration branch под owner'ом `lead-tactical`.
5. Не заставлять существующих workers самостоятельно rebasing-ить свои ветки поверх нового состояния.
6. Если worker handoff ещё не влит и теперь конфликтует:
   - либо merge/replay делает `lead-tactical`;
   - либо создаётся новый worker от обновлённого integration branch с узкой задачей conflict resolution.
7. После восстановления branch state:
   - обновить memory;
   - заново прогнать canonical checks (`pnpm check`, `pnpm build`, `pnpm lint:boundaries`);
   - при необходимости повторить integration review.

Практическое правило:

- mid-wave merge предпочтительнее rebase;
- rebase допустим только когда нет active worker handoffs и нет риска потерять review context.

## RP-3. Codex / GPT-5.4 unavailable mid-iterative cycle

Примеры:

- strategic review недоступен;
- `--resume` временно не работает;
- iterative loop уже дошёл до slice `N`.

Действия:

1. Не терять текущий tactical state:
   - сразу обновить `lead-tactical/memory.md`;
   - если есть свежие strategic decisions в контексте, сделать backfill в `lead-strategic/memory.md`.
2. Довести до конца только уже начатый локальный slice, если одновременно верно:
   - acceptance для него уже понятен;
   - не нужен new exception/waiver;
   - не нужен semantic reframe plan;
   - нет unresolved `CRITICAL`.
3. Не стартовать следующий dependent slice без strategic owner, если нужен reframe или acceptance спорный.
4. Подготовить один из recovery outputs:
   - draft `Plan Change Request`;
   - `last_report.md` со статусом `частично` / `blocked`;
   - список открытых вопросов для strategic review.
5. Переключиться на fallback/manual strategic path, если он доступен.
6. После возвращения Codex/GPT продолжить с `--resume`, если thread жив, иначе с `--fresh` + актуальные `memory.md`.

Жёсткое правило:

- отсутствие strategic tooling не даёт `lead-tactical` права молча менять canonical plan.

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

## RP-6. Teammate загрязнил integration branch за пределами scope

Примеры:

- teammate закоммитил файлы вне owned scope из handoff;
- teammate случайно изменил файлы lead-tactical или другого slice.

Действия (все выполняет lead-tactical, не teammate):

1. Lead-tactical делает triage внутри integration branch (не discard/recreate).
2. Определить: какие коммиты вне scope, какие в scope.
3. Если вне-scope изменения безвредны — lead-tactical делает targeted revert конкретных коммитов или hunks.
4. Если вне-scope изменения конфликтуют с другой работой — lead-tactical эскалирует к пользователю.
5. Lead-tactical фиксирует в memory и report: что загрязнено, как восстановлено.

Recovery ownership: lead-tactical, не teammate.
Teammate не делает revert самостоятельно — это может усугубить scope contamination.

Жёсткое правило:

- Recovery идёт через targeted revert/fix в integration branch, не через branch discard/recreate (это уничтожит работу lead-tactical и других workers).
