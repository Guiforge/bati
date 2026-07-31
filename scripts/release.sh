#!/usr/bin/env bash
# Cut a release: bump the version, tag it, push. CI does the rest.
#
#   npm run release            # 1.0.0 -> 1.0.1
#   npm run release -- minor   # 1.0.0 -> 1.1.0
#   npm run release -- major   # 1.0.0 -> 2.0.0
#
# The tag is what triggers .github/workflows/release.yml, which builds the APK and publishes it
# as a GitHub Release. Nothing here talks to a store.
set -euo pipefail

bump="${1:-patch}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Releases are cut from main, not $branch." >&2
  exit 1
fi

git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "main is not in sync with origin. Pull or push first." >&2
  exit 1
fi

# package.json is the source of the number; app.json has to agree or the app reports a version
# it is not. `npm version` writes the first, commits and tags — so app.json is updated *before*
# that, and rides along in the same commit.
current="$(node -p "require('./package.json').version")"
next="$(node -p "
  const [maj, min, pat] = '$current'.split('.').map(Number);
  ({ major: [maj + 1, 0, 0], minor: [maj, min + 1, 0], patch: [maj, min, pat + 1] })['$bump'].join('.')
")"

echo "  $current -> $next"

node -e "
  const fs = require('fs');
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  app.expo.version = '$next';
  fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
"
git add app.json

npm version "$next" --message "chore(release): v%s" >/dev/null

git push --follow-tags

echo
echo "  Tagged v$next and pushed."
echo "  Watch the build: gh run watch \$(gh run list --workflow=release.yml --limit=1 --json databaseId -q '.[0].databaseId')"
