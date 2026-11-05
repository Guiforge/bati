#!/usr/bin/env bash
# Rebuilds the atelier, then the gates of tiers 1 to 12 by day at the default stage and at the tallest (haut=1), one run after the other.
# Writes DIR/defaut.txt and DIR/haut.txt: portes-tout.sh DIR
cd "$(dirname "$0")/../.."
DIR="$1"; mkdir -p "$DIR"
node scripts/atelier/atelier.js render --tier 1 --light jour --out "$(mktemp -d)" >/dev/null 2>&1
scripts/layout/portes.sh > "$DIR/defaut.txt" 2>&1
scripts/layout/portes.sh haut=1 > "$DIR/haut.txt" 2>&1
echo done > "$DIR/fini.txt"
