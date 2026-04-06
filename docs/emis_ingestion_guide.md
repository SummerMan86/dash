# EMIS External Object Ingestion — Руководство

## Что это

Контур автоматического импорта объектов энергетической и морской инфраструктуры из внешних источников (OpenStreetMap, Global Energy Monitor) в EMIS.

### Архитектура потока данных

```
Внешний источник (OSM / GEM)
  ↓  fetch через source adapter
stg_emis.obj_import_candidate  (staging — сырые кандидаты)
  ↓  match engine (dedup по source_ref → имени → геопозиции)
  ↓  resolution policy (source-priority по типу объекта)
emis.objects + emis.object_source_refs  (curated — проверенные объекты)
  ↓  published views
mart.emis_objects_dim  (BI витрина — только curated)
```

### Ключевые принципы

- **Staging ≠ truth.** `stg_emis` — черновик, `emis.objects` — единственный источник правды для API и UI.
- **Low-confidence не публикуется.** Неоднозначные совпадения остаются в staging до ручного review.
- **Source-priority policy.** Для каждого типа объекта определён предпочтительный источник (GEM для энергетики, OSM для портов).
- **Full geometry.** Поддерживаются Point, LineString, Polygon и Multi-варианты.

---

## Быстрый старт

### 1. Подготовка БД

```bash
# Применить DDL (новые таблицы) к существующей БД:
PGPASSWORD=SSYS psql -h localhost -p 5435 -U postgres -d dashboard \
  -f db/pending_changes.sql

# Применить seeds (источники + типы объектов):
PGPASSWORD=SSYS psql -h localhost -p 5435 -U postgres -d dashboard \
  -f db/seeds/002_object_types.sql
PGPASSWORD=SSYS psql -h localhost -p 5435 -U postgres -d dashboard \
  -f db/seeds/003_sources.sql
```

### 2. Запуск dev server

```bash
EMIS_AUTH_MODE=none pnpm dev
```

### 3. Загрузка данных

#### Один запрос (пример — порты Средиземноморья):

```bash
curl -X POST http://localhost:5173/api/emis/ingestion/trigger \
  -H "Content-Type: application/json" \
  -H "x-emis-actor-id: admin" \
  -d '{
    "sourceCode": "osm",
    "params": {
      "query": "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](34,19,41,28);out body 100;"
    }
  }'
```

#### Массовая загрузка всех регионов:

```bash
bash scripts/emis-osm-bulk-ingest.sh
```

#### С альтернативным Overpass mirror (при проблемах с основным):

```bash
OVERPASS_URL=https://overpass.openstreetmap.fr/api/interpreter \
  bash scripts/emis-osm-bulk-ingest.sh
```

#### Dry run (показать запросы без выполнения):

```bash
DRY_RUN=1 bash scripts/emis-osm-bulk-ingest.sh
```

---

## API Endpoints

### Trigger (Admin)

```
POST /api/emis/ingestion/trigger
```

Body:
```json
{
  "sourceCode": "osm",
  "params": {
    "query": "[out:json][timeout:30];node[\"power\"=\"substation\"][\"name\"](55,37,56,38);out body 100;",
    "baseUrl": "https://overpass.openstreetmap.fr/api/interpreter"
  }
}
```

`baseUrl` — опционально, для переключения на альтернативный Overpass mirror.

Response: `{ "id": "run-uuid" }` (201)

### Batches (Viewer+)

```
GET /api/emis/ingestion/batches                    — список всех runs
GET /api/emis/ingestion/batches/:id                — детали run
GET /api/emis/ingestion/batches/:id/objects         — кандидаты в run
```

Query params: `sourceCode`, `status`, `limit`, `offset`.

### Conflicts (Viewer+ / Admin для resolve)

```
GET  /api/emis/ingestion/conflicts                  — неразрешённые кандидаты
POST /api/emis/ingestion/conflicts/:id/resolve       — разрешить конфликт
```

Resolve body:
```json
{ "resolution": "unique" }
{ "resolution": "duplicate_with_clear_winner", "targetObjectId": "uuid" }
{ "resolution": "possible_duplicate_low_confidence" }
{ "resolution": "invalid_or_unmapped" }
```

---

## Типы объектов и маппинг

### Текущие типы (14 шт.)

| EMIS тип | Название | OSM теги | Source-priority winner |
|---|---|---|---|
| `port` | Порт | `harbour=yes`, `industrial=port` | OSM |
| `terminal` | Терминал | `industrial=terminal` | OSM |
| `storage` | Хранилище | `man_made=storage_tank` | OSM |
| `substation` | Подстанция | `power=substation` | OSM |
| `lighthouse` | Маяк | `man_made=lighthouse` | — |
| `shipyard` | Верфь | `industrial=shipyard` | — |
| `dock` | Док | `waterway=dock` | — |
| `power_plant` | Электростанция | `power=plant` | GEM |
| `nuclear_plant` | АЭС | `plant:source=nuclear` | — |
| `wind_farm` | Ветряная ферма | `generator:source=wind` | — |
| `solar_farm` | Солнечная ферма | `generator:source=solar` | — |
| `refinery` | НПЗ | `industrial=refinery` | — |
| `coal_mine` | Угольная шахта | `resource=coal` | GEM |
| `mine` | Шахта | `industrial=mine` | — |
| `petroleum_well` | Нефтяная скважина | `man_made=petroleum_well` | — |
| `gas_pipeline` | Газопровод | `man_made=pipeline` + `substance=gas` | GEM |
| `oil_pipeline` | Нефтепровод | `man_made=pipeline` + `substance=oil` | GEM |
| `lng_terminal` | LNG терминал | `industrial=lng_terminal` | — |

### Как добавить новый тип

1. Добавить в `emis.object_types`:
   ```sql
   INSERT INTO emis.object_types (id, code, name, geometry_kind, icon_key)
   VALUES (gen_random_uuid(), 'new_type', 'Название', 'point', 'icon');
   ```

2. Добавить маппинг в `packages/emis-server/src/modules/ingestion/adapters/osmAdapter.ts`:
   - Простой тег → `OSM_TYPE_MAP`
   - Комбинация тегов → `OSM_COMPOUND_RULES`

3. Перезапустить dev server и trigger ingestion.

---

## Overpass Query Language — шпаргалка

### Базовый синтаксис

```
[out:json][timeout:30];
node["tag"="value"]["name"](south,west,north,east);
out body LIMIT;
```

### Типы элементов

| Тип | Что это | Geometry |
|---|---|---|
| `node` | Точка | Point |
| `way` | Линия/полигон | LineString / Polygon |
| `relation` | Составной объект | MultiPolygon |

Для `way` и `relation` добавлять `out body geom` (чтобы вернулась geometry).

### Примеры запросов

```bash
# Все named порты в Европе
[out:json][timeout:30];node["harbour"="yes"]["name"](35,-10,70,40);out body 200;

# НПЗ как площадные объекты
[out:json][timeout:30];way["industrial"="refinery"]["name"](35,-10,55,25);out body geom 100;

# Электростанции в конкретной стране (bbox России)
[out:json][timeout:30];node["power"="plant"]["name"](50,25,70,60);out body 100;

# Комбинация node + way
[out:json][timeout:30];(node["power"="plant"]["name"](50,37,56,38);way["power"="plant"]["name"](50,37,56,38););out body geom 100;
```

### Полезные ссылки

- Overpass Turbo (визуальный конструктор): `https://overpass-turbo.eu/`
- Статус основного API: `https://overpass-api.de/api/status`
- Зеркала при перегрузке:
  - `https://overpass.openstreetmap.fr/api/interpreter`
  - `https://overpass.kumi.systems/api/interpreter`

---

## Resolution Engine — как работает

### Алгоритм матчинга

Для каждого кандидата из staging ищутся совпадения в curated `emis.objects`:

1. **Source ref match** (score 1.0) — точное совпадение `(source_code, source_ref)` в `emis.object_source_refs`. Самый надёжный.
2. **Name proximity** (score 0.8) — case-insensitive exact match по `name` или `name_en` в пределах того же object type.
3. **Spatial proximity** (score 0.3–0.7) — centroid within 500m, тот же object type.

### Resolution outcomes

| Outcome | Что происходит | Когда |
|---|---|---|
| `unique` | Авто-публикация как новый объект | Нет совпадений |
| `duplicate_with_clear_winner` | Обновление существующего объекта | Source ref match или name match + source-priority |
| `possible_duplicate_low_confidence` | Остаётся в staging | Есть совпадения, но нет clear winner |
| `invalid_or_unmapped` | Остаётся в staging | Нет маппинга object type |

### Source-priority policy

Определяет, какой источник считается авторитетным для данного типа объекта:

- **GEM** wins for: `power_plant`, `coal_mine`, `gas_pipeline`, `oil_pipeline`
- **OSM** wins for: `port`, `terminal`, `storage`, `substation`

Если source-priority не определён — clear winner определяется только при score ≥ 0.8 + source ref match.

---

## Review UI

### Candidate detail page

```
/emis/objects/imported/[id]
```

Показывает:
- Candidate info (source, type, status, resolution, geometry)
- Match candidates (с кем совпал, score, match kind)
- Winner rule explanation (почему такое resolution)
- Raw payload (исходные данные из OSM/GEM)
- Resolve actions (Publish as New, Merge, Hold, Reject)

### Objects catalog

```
/emis/objects
```

Содержит ссылку "import review (API)" на `/api/emis/ingestion/conflicts` для просмотра неразрешённых кандидатов.

---

## Витрина (BI)

Curated objects автоматически попадают в `mart.emis_objects_dim`:

```sql
SELECT id, name, object_type_code, country_name_ru, geometry_type,
       centroid_lon, centroid_lat, source_origin
FROM mart.emis_objects_dim
WHERE source_origin = 'ingestion';
```

Витрина **не читает напрямую из staging** — только curated `emis.objects`.

---

## Troubleshooting

### Overpass API timeout (504)

Причина: слишком большой bbox или API перегружен.

Решения:
- Уменьшить bbox запроса
- Добавить `[timeout:30]`
- Использовать альтернативный mirror: `OVERPASS_URL=https://overpass.openstreetmap.fr/api/interpreter`
- Retry позже (off-peak UTC)

### Candidates held как invalid_or_unmapped

Причина: OSM тег не маппится на EMIS object type.

Решение: добавить маппинг в `OSM_TYPE_MAP` или `OSM_COMPOUND_RULES` в `osmAdapter.ts`.

### Objects не появляются в curated

Причина: candidate без `name` (objects.name NOT NULL) или без mapped object type.

Решение: фильтровать `["name"]` в Overpass запросе и убедиться что тип маппится.

### Дубликаты при повторном запуске

Не проблема — match engine dedup'лит по `source_ref`. Повторный import тех же объектов будет resolved как `duplicate_with_clear_winner` и обновит существующие записи.

---

## Полная очистка и перезагрузка

```sql
-- Очистить все ingestion данные
BEGIN;
DELETE FROM stg_emis.obj_candidate_match;
DELETE FROM stg_emis.obj_import_candidate;
DELETE FROM stg_emis.obj_import_run;
DELETE FROM emis.object_source_refs;
DELETE FROM emis.objects WHERE source_origin = 'ingestion';
COMMIT;
```

Затем заново: `bash scripts/emis-osm-bulk-ingest.sh`.
