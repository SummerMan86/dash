#!/usr/bin/env bash
set -euo pipefail

readonly SQL_FILE="/tmp/dashboard-builder-intake.sql"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 1
fi

exec "$(dirname "$0")/dashboard-psql-intake.sh" \
  -v ON_ERROR_STOP=1 \
  -X \
  -A \
  -F $'\t' \
  -P pager=off \
  -f "$SQL_FILE"
