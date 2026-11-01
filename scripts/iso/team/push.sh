#!/usr/bin/env bash
# The lead's only way to push: the V1 branch, to its own name, never forced, never main.
# Through heavy.sh because the pre-push hook runs the full jest suite and knip, on the working
# tree: push inside a quiet window, with no teammate file half-written.
# Run it with a 10-minute Bash timeout or in the background.
set -uo pipefail

branch_expected="${ISO_BRANCH:-feat/village-iso}"
branch=$(git branch --show-current)
if [ "$branch" != "$branch_expected" ]; then
  echo "push.sh: on '$branch', expected '$branch_expected'. Refusing." >&2; exit 1
fi
root=$(git rev-parse --show-toplevel) || exit 1
exec "$root/scripts/iso/team/heavy.sh" git push origin "HEAD:refs/heads/$branch_expected"
