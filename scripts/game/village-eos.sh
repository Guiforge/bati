#!/usr/bin/env bash
# Runs .maestro/village-end-of-session.yaml on an emulator: a blank hero who trained once and visited
# the village (village-eos-prep), one muscle bumped to just under rank 2, then a real session.
#
#   scripts/game/village-eos.sh [emulator-5554]
#
# Wipes the dev package's data on that emulator. Metro must already run.
set -euo pipefail

serial="${1:-emulator-5554}"
case "$serial" in emulator-*) ;; *) echo "refusing $serial: emulators only" >&2; exit 1 ;; esac
export PATH="$PATH:$HOME/.maestro/bin"
pkg=com.guiforge.bati.dev
a() { adb -s "$serial" "$@"; }

scripts/game/village-flows.sh village-eos-prep "$serial"

copie="$(mktemp -d)"
a shell am force-stop "$pkg"
for f in bati.v3.db bati.v3.db-wal bati.v3.db-shm; do
  a exec-out run-as "$pkg" cat "files/SQLite/$f" >"$copie/$f"
done
python3 -I scripts/game/eos_bump.py "$copie/bati.v3.db"
a push "$copie/bati.v3.db" /data/local/tmp/bati.v3.db >/dev/null
a shell run-as "$pkg" cp /data/local/tmp/bati.v3.db files/SQLite/bati.v3.db
a shell run-as "$pkg" rm -f files/SQLite/bati.v3.db-wal files/SQLite/bati.v3.db-shm
a shell rm /data/local/tmp/bati.v3.db
rm -rf "$copie"

exec maestro --device "$serial" test .maestro/village-end-of-session.yaml
