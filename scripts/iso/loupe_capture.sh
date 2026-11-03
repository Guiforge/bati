#!/usr/bin/env bash
# Loupe captures: one cold start per entry of a spec, a screenshot and the sprite dump of each, on the
# emulator, `.perf` build (like loop_capture.sh).
#
#   scripts/iso/loupe_capture.sh <out-dir> <spec.json>
#
# spec.json is a list of {name, query, video?, sheetStart?, sheetEnd?}:
#   [{"name": "palier-12-jour", "query": "palier=12&ambiance=jour&fige=1"},
#    {"name": "forge-pres",     "query": "foyer=forge&zoom=2&lumieres=0", "video": 5}]
# `query` is the query string of bati://dev-iso (palier=, ambiance=, zoom=, foyer=, vocation=, fige=1,
# lumieres=0, ...). nu=1 is added unless the query has its own `nu=` (the bare map fills the
# screen); dump=<name> is added by this script. Per entry it writes <out>/<name>.png and
# <out>/<name>.json (the dump, loupe_checks.py's format). With "video": N (seconds), the map is then
# recorded for N seconds, and loupe_crop.py sheet-all makes <out>/<name>-planche.png (12 frames spread
# over the whole film; a bld= link is cropped to the centred square, where the building stands); the
# mp4 stays out of the repo in ~/.cache/bati-art-loop/iso/loupe/<out folder name>/. The script prints
# each film's measured length and warns when it is under half of N (an empty film).
# "sheetStart" / "sheetEnd" (seconds) narrow the 12 frames to a window of the film, counted from the
# first frame that is not black (loupe_crop.py --from-lit): the app takes a few seconds to start, and
# a show starts `delai` seconds after that, so a show with delai=6 and 4 s of gesture is
# "sheetStart": 5.5, "sheetEnd": 9.5. Left out, the whole film.
# A link with bld= and show= (the buildings track) is recorded from BEFORE it opens, so the show,
# which starts `delai=` seconds after the app has mounted, is in the film: give N room for a cold
# start (about 4 s) plus delai plus the show. A bld= link has no sprite dump: none is waited for.
#
# The dump comes from logcat (ReactNativeJS, level E), because a release build is not debuggable and
# run-as is not available: scripts/iso/loupe_dump_pull.py rebuilds it. By hand:
#   scripts/iso/team/emu-adb.sh logcat -d -s ReactNativeJS:E | scripts/iso/loupe_dump_pull.py <name> > <name>.json
#
# Before any capture it checks the build (scripts/iso/build_guard.py, record written by
# scripts/iso/team/install-build.sh): the device must still hold that install, and the build's commit
# must be HEAD, or differ from it by docs/ only. Else it refuses. It then writes <out>/build-commit.txt
# and <out>/manifest.tsv (name, build sha, the full URL really opened, nu=1 and dump= included).
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
  { echo "loupe_capture.sh: $spec must be a list of {name (letters, digits, _ . -), query, video?, sheetStart?, sheetEnd?}." >&2; exit 1; }
dup=$(jq -r '[.[].name] | group_by(.) | map(select(length > 1) | .[0]) | .[]' "$spec")
[ -z "$dup" ] || { echo "loupe_capture.sh: duplicate names in the spec: $dup" >&2; exit 1; }
pkg=com.guiforge.bati.perf
rec="$HOME/.cache/bati-builds/$pkg.json"
[ -f "$rec" ] || { echo "loupe_capture.sh: $rec missing, install with scripts/iso/team/install-build.sh." >&2; exit 1; }
devtime=$(scripts/iso/team/emu-adb.sh shell dumpsys package $pkg | tr -d '\r' | sed -n 's/^ *lastUpdateTime=//p' | head -1)
scripts/iso/build_guard.py check "$rec" "$devtime" || exit 1
buildsha=$(jq -r .sha "$rec")
vids="$HOME/.cache/bati-art-loop/iso/loupe/$(basename "$out")"
for d in "$out" "$vids"; do
  if [ -d "$d" ] && [ -n "$(ls -A "$d")" ]; then echo "loupe_capture.sh: $d is not empty, refusing." >&2; exit 1; fi
done
mkdir -p "$out" "$vids" || exit 1
echo "$buildsha" >"$out/build-commit.txt"
adb=scripts/iso/team/emu-adb.sh
maestro=scripts/iso/team/emu-maestro.sh

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

# Reduced motion off the system (transition_animation_scale 0) stops the map's clock: still films.
case $($adb shell settings get global transition_animation_scale | tr -d '\r') in
  0 | 0.0) echo "loupe_capture.sh: transition_animation_scale is 0, the app reads reduced motion: films will not move." >&2 ;;
esac
fail=0
# On fd 3: adb and maestro read stdin and would swallow the rest of the list.
while IFS= read -r entry <&3; do
  name=$(jq -r '.name' <<<"$entry")
  query=$(jq -r '.query' <<<"$entry")
  secs=$(jq -r '.video // 0' <<<"$entry")
  win=()
  if jq -e 'has("sheetStart") or has("sheetEnd")' <<<"$entry" >/dev/null; then
    win=(--from-lit --start "$(jq -r '.sheetStart // 0' <<<"$entry")")
    jq -e 'has("sheetEnd")' <<<"$entry" >/dev/null && win+=(--end "$(jq -r '.sheetEnd' <<<"$entry")")
  fi
  for f in "$out/$name.png" "$out/$name.json" "$out/$name-planche.png"; do
    [ -e "$f" ] && { echo "loupe_capture.sh: $f exists, not replaced." >&2; fail=1; continue 2; }
  done
  case "&$query&" in *"&nu="*) ;; *) query="nu=1${query:+&$query}" ;; esac
  case "&$query&" in *"&dump="*) ;; *) query="$query&dump=$name" ;; esac
  printf '%s\t%s\t%s\n' "$name" "$buildsha" "bati://dev-iso?$query" >>"$out/manifest.tsv"
  film=0; [ "$secs" -gt 0 ] 2>/dev/null && film=1
  bld=0; case "&$query&" in *"&bld="*) bld=1 ;; esac
  f=/sdcard/loupe_$name.mp4
  rec() { $adb shell screenrecord --bit-rate 8000000 --time-limit "$secs" $f </dev/null; }
  early=0
  if [ "$film" = 1 ] && [ "$bld" = 1 ]; then case "&$query&" in *"&show="*) early=1 ;; esac; fi
  if [ "$early" = 1 ]; then rec & recpid=$!; sleep 1; fi # the show must be in the film
  open_link "$query"
  if [ "$bld" = 1 ]; then sleep 6 # no sprite dump in this mode
  elif ! attend_dump "$name"; then echo "loupe_capture.sh: $name: no dump in the log after 25 s (map mode only; a ready demo writes none)." >&2; fail=1; fi
  if [ "$early" = 1 ]; then wait "$recpid"; fi
  sleep 1
  $adb exec-out screencap -p >"$out/$name.png"
  if [ "$bld" = 1 ]; then
    echo "loupe_capture.sh: $name: $out/$name.png"
  elif $adb logcat -d -s ReactNativeJS:E | tr -d '\r' | scripts/iso/loupe_dump_pull.py "$name" >"$out/$name.json"; then
    echo "loupe_capture.sh: $name: $out/$name.png, $out/$name.json"
  else
    rm -f "$out/$name.json"; fail=1
  fi
  if [ "$film" = 1 ]; then
    [ "$early" = 1 ] || rec
    $adb pull $f "$vids/$name.mp4" >/dev/null && $adb shell rm $f
    got=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$vids/$name.mp4" 2>/dev/null)
    echo "loupe_capture.sh: $name: film $vids/$name.mp4, ${got:-unreadable} s of $secs s"
    awk -v g="${got:-0}" -v s="$secs" 'BEGIN { exit !(g + 0 < s / 2) }' && { echo "loupe_capture.sh: $name: film under half of $secs s, empty film?" >&2; fail=1; }
    crop=(); [ "$bld" = 1 ] && crop=(--square)
    scripts/iso/loupe_crop.py sheet-all "$vids/$name.mp4" "$out/$name-planche.png" "${crop[@]}" "${win[@]}" || fail=1
  fi
done 3< <(jq -c '.[]' "$spec")
$adb shell am force-stop $pkg
[ "$fail" -eq 0 ] && echo "loupe_capture.sh: done, $out" || echo "loupe_capture.sh: done with failures, $out" >&2
exit "$fail"
