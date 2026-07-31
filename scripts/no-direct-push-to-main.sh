#!/usr/bin/env bash
# Refuse a direct push to main.
#
# GitHub's own branch protection is the real enforcement, but it needs GitHub Pro or a public
# repository — this one is private on the free plan, so the server will happily accept a push to
# main. This hook is the stand-in: it catches the habit rather than preventing the act, since
# anyone can pass --no-verify.
#
# Replace it with a ruleset the day the repository goes public or the plan changes:
#   gh api -X PUT repos/Guiforge/bati/branches/main/protection \
#     -F required_pull_request_reviews.required_approving_review_count=0 \
#     -F required_status_checks.strict=true \
#     -F 'required_status_checks.contexts[]=check' \
#     -F enforce_admins=false -F restrictions=
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" != "main" ]; then
  exit 0
fi

cat >&2 <<'MSG'

  Direct pushes to main are off. Open a pull request instead:

    git switch -c my-change
    git push -u origin HEAD
    gh pr create --fill

  CI runs on the PR; merge it from GitHub (or `gh pr merge --squash`).

  Genuinely need to bypass it once:  git push --no-verify

MSG
exit 1
