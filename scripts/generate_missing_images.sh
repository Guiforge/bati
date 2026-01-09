#!/bin/bash
# Generate only the missing BATI images referenced by SQL seeds (plus optional village matrix)
#
# Usage:
#   ./scripts/generate_missing_images.sh [--dry-run] [--limit N] [--threads N] [--max-errors N] [--include-village]
#
# Examples:
#   ./scripts/generate_missing_images.sh --dry-run
#   ./scripts/generate_missing_images.sh --threads 3 --max-errors 5
#   ./scripts/generate_missing_images.sh --include-village --limit 10

# Don't use set -e: we want a non-zero exit from the python script to still show logs clearly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PY_SCRIPT="$SCRIPT_DIR/generate_missing_images.py"

if [ ! -f "$PY_SCRIPT" ]; then
  echo "❌ Missing script: $PY_SCRIPT"
  exit 1
fi

cd "$PROJECT_ROOT" || exit 1

echo "🧩 BATI Missing Image Generator"
echo "================================"
echo "Scanning SQL for referenced assets in:"
echo "  - drizzle/*.sql"
echo "  - src/drizzle/*.sql"
echo ""

if command -v uv >/dev/null 2>&1; then
  uv run "$PY_SCRIPT" "$@"
else
  python3 "$PY_SCRIPT" "$@"
fi
