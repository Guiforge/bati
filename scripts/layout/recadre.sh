#!/usr/bin/env bash
# One render (built first when asked), then a crop of it: recadre.sh NOM TIER LUMIERE "QUERY" W H X Y [--build]
# Writes docs/designs/village/layout/img/NOM.jpg (the crop W x H at X, Y of the 1080 x 2400 screen).
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME="$1"; TIER="$2"; LIGHT="$3"; QUERY="$4"; W="$5"; H="$6"; X="$7"; Y="$8"
TMP="$(mktemp -d)"
ARGS=(render --tier "$TIER" --light "$LIGHT" --out "$TMP")
[ -n "$QUERY" ] && ARGS+=(--query "$QUERY")
[ "${9:-}" = "--build" ] || ARGS+=(--no-build)
node scripts/atelier/atelier.js "${ARGS[@]}" >/dev/null
magick "$TMP"/*.png -crop "${W}x${H}+${X}+${Y}" +repage -quality 88 "docs/designs/village/layout/img/$NAME.jpg"
