#!/usr/bin/env bash
# EMIS OSM Bulk Ingestion Script
# Loads objects from OpenStreetMap Overpass across all major regions.
#
# Usage:
#   EMIS_AUTH_MODE=none pnpm dev &   # start dev server first
#   bash scripts/emis-osm-bulk-ingest.sh
#
# Options:
#   EMIS_API_URL    — base URL (default: http://localhost:5173)
#   PAUSE_SECONDS   — pause between queries (default: 8)
#   MAX_RETRIES     — retries per query (default: 2)
#   OVERPASS_URL    — override Overpass endpoint
#   DRY_RUN=1       — print queries without executing

set -euo pipefail

API_URL="${EMIS_API_URL:-http://localhost:5173}"
PAUSE="${PAUSE_SECONDS:-8}"
RETRIES="${MAX_RETRIES:-2}"
OVERPASS="${OVERPASS_URL:-}"
DRY="${DRY_RUN:-}"
LOG_FILE="scripts/osm-ingest-$(date +%Y%m%d-%H%M%S).log"

# Counters
TOTAL=0; OK=0; FAIL=0; FETCHED=0

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

trigger() {
  local label="$1" query="$2"
  TOTAL=$((TOTAL + 1))

  if [[ -n "$OVERPASS" ]]; then
    query_json="{\"sourceCode\":\"osm\",\"params\":{\"query\":\"$query\",\"baseUrl\":\"$OVERPASS\"}}"
  else
    query_json="{\"sourceCode\":\"osm\",\"params\":{\"query\":\"$query\"}}"
  fi

  if [[ -n "$DRY" ]]; then
    log "DRY [$TOTAL] $label"
    return
  fi

  local attempt=0
  while [ $attempt -le "$RETRIES" ]; do
    attempt=$((attempt + 1))
    log "[$TOTAL] $label (attempt $attempt)..."

    local resp
    resp=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/emis/ingestion/trigger" \
      -H "Content-Type: application/json" \
      -H "x-emis-actor-id: bulk-ingest" \
      -d "$query_json" 2>&1) || true

    local http_code body
    http_code=$(echo "$resp" | tail -1)
    body=$(echo "$resp" | sed '$d')

    if [[ "$http_code" == "201" ]]; then
      local run_id
      run_id=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
      # Wait a moment for async processing, then check counters
      sleep 2
      local stats
      stats=$(curl -s "$API_URL/api/emis/ingestion/batches/$run_id" 2>/dev/null) || true
      local cnt
      cnt=$(echo "$stats" | grep -o '"cntFetched":[0-9]*' | cut -d: -f2)
      FETCHED=$((FETCHED + ${cnt:-0}))
      log "  OK: fetched=${cnt:-?} (run=$run_id)"
      OK=$((OK + 1))
      break
    else
      log "  FAIL (HTTP $http_code): $body"
      if [ $attempt -le "$RETRIES" ]; then
        local wait=$((PAUSE * attempt * 2))
        log "  Retrying in ${wait}s..."
        sleep "$wait"
      else
        FAIL=$((FAIL + 1))
        log "  GIVING UP on: $label"
      fi
    fi
  done

  sleep "$PAUSE"
}

log "=== EMIS OSM Bulk Ingestion ==="
log "API: $API_URL | Pause: ${PAUSE}s | Retries: $RETRIES"
log "Log: $LOG_FILE"
echo ""

# ============================================================
# REGION DEFINITIONS
# Format: trigger "LABEL" "OVERPASS_QUERY"
# Each query uses [timeout:30] and limits results.
# ============================================================

# --- RUSSIA ---
log "--- Russia ---"
trigger "RU: Moscow substations" \
  "[out:json][timeout:30];node[\"power\"=\"substation\"][\"name\"](55.3,36.5,56.2,38.5);out body 100;"
trigger "RU: St Petersburg substations" \
  "[out:json][timeout:30];node[\"power\"=\"substation\"][\"name\"](59.5,29.0,60.5,31.5);out body 100;"
trigger "RU: Novorossiysk/Black Sea harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](43.0,36.0,45.5,40.0);out body 50;"
trigger "RU: Murmansk/Barents harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](68.0,32.0,70.0,35.0);out body 50;"
trigger "RU: Kazan/Volga substations" \
  "[out:json][timeout:30];node[\"power\"=\"substation\"][\"name\"](55.0,48.0,56.5,50.0);out body 100;"
trigger "RU: Vladivostok/Far East harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](42.5,131.0,44.0,133.0);out body 50;"
trigger "RU: Kaliningrad harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](54.3,19.5,55.3,21.0);out body 50;"

# --- SCANDINAVIA ---
log "--- Scandinavia ---"
trigger "NO: Norway coast harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](58.0,4.0,64.0,12.0);out body 100;"
trigger "NO: Norway north harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](64.0,10.0,71.0,30.0);out body 100;"
trigger "SE: Sweden harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](55.0,11.0,62.0,19.0);out body 100;"
trigger "FI: Finland harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](59.5,20.0,66.0,30.0);out body 100;"
trigger "DK: Denmark harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](54.5,8.0,58.0,13.0);out body 100;"

# --- WESTERN EUROPE ---
log "--- Western Europe ---"
trigger "UK: England harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](49.5,-6.0,55.0,2.0);out body 100;"
trigger "UK: Scotland harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](55.0,-8.0,59.0,-1.0);out body 100;"
trigger "NL: Netherlands harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](51.0,3.0,53.5,7.5);out body 100;"
trigger "BE: Belgium harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](50.5,2.5,51.5,6.0);out body 50;"
trigger "DE: Germany north harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](53.0,7.0,55.0,14.5);out body 100;"
trigger "DE: Germany substations" \
  "[out:json][timeout:30];node[\"power\"=\"substation\"][\"name\"](49.0,6.0,52.0,15.0);out body 100;"
trigger "FR: France Atlantic harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](43.0,-5.0,49.0,0.0);out body 100;"
trigger "FR: France Med harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](42.0,2.0,44.0,7.5);out body 100;"

# --- BALTICS ---
log "--- Baltics ---"
trigger "EE: Estonia harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](57.5,21.5,59.7,28.5);out body 50;"
trigger "LV: Latvia harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](56.0,20.5,58.0,28.5);out body 50;"
trigger "LT: Lithuania harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](55.3,20.5,56.5,26.5);out body 50;"
trigger "PL: Poland harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](53.5,14.0,55.5,19.5);out body 50;"

# --- MEDITERRANEAN ---
log "--- Mediterranean ---"
trigger "IT: Italy Adriatic harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](40.0,13.0,44.5,19.0);out body 100;"
trigger "IT: Italy Tyrrhenian harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](38.0,9.0,43.0,16.0);out body 100;"
trigger "GR: Greece harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](34.5,19.0,41.0,28.0);out body 100;"
trigger "ES: Spain Med harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](36.0,-2.0,42.0,4.0);out body 100;"
trigger "ES: Spain Atlantic harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](36.0,-10.0,44.0,-2.0);out body 100;"
trigger "HR: Croatia harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](42.0,13.0,46.0,19.5);out body 100;"

# --- TURKEY & BLACK SEA ---
log "--- Turkey & Black Sea ---"
trigger "TR: Bosphorus harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](40.0,28.0,42.0,30.5);out body 50;"
trigger "TR: Turkey south coast harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](36.0,28.0,37.5,36.0);out body 100;"
trigger "TR: Turkey substations" \
  "[out:json][timeout:30];node[\"power\"=\"substation\"][\"name\"](37.0,26.0,42.0,44.0);out body 100;"
trigger "UA: Ukraine Black Sea harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](44.0,30.0,47.0,40.0);out body 50;"
trigger "RO: Romania harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](43.5,27.5,46.0,30.0);out body 50;"
trigger "BG: Bulgaria harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](42.0,27.0,44.0,29.0);out body 50;"

# --- MIDDLE EAST / ENERGY ---
log "--- Middle East / Energy ---"
trigger "EG: Egypt/Suez harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](29.0,31.0,32.0,34.0);out body 50;"
trigger "SA: Saudi Arabia harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](16.0,36.0,28.0,50.0);out body 50;"
trigger "AE: UAE harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](23.0,51.0,26.5,56.5);out body 50;"
trigger "OM: Oman harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](16.0,52.0,26.0,60.0);out body 50;"

# --- ASIA ---
log "--- Asia ---"
trigger "CN: China east coast harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](28.0,118.0,35.0,123.0);out body 100;"
trigger "JP: Japan harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](33.0,130.0,40.0,142.0);out body 100;"
trigger "KR: South Korea harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](34.0,126.0,38.0,130.0);out body 50;"
trigger "SG+MY: Singapore/Malaysia harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](1.0,103.0,5.0,105.0);out body 50;"
trigger "IN: India west coast harbours" \
  "[out:json][timeout:30];node[\"harbour\"=\"yes\"][\"name\"](8.0,72.0,22.0,78.0);out body 100;"

# ============================================================

echo ""
log "=== DONE ==="
log "Total queries: $TOTAL | OK: $OK | Failed: $FAIL"
log "Total objects fetched: $FETCHED"
log "Full log: $LOG_FILE"
