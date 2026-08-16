#!/usr/bin/env bash
# `noUncheckedIndexedAccess` over everything the app actually ships.
#
# Without it every `arr[0]`, `codes[i]` and `rows[0].value` is typed as if the element were
# always there, and TypeScript agrees with you right up to the crash. Turning it on cost 255
# fixes, done in batches behind a ratchet (the error count could only go down). The count
# reached zero on 2026-08-16, so this is no longer a ratchet: **any** error fails.
#
# Nearly every one of those 255 was the same shape — guard with `rows.length === 0`, then index
# `rows[0]`, which does not narrow — and the fix was to check the value instead of the length.
# Where the index was in range by construction, the answer was to remove the indexing rather
# than guard it: `for...of` over `entries()`, a rotated array instead of modulo arithmetic, and
# `as const` on fixed catalogues so index 0 has a known type. Guards that cannot be reached are
# branches no test can cover, and the coverage thresholds say so loudly.
#
# `__tests__` is excluded in tsconfig.strict.json, deliberately: the flag exists to protect
# shipped code, and a test that reads past the end of an array fails immediately and loudly the
# moment it runs. Including them would mean ~70 non-null assertions and turning off
# noNonNullAssertion for tests, weakening a rule that currently holds everywhere. To reverse
# that trade, delete the `exclude` line and expect the 70 back.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! npx tsc -p tsconfig.strict.json --noEmit; then
  echo
  echo "noUncheckedIndexedAccess: an indexed access is no longer guarded."
  echo "Check the value rather than the length, or remove the indexing entirely."
  exit 1
fi

echo "noUncheckedIndexedAccess: clean."
