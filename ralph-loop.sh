#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${RALPH_PROMPT_FILE:-prompts/ralph-loop.md}"
TICKET_DIR="${RALPH_TICKET_DIR:-docs/tickets}"
CLAUDE_LIMIT="${RALPH_CLAUDE_LIMIT:-0}"
TOTAL_LIMIT="${RALPH_TOTAL_LIMIT:-5}"
BATCHES="${RALPH_BATCHES:-2}"
SLEEP_BETWEEN_BATCHES_SECONDS="${RALPH_SLEEP_BETWEEN_BATCHES_SECONDS:-18000}"
CODEX_SANDBOX="${RALPH_CODEX_SANDBOX:-workspace-write}"
CODEX_APPROVAL="${RALPH_CODEX_APPROVAL:-never}"
CODEX_REASONING_EFFORT="${RALPH_CODEX_REASONING_EFFORT:-high}"
LOG_DIR="${RALPH_LOG_DIR:-tmp/codex-log}"
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

if ! is_non_negative_int "$BATCHES"; then
  echo "RALPH_BATCHES must be a non-negative integer: $BATCHES" >&2
  exit 1
fi

if ! is_non_negative_int "$SLEEP_BETWEEN_BATCHES_SECONDS"; then
  echo "RALPH_SLEEP_BETWEEN_BATCHES_SECONDS must be a non-negative integer: $SLEEP_BETWEEN_BATCHES_SECONDS" >&2
  exit 1
fi

active_ticket_count() {
  find "$TICKET_DIR" -maxdepth 1 -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' '
}

echo "pwd: $(pwd)"
echo "active tickets:"
find "$TICKET_DIR" -maxdepth 1 -type f -name "*.md" -print | sort
echo ""
echo "limits: batches=$BATCHES phases_per_batch=$TOTAL_LIMIT claude_phases_per_batch=$CLAUDE_LIMIT sleep_between_batches_seconds=$SLEEP_BETWEEN_BATCHES_SECONDS"
echo "codex: sandbox=$CODEX_SANDBOX approval=$CODEX_APPROVAL reasoning_effort=$CODEX_REASONING_EFFORT"
echo ""

if [ "$BATCHES" -eq 0 ]; then
  echo "RALPH_BATCHES=0. Nothing to run."
  exit 0
fi

if [ "$TOTAL_LIMIT" -eq 0 ]; then
  echo "RALPH_TOTAL_LIMIT=0. Nothing to run."
  exit 0
fi

if [ "$(active_ticket_count)" -eq 0 ]; then
  echo "No active tickets found."
  exit 0
fi

if [ "$CLAUDE_LIMIT" -gt 0 ] && ! command -v claude >/dev/null 2>&1; then
  echo "claude command not found" >&2
  exit 1
fi

if [ "$TOTAL_LIMIT" -gt "$CLAUDE_LIMIT" ] && ! command -v codex >/dev/null 2>&1; then
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
    mkdir -p "$LOG_DIR"
    local log_file
    log_file="${LOG_DIR}/$(date +%Y%m%d-%H%M%S)-phase${phase}-codex.log"
    echo "codex output: $log_file"
    codex -a "$CODEX_APPROVAL" exec -C "$(pwd)" -s "$CODEX_SANDBOX" -c "model_reasoning_effort=\"${CODEX_REASONING_EFFORT}\"" "$prompt" >"$log_file" 2>&1
  fi
  echo "=== Phase${phase} (${provider}) 終了 ==="
  echo ""
}

run_batch() {
  local batch="$1"
  local active_count
  local phase_limit
  local batch_claude_limit
  local count
  local phase

  active_count="$(active_ticket_count)"
  phase_limit="$active_count"
  batch_claude_limit="$CLAUDE_LIMIT"

  if [ "$phase_limit" -eq 0 ]; then
    echo "No active tickets found before Batch${batch}."
    return 1
  fi

  if [ "$phase_limit" -gt "$TOTAL_LIMIT" ]; then
    phase_limit="$TOTAL_LIMIT"
  fi

  if [ "$batch_claude_limit" -gt "$phase_limit" ]; then
    batch_claude_limit="$phase_limit"
  fi

  echo "=== Batch${batch} 開始 ==="
  echo "batch limits: active_tickets=$active_count phases=$phase_limit claude_phases=$batch_claude_limit codex_phases=$((phase_limit - batch_claude_limit))"
  echo ""

  count=0

  while [ "$count" -lt "$phase_limit" ]; do
    phase=$((count + 1))
    if [ "$count" -lt "$batch_claude_limit" ]; then
      run_phase "$phase" "claude"
    else
      run_phase "$phase" "codex"
    fi
    count=$((count + 1))
  done

  if [ "$active_count" -gt "$phase_limit" ]; then
    echo "Batch${batch} stopped at RALPH_TOTAL_LIMIT=$TOTAL_LIMIT. Remaining tickets may be handled by a later batch."
  fi
  echo "=== Batch${batch} 終了 ==="
  echo ""
  return 0
}

batch=1

while [ "$batch" -le "$BATCHES" ]; do
  if ! run_batch "$batch"; then
    break
  fi

  if [ "$batch" -lt "$BATCHES" ]; then
    if [ "$(active_ticket_count)" -eq 0 ]; then
      echo "No active tickets remain. Stopping before next batch."
      break
    fi

    if [ "$SLEEP_BETWEEN_BATCHES_SECONDS" -gt 0 ]; then
      echo "Sleeping $SLEEP_BETWEEN_BATCHES_SECONDS seconds before Batch$((batch + 1))."
      sleep "$SLEEP_BETWEEN_BATCHES_SECONDS"
      echo ""
    fi
  fi

  batch=$((batch + 1))
done
