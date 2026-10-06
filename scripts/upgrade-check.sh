#!/usr/bin/env bash
# Does a real update keep a hero? Installs the previous APK on an emulator, gives it a three-year
# hero, installs the new APK over it (`adb install -r`, exactly what an update is), and compares
# what the hero reads: level, village, and the counts under them.
#
# Run by hand before every tag. It is not in CI: it needs an emulator and two release builds.
#
#   scripts/upgrade-check.sh OLD.apk NEW.apk [--device emulator-5554] [--package com.guiforge.bati.perf]
#
# Both APKs must be signed with the same key and carry the same application id, or Android refuses
# the update (and the tempting fix, uninstalling, is what erases the database). The released APKs
# are signed with the release key, which is not on a laptop, so build the pair locally, both with
# the debug key and the `.perf` id:
#
#   git worktree add ../bati-old v2.8.0 && cd ../bati-old && npm ci
#   cp <repo>/android/app/debug.keystore android/app/   # gitignored, missing in a fresh worktree
#   cd android && ./gradlew :app:assembleRelease -PbatiLocalId=.perf -PreactNativeArchitectures=x86_64
#   # the APK: android/app/build/outputs/apk/release/app-release.apk; the same from this checkout
#
# x86_64, because an arm64 build crashes under the emulator's translation. The emulator must be a
# `google_apis` image (not `google_apis_playstore`): the script needs `adb root` to put a database
# where a release app, which is not debuggable, can read it.
#
# Needs on the host: adb, sqlite3, and Node 22.18 or later (it reads the seed SQL from a .ts file).
# Run it from the repo root.
#
# It passes when nothing the hero reads moved, and fails, listing each figure that did, when the
# update lost or changed anything, when the app does not come back up, or when the new build left
# no `premigrate.db` behind (pass --allow-no-premigrate for a NEW build that predates it). To see
# it fail, build an APK with a migration that deletes rows and run it as NEW.
set -euo pipefail

# The figures, as `name=value` lines. One place, so before and after are read the same way.
# $1: the pulled database, $2: the Home screen dump.
figures() {
  local db="$1" dump="$2"
  sqlite3 "$db" "SELECT 'sessions=' || COUNT(*) FROM completed_sessions;
                 SELECT 'exercises=' || COUNT(*) FROM completed_exercises;
                 SELECT 'xp=' || COALESCE(SUM(xpEarned), 0) FROM completed_sessions;"
  # What is on screen, not what is in the table: a level is computed, and a computation is what
  # an update can change without touching a row.
  echo "level=$(grep -oE '(Level|Niveau|Stufe|Nivel) [0-9]+' "$dump" | head -1 || true)"
  # The village by its spoken label: a release build drops `testID` from the accessibility tree,
  # and the label is what a screen reader says, so it is also what is stable. The flame left Home's
  # strip in 2.9.0; `golden-hero` holds its figure.
  # Its name only: the name comes from the tier, so it freezes the tier, while the rest of the label
  # ("Tier 11. Open the village") is copy that a release is free to reword.
  echo "village=$(grep -oE 'content-desc="[^"]*Open the village"' "$dump" | head -1 \
    | sed -E 's/content-desc="([^.,"]*).*/\1/' || true)"
}

# Fails, listing each figure that differs, unless `after` equals `before` on every line they share.
# $1, $2: files of `name=value` lines.
compare() {
  local before="$1" after="$2" status=0 line name b a
  while IFS= read -r line; do
    name="${line%%=*}"
    b="${line#*=}"
    a="$(grep -m1 "^${name}=" "$after" | cut -d= -f2- || true)"
    if [ "$a" != "$b" ]; then
      echo "  ${name}: ${b} -> ${a:-<missing>}" >&2
      status=1
    fi
  done <"$before"
  return "$status"
}

# `source`d by the tests: the comparison is the part worth proving without an emulator.
if [ "${UPGRADE_CHECK_SOURCE_ONLY:-}" = "1" ]; then
  # shellcheck disable=SC2317 # `return` works when sourced, `exit` when run: one of them is always reached
  return 0 2>/dev/null || exit 0
fi

device="${ANDROID_SERIAL:-}"
package="com.guiforge.bati.perf"
need_premigrate=1
apks=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --device) device="${2:-}"; shift 2 || shift ;;
    --package) package="${2:-}"; shift 2 || shift ;;
    --allow-no-premigrate) need_premigrate=0; shift ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) apks+=("$1"); shift ;;
  esac
done
old_apk="${apks[0]:-}"
new_apk="${apks[1]:-}"

if [ ! -f "$old_apk" ] || [ ! -f "$new_apk" ]; then
  sed -n '2,12p' "$0" >&2
  exit 2
fi

# Always named, and always an emulator. This script uninstalls the app and rewrites its database;
# on 2026-09-13 a Maestro run that guessed its device did exactly that to a phone on the desk.
if [ -z "$device" ]; then
  mapfile -t devices < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
  if [ "${#devices[@]}" -ne 1 ]; then
    echo "Expected exactly one device, found ${#devices[@]}. Pass --device emulator-5554." >&2
    exit 2
  fi
  device="${devices[0]}"
fi
case "$device" in
  emulator-*) ;;
  *) echo "Refusing ${device}: this wipes the app's data, and only an emulator is allowed." >&2; exit 2 ;;
esac

a() { adb -s "$device" "$@"; }
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
dir="/data/data/${package}/files/SQLite"

launch() {
  a shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
}

# The database is written to a WAL, so the main file alone is a stale copy: pull all three and let
# sqlite fold the log in.
pull_db() {
  local out="$1" name
  name="$(a shell "ls ${dir}/*.db" | tr -d '\r' | head -1 | xargs -n1 basename)"
  rm -f "$out" "$out-wal" "$out-shm"
  a pull "${dir}/${name}" "$out" >/dev/null
  a pull "${dir}/${name}-wal" "$out-wal" >/dev/null 2>&1 || true
  a pull "${dir}/${name}-shm" "$out-shm" >/dev/null 2>&1 || true
  sqlite3 "$out" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null
  rm -f "$out-wal" "$out-shm"
  echo "$name"
}

home_dump() {
  # Past the splash and the first queries. A fixed wait, because there is no marker to poll that
  # a release build exposes before the thing being read is itself on screen.
  sleep 15
  a shell uiautomator dump /sdcard/home.xml >/dev/null 2>&1
  a shell cat /sdcard/home.xml >"$1"
}

echo "== Clean slate on ${device}"
a root >/dev/null
a wait-for-device
# `adb root` only works on a google_apis image. Without it every later step fails 90 s in, with a
# message about something else.
if [ "$(a shell id -u | tr -d '\r')" != "0" ]; then
  echo "adb root did not take: use a google_apis emulator image, not google_apis_playstore." >&2
  exit 2
fi
a uninstall "$package" >/dev/null 2>&1 || true

echo "== Install the previous build and let it migrate"
a install -r "$old_apk" >/dev/null
launch
for _ in $(seq 1 45); do
  sleep 2
  if name="$(pull_db "$work/old.db" 2>/dev/null)" \
    && [ "$(sqlite3 "$work/old.db" 'SELECT COUNT(*) FROM __drizzle_migrations' 2>/dev/null || echo 0)" -gt 0 ]; then
    break
  fi
done
migrations_old="$(sqlite3 "$work/old.db" 'SELECT COUNT(*) FROM __drizzle_migrations')"
echo "   ${migrations_old} migrations applied by the old build"

echo "== Give the hero three years"
a shell am force-stop "$package"
node --input-type=module -e '
  import { historyStatements } from "./db/historyStatements.ts";
  const [sessions, exercises] = historyStatements(3, Math.floor(Date.now() / 1000));
  console.log(sessions + ";\n" + exercises + ";");
' >"$work/seed.sql"
sqlite3 "$work/old.db" <"$work/seed.sql"
sqlite3 "$work/old.db" "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('hasFinishedOnboarding', 'true');"
uid="$(a shell stat -c %u "/data/data/${package}" | tr -d '\r')"
a push "$work/old.db" /data/local/tmp/upgrade-check.db >/dev/null
a shell "rm -f ${dir}/${name}-wal ${dir}/${name}-shm && cp /data/local/tmp/upgrade-check.db ${dir}/${name} \
  && chown ${uid}:${uid} ${dir}/${name} && restorecon ${dir}/${name}; rm -f /data/local/tmp/upgrade-check.db"

launch
home_dump "$work/before.xml"
a shell am force-stop "$package"
pull_db "$work/before.db" >/dev/null
figures "$work/before.db" "$work/before.xml" >"$work/before.txt"
sed 's/^/   /' "$work/before.txt"
# Both read off the screen. An empty one on both sides would compare equal and prove nothing.
for shown in level village; do
  if ! grep -q "^${shown}=.\+" "$work/before.txt"; then
    echo "The old build never showed its ${shown} on Home, so there is nothing to compare. Is the emulator awake?" >&2
    exit 1
  fi
done

echo "== Install the new build over it"
a shell am force-stop "$package"
a logcat -c
a install -r "$new_apk" >/dev/null
launch
home_dump "$work/after.xml"

# Read while it is still running, then stop it: a database pulled under a live app can be torn.
status=0
if [ -z "$(a shell pidof "$package" | tr -d '\r')" ]; then
  echo "  the app is not running after the update" >&2
  status=1
fi
if a logcat -d -b crash | grep -q "$package"; then
  echo "  the app crashed after the update:" >&2
  a logcat -d -b crash | grep -A8 "$package" | head -20 >&2
  status=1
fi
a shell am force-stop "$package"
pull_db "$work/after.db" >/dev/null
figures "$work/after.db" "$work/after.xml" >"$work/after.txt"
migrations_new="$(sqlite3 "$work/after.db" 'SELECT COUNT(*) FROM __drizzle_migrations')"
sed 's/^/   /' "$work/after.txt"
echo "   ${migrations_new} migrations applied after the update"

# The net under the update: a build that migrated without leaving a copy has a broken guard.
if [ "$need_premigrate" -eq 1 ] \
  && [ "$migrations_new" -gt "$migrations_old" ] \
  && ! a shell "ls ${dir}/premigrate.db" >/dev/null 2>&1; then
  echo "  no premigrate.db after an update that ran migrations" >&2
  status=1
fi
if [ "$migrations_new" -lt "$migrations_old" ]; then
  echo "  migrations: ${migrations_old} -> ${migrations_new}" >&2
  status=1
fi
compare "$work/before.txt" "$work/after.txt" || status=1

if [ "$status" -eq 0 ]; then
  echo "OK: the hero came through the update unchanged."
else
  echo "FAILED: the update changed what the hero reads, listed above." >&2
fi
exit "$status"
