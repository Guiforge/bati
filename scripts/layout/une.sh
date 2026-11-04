#!/usr/bin/env bash
# One render to docs/designs/village/layout/img/NAME.jpg (1080 px).  une.sh NAME [tier] [light] [query] [--build]
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME="$1"; TIER="${2:-12}"; LIGHT="${3:-jour}"; QUERY="${4:-}"
TMP="$(mktemp -d)"
ARGS=(render --tier "$TIER" --light "$LIGHT" --out "$TMP")
[ -n "$QUERY" ] && ARGS+=(--query "$QUERY")
[ "${5:-}" = "--build" ] || ARGS+=(--no-build)
node scripts/atelier/atelier.js "${ARGS[@]}" >/dev/null
magick "$TMP"/*.png -resize 1080x -quality 85 "docs/designs/village/layout/img/$NAME.jpg"
