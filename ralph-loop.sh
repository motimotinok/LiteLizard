#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${RALPH_PROMPT_FILE:-prompts/ralph-loop.md}"
TICKET_DIR="${RALPH_TICKET_DIR:-docs/tickets}"
CLAUDE_LIMIT="${RALPH_CLAUDE_LIMIT:-2}"
TOTAL_LIMIT="${RALPH_TOTAL_LIMIT:-6}"
CODEX_SANDBOX="${RALPH_CODEX_SANDBOX:-workspace-write}"
CODEX_APPROVAL="${RALPH_CODEX_APPROVAL:-never}"
DRY_RUN="${RALPH_DRY_RUN:-0}"

is_non_negative_int() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

if [ ! -f "$PROMPT_FILE" ]; then
  echo "prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

if [ ! -d "$TICKET_DIR" ]; then
  echo "ticket directory not found: $TICKET_DIR" >&2
  exit 1
fi

if ! is_non_negative_int "$CLAUDE_LIMIT"; then
  echo "RALPH_CLAUDE_LIMIT must be a non-negative integer: $CLAUDE_LIMIT" >&2
  exit 1
fi

if ! is_non_negative_int "$TOTAL_LIMIT"; then
  echo "RALPH_TOTAL_LIMIT must be a non-negative integer: $TOTAL_LIMIT" >&2
  exit 1
fi

active_ticket_count=$(find "$TICKET_DIR" -maxdepth 1 -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
phase_limit="$active_ticket_count"

if [ "$phase_limit" -gt "$TOTAL_LIMIT" ]; then
  phase_limit="$TOTAL_LIMIT"
fi

if [ "$CLAUDE_LIMIT" -gt "$phase_limit" ]; then
  CLAUDE_LIMIT="$phase_limit"
fi

echo "pwd: $(pwd)"
echo "active tickets:"
find "$TICKET_DIR" -maxdepth 1 -type f -name "*.md" -print | sort
echo ""
echo "limits: active_tickets=$active_ticket_count total_phases=$phase_limit claude_phases=$CLAUDE_LIMIT codex_phases=$((phase_limit - CLAUDE_LIMIT))"
echo ""

if [ "$phase_limit" -eq 0 ]; then
  echo "No active tickets found."
  exit 0
fi

if [ "$CLAUDE_LIMIT" -gt 0 ] && ! command -v claude >/dev/null 2>&1; then
  echo "claude command not found" >&2
  exit 1
fi

if [ "$phase_limit" -gt "$CLAUDE_LIMIT" ] && ! command -v codex >/dev/null 2>&1; then
  echo "codex command not found" >&2
  exit 1
fi

run_phase() {
  local phase="$1"
  local provider="$2"
  local prompt

  prompt="$(cat "$PROMPT_FILE")"

  echo "=== Phase${phase} (${provider}) 開始 ==="
  if [ "$DRY_RUN" = "1" ]; then
    echo "dry run: would run ${provider}"
    echo "=== Phase${phase} (${provider}) 終了 ==="
    echo ""
    return
  fi

  if [ "$provider" = "claude" ]; then
    claude -p "$prompt" --dangerously-skip-permissions
  else
    codex -a "$CODEX_APPROVAL" exec -C "$(pwd)" -s "$CODEX_SANDBOX" "$prompt"
  fi
  echo "=== Phase${phase} (${provider}) 終了 ==="
  echo ""
}

count=0

while [ "$count" -lt "$phase_limit" ]; do
  phase=$((count + 1))
  if [ "$count" -lt "$CLAUDE_LIMIT" ]; then
    run_phase "$phase" "claude"
  else
    run_phase "$phase" "codex"
  fi
  count=$((count + 1))
done

if [ "$active_ticket_count" -gt "$phase_limit" ]; then
  echo "Stopped at RALPH_TOTAL_LIMIT=$TOTAL_LIMIT. Remaining tickets will be handled in a later run."
fi
