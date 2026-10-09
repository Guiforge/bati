#!/usr/bin/env bash
# Push a database built by village-states.py onto the emulator, or put dev.db.orig back.
#   scripts/village-states-push.sh <state|orig> [db dir, default ~/.cache/bati-village/db]
# Emulator only (emulator-5554): the phone holds a real hero. Recipe from the device-check skill.
set -euo pipefail
state=${1:?usage: village-states-push.sh <state|orig> [dir]}
dir=${2:-$HOME/.cache/bati-village/db}
src="$dir/$state.db"; [ "$state" = orig ] && src="$dir/dev.db.orig"
a() { adb -s emulator-5554 "$@"; }
pkg=com.guiforge.bati.dev
a shell am force-stop $pkg
a push "$src" /data/local/tmp/village.db >/dev/null
a shell "run-as $pkg cp /data/local/tmp/village.db files/SQLite/bati.v3.db && run-as $pkg rm -f files/SQLite/bati.v3.db-wal files/SQLite/bati.v3.db-shm && rm /data/local/tmp/village.db"
a shell monkey -p $pkg -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
echo "pushed $state"
