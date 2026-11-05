#!/usr/bin/env bash
# The full gate lines of check at tiers 1, 3, 6, 9, 12 by day: portes.sh [query]  (e.g. haut=1). Prints one block per tier.
set -uo pipefail
cd "$(dirname "$0")/../.."
Q="${1:-}"
ARGS=(check --tier "${TIERS:-1,2,3,4,5,6,7,8,9,10,11,12}" --light jour --no-build)
[ -n "$Q" ] && ARGS+=(--query "$Q")
node scripts/atelier/atelier.js "${ARGS[@]}" 2>&1 | rg "^== palier|^GATE (occlusion|anchors|depth|hooks|tap|props)|^GATE FAILED|^  [a-z_]+ +[0-9.]+ %" | cut -c1-175
