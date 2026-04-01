#!/usr/bin/env bash
set -euo pipefail

readonly UPSTREAM_WRAPPER="/home/orl/Shl/КА/MS BI/bsc_model/agent_pack/bin/dashboard-psql.sh"

if [[ ! -x "$UPSTREAM_WRAPPER" ]]; then
  echo "Upstream dashboard psql wrapper is missing or not executable: $UPSTREAM_WRAPPER" >&2
  exit 1
fi

if [[ "${1-}" == "--" ]]; then
  shift
fi

exec "$UPSTREAM_WRAPPER" "$@"
