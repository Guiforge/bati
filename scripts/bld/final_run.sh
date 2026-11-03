#!/bin/sh
# Runs one final_paint.py command with the BFL key from the main checkout's .env (never printed).
# usage: scripts/bld/final_run.sh <command> [arg]
set -e
KEY=$(sed -n 's/^BFL_API_KEY=//p' /home/guiforge/Documents/code/bati/.env | head -1 | tr -d "\"'")
BFL_API_KEY="$KEY" exec python3 "$(dirname "$0")/final_paint.py" "$@"
