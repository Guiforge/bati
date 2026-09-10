#!/usr/bin/env bash
# Photograph the whole app for a UX audit, seeded and empty, into .audit/<lang>/.
#
#   npm run audit:shots            # en
#   npm run audit:shots -- fr
#
# Two runs because they need two different apps: a hero with three years of history cannot show
# an empty journal, and a fresh install cannot show a maxed village. Both start from `pm clear`,
# so the second one really is a stranger's first launch.
#
# Needs a debug build on a plugged-in device (`npx expo run:android`) and Metro running
# (`npx expo start --dev-client`) — the seeding goes through the dev screen, which is __DEV__ only.
set -euo pipefail

lang="${1:-en}"
out=".audit/$lang"

for flow in audit audit-fresh; do
  AUDIT=1 FLOW=".maestro/$flow.yaml" RAW="$out/$flow" bash scripts/screenshots.sh "$lang"
done

echo
echo "  $(find "$out" -name '*.png' | wc -l) shots in $out/"
echo "  Nothing here asserts anything. Looking at them is the test."
