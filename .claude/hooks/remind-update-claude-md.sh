#!/bin/bash
# Stop フック: Claude の返信完了後に実行される
# コードファイルが変更されていれば CLAUDE.md 更新を促すリマインダーを出力する

INPUT=$(cat)

# git diff で変更されたコードファイルを確認（CLAUDE.md 自体は除外）
CHANGED=$(git -C "$(pwd)" diff --name-only HEAD 2>/dev/null \
  | grep -v "CLAUDE.md" \
  | grep -E "\.(tsx?|jsx?|css|json)$" \
  | head -5)

if [ -n "$CHANGED" ]; then
  echo "【自動リマインダー】以下のコードファイルが変更されました:"
  echo "$CHANGED"
  echo "→ .claude/CLAUDE.md の「実装状況」セクションを必要に応じて更新してください。"
fi
