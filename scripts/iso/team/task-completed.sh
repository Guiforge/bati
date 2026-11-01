#!/usr/bin/env bash
# TaskCompleted hook of the village-iso V1 team. A task named after a V1 id (L2-T07) can only be
# marked completed once its report exists and the lead has written a passing review verdict:
#
#   docs/designs/village-iso-v1/reports/<id>.md     written by the teammate
#   docs/designs/village-iso-v1/reviews/<id>.md     written by the lead, first line `verdict: pass`
#
# Exit 2 keeps the task open and sends the reason back. Tasks without an id are left alone.
set -uo pipefail

input=$(cat)
# The id is the one at the head of the title; the description may name dependencies.
subject=$(jq -r '.task_subject // .task_title // .subject // .title // empty' <<<"$input" 2>/dev/null) || {
  echo "task-completed.sh: unreadable hook input, completion refused; tell the lead." >&2; exit 2; }
id=$(grep -oE '^[[:space:]]*L[0-9]+-T[0-9]+' <<<"$subject" | tr -d '[:space:]' | head -1)
[ -z "$id" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-.}/docs/designs/village-iso-v1"
if [ ! -s "$root/reports/$id.md" ]; then
  echo "Task $id: reports/$id.md absent (pas de rapport). The teammate writes the report and sends « prêt : $id » to the lead; only the lead completes tasks." >&2
  exit 2
fi
if ! head -1 "$root/reviews/$id.md" 2>/dev/null | grep -qiE '^verdict:[[:space:]]*pass'; then
  echo "Task $id: no passing review. The lead runs the fresh reviewer, then writes reviews/$id.md starting with 'verdict: pass' before completing the task." >&2
  exit 2
fi
exit 0
