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

# Surgical, not a JSON round-trip: re-serialising app.json reformats the inline arrays, which
# Biome's pre-commit hook then collapses again — the two fought on the first attempt. The version
# is passed as an argument rather than interpolated, so the script survives quoting.
#
# versionCode rides along: app.config.js derives it from the version, but F-Droid's checkupdates
# greps app.json for the literal number, so the same commit has to carry both. app.config.js
# throws if the two ever disagree.
# shellcheck disable=SC2016  # single quotes are the point: this is a node script, not shell.
node -e '
  const fs = require("fs");
  const next = process.argv[1];
  const [maj, min, pat] = next.split(".").map(Number);
  const code = maj * 10000 + min * 100 + pat;
  const before = fs.readFileSync("app.json", "utf8");
  const after = before
    .replace(/("version":\s*)"[^"]+"/, `$1"${next}"`)
    .replace(/("versionCode":\s*)\d+/, `$1${code}`);
  if (!/("version":\s*)"[^"]+"/.test(before) || !/("versionCode":\s*)\d+/.test(before)) {
    console.error("release: could not find version/versionCode to bump in app.json");
    process.exit(1);
  }
  fs.writeFileSync("app.json", after);
' "$next"

# app.config.js re-derives the versionCode and throws if app.json disagrees — so a drift between
# this script's formula and the real one fails here, not in a shipped build.
node -e 'require("./app.config.js")()' >/dev/null

# `npm version` on its own refuses to run with anything staged, and app.json has to be staged
# to ride along in the same commit — so it only writes package.json here, and the commit and tag
# are made by hand. One commit, both files, one tag: a version that exists in package.json and
# not in app.json is an app that reports a number it is not.
npm version "$next" --no-git-tag-version --allow-same-version >/dev/null

# android/ is committed (F-Droid's subdir check needs it) and CI regenerates it with
# `prebuild --clean` and diffs — so the bumped versionCode has to land in the generated
# files in this same commit, or every release turns CI red until someone re-commits them.
echo "  Regenerating android/ at $next"
npx expo prebuild -p android --clean >/dev/null

git add app.json package.json package-lock.json android
git commit -q -m "chore(release): v$next"
git tag -a "v$next" -m "v$next"

git push --follow-tags

echo
echo "  Tagged v$next and pushed."
echo "  Watch the build: gh run watch \$(gh run list --workflow=release.yml --limit=1 --json databaseId -q '.[0].databaseId')"
