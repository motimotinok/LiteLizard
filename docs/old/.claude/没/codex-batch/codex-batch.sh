#!/usr/bin/env bash
# codex-batch - タスクリスト Markdown を codex exec で並列バッチ処理する
#
# Usage:
#   codex-batch <tasklist.md> [-j N] [-d DIR]
#
# tasklist.md の frontmatter から設定を読み取り、各タスク行を codex exec で並列実行する。
# bash 3.2+ 互換（macOS デフォルト bash で動作）

set -uo pipefail

# --- ヘルパー関数 ---

usage() {
  echo "Usage: codex-batch <tasklist.md> [-j N] [-d DIR]" >&2
  echo "" >&2
  echo "Arguments:" >&2
  echo "  tasklist.md  タスクリスト Markdown ファイル" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  -j N    並列数（デフォルト: frontmatter の concurrency、なければ 3）" >&2
  echo "  -d DIR  作業ディレクトリ（デフォルト: frontmatter の dir、なければ pwd）" >&2
  exit 1
}

# frontmatter から値を抽出するシンプルなパーサー
parse_frontmatter() {
  local file="$1"
  local key="$2"
  local default="$3"
  local result
  result=$(awk -v key="$key" '
    /^---$/ { if (in_fm) exit; in_fm=1; next }
    in_fm && $0 ~ "^" key ":" {
      sub("^" key ":[[:space:]]*", ""); print; found=1
    }
    END { if (!found) print "___DEFAULT___" }
  ' "$file")
  if [ "$result" = "___DEFAULT___" ]; then
    echo "$default"
  else
    echo "$result"
  fi
}

# frontmatter 以降の本文を抽出（空行・コメント行を除外）
extract_tasks() {
  local file="$1"
  awk '
    /^---$/ { if (in_fm) { past_fm=1; in_fm=0; next } else if (!past_fm) { in_fm=1; next } }
    in_fm { next }
    past_fm && /^[[:space:]]*$/ { next }
    past_fm && /^[[:space:]]*#/ { next }
    past_fm { print }
  ' "$file"
}

# --- codex コマンドの確認 ---

if ! command -v codex &>/dev/null; then
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    source "$HOME/.nvm/nvm.sh"
  fi
  if ! command -v codex &>/dev/null; then
    echo "Error: codex コマンドが見つかりません。nvm の環境を確認してください。" >&2
    exit 1
  fi
fi

# --- 引数パース ---

if [ $# -eq 0 ]; then
  usage
fi

TASKLIST="$1"
shift

if [ ! -f "$TASKLIST" ]; then
  echo "Error: タスクリストファイルが見つかりません: $TASKLIST" >&2
  exit 1
fi

# frontmatter からデフォルト値を読み取り
FM_DIR=$(parse_frontmatter "$TASKLIST" "dir" "$(pwd)")
FM_CONCURRENCY=$(parse_frontmatter "$TASKLIST" "concurrency" "3")

# コマンドライン引数で上書き
DIR="$FM_DIR"
CONCURRENCY="$FM_CONCURRENCY"

while getopts "j:d:" opt; do
  case $opt in
    j) CONCURRENCY="$OPTARG" ;;
    d) DIR="$OPTARG" ;;
    *) usage ;;
  esac
done

# --- ログディレクトリ準備 ---

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_DIR="$DIR/tmp/codex-batch-logs/$TIMESTAMP"
mkdir -p "$LOG_DIR"

# --- タスク抽出（bash 3.2 互換: while read ループ） ---

TOTAL=0
while IFS= read -r line; do
  eval "TASK_${TOTAL}=\$(printf '%s' \"\$line\")"
  TOTAL=$((TOTAL + 1))
done < <(extract_tasks "$TASKLIST")

if [ "$TOTAL" -eq 0 ]; then
  echo "タスクが見つかりません（空のタスクリスト、またはフォーマットエラー）" >&2
  exit 0
fi

echo "=== codex-batch 開始 ===" >&2
echo "    タスク数  : $TOTAL" >&2
echo "    並列数    : $CONCURRENCY" >&2
echo "    作業DIR   : $DIR" >&2
echo "    ログ      : $LOG_DIR" >&2
echo "" >&2

# --- 並列実行（PID トラッキング方式、bash 3.2 互換） ---

PIDS=""
RUNNING=0

i=0
while [ "$i" -lt "$TOTAL" ]; do
  TASK_NUM=$((i + 1))
  eval "PROMPT=\$TASK_${i}"
  RESULT_FILE="$LOG_DIR/task_$(printf '%02d' "$TASK_NUM")_result.txt"
  TASK_LOG="$LOG_DIR/task_$(printf '%02d' "$TASK_NUM").log"

  # セマフォ: 並列数に達したら完了を待つ
  if [ "$RUNNING" -ge "$CONCURRENCY" ]; then
    # いずれかの子プロセス完了を待つ
    wait -n 2>/dev/null
    if [ $? -ne 0 ] 2>/dev/null; then
      # wait -n 非対応の場合: 全子プロセスを wait してリセット
      wait
      RUNNING=0
    else
      RUNNING=$((RUNNING - 1))
    fi
  fi

  (
    PROMPT_PREVIEW="$(echo "$PROMPT" | cut -c1-80)"
    echo "[$(date +%H:%M:%S)] Task $TASK_NUM/$TOTAL 開始: ${PROMPT_PREVIEW}..." >&2

    codex --full-auto -C "$DIR" \
      exec --output-last-message "$RESULT_FILE" "$PROMPT" \
      > "$TASK_LOG" 2>&1
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
      echo "[$(date +%H:%M:%S)] Task $TASK_NUM/$TOTAL 完了: 成功" >&2
    else
      echo "[$(date +%H:%M:%S)] Task $TASK_NUM/$TOTAL 完了: 失敗 (exit $EXIT_CODE)" >&2
    fi

    echo "$EXIT_CODE" > "$LOG_DIR/task_$(printf '%02d' "$TASK_NUM")_exit"
  ) &

  RUNNING=$((RUNNING + 1))
  i=$((i + 1))
done

# 残りの全プロセスを待機
wait

# --- 結果集計 ---

SUCCESS=0
FAIL=0
FAIL_DETAIL_FILE="$LOG_DIR/_fail_details.txt"
: > "$FAIL_DETAIL_FILE"

i=0
while [ "$i" -lt "$TOTAL" ]; do
  TASK_NUM=$((i + 1))
  EXIT_FILE="$LOG_DIR/task_$(printf '%02d' "$TASK_NUM")_exit"
  eval "PROMPT=\$TASK_${i}"
  PROMPT_SHORT="$(echo "$PROMPT" | cut -c1-60)"

  if [ -f "$EXIT_FILE" ]; then
    CODE=$(cat "$EXIT_FILE")
    if [ "$CODE" -eq 0 ]; then
      SUCCESS=$((SUCCESS + 1))
    else
      FAIL=$((FAIL + 1))
      echo "  [$TASK_NUM] $PROMPT_SHORT (exit code: $CODE)" >> "$FAIL_DETAIL_FILE"
    fi
  else
    FAIL=$((FAIL + 1))
    echo "  [$TASK_NUM] $PROMPT_SHORT (終了コード不明)" >> "$FAIL_DETAIL_FILE"
  fi
  i=$((i + 1))
done

# --- サマリー出力 ---

echo ""
echo "=== codex-batch 実行結果 ==="
echo "総タスク数: $TOTAL"
echo "成功: $SUCCESS"
echo "失敗: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "失敗タスク:"
  cat "$FAIL_DETAIL_FILE"
fi

echo ""
echo "ログ: $LOG_DIR/"

# 失敗があった場合は exit 1
[ "$FAIL" -gt 0 ] && exit 1
exit 0
