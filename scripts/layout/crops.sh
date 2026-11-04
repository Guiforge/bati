#!/usr/bin/env bash
# L10: the locked crops `porte`, `lisiere`, `pieds` (loupes/bc/card.md: tiles, tier 6, day) before and after the plan.
#   scripts/layout/crops.sh BEFORE_REF OUT_DIR      (BEFORE_REF: e.g. origin/track-layout; the tree must be committed)
# Renders the tier 6 day state at BEFORE_REF's components and constants, then at HEAD's, and cuts the three crops with
# scripts/iso/loupe_crop.py's tile projection and the camera the atelier's check dumps. Restores HEAD's files at the end.
set -euo pipefail
cd "$(dirname "$0")/../.."
REF="$1"; OUT="$2"; mkdir -p "$OUT"
[ -z "$(/usr/bin/git status --porcelain -- components constants)" ] || { echo "commit first"; exit 1; }
un() { # un LABEL
  node scripts/atelier/atelier.js render --tier 6 --light jour --out "$OUT/$1" >/dev/null
  mv "$OUT/$1"/*.png "$OUT/$1.png"
  node scripts/atelier/atelier.js check --tier 6 --light jour --no-build --out "$OUT/$1-check" >/dev/null 2>&1 || true
  python3 scripts/layout/crops.py "$OUT/$1.png" "$OUT/$1-check"/check-*.json "$OUT/$1"
}
/usr/bin/git checkout "$REF" -- components constants
trap '/usr/bin/git checkout HEAD -- components constants' EXIT
un avant
/usr/bin/git checkout HEAD -- components constants
trap - EXIT
un apres
