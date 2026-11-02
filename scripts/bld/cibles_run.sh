#!/bin/sh
# One FLUX script at a time: the four directions in sequence, then the diff gate.
cd "$(dirname "$0")/../.." || exit 1
BFL_API_KEY=$(sed -n "s/^BFL_API_KEY=//p" /home/guiforge/Documents/code/bati/.env | tr -d "\"'"); export BFL_API_KEY
for d in windmill_A windmill_B windmill_C observatory_C; do
  python3 scripts/bld/cibles_e1.py paint "$d" || exit 1
done
python3 scripts/bld/cibles_e1.py post
