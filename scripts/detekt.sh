#!/usr/bin/env bash
# Static analysis for the Kotlin, with a detekt this repo pins itself.
#
#   scripts/detekt.sh                  # check, fail on anything not in the baseline
#   scripts/detekt.sh --create-baseline   # regenerate detekt-baseline.xml (shrink it, never widen it)
#
# ktlint owns the style; detekt reads what style cannot: swallowed and over-broad catches, empty
# blocks, complexity. Same shape as scripts/ktlint.sh and for the same reason: a Gradle plugin
# would not survive `expo prebuild` regenerating the modules' build. Rules switched off, and why,
# are in detekt.yml. detekt-baseline.xml holds what was already there on 2026-11-13: a ratchet,
# like android-lint-baseline.xml.
set -euo pipefail

VERSION="1.23.8"
SHA256="2ce2ff952e150baf28a29cda70a363b0340b3e81a55f43e51ec5edffc3d066c1"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/bati-detekt"
JAR="$CACHE/detekt-cli-$VERSION-all.jar"

if [ ! -f "$JAR" ]; then
  echo "detekt $VERSION is not in the cache, fetching it once."
  mkdir -p "$CACHE"
  tmp="$(mktemp "$CACHE/detekt.XXXXXX")"
  curl -fsSL -o "$tmp" \
    "https://github.com/detekt/detekt/releases/download/v$VERSION/detekt-cli-$VERSION-all.jar"
  actual="$(sha256sum "$tmp" | cut -d' ' -f1)"
  if [ "$actual" != "$SHA256" ]; then
    rm -f "$tmp"
    echo "detekt checksum mismatch." >&2
    echo "  expected: $SHA256" >&2
    echo "  got:      $actual" >&2
    exit 1
  fi
  mv "$tmp" "$JAR"
fi

cd "$(dirname "$0")/.."
exec java -jar "$JAR" \
  --input modules \
  --excludes '**/build/**' \
  --config detekt.yml \
  --build-upon-default-config \
  --baseline detekt-baseline.xml \
  "$@"
