# EMIS Structural Migration

Документ для редких задач, где меняется **структура кода**, а не поведение продукта.  
Использовать только если задача реально про extraction, package boundaries, aliases или import directions.

## 1. Topology decision

Текущий target-state:

- один deployable `SvelteKit` app;
- monorepo-friendly структура;
- reusable domain/platform code — в `packages/*`;
- route composition и app glue — в `apps/web`.

Big-bang split на отдельный EMIS runtime не является текущим default.

## 2. Target layout

```text
dashboard-builder/
├── apps/
│   └── web/
│       ├── src/routes/
│       ├── src/lib/
│       └── static/
├── packages/
│   ├── platform-core/
│   ├── platform-ui/
│   ├── platform-datasets/
│   ├── platform-filters/
│   ├── db/
│   ├── emis-contracts/
│   ├── emis-server/
│   ├── emis-ui/
│   ├── bi-alerts/       # only if reuse pressure justifies
│   └── bi-dashboards/   # only if reuse pressure justifies
└── db/
```

## 3. Current zones -> target homes

### EMIS-specific

| Current zone | Target home | Notes |
|---|---|---|
| `packages/emis-contracts/*` | `packages/emis-contracts/` | shared DTOs and schemas |
| `apps/web/src/lib/server/emis/*` | `packages/emis-server/` except app-owned HTTP glue | `infra/http.ts` stays app-owned |
| `packages/emis-ui/*` | `packages/emis-ui/` | reusable EMIS UI |
| `apps/web/src/lib/emis-manual-entry/*` | stays in `apps/web` | depends on `$app/forms` |
| route-local drawers/panels | stays in `apps/web` | route composition, not reusable package code |

### Platform / BI-specific

| Current zone | Target home |
|---|---|
| dataset definitions / providers | `packages/platform-datasets/` |
| db pool factory | `packages/db/` |
| filter contracts/store | `packages/platform-filters/` |
| generic UI primitives | `packages/platform-ui/` |

## 4. Import direction rules

### Dependency graph

```text
apps/web
  -> imports from platform-*, emis-*, bi-*, db

emis-ui
  -> platform-ui, platform-core, platform-filters, emis-contracts

emis-server
  -> platform-core, platform-datasets, db, emis-contracts

emis-contracts
  -> platform-core (types-only)

bi-*
  -> platform-* and db
```

### Non-negotiable boundaries

- `platform-*` не импортирует `emis-*` или `bi-*`;
- `emis-*` не импортирует `bi-*`;
- `bi-*` не импортирует `emis-*`;
- `emis-server` не импортирует `emis-ui`;
- никто не импортирует `apps/web`;
- `emis-contracts` — shared foundation для EMIS domain.

## 5. Alias policy

### Active alias

```text
$lib -> apps/web/src/lib
```

### Rules

1. App-local code в `apps/web` использует `$lib/*`.
2. Code inside `packages/*` не использует app aliases.
3. Удалённые aliases (`$shared`, `$entities`, `$features`, `$widgets`) не возвращаются.
4. Новые “временные” aliases для migration не создаются.

## 6. Migration policy

### Core principles

- no big-bang move;
- один structural slice — один понятный boundary move;
- runtime behavior сохраняется до и после move;
- docs едут вместе с кодом;
- compatibility shims временные.

### Compatibility shims

Во время migration допускаются:

- re-export из старого пути в новый;
- временная двойная регистрация dataset definitions.

Каждый shim должен:

- быть помечен как migration-only;
- иметь owner;
- иметь condition удаления;
- удаляться в завершающем slice.

### Что нельзя делать

- прятать domain rewrite под видом structural move;
- менять API contract одновременно с extraction, если это можно разделить;
- создавать “god package”;
- закреплять новый canonical home через временный shim.

## 7. Structural verification

Минимум для structural slice:

```bash
pnpm lint:boundaries
pnpm check
pnpm build
```

`pnpm lint` сам по себе не является заменой boundary verification.

## 8. Когда не открывать structural migration

Не открывать structural change только ради “красивой” схемы, если:

- reuse pressure не доказан;
- текущий home уже bounded и понятен;
- задача на самом деле про runtime behavior;
- выигрыш только эстетический.

## 9. Related sources

- `architecture.md` — current-state architecture;
- `change_policy.md` — review triggers и delivery rules;
- repo-wide `docs/architecture.md` — общая архитектурная рамка.
