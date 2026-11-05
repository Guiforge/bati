#!/usr/bin/env bash
# Rebuilds the atelier and prints tier 12's occlusion, props and hooks lists at the tallest stage: mesure12.sh [tier] [query]
cd "$(dirname "$0")/../.."
TIER="${1:-12}"; Q="${2:-haut=1}"
node scripts/atelier/atelier.js render --tier 1 --light jour --out "$(mktemp -d)" >/dev/null 2>&1
node scripts/atelier/atelier.js check --tier "$TIER" --light jour --query "$Q" --no-build 2>&1 | rg "^GATE (occlusion|props|hooks|anchors|tap|FAILED)|^  [a-z_0-9]+ +[0-9.]+ %|covered" | cut -c1-175
