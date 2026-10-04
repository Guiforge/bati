#!/bin/bash
# Block the Bash commands that have already destroyed work in this repo. Each one is a rule an
# agent was told and forgot; a hook does not forget.
#
# - git checkout -- <path> / git checkout . / git restore <path>: discards uncommitted edits,
#   including the user's, who edits the same tree in parallel. A test then goes green on the
#   wrong code. Revert your own change with an Edit instead.
# - git stash pop / apply: on a clean tree it pops an *old* WIP stash the user keeps on purpose.
# - maestro test without --device: Maestro ignores ANDROID_SERIAL and picks any device. It once
#   ran clearState on the USB phone and wiped its dev app.
#
# Exit 2 sends the reason back to Claude and cancels the call. The user's own shell is untouched.

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

block() {
  echo "BLOCKED by .claude/hooks/guard-bash.sh: $1" >&2
  exit 2
}

# One segment per simple command, so a flag in one does not excuse another.
while IFS= read -r seg; do
  if grep -qE '(^|[[:space:]/])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+checkout([[:space:]].*)?[[:space:]](--|\.)([[:space:]]|$)' <<<"$seg"; then
    block "git checkout of paths discards uncommitted work (yours and the user's). Undo your own edit with Edit, or ask."
  fi
  if grep -qE '(^|[[:space:]/])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+restore([[:space:]]|$)' <<<"$seg" &&
    { ! grep -qE '(--staged|-S)([[:space:]]|$)' <<<"$seg" || grep -qE '(--worktree|-W)([[:space:]]|$)' <<<"$seg"; }; then
    block "git restore of the working tree discards uncommitted work. Use 'git restore --staged' to unstage, Edit to undo your own change, or ask."
  fi
  if grep -qE '(^|[[:space:]/])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+stash[[:space:]]+(pop|apply)([[:space:]]|$)' <<<"$seg"; then
    block "the user keeps WIP in stashes; pop/apply on a clean tree restores an old one. Compare with 'git stash show -p' or a worktree, or ask."
  fi
  if grep -qE '(^|[[:space:]/])maestro[[:space:]]+(.*[[:space:]])?test([[:space:]]|$)' <<<"$seg" &&
    ! grep -qE -- '--device([^[:alnum:]_-]|$)' <<<"$seg"; then
    block "maestro test needs --device <serial> (it ignores ANDROID_SERIAL and may pick the USB phone). Use the emulator: --device emulator-5554."
  fi
done < <(sed -E 's/(&&|\|\||;|\|)/\n/g' <<<"$cmd")

exit 0
