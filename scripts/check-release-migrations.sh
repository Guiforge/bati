#!/usr/bin/env bash
# A release carries at most one new migration since the previous tag.
#
# Not because two are dangerous in themselves: because the one a hero hits first is the one that
# breaks, and with several at once nobody can say which. A deliberate exception is allowed and
# costs one line in the added file: `-- multi-migration-ok: <why these ship together>`.
#
# Usage: scripts/check-release-migrations.sh [ref]   (default HEAD, the tag being released)
set -euo pipefail

ref="${1:-HEAD}"

# The nearest tag before this one. None means this is the first release: nothing to compare.
if ! prev=$(git describe --abbrev=0 --tags "${ref}^" 2>/dev/null); then
  echo "No previous tag before ${ref}, nothing to compare."
  exit 0
fi

mapfile -t added < <(git diff --name-only --diff-filter=A "${prev}..${ref}" -- 'drizzle/[0-9]*.sql')

if [ "${#added[@]}" -le 1 ]; then
  echo "${#added[@]} new migration(s) since ${prev}."
  exit 0
fi

for file in "${added[@]}"; do
  # Into a variable first: `grep -q` exits at the first match, and under pipefail the SIGPIPE it
  # sends back to `git show` on a file past the pipe buffer reads as "no match".
  body="$(git show "${ref}:${file}")"
  if grep -Eq -- '--[[:space:]]*multi-migration-ok:[[:space:]]*[^[:space:]]' <<<"$body"; then
    echo "${#added[@]} new migrations since ${prev}, allowed by multi-migration-ok in ${file}."
    exit 0
  fi
done

echo "::error::${#added[@]} new migrations since ${prev}, a release carries at most one:" >&2
printf '  %s\n' "${added[@]}" >&2
echo "Ship them in separate releases, or add '-- multi-migration-ok: <reason>' to one of them." >&2
exit 1
