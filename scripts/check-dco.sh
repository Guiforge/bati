#!/usr/bin/env bash
# Developer Certificate of Origin check (audit B3): every commit in BASE..HEAD that is not the
# maintainer's or a bot's carries a "Signed-off-by: Name <email>" trailer (`git commit -s`).
# Usage: check-dco.sh BASE HEAD. Maintainer emails live in .github/dco-maintainers.txt.
set -euo pipefail

base="${1:?base sha}"
head="${2:?head sha}"
maintainers="$(dirname "$0")/../.github/dco-maintainers.txt"
failed=0

for sha in $(git rev-list --no-merges "$base..$head"); do
  email="$(git log -1 --format=%ae "$sha")"
  case "$email" in *"[bot]"*) continue ;; esac
  if grep -qixF "$email" "$maintainers"; then continue; fi
  if ! git log -1 --format=%B "$sha" | grep -qE '^Signed-off-by: .+ <.+@.+>$'; then
    echo "::error::$sha has no Signed-off-by line (git commit -s, or git rebase --signoff)"
    failed=1
  fi
done

exit "$failed"
