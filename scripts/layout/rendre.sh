#!/usr/bin/env bash
# Renders the proposal's tiers to docs/designs/village/layout/img/prop-*.jpg (JPEG, 1080 px) and prints each tier's gate line.
#   scripts/layout/rendre.sh [suffix]     (suffix: "", or e.g. "-rue-a" to keep a variant beside the default)
set -euo pipefail
cd "$(dirname "$0")/../.."
SUF="${1:-}"
TMP="$(mktemp -d)"
IMG=docs/designs/village/layout/img
for t in 1 3 6 9 12; do
  node scripts/atelier/atelier.js render --tier "$t" --light jour --out "$TMP/j$t" --no-build >/dev/null 2>&1 || node scripts/atelier/atelier.js render --tier "$t" --light jour --out "$TMP/j$t" >/dev/null
  magick "$TMP"/j$t/*.png -resize 1080x -quality 85 "$IMG/prop-t$t-jour$SUF.jpg"
done
node scripts/atelier/atelier.js render --tier 12 --light nuit --out "$TMP/n" --no-build >/dev/null
magick "$TMP"/n/*.png -resize 1080x -quality 85 "$IMG/prop-t12-nuit$SUF.jpg"
node scripts/atelier/atelier.js render --tier 12 --light jour --out "$TMP/z" --no-build --query 'foyer=forge&zoom=0.3' >/dev/null
magick "$TMP"/z/*.png -resize 1080x -quality 85 "$IMG/prop-t12-recul$SUF.jpg"
for t in 1 3 6 9 12; do
  echo "== tier $t"
  node scripts/atelier/atelier.js check --tier "$t" --light jour --no-build 2>&1 | rg "^GATE (occlusion|FAILED)|^  [a-z_]+ +[0-9.]+ %" | head -5 || true
done
