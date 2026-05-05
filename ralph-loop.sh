ticket_count=$(find docs/ticket -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
count=0

while [ "$count" -lt "$ticket_count" ]; do
  claude -p "$(cat prompts/ralph-loop.md)" --dangerously-skip-permissions
  count=$((count + 1))
done