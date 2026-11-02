#!/usr/bin/env bash
# Installe un APK sur l'emulateur et enregistre d'ou il vient, pour que loupe_capture.sh le verifie.
#
#   scripts/iso/team/install-build.sh <apk> <paquet>
#
# Lit le commit du build dans build-commit.txt a cote de l'APK (ecrit par gradle-perf.sh), refuse
# sans lui, installe par emu-adb.sh, puis ecrit ~/.cache/bati-builds/<paquet>.json :
# {sha, lastUpdateTime} (lastUpdateTime lu sur l'appareil).
set -uo pipefail

apk=${1:?usage: install-build.sh <apk> <package>}
pkg=${2:?usage: install-build.sh <apk> <package>}
root=$(cd "$(dirname "$0")/../../.." && pwd) || exit 1
cd "$root" || exit 1
f="$(dirname "$apk")/build-commit.txt"
[ -f "$apk" ] || { echo "install-build.sh: $apk not found." >&2; exit 1; }
[ -s "$f" ] || { echo "install-build.sh: $f missing, this APK has no known commit, refusing. Build with gradle-perf.sh." >&2; exit 1; }
sha=$(tr -d '[:space:]' <"$f")
adb=scripts/iso/team/emu-adb.sh
$adb install -r "$apk" || { echo "install-build.sh: install failed." >&2; exit 1; }
t=$($adb shell dumpsys package "$pkg" | tr -d '\r' | sed -n 's/^ *lastUpdateTime=//p' | head -1)
[ -n "$t" ] || { echo "install-build.sh: no lastUpdateTime for $pkg." >&2; exit 1; }
mkdir -p "$HOME/.cache/bati-builds" || exit 1
jq -n --arg sha "$sha" --arg t "$t" '{sha: $sha, lastUpdateTime: $t}' >"$HOME/.cache/bati-builds/$pkg.json" || exit 1
echo "install-build.sh: $pkg from ${sha:0:10}, installed $t"
