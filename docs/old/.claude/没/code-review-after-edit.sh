#!/bin/bash
# PostToolUse フック: Edit/Write 後にコードレビューを促す
# stdout の内容は Claude のコンテキストにリアルタイムで注入される

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# .claude/ 配下（CLAUDE.md・hooksスクリプト等）は除外
if [[ "$FILE_PATH" == *"/.claude/"* ]]; then
  exit 0
fi

# 対象: コード・スタイルファイルのみ
if [[ "$FILE_PATH" =~ \.(tsx?|jsx?|css|json)$ ]]; then
  echo "【自動レビュー指示】${FILE_PATH} を編集しました。"
  echo "続行前に以下を確認し、問題があれば修正してください:"
  echo "1. 型エラー・未定義参照がないか"
  echo "2. ロジックのバグ・想定外の副作用がないか"
  echo "3. 既存のコーディングパターン・import パスとの整合性"
  echo "問題なければ次の作業に進んでください。"
fi
