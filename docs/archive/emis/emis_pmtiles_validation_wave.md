# EMIS PMTiles Validation Wave

Архивная заметка о завершённой validation wave.
Текущий operational context смотреть в [EMIS Session Bootstrap](../../emis_session_bootstrap.md) и `../../emis_offline_maps_ops.md`.

Этот документ сохранён как краткая заметка о завершённой validation wave.

## 1. Итог

PMTiles validation wave пройдена:

- `Range` / `206 Partial Content` подтверждены;
- browser smoke для `MapLibre + pmtiles.Protocol` подтверждён;
- локальный offline сценарий без внешнего интернета подтверждён;
- основной `/emis` runtime переведён на новый contract.

Текущий production-like contract теперь такой:

- `online` - remote style (`MapTiler` или custom URL);
- `offline` - local `PMTiles`;
- `auto` - online first, одноразовый fallback в local `PMTiles` при startup failure.

## 2. Что осталось от spike-wave

В репозитории намеренно оставлены:

- `/emis/pmtiles-spike` - отдельный маршрут для техпроверки и наблюдаемости;
- `pnpm map:pmtiles:probe` - CLI для byte-serving / range smoke check;
- `pnpm map:pmtiles:setup` - локальный setup реальных PMTiles assets.

## 3. Когда этот документ полезен

Открывать его стоит, если нужно:

- быстро понять, почему в проекте есть отдельный PMTiles spike route;
- повторить low-level range/browser smoke вне основного `/emis` UI;
- проверить новый bundle до выката или смены coverage.

## 4. Что теперь считать source of truth

Для текущей эксплуатации и contract semantics ориентироваться уже не на этот spike-note, а на:

- [EMIS Offline Maps Ops Guide](../../emis_offline_maps_ops.md)
- [EMIS Session Bootstrap](../../emis_session_bootstrap.md)
- [EMIS Implementation Reference v1](./emis_implementation_reference_v1.md)
