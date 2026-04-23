# Итоговый документ по доработке BI-архитектуры

## 1. Цель документа

Этот документ сводит в одно место:

- выводы по текущей BI-архитектуре;
- предложения из предыдущего review;
- рекомендации из `architecture_improvements_backlog.md`;
- итоговую приоритизацию: что делать сейчас, что зафиксировать как триггер, а что оставить на полировку.

Документ задуман как практическое дополнение к `docs/architecture.md` и `docs/bi/architecture.md`, без пересборки уже работающего архитектурного ядра.

---

## 2. Итоговый вердикт

### 2.1. Можно ли развивать архитектуру дальше

Да. Текущую архитектуру можно спокойно развивать и расширять.

У нее уже есть хороший устойчивый фундамент:

- package-first границы;
- thin routes;
- route-first page composition;
- registry-first dataset runtime;
- узкий execution path `Page -> fetchDataset -> /api/datasets/:id -> executeDatasetQuery -> provider.execute`;
- честный read-model контракт через `SelectIr`;
- статическая регистрация вместо runtime plugin model;
- явный migration debt register.

Это означает, что у проекта уже есть **здоровая модульная BI-монолитная архитектура**, а не набор случайных решений.

### 2.2. Главный вывод

Главный следующий шаг — **не переделывать runtime**, а достроить поверх него два слоя:

1. **governance-слой**: lifecycle, ownership, freshness, lineage, versioning;
2. **ops-слой**: observability, budgets, degraded modes, runbooks, rollout/rollback.

Именно там сейчас накапливаются реальные слепые зоны.

---

## 3. Что сохраняем без изменений

Ниже — вещи, которые стоит считать устойчивым ядром и не трогать без очень сильной причины.

### 3.1. Архитектурное ядро BI

Сохраняем как канон:

- route-first UI composition;
- package-first data execution;
- thin SvelteKit routes как BFF-адаптеры;
- один `DatasetRegistryEntry` на dataset;
- flat wire contract через `DatasetQuery.params`;
- `SelectIr` как честный read-model fetch contract;
- provider-owned backend specifics;
- page-local async query state;
- отсутствие global dataset store как дефолта;
- static registration, а не runtime plugin discovery.

### 3.2. Что не надо делать сейчас

Не рекомендую открывать сейчас такие направления:

- переход к микросервисам;
- runtime plugin loading;
- расширение `SelectIr` аналитическими фичами `GROUP BY` / aggregation;
- глобальный store-first BI runtime;
- раннее внедрение сложного query framework по всему приложению;
- перенос семантики upstream DWH внутрь приложения.

Если позже появится необходимость в app-composed analytics, это должен быть **отдельный `AnalyticalIr`**, а не размывание текущего `SelectIr`.

---

## 4. Ключевые проблемы, которые реально стоит закрыть

### 4.1. Документы частично рассинхронизированы с текущим runtime

Сейчас foundation doc и BI doc местами описывают разные версии ментальной модели.

Примеры:

- в `architecture.md` BI path еще описан через `compileDataset -> DatasetIr -> Provider.execute`, хотя BI vertical уже описывает канон через `executeDatasetQuery -> parse -> compile -> provider.execute` и `SelectIr`;
- в package map foundation doc еще использует старую терминологию `planFiltersForDataset`, тогда как BI vertical опирается на `planFiltersForTarget(s)`;
- в BI vertical есть внутреннее несоответствие: в разделе о canonical planning path фигурирует `planFiltersForTarget(s)`, а в guardrails для `fetchDataset()` все еще упоминается `planFiltersForDataset()`.

Это не ломает runtime, но ломает онбординг, code review и архитектурную “истину в одном месте”.

### 4.2. Security / tenancy / access модель не доведена до исполнимой политики

Проблема не в том, что архитектура “небезопасна”, а в том, что в ней есть незакрытый seam:

- `ServerContext.tenantId` уже существует;
- coarse-grained access policy через `requiredScopes` уже предусмотрена;
- `assertDatasetAccess()` пока остается placeholder;
- cache identity уже учитывает `tenantId`, но repo-wide doc не фиксирует tenancy model явно.

Итог: модель безопасности для BI read-side частично задумана, но еще не стала полноценной архитектурной политикой.

### 4.3. Dataset governance пока описан слабее, чем dataset execution

На сегодня хорошо описано, **как dataset исполняется**. Намного слабее описано:

- кто владелец dataset;
- кто владелец upstream source;
- как измеряется freshness;
- как документируется lineage до dashboard/alert;
- как dataset деприкейтится;
- как versioning влияет на consumers.

Именно здесь обычно появляются “живые, но недостоверные” BI-системы.

### 4.4. Недостаточно формализованы resource budgets

Для single-node runtime на 1 vCPU / 1 GB RAM архитектуре нужны явные правила, а не только общая осторожность.

Сейчас у системы уже есть:

- bounded in-process cache;
- provider-owned cache hints;
- polling / refresh model;
- timeout hints;
- один процесс и ограниченная память.

Но не закреплены как policy:

- pool limits;
- cache budgets;
- concurrency budgets;
- max refresh cadence;
- default / max timeout classes;
- page-level query budgets.

### 4.5. Observability есть, но пока как заготовка, а не как operating model

BI doc уже задает полезный минимум telemetry fields (`datasetId`, `provider`, `sourceKind`, `requestId`, timings, `cacheHit`, `cacheAgeMs`, `errorCode`).

Следующий шаг — превратить это в полноценную operational модель:

- trace / metrics / structured logs;
- SLO / alerting thresholds;
- degraded modes;
- runbooks;
- correlation model across layers.

### 4.6. Migration debt нужно продолжать выжигать системно

Наиболее важные долги:

- `looseParams` на большинстве datasets;
- legacy `filterContext` path;
- сохраненный `DatasetQuery.filters` compatibility seam;
- дублирование dataset definitions;
- placeholder-доступ в `assertDatasetAccess()`.

Это нормальные долговые seams для переходного состояния, но их не надо консервировать как “долгосрочную совместимость”.

---

## 5. Итоговая приоритизация рекомендаций

Ниже — уже отфильтрованный список: что реально лучшее и что стоит принять как итоговую программу улучшений.

## 5.1. Делать сейчас (высокий приоритет)

### A1. Синхронизировать архитектурные документы с реальным runtime

**Почему это важно:** это самый дешевый и самый недооцененный способ снизить future drift.

**Что сделать:**

- в `docs/architecture.md` обновить BI vocabulary:
  - `compileDataset -> DatasetIr` заменить на актуальный runtime path;
  - `DatasetIr` в foundation doc либо убрать из канонического BI narrative, либо явно оставить как legacy / internal terminology;
  - `planFiltersForDataset` заменить на текущую planner terminology;
- в `docs/bi/architecture.md` убрать внутреннюю рассинхронизацию между `planFiltersForTarget(s)` и `planFiltersForDataset()`;
- проверить `Verification Hooks`, чтобы в foundation doc не оставались устаревшие счетчики и прошлые baseline-артефакты.

**Статус рекомендации:** принять без споров.

---

### A2. Формально закрепить текущую security / tenancy позицию

**Почему это важно:** tenancy и access policy уже присутствуют в контрактах, но не закреплены как explicit architecture policy.

**Что сделать сейчас:**

- в `architecture.md` явно указать текущую tenancy model:
  - либо `single-tenant today, multi-tenant-aware seams exist`;
  - либо `internal scoped tenancy only`;
- описать, какие измерения обязательно участвуют в cache identity;
- явно зафиксировать, что `hidden: true` — не security boundary;
- закрепить правило: dataset-level access — registry/orchestration, row-level visibility — source/view/provider layer.

**Что сделать в коде в ближайшей очереди:**

- реально включить `entry.access.requiredScopes` в `assertDatasetAccess()`;
- убедиться, что `/api/datasets/:id/schema` использует тот же access gate.

**Статус рекомендации:** принять; часть документирования сделать сразу, часть enforcement — в ближайший рабочий цикл.

---

### A3. Добавить dataset governance metadata и lifecycle policy

**Почему это важно:** сегодня execution model сильнее lifecycle model.

**Что добавить:**

Для каждого важного dataset должны быть определены:

- dataset owner;
- source owner;
- freshness class;
- sensitivity class;
- execution class;
- dashboard / alert consumers;
- deprecation rule.

**Минимальный рекомендуемый shape:**

```ts
type DatasetGovernance = {
  owner: string;
  sourceOwner?: string;
  dashboardOwner?: string;
  sensitivity: 'public-internal' | 'restricted' | 'sensitive';
  freshness: {
    mode: 'realtime' | 'near_realtime' | 'daily' | 'manual';
    targetMs?: number;
    warnAfterMs?: number;
    errorAfterMs?: number;
  };
  executionClass: 'interactive-light' | 'interactive-heavy' | 'background' | 'admin';
};
```

**Статус рекомендации:** принять и продвинуть в near-term, не оставлять “на потом”.

---

### A4. Формализовать observability и SLO baseline

**Почему это важно:** telemetry already exists conceptually; now it needs to become usable for operations.

**Что принять как минимум:**

- общий correlation key: `requestId`, `datasetId`, `provider`, `sourceKind`, при необходимости `tenantId`;
- trace span model: request -> dataset orchestration -> provider/db call;
- базовые metrics:
  - query duration;
  - error rate by dataset / code;
  - cache hit ratio;
  - stale response count;
  - pool waiting / saturation;
- runbook-visible degraded modes;
- минимум SLO для критичных dataset/page:
  - p95 latency;
  - freshness target;
  - error budget.

**Статус рекомендации:** принять и повысить приоритет выше обычной “полировки”.

---

### A5. Ввести явные runtime budgets

**Почему это важно:** текущий deployment model уже жестко constrained, значит budgets должны быть частью архитектуры, а не только “практики”.

**Что формализовать:**

- max memory per provider cache;
- max entries / eviction policy;
- pool size and pool waiting thresholds;
- default and max `timeoutMs` per execution class;
- default and max `limit`;
- max concurrent dataset executions per page/request;
- max allowed polling cadence for real-time pages.

**Статус рекомендации:** принять и продвинуть в near-term.

---

### A6. Продолжить целевой выжиг migration debt

**Почему это важно:** это самый прямой путь к честному и устойчивому контракту.

**Приоритет долгов:**

1. `requiredScopes` enforcement;
2. `looseParams` -> explicit schemas для наиболее критичных datasets;
3. removal of legacy `filterContext` path;
4. removal of `DatasetQuery.filters` from canonical wire contract;
5. cleanup duplicated dataset definitions.

**Статус рекомендации:** принять.

---

### A7. Добавить внешний dependency catalog

**Почему это важно:** сейчас dependency knowledge размазано между docs, env и code.

**Что включить в каталог:**

- Telegram Bot API;
- MapTiler;
- PMTiles CDN;
- WB Prices API;
- Oracle DWH;
- ClickHouse;
- Cube;
- external DWHs `mart_marketplace`, `mart_strategy`.

Для каждого dependency:

- owner;
- auth model;
- failure semantics;
- что ломается при недоступности;
- есть ли degraded mode.

**Статус рекомендации:** принять; это недорогой и очень полезный operational artifact.

---

### A8. Снять противоречие “one process” vs scheduler lock

**Почему это важно:** это именно архитектурное противоречие, а не чисто ops-деталь.

**Рекомендуемая формулировка:**

- система **нормально работает как один deployable process**;
- отдельные компоненты должны быть безопасны к **краткому overlap во время deploy transitions**;
- distributed lock у scheduler нужен не как заявление о полноценной multi-instance architecture, а как защита от overlap / blue-green / restart-window duplication.

Это аккуратно снимает конфликт между runtime principle и фактом существования `scheduler_locks`.

**Статус рекомендации:** принять и исправить прямо в docs.

## 5.2. Делать по триггеру, но зафиксировать уже сейчас

### B1. Полноценная multi-tenant model

Это не обязательно внедрять немедленно, если система по факту остается internal/single-tenant. Но важно **уже сейчас** задокументировать:

- какая модель верна сегодня;
- что именно станет trigger для полноценной tenancy enforcement;
- где проходит row-level boundary;
- какие cache keys обязаны участвовать в visibility isolation.

**Триггеры:**

- второй tenant;
- внешние пользователи;
- реальная scope/role segmentation на BI read-side.

---

### B2. Полноценная multi-instance support policy

Сейчас в ней нет нужды как в durable design target. Но trigger должен быть заранее описан:

- HA;
- scale-out;
- canary / blue-green как штатная практика;
- отдельные background workers.

До этого момента не стоит изображать систему распределенной, если она таковой не является.

---

### B3. Отдельный `AnalyticalIr`

Это не делать заранее.

Нужно открывать только если появятся реальные потребности в app-composed semantics:

- measure/dimension composition;
- dynamic analytical groupings;
- time windows beyond published read models;
- heavy ad-hoc analytics not covered by published views / Cube read models.

До этого момента current read-model contract нужно сохранить честным и узким.

## 5.3. Полезно, но ниже по приоритету

### C1. System summary + TOC + context diagram

Это хорошие и дешевые улучшения для `architecture.md`:

- короткий system summary;
- TOC;
- простой context diagram уровня C4-L1.

Их стоит сделать, но они не важнее governance и ops gaps.

---

### C2. Merge `Verification Hooks` и `Lint Governance`

Очень разумная рекомендация.

Она не меняет архитектуру, но уменьшает cognitive overhead и делает verification policy читабельнее.

---

### C3. Minor accuracy fixes

Тоже стоит принять:

- `business-domain-agnostic` вместо абсолютного `domain-agnostic`;
- добавить file-path references для `assertWriteContext()` и `isSafeIdent()`;
- объяснить, почему alerts subsystem app-local;
- привести concrete naming example;
- добавить trigger для overlay pattern.

Это все небольшие изменения, но они укрепляют документ как рабочий инструмент.

---

### C4. Repo-wide timezone / CI / error taxonomy / secrets policy

Это хорошие repo-wide улучшения, но не первые в очереди именно для BI-архитектуры.

Предлагаю держать их в следующей волне после:

- doc sync;
- access enforcement;
- budgets;
- observability baseline;
- dataset governance metadata.

---

### C5. Frontend architecture subsection

Полезно, но по BI вертикали это уже во многом покрыто page model и route-first guidance.

Поэтому это скорее enhancement для foundation doc, а не критический gap.

---

## 6. Какие backlog-пункты я бы повысил в приоритете

Ниже — важный вывод: не все пункты backlog стоит принимать с исходной приоритизацией.

### Повысить из “полировки” в near-term

Я бы поднял выше исходного уровня:

- **P3.1 Repo-wide observability conventions** -> near-term;
- **P3.3 Performance budgets** -> near-term;
- **P3.4 Contract versioning policy** -> near-term;
- **P2.3 External dependencies catalog** -> near-term.

Причина простая: это уже не косметика, а часть реальной эксплуатационной устойчивости.

### Оставить trigger-driven, но частично задокументировать сразу

- **P1.1 Multi-tenancy model is undeclared** — implementation remains trigger-driven, but current assumption must be documented now.
- **P1.2 Scheduler lock vs one process contradiction** — doc clarification should happen now, not later.

---

## 7. Что именно стоит добавить в документы

## 7.1. Изменения в `docs/architecture.md`

### Обязательно

1. Обновить BI canonical path до текущего runtime.
2. Обновить package map / planner terminology.
3. Зафиксировать current tenancy assumption.
4. Снять противоречие around scheduler lock / one-process deployment.
5. Добавить external dependencies catalog.
6. Объединить `Verification Hooks` и `Lint Governance` в одну таблицу.

### Желательно в той же волне

7. Добавить system summary и context diagram.
8. Добавить TOC.
9. Исправить minor accuracy wording.
10. Добавить краткий repo-wide observability baseline.
11. Добавить contract versioning subsection.

---

## 7.2. Изменения в `docs/bi/architecture.md`

### Обязательно

Добавить новые секции:

1. `Non-Goals`
2. `Dataset Lifecycle and Versioning`
3. `Data Quality, Freshness, and Lineage`
4. `Observability and SLOs`
5. `Performance and Resource Budgets`
6. `Security and Sensitive Data Rules for BI Read-Side`
7. `Release, Migration, and Rollback Policy`
8. `Runbook Index`
9. `New Dataset Checklist`
10. `Architecture Fitness Review`

### Также обновить текущие секции

- синхронизировать planner naming;
- синхронизировать canonical fetch path формулировки;
- зафиксировать cache isolation rule для access-sensitive dimensions;
- связать migration debt с trigger-based removal policy;
- явно задокументировать, что `hidden` не равен security.

---

## 7.3. Нужны ли новые документы-оверлеи

Да, но только там, где секции начинают разрастаться.

Я бы рекомендовал максимум 2 новых overlay docs, не больше:

1. `docs/bi_data_governance_contract.md`
   - ownership;
   - freshness;
   - lineage / exposures;
   - deprecation;
   - dataset checklist.

2. `docs/bi_observability_contract.md`
   - traces / metrics / logs;
   - SLO/SLI;
   - degraded modes;
   - runbook index.

Не надо плодить много документов раньше времени. Сначала — сильный canonical BI doc, затем максимум два практических overlay.

---

## 8. Рекомендуемая программа работ

## 8.1. Ближайшие 1–2 спринта

### Пакет 1. Truth sync + critical seams

- обновить `architecture.md` до актуального BI runtime vocabulary;
- исправить planner terminology drift;
- задокументировать current tenancy assumption;
- снять scheduler contradiction;
- включить `requiredScopes` в `assertDatasetAccess()`;
- выбрать 5–10 наиболее важных datasets и перевести их с `looseParams` на explicit schemas.

### Пакет 2. Governance baseline

- добавить owner / freshness / sensitivity metadata;
- описать dataset lifecycle + versioning rules;
- добавить minimal lineage / exposure mapping для критичных dashboards и alerts.

### Пакет 3. Ops baseline

- утвердить telemetry contract;
- формализовать resource budgets;
- сделать external dependency catalog;
- добавить runbook index.

---

## 8.2. Следующая волна

- timezone policy;
- repo-wide error taxonomy;
- CI / release / promotion section;
- secrets management section;
- frontend architecture subsection;
- полная cleanup-волна по legacy filter compatibility seams.

---

## 8.3. Триггерная волна

Запускать только при реальном trigger:

- full multi-tenant enforcement;
- multi-instance runtime support;
- отдельный `AnalyticalIr`;
- более сложный query manager layer, если page orchestration действительно усложнится.

---

## 9. Лучшие практики, которые действительно стоит перенять

Не все best practices одинаково полезны. Ниже — те, которые реально ложатся на вашу текущую архитектуру.

### 9.1. Document the truth, not the aspiration

Архитектурные docs должны описывать runtime truth, а не “как было бы красиво потом”.

Для вашего проекта это критично, потому что docs у вас уже используются как operating contract, а не как презентация.

### 9.2. Governance metadata belongs next to execution metadata

Если dataset уже имеет `source`, `fields`, `paramsSchema`, `cache`, `execution`, то owner/freshness/sensitivity/versioning нельзя держать где-то “снаружи по памяти”.

### 9.3. Treat stale compatibility seams as temporary debt, not soft forever-support

Очень правильная текущая тенденция — явно называть migration debt. Ее надо продолжать.

### 9.4. Separate read-model fetch from analytical semantics

Это уже сильная сторона вашей архитектуры. Ее нужно сохранить.

### 9.5. Small-box systems need explicit budgets

Если инфраструктура constrained, budgets должны быть архитектурным контрактом.

### 9.6. Access rules must influence cache identity

Это одна из самых частых недооцененных проблем в BI read-sides.

### 9.7. External dependency visibility is part of architecture

Если система зависит от DWH, Telegram, MapTiler, WB API и других runtime integrations, эти зависимости — часть архитектуры, а не просто env vars.

---

## 10. Итоговый shortlist лучших рекомендаций

Если брать только самое сильное и полезное, я бы зафиксировал вот эти 10 пунктов как итоговую программу:

1. Синхронизировать `architecture.md` с текущим BI runtime.
2. Убрать planner terminology drift.
3. Явно задокументировать current tenancy model.
4. Реально включить `requiredScopes` в `assertDatasetAccess()`.
5. Добавить dataset governance metadata: owner, freshness, sensitivity, execution class.
6. Формализовать observability baseline и SLO minimum.
7. Формализовать resource budgets.
8. Сделать external dependencies catalog.
9. Продолжить выжиг `looseParams` и legacy filter seams.
10. Снять противоречие между one-process deployment и scheduler locks.

Это и есть наиболее ценный, сбалансированный и практически применимый набор.

---

## 11. Финальная рекомендация

Архитектура уже хорошая.

Ее **не нужно переделывать**.
Нужно:

- синхронизировать docs с runtime truth;
- закрыть security/access и governance gaps;
- добавить ops-layer и budget policy;
- аккуратно добить migration debt.

То есть правильная стратегия — **эволюционное усиление текущего modular BI monolith**, а не архитектурный разворот.
