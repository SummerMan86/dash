#!/usr/bin/env bash
# emis-task — bootstrap an orchestrator session for a new task.
# Usage:
#   ./scripts/emis-task.sh "описание задачи"
#   ./scripts/emis-task.sh "описание задачи" --scope "apps/web/src/routes/emis/*"
#   ./scripts/emis-task.sh "описание задачи" --low-risk   # batch/low-risk hint, no ownership bypass
#   ./scripts/emis-task.sh "описание задачи" --simple     # deprecated alias for --low-risk
set -euo pipefail

TASK=""
SCOPE=""
LOW_RISK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope) SCOPE="$2"; shift 2 ;;
    --low-risk|--simple) LOW_RISK=true; shift ;;
    *) TASK="$1"; shift ;;
  esac
done

if [[ -z "$TASK" ]]; then
  echo "Usage: emis-task.sh \"описание задачи\" [--scope \"path\"] [--low-risk]"
  exit 1
fi

# Ensure we're in a tmux session (required for Agent Teams)
if [[ -z "${TMUX:-}" ]]; then
  echo "Not inside tmux. Starting tmux session 'emis'..."
  # Re-exec this script inside a new tmux session, preserving all args
  exec tmux new-session -s emis -- "$0" "$TASK" ${SCOPE:+--scope "$SCOPE"} $($LOW_RISK && echo --low-risk)
fi

if $LOW_RISK; then
PROMPT="Новая задача: $TASK${SCOPE:+
Scope: $SCOPE}
Risk hint: local low-risk / batch candidate.
Даже в этом режиме canonical workflow остаётся в силе: plan ownership и final acceptance остаются у lead-strategic.
Сначала классифицируй задачу по docs/agents/workflow.md. Если change действительно batch / low-risk, используй обычный strategic loop с batched acceptance на integration/final stage и lightweight report только если это допускает risk profile."
else
PROMPT="Новая задача: $TASK${SCOPE:+
Scope: $SCOPE}
Ограничения: не выходи за scope.
Работай по docs/agents/workflow.md как orchestration-only orchestrator."
fi

echo "=== emis-task ==="
echo "Task:   $TASK"
echo "Scope:  ${SCOPE:-auto}"
echo "Mode:   $(if $LOW_RISK; then echo low-risk; else echo full; fi)"
echo "================="
echo ""

# Interactive session with the prompt pre-filled
exec claude "$PROMPT"
