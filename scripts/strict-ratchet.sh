#!/usr/bin/env bash
# A ratchet on `noUncheckedIndexedAccess`, the biggest type-level guarantee this project does not
# have yet: without it every `arr[0]`, `codes[i]` and `result[0].value` is typed as if the element
# were always there, and TypeScript agrees with you right up to the crash.
#
# Turning it on costs 255 fixes, which is a project, not an evening. So instead of a flag that is
# either off or blocking, the error count is a number that may only go **down** — the same shape
# as the jest coverage thresholds, and for the same reason: it catches backsliding without
# demanding the whole debt be paid at once.
#
# When BASELINE reaches 0: move `noUncheckedIndexedAccess` into tsconfig.json, delete
# tsconfig.strict.json, delete this script, and delete its CI step. The ratchet is scaffolding
# and it is supposed to disappear.
#
# Order to work through, cheapest-risk first (each of these has real tests behind it):
# db/, stores/ and constants/ are done. What is left is 15 errors in components/ and app/, all
# in files that have no tests: FilterRail, SessionRewards, JournalStats, OathCard, settings.tsx,
# exercises/[id].tsx. They wait on purpose — fixing an indexed access in code nothing watches is
# editing blind. Cover the screen first (see the coverage track), then come back here.
#
# `__tests__` is excluded in tsconfig.strict.json, not fixed. The flag exists to protect shipped
# code; a test that indexes past the end of an array fails immediately and loudly when it runs,
# which is the whole job. If that ever stops being true, drop the exclude and expect ~70 errors.
set -euo pipefail

# Measured on 2026-08-16. Lower it every time you fix a file; never raise it.
BASELINE=15

cd "$(dirname "$0")/.."

# `|| true`: tsc exits non-zero whenever there is at least one error, which is the normal state
# here until the baseline reaches zero. The count is the signal, not the exit code.
output=$(npx tsc -p tsconfig.strict.json --noEmit 2>&1 || true)
count=$(printf '%s\n' "$output" | grep -cE "error TS" || true)

if [ "$count" -gt "$BASELINE" ]; then
  echo "noUncheckedIndexedAccess: $count errors, baseline is $BASELINE."
  echo "New unchecked indexed accesses were introduced. The new ones:"
  printf '%s\n' "$output" | grep -E "error TS" | head -20
  exit 1
fi

if [ "$count" -lt "$BASELINE" ]; then
  echo "noUncheckedIndexedAccess: $count errors, down from $BASELINE. Good."
  echo "Set BASELINE=$count in scripts/strict-ratchet.sh so the gain cannot be given back."
  exit 1
fi

echo "noUncheckedIndexedAccess: $count errors, holding at the baseline."
