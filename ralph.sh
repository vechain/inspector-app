#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  RALPH ITERATION $i                                            "
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  claude --dangerously-skip-permissions --verbose --print --output-format stream-json "@prd.json @progress.txt \
1. Find the highest-priority feature with passes:false and work only on that feature. \
2. Check that the types check via yarn kit:typecheck. \
3. Update prd.json: set passes:true and add notes for the completed story. \
4. Append your progress to progress.txt with details of what was done. \
5. Make a git commit for that feature. \
ONLY WORK ON A SINGLE FEATURE. \
If all stories have passes:true, output <promise>COMPLETE</promise> and stop." \
  | jq -rj 'if .type == "assistant" then (.message.content[]? | if .type == "text" then .text else "\n🔧 Tool: \(.name)\n" end) elif .type == "result" then "\n✅ Done\n" else empty end' 2>/dev/null

  exit_code=${PIPESTATUS[0]}

  echo ""
  echo "────────────────────────────────────────────────────────────────"
  echo "Iteration $i finished with exit code: $exit_code"
  echo "────────────────────────────────────────────────────────────────"

  # Check if PRD is complete by reading prd.json
  if grep -q '"passes": false' prd.json 2>/dev/null; then
    remaining=$(grep -c '"passes": false' prd.json)
    echo "📋 Remaining stories: $remaining"
  else
    echo "✅ All stories complete!"
    echo "PRD complete, exiting."
    exit 0
  fi

  echo ""
  sleep 2
done

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "Ralph completed $1 iterations. Check prd.json for remaining stories."
echo "═══════════════════════════════════════════════════════════════════"