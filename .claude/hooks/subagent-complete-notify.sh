#!/bin/bash
# SubagentStop hook: サブエージェント完了時に worktree マージ・クリーンアップを促す
#
# stdin から JSON を受け取り、isolation: worktree で起動されたサブエージェントの
# 完了時にマージとクリーンアップの指示を additionalContext として返す。

set -euo pipefail

INPUT=$(cat)

# agent_type を取得（サブエージェント名）
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')

# additionalContext でClaude に指示を返す
cat <<'EOF'
{
  "hookSpecificOutput": {
    "additionalContext": "【サブエージェント完了】このサブエージェントの作業が完了しました。isolation: worktree で起動されていた場合、以下を実行してください:\n1. サブエージェントの結果から worktree パスとブランチ名を確認\n2. 差分がある場合: メインディレクトリで `git merge <branch>` を実行し dev にマージ\n3. マージ後: `git worktree remove <worktree-path>` と `git branch -d <branch>` でクリーンアップ\n4. 差分がない場合: worktree は自動削除済みなので対応不要"
  }
}
EOF
