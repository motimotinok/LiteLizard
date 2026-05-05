ticket_count=$(find docs/ticket -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
count=0

while [ "$count" -lt "$ticket_count" ]; do
  claude -p "$(cat prompts/ralph-loop.md)"
  git status
  git diff --stat
  read -p "次のループへ進むならEnter、止めるならCtrl+C"
  count=$((count + 1))
done