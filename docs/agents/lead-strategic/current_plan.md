# Plan: Generalize Agent Workflow for Multi-Domain Use

## Цель

Сделать `docs/agents/*` domain-agnostic для работы не только с EMIS, но и с Oracle, CubeJS и будущими контурами, вынеся domain-specific rules в overlays и сохранив текущий workflow полностью рабочим для EMIS. Operating mode для этой wave: `ordinary iterative` — низкий риск, docs-only, но с поэтапным reframe из-за плотных ссылок между canonical docs.

## Подзадачи

### ST-1: Вынести domain-specific invariants в overlays

- scope: `docs/agents/invariants.md`, новые overlay docs для active domains (`docs/agents/invariants-emis.md`, при необходимости `docs/agents/invariants-platform.md`), `docs/AGENTS.md`
- depends on: —
- размер: M
- acceptance: `docs/agents/invariants.md` содержит только generic workflow/repo guardrails и правило подключения overlays; EMIS-specific package/path/BI rules вынесены в явный overlay; у каждого перенесённого правила остаётся ровно один canonical home; навигация до EMIS overlay доступна из generic doc за один шаг
- verification intent: проверить, что generic invariants можно применять к новому домену без правки core doc, а EMIS rules не теряются и остаются discoverable
- verification mode: `verification-first`
- заметки: делать extraction additively; сначала завести overlay, потом чистить core doc

### ST-2: Обобщить core workflow и role instructions

- scope: `docs/agents/workflow.md`, `docs/agents/lead-strategic/instructions.md`, `docs/agents/lead-tactical/instructions.md`, `docs/agents/roles.md`
- depends on: ST-1
- размер: M
- acceptance: lifecycle, ownership, operating modes и report loop не меняются; role docs больше не требуют EMIS docs как default context для любой задачи; generic instructions ссылаются на relevant domain overlay / local `AGENTS.md` / contour bootstrap вместо hardcoded EMIS bootstrap
- verification intent: проверить, что `lead-strategic` и `lead-tactical` могут отработать одну и ту же процедуру для EMIS, Oracle или CubeJS без скрытых EMIS-only предпосылок
- verification mode: `verification-first`
- заметки: оставить все механизмы без semantic rewrite; менять только default framing и ссылки

### ST-3: Обобщить шаблоны и review/governance interfaces

- scope: `docs/agents/templates.md`, `docs/agents/review-gate.md`, `docs/agents/git-protocol.md`
- depends on: ST-1, ST-2
- размер: M
- acceptance: templates больше не хардкодят `server/emis` и EMIS-only contour labels; architecture/review placeholders становятся domain-neutral или явно marked as examples; EMIS-specific checkpoint rhythm в git protocol заменён на generic/example framing; форма plan/handoff/report остаётся backward-compatible
- verification intent: проверить, что canonical templates можно заполнить без переписывания под новый домен, а текущие EMIS waves по-прежнему проходят по тем же шаблонам
- verification mode: `verification-first`
- заметки: не менять section structure и обязательные поля шаблонов

### ST-4: Вычистить governance helper docs от EMIS-default assumptions

- scope: `docs/agents/architecture-steward/instructions.md`, `docs/agents/baseline-governor/instructions.md`, `docs/agents/architecture-reviewer/instructions.md`, связанные ссылки на exceptions registry / baseline routine в touched docs
- depends on: ST-1, ST-2, ST-3
- размер: M
- acceptance: governance/helper docs больше не навязывают EMIS package homes, EMIS-only baseline checks и `docs/emis_known_exceptions.md` как universal default; generic wording опирается на overlay-owned boundaries, baseline routine и exceptions registry; EMIS-specific governance checks остаются доступными через EMIS overlay/reference path
- verification intent: проверить, что architecture pass, baseline pass и architecture-reviewer могут корректно оценивать любой домен при поданном overlay context, не ломая текущий EMIS governance trail
- verification mode: `verification-first`
- заметки: если глобальный rename registry создаёт лишний blast radius, rename не делать; достаточно перевести core docs на overlay indirection и оставить `docs/emis_known_exceptions.md` как EMIS-specific artifact

### ST-5: Финальный navigation и consistency pass

- scope: `docs/AGENTS.md` и все изменённые docs из ST-1..ST-4
- depends on: ST-1, ST-2, ST-3, ST-4
- размер: S
- acceptance: doc map явно разделяет generic agent model и domain overlays; все ссылки консистентны; EMIS remains first-class supported overlay; добавление будущего `invariants-oracle.md` или `invariants-cubejs.md` не требует нового переписывания core workflow docs
- verification intent: проверить, что новый читатель может пройти маршрут "generic workflow -> relevant domain overlay" без неоднозначности и broken references
- verification mode: `verification-first`
- заметки: это doc consistency slice, без расширения scope в code/runtime

## Ограничения

- Это только docs/process refactor; code, packages, routes, runtime contracts и execution paths не меняются
- Не ломать действующий agent workflow для EMIS во время и после refactor
- Держать refactor минимальным: extraction и genericization ссылок, а не переписывание всей системы документации
- Не трогать already-clean docs: `docs/agents/skills/debugging.md`, `docs/agents/skills/testing-strategy.md`, `docs/agents/memory-protocol.md`
- Не менять canonical ownership артефактов: `current_plan.md`, `last_report.md`, `memory.md`, report types, role names, operating modes
- Не удалять EMIS-specific правила без явного нового canonical home в overlay docs
- Предпочитать overlay indirection и additive docs над массовыми rename/move, если rename не даёт явной пользы

## Per-slice integrity checklist

После каждого slice worker и reviewer проверяют:

1. **Принципы не потеряны**: core lifecycle (plan → execute → review → accept), role ownership (strategic/tactical/worker/reviewers), Review Gate (slice + integration), governance passes (architecture/baseline) — всё на месте и не размыто
2. **Сложность не выросла**: количество обязательных файлов для старта работы не увеличилось; новый overlay — это дополнение, а не ещё один обязательный шаг
3. **Навигация из AGENTS.md**: каждый новый или перемещённый doc имеет строку в `docs/AGENTS.md`; читатель может найти любой doc за один шаг из doc map
4. **Нет broken references**: все ссылки из изменённых docs ведут на существующие файлы; grep `invariants.md`, `emis_session_bootstrap`, `emis_known_exceptions` и т.д. не выдаёт dangling links
5. **EMIS не сломан**: текущий EMIS workflow можно пройти по overlay path так же, как раньше — по прямым ссылкам; EMIS-specific rules не потеряны и не задублированы
6. **Нет запутанности**: generic doc не содержит domain-specific правил (кроме явных `example:` блоков); overlay не содержит generic workflow rules
7. **Backward compatibility**: формат plan/handoff/report/review request не сломан; старые артефакты (reports, plans) остаются валидными

Если любой пункт нарушен — это `WARNING` при review, и slice не принимается без fix.

## Ожидаемый результат

- `docs/agents/*` описывают generic agent workflow, применимый к любому домену в этом repo
- Domain-specific rules живут в отдельных overlays, начиная с EMIS, и подключаются из generic docs без hardcoded default domain
- EMIS workflow остаётся полностью рабочим и discoverable через explicit overlay path
- Для Oracle, CubeJS и будущих контуров появляется понятный extension path: добавить overlay docs, не переписывая core workflow
