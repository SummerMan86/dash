#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
schema_file="${1:-$repo_root/db/current_schema.sql}"
catalog_file="$repo_root/db/schema_catalog.md"

if [[ ! -f "$schema_file" ]]; then
  echo "Schema snapshot not found: $schema_file" >&2
  exit 1
fi

if [[ ! -f "$catalog_file" ]]; then
  echo "Schema catalog not found: $catalog_file" >&2
  exit 1
fi

tmp_expected="$(mktemp)"
trap 'rm -f "$tmp_expected"' EXIT

rg -N --no-heading --no-filename -o '`(emis|stg_emis|mart_emis|mart)\.[a-zA-Z0-9_]+`' \
  "$catalog_file" \
  | tr -d '`' \
  | sort -u \
  > "$tmp_expected"

missing=0
checked=0

while IFS= read -r object_name; do
  [[ -z "$object_name" ]] && continue
  checked=$((checked + 1))
  if ! grep -Fq -- "$object_name" "$schema_file"; then
    echo "Missing object in snapshot: $object_name" >&2
    missing=1
  fi
done < "$tmp_expected"

if grep -Eq -- '(^CREATE TABLE emis\.schema_migrations\b|^-- Name: schema_migrations; Type: TABLE; Schema: emis;)' "$schema_file"; then
  echo "Snapshot still contains legacy bookkeeping table emis.schema_migrations" >&2
  missing=1
fi

if grep -Eq -- '(^CREATE SCHEMA (staging_back2103|mart_back2103)\b|^CREATE TABLE staging\._(fact_comment|gap|dq_comment|link_comment)_backup_20260320\b)' "$schema_file"; then
  echo "Snapshot contains excluded legacy archive or backup objects" >&2
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "Verified $checked documented objects against $schema_file"
