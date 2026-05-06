echo "pwd: $(pwd)"
echo "tickets:"
find docs/tickets -type f -name "*.md"

ticket_count=$(find docs/tickets -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
count=0

while [ "$count" -lt "$ticket_count" ]; do
  echo "=== Phase$((count+1)) 開始 ==="
  claude -p "$(cat prompts/ralph-loop.md)" --dangerously-skip-permissions
  echo "=== Phase$((count+1)) 終了 ==="
  echo ""
  count=$((count + 1))
done