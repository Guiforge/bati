#!/usr/bin/env bash
# Overview folder: fixed stills of the village at every tier, then close-ups, on the emulator.
#
#   scripts/iso/vue_ensemble.sh docs/designs/village-loop/vue-ensemble
#
# Needs the `.perf` build installed (see loop_capture.sh). Never resets the app; refuses a
# non-empty output folder and never replaces a file. A still over 2 MB goes out as .webp.
# Every opening passes nu=1 (bare map) and peint=tout (all painted layers), fige=1 (frozen).
# Contents: the 12 tiers by day; tiers 1, 4, 8, 12 by night; at tier 12 close-ups (foyer=) of ten
# buildings by day and three by night; the five vocations at tier 12 (opening frame + the square).
# About 8 minutes (7 s of render wait per opening: the opening fade waits for the painted ground, 1.5 s cap).
set -uo pipefail

out=${1:?usage: vue_ensemble.sh <output folder>}
root=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$root" || exit 1
if [ -d "$out" ] && [ -n "$(ls -A "$out")" ]; then echo "vue_ensemble.sh: $out is not empty, refusing." >&2; exit 1; fi
mkdir -p "$out" || exit 1
adb=scripts/iso/team/emu-adb.sh
maestro=scripts/iso/team/emu-maestro.sh
pkg=com.guiforge.bati.perf
head_sha=$(/usr/bin/git rev-parse HEAD)
jl=$(mktemp)
trap 'rm -f "$jl"' EXIT

note() { # file palier ambiance foyer detail
  jq -n --arg f "$1" --arg p "$2" --arg a "$3" --arg o "$4" --arg d "$5" \
    '{file:$f,palier:$p,ambiance:$a,foyer:$o,detail:$d}' >>"$jl"
}
# Cold start on the map each time: no state left from the previous shot.
open_map() { # query string of bati://dev-iso (after nu=1&peint=tout&fige=1)
  $adb shell am force-stop $pkg
  $adb shell "am start -W -a android.intent.action.VIEW -d 'bati://dev-iso?nu=1&peint=tout&fige=1&$1' $pkg" >/dev/null
  sleep 7
}
leger() { # path-without-extension: prints the final file name, .webp if the PNG is over 2 MB
  local base=$1
  if [ "$(stat -c%s "$base.png")" -gt 2097152 ] && [ ! -e "$base.webp" ] &&
    ffmpeg -loglevel error -n -i "$base.png" -c:v libwebp -quality 90 "$base.webp"; then
    rm "$base.png"; echo "${base##*/}.webp"
  else echo "${base##*/}.png"; fi
}
still() { # name palier ambiance foyer detail [extra query]
  [ -e "$out/$1.png" ] && { echo "vue_ensemble.sh: $1.png exists, not replaced." >&2; return 1; }
  open_map "ambiance=$3&palier=$2${4:+&foyer=$4}${6:+&$6}"
  $adb exec-out screencap -p >"$out/$1.png"
  note "$(leger "$out/$1")" "$2" "$3" "$4" "$5"
}

# Empty Glide's image cache once (it can serve another build's sprite): the flow taps the dev button,
# which only the bar shows, so this one opening keeps the bar.
$adb shell am force-stop $pkg
$adb shell "am start -W -a android.intent.action.VIEW -d 'bati://dev-iso?peint=tout&fige=1&ambiance=jour' $pkg" >/dev/null
sleep 6
$maestro test .maestro/iso-loop-cache.yaml >/dev/null 2>&1 || echo "vue_ensemble.sh: cache flow failed" >&2
$adb shell am force-stop $pkg

# --- The 12 tiers by day, then 1, 4, 8, 12 by night ---------------------------------------------
for p in 1 2 3 4 5 6 7 8 9 10 11 12; do
  n=$(printf '%02d' $p)
  still "palier-$n-jour" $p jour "" "palier $p, cadrage d'ouverture"
done
for p in 1 4 8 12; do
  n=$(printf '%02d' $p)
  still "palier-$n-nuit" $p nuit "" "palier $p, cadrage d'ouverture"
done

# --- Close-ups at tier 12 ---------------------------------------------------------------------
for b in heroes_hall forge windmill observatory castle_wall champion_arena dragon_lair wizard_tower farm campfire; do
  still "gros-plan-$b-jour" 12 jour $b "gros plan $b, palier 12"
done
for b in heroes_hall forge campfire; do
  still "gros-plan-$b-nuit" 12 nuit $b "gros plan $b, palier 12"
done

# --- Vocations at tier 12 by day: opening frame, then the square -------------------------------
for v in course callisthenie force yoga velo; do
  still "vocation-$v-cadre" 12 jour "" "vocation $v, cadrage d'ouverture" "vocation=$v"
  still "vocation-$v-place" 12 jour campfire "vocation $v, gros plan sur la place" "vocation=$v"
done

jq -s --arg h "$head_sha" --arg d "$(date -Iseconds)" \
  '{head:$h,date:$d,device:"emulator (bati-bench), build .perf",files:.}' "$jl" >"$out/manifest.json"
echo "vue_ensemble.sh: done, $out/manifest.json"
