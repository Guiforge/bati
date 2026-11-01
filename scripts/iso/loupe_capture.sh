#!/usr/bin/env bash
# Loupe captures: one cold start per entry of a spec, a screenshot and the sprite dump of each, on the
# emulator, `.perf` build (like loop_capture.sh).
#
#   scripts/iso/loupe_capture.sh <out-dir> <spec.json>
#
# spec.json is a list of {name, query, video?}:
#   [{"name": "palier-12-jour", "query": "palier=12&ambiance=jour&fige=1&peint=tout"},
#    {"name": "forge-pres",     "query": "foyer=forge&zoom=2&lumieres=0", "video": 5}]
# `query` is the query string of bati://dev-iso (palier=, ambiance=, zoom=, foyer=, vocation=, fige=1,
# peint=tout, lumieres=0, ...). nu=1 is added unless the query has its own `nu=` (the bare map fills the
# screen); dump=<name> is added by this script. Per entry it writes <out>/<name>.png and
# <out>/<name>.json (the dump, loupe_checks.py's format). With "video": N (seconds), the map is then
# recorded for N seconds, and loupe_crop.py sheet makes <out>/<name>-planche.png; the mp4 stays out of
# the repo in ~/.cache/bati-art-loop/iso/loupe/<out folder name>/.
#
# The dump comes from logcat (ReactNativeJS, level E), because a release build is not debuggable and
# run-as is not available: scripts/iso/loupe_dump_pull.py rebuilds it. By hand:
#   scripts/iso/team/emu-adb.sh logcat -d -s ReactNativeJS:E | scripts/iso/loupe_dump_pull.py <name> > <name>.json
#
# Refuses a non-empty output folder and replaces no file. Empties Glide's image cache first, as
# loop_capture.sh does. Never resets the app's data.
set -uo pipefail

out=${1:?usage: loupe_capture.sh <out-dir> <spec.json>}
spec=${2:?usage: loupe_capture.sh <out-dir> <spec.json>}
root=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$root" || exit 1
[ -f "$spec" ] || { echo "loupe_capture.sh: $spec not found." >&2; exit 1; }
jq -e 'type == "array" and length > 0 and all(.[]; (.name | type == "string" and test("^[A-Za-z0-9_.-]+$")) and (.query | type == "string"))' "$spec" >/dev/null ||
  { echo "loupe_capture.sh: $spec must be a list of {name (letters, digits, _ . -), query, video?}." >&2; exit 1; }
dup=$(jq -r '[.[].name] | group_by(.) | map(select(length > 1) | .[0]) | .[]' "$spec")
[ -z "$dup" ] || { echo "loupe_capture.sh: duplicate names in the spec: $dup" >&2; exit 1; }
vids="$HOME/.cache/bati-art-loop/iso/loupe/$(basename "$out")"
for d in "$out" "$vids"; do
  if [ -d "$d" ] && [ -n "$(ls -A "$d")" ]; then echo "loupe_capture.sh: $d is not empty, refusing." >&2; exit 1; fi
done
mkdir -p "$out" "$vids" || exit 1
adb=scripts/iso/team/emu-adb.sh
maestro=scripts/iso/team/emu-maestro.sh
pkg=com.guiforge.bati.perf

# Cold start on the map each time: no state left from the previous entry. logcat is cleared first so
# the dump found afterwards is this start's.
open_link() { # full query string of bati://dev-iso
  $adb shell am force-stop $pkg
  $adb logcat -c
  $adb shell "am start -W -a android.intent.action.VIEW -d 'bati://dev-iso?$1' $pkg" >/dev/null
}

# Empty Glide's image cache (it can serve another build's sprite): the flow taps the dev button
# "iso-vider-cache", which only the bar shows, so the map opens WITH the bar; then a force-stop.
open_link "fige=1&ambiance=jour"
sleep 6
$maestro test .maestro/iso-loop-cache.yaml >/dev/null 2>&1 || echo "loupe_capture.sh: cache flow failed." >&2
$adb shell am force-stop $pkg

# Waits for the last chunk of the dump in the log (the app writes it 4 s after the map settles), 25 s at most.
attend_dump() { # name
  local n
  for _ in $(seq 1 50); do
    n=$($adb logcat -d -s ReactNativeJS:E | tr -d '\r' | sed -n "s/.*ISO_DUMP $1 \([0-9]*\)\/\([0-9]*\) .*/\1 \2/p" | awk '$1 == $2' | wc -l)
    [ "$n" -gt 0 ] && return 0
    sleep 0.5
  done
  return 1
}

fail=0
# On fd 3: adb and maestro read stdin and would swallow the rest of the list.
while IFS= read -r entry <&3; do
  name=$(jq -r '.name' <<<"$entry")
  query=$(jq -r '.query' <<<"$entry")
  secs=$(jq -r '.video // 0' <<<"$entry")
  for f in "$out/$name.png" "$out/$name.json" "$out/$name-planche.png"; do
    [ -e "$f" ] && { echo "loupe_capture.sh: $f exists, not replaced." >&2; fail=1; continue 2; }
  done
  case "&$query&" in *"&nu="*) ;; *) query="nu=1${query:+&$query}" ;; esac
  case "&$query&" in *"&dump="*) ;; *) query="$query&dump=$name" ;; esac
  open_link "$query"
  if ! attend_dump "$name"; then echo "loupe_capture.sh: $name: no dump in the log after 25 s (map mode only; a ready demo writes none)." >&2; fail=1; fi
  sleep 1
  $adb exec-out screencap -p >"$out/$name.png"
  if $adb logcat -d -s ReactNativeJS:E | tr -d '\r' | scripts/iso/loupe_dump_pull.py "$name" >"$out/$name.json"; then
    echo "loupe_capture.sh: $name: $out/$name.png, $out/$name.json"
  else
    rm -f "$out/$name.json"; fail=1
  fi
  if [ "$secs" -gt 0 ] 2>/dev/null; then
    f=/sdcard/loupe_$name.mp4
    $adb shell screenrecord --bit-rate 8000000 --time-limit "$secs" $f
    $adb pull $f "$vids/$name.mp4" >/dev/null && $adb shell rm $f
    scripts/iso/loupe_crop.py sheet "$vids/$name.mp4" "$out/$name-planche.png" || fail=1
  fi
done 3< <(jq -c '.[]' "$spec")
$adb shell am force-stop $pkg
[ "$fail" -eq 0 ] && echo "loupe_capture.sh: done, $out" || echo "loupe_capture.sh: done with failures, $out" >&2
exit "$fail"
