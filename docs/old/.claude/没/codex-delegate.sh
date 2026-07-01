#!/usr/bin/env bash
# codex-delegate - Codex CLI に定型作業を委譲するラッパー
#
# Usage:
#   codex-delegate gen    <DIR> "<PROMPT>"   - コード生成・変換
#   codex-delegate review <DIR>              - コードレビュー

set -euo pipefail

MODE="${1:-}"
DIR="${2:-$(pwd)}"
PROMPT="${3:-}"

if [[ -z "$MODE" ]]; then
  echo "Usage: codex-delegate <gen|review> <DIR> [PROMPT]" >&2
  exit 1
fi

# codex コマンドの確認
if ! command -v codex &>/dev/null; then
  echo "Error: codex コマンドが見つかりません。nvm の環境を確認してください。" >&2
  exit 1
fi

# ログディレクトリ: $DIR/tmp/codex-logs/
LOG_DIR="$DIR/tmp/codex-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

case "$MODE" in
  gen|generate)
    if [[ -z "$PROMPT" ]]; then
      echo "Error: gen モードにはプロンプトが必要です" >&2
      echo "Usage: codex-delegate gen <DIR> \"<PROMPT>\"" >&2
      exit 1
    fi
    LOG_FILE="$LOG_DIR/gen_${TIMESTAMP}.log"
    RESULT_FILE="$LOG_DIR/gen_${TIMESTAMP}_result.txt"

    echo "==> Codex (gen) を起動します..." >&2
    echo "    DIR   : $DIR" >&2
    echo "    PROMPT: $PROMPT" >&2
    echo "    LOG   : $LOG_FILE" >&2
    echo "" >&2

    codex -a never --sandbox workspace-write -C "$DIR" \
      exec --output-last-message "$RESULT_FILE" "$PROMPT" \
      > "$LOG_FILE" 2>&1
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
      cat "$RESULT_FILE"
    else
      echo "Error: codex が失敗しました (exit $EXIT_CODE)" >&2
      echo "--- ログ末尾 ---" >&2
      tail -20 "$LOG_FILE" >&2
      exit $EXIT_CODE
    fi
    ;;

  review)
    LOG_FILE="$LOG_DIR/review_${TIMESTAMP}.log"

    echo "==> Codex (review) を起動します..." >&2
    echo "    DIR: $DIR" >&2
    echo "    LOG: $LOG_FILE" >&2
    echo "" >&2

    cd "$DIR" && codex review --uncommitted > "$LOG_FILE" 2>&1 || true
    # 全文はログ保存済み。最後の "codex" マーカー以降だけ抽出して Claude に渡す
    REVIEW_SUMMARY=$(awk '/^codex$/{buf=""} !/^codex$/{buf=buf (buf?"\n":"") $0} END{print buf}' "$LOG_FILE")
    jq -n --arg result "$REVIEW_SUMMARY" '{"hookSpecificOutput":{"additionalContext":$result}}'
    ;;

  *)
    echo "Error: 不明なモード '$MODE'. gen または review を指定してください" >&2
    exit 1
    ;;
esac
