#!/usr/bin/env bash
# The lead's only way to commit. Teammates never run it.
#
#   scripts/iso/team/commit.sh <message-file> <path>...
#
# - Refuses any branch but feat/village-iso (override with ISO_BRANCH if Guillaume renamed it).
# - Refuses to stage a frozen file or VALIDATIONS.md: those are Guillaume's commits.
# - Stages exactly the paths given, nothing else, and commits through heavy.sh (the pre-commit
#   hook runs biome --write, tsc on the whole project, whitespace fixers, the 2 MB limit).
# - If the commit fails, it unstages what it staged, so the next try starts clean (the lead
#   cannot run `git restore --staged` itself: the team hook blocks every git write).
#   When the failure is biome or a whitespace fixer rewriting the files, just run it again.
#
# The pre-commit hook stashes every unstaged change in the tree while it runs and restores it
# after. A teammate (or a background job) writing a tracked file during that window can lose the
# edit: commit only inside a quiet window, see the lead prompt §4. Run it with a 10-minute Bash
# timeout or in the background: killing it mid-hook leaves the work in prek's patch file only.
set -uo pipefail

branch_expected="${ISO_BRANCH:-feat/village-iso}"
if [ "$#" -lt 2 ]; then echo "usage: commit.sh <message-file> <path>..." >&2; exit 64; fi
msg="$1"; shift
[ -f "$msg" ] || { echo "commit.sh: message file '$msg' not found." >&2; exit 64; }
root=$(git rev-parse --show-toplevel) || exit 1

branch=$(git branch --show-current)
if [ "$branch" != "$branch_expected" ]; then
  echo "commit.sh: on '$branch', expected '$branch_expected'. Refusing." >&2; exit 1
fi

frozen='(^|/)(PROMPT-EQUIPE-V1\.md|CHECKLIST\.md|CRITERES-V1\.md|REVUE-PROMPT\.md|REVUE-UI-PROMPT\.md|VALIDATIONS\.md|iso_audit\.py|audit-thresholds\.json)$|^scripts/iso/team/|^\.claude/'

already=$(git diff --cached --name-only)
if [ -n "$already" ]; then
  echo "commit.sh: the index already holds staged files (Guillaume's, or a crash). Ask Guillaume; not mixing them in:" >&2
  echo "$already" >&2; exit 1
fi

unstage() { git restore --staged -- "$@" 2>/dev/null || git reset -q -- "$@"; }

git add -- "$@" || { unstage "$@"; exit 1; }
staged=$(git diff --cached --name-only)
if [ -z "$staged" ]; then echo "commit.sh: nothing to commit in those paths." >&2; exit 1; fi
if grep -qE "$frozen" <<<"$staged"; then
  echo "commit.sh: a frozen path got staged. Unstaging and refusing:" >&2
  grep -E "$frozen" <<<"$staged" >&2
  unstage "$@"; exit 1
fi

"$root/scripts/iso/team/heavy.sh" git commit -F "$msg"
rc=$?
if [ "$rc" -ne 0 ]; then
  unstage "$@"
  echo "commit.sh: commit failed (exit $rc), paths unstaged. If biome or a whitespace fixer rewrote files, run commit.sh again; otherwise make a fix task." >&2
fi
exit "$rc"
