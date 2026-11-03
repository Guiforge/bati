#!/bin/sh
# Runs one command of final_paint.py (or of $SCRIPT, e.g. SCRIPT=final_elements.py) with the BFL key read from the main
# checkout's .env (never printed). usage: [SCRIPT=final_elements.py] scripts/bld/final_run.sh <command> [arg]
set -e
KEY=$(sed -n 's/^BFL_API_KEY=//p' /home/guiforge/Documents/code/bati/.env | head -1 | tr -d "\"'")
BFL_API_KEY="$KEY" exec python3 "$(dirname "$0")/${SCRIPT:-final_paint.py}" "$@"
