#!/bin/bash
# SubagentStop hook: implementer エージェント完了時に worktree マージ・クリーンアップを促す
#
# stdin から JSON を受け取り、isolation: worktree で起動された implementer エージェントの
# 完了時にマージとクリーンアップの指示を additionalContext として返す。
# implementer 以外のエージェント（Explore、research 等）は無視する。

set -euo pipefail

INPUT=$(cat)

# agent_type を取得（サブエージェント名）
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')

# implementer エージェント以外は何もしない
if [ "$AGENT_TYPE" != "implementer" ]; then
  echo '{}'
  exit 0
fi

# implementer の場合のみ worktree マージ手順を案内
cat <<'EOF'
{
  "hookSpecificOutput": {
    "additionalContext": "【implementer 完了】implementer エージェントの作業が完了しました。isolation: worktree で起動されていた場合、以下を実行してください:\n1. サブエージェントの結果から worktree パスとブランチ名を確認\n2. 差分がある場合: メインディレクトリで `git merge <branch>` を実行し dev にマージ\n3. マージ後: `git worktree remove <worktree-path>` と `git branch -d <branch>` でクリーンアップ\n4. 差分がない場合: worktree は自動削除済みなので対応不要"
  }
}
EOF
