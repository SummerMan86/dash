#!/usr/bin/env bash
# codex-companion — stable repo-local entrypoint to the installed Codex plugin runtime.
set -euo pipefail

resolve_companion_script() {
  if [[ -n "${CODEX_COMPANION_SCRIPT:-}" && -f "${CODEX_COMPANION_SCRIPT}" ]]; then
    printf '%s\n' "${CODEX_COMPANION_SCRIPT}"
    return 0
  fi

  if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" && -f "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" ]]; then
    printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs"
    return 0
  fi

  local cache_root="${HOME}/.claude/plugins/cache/openai-codex/codex"
  local candidates=()

  if [[ -d "${cache_root}" ]]; then
    shopt -s nullglob
    candidates=("${cache_root}"/*/scripts/codex-companion.mjs)
    shopt -u nullglob
  fi

  if ((${#candidates[@]} == 0)); then
    return 1
  fi

  printf '%s\n' "${candidates[@]}" | sort -V | tail -n 1
}

if ! command -v node >/dev/null 2>&1; then
  echo "node not found in PATH." >&2
  exit 1
fi

COMPANION_SCRIPT="$(resolve_companion_script || true)"
if [[ -z "${COMPANION_SCRIPT}" ]]; then
  cat >&2 <<'EOF'
Could not locate codex-companion.mjs.

Expected one of:
- CODEX_COMPANION_SCRIPT to point at the file directly
- CLAUDE_PLUGIN_ROOT/scripts/codex-companion.mjs to exist
- ~/.claude/plugins/cache/openai-codex/codex/<version>/scripts/codex-companion.mjs

Run /plugin, /reload-plugins, or reinstall the openai-codex plugin if needed.
EOF
  exit 1
fi

exec node "${COMPANION_SCRIPT}" "$@"
