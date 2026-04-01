#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
env_file="${ENV_FILE:-$repo_root/.env}"
output_file="${1:-$repo_root/db/current_schema.sql}"

if [[ ! -f "$env_file" ]]; then
  echo "Env file not found: $env_file" >&2
  exit 1
fi

set -a
source "$env_file"
set +a

: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PORT:?POSTGRES_PORT is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

tmp_raw="$(mktemp)"
tmp_filtered="$(mktemp)"
trap 'rm -f "$tmp_raw" "$tmp_filtered"' EXIT

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -s \
  --no-owner \
  --no-privileges \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -n emis \
  -n stg_emis \
  -n mart_emis \
  -n mart \
  -T emis.schema_migrations \
  > "$tmp_raw"

awk '
/^\\restrict / { next }
/^\\unrestrict / { next }
/^-- Dumped from database version / { next }
/^-- Dumped by pg_dump version / { next }
/^-- Name: SCHEMA .*; Type: COMMENT; Schema: -; Owner: -$/ { next }
/COMMENT ON SCHEMA / {
  next
}
{ print }
' "$tmp_raw" > "$tmp_filtered"

mkdir -p "$(dirname "$output_file")"

{
  printf '%s\n' "-- Dashboard Builder DB snapshot"
  printf '%s\n' "-- Source of truth for the active app schemas in this repo"
  printf '%s\n' "-- Generated from live database ${POSTGRES_DB} via scripts/db-export-current-schema.sh"
  printf '%s\n' "-- Scope: emis, stg_emis, mart_emis, mart"
  printf '%s\n' "-- Excludes: emis.schema_migrations and archive-only legacy schemas"
  printf '\n'
  printf '%s\n' "CREATE EXTENSION IF NOT EXISTS postgis;"
  printf '%s\n' "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
  printf '\n'
  cat "$tmp_filtered"
} > "$output_file"

echo "Wrote snapshot to $output_file"
