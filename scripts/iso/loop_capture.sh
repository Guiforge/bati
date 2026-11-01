#!/usr/bin/env bash
# Visual loop capture: the same shots, videos, frames and gfxinfo at every iteration, on the emulator.
#
#   scripts/iso/loop_capture.sh docs/designs/village-loop/iter-01
#
# Needs the `.perf` build installed (scripts/iso/team/heavy.sh --gradle scripts/iso/team/gradle-perf.sh,
# then emu-adb.sh install -r ...). Never resets the app; refuses a non-empty output folder, so it
# never replaces a file. Videos (over 2 MB) go to ~/.cache/bati-art-loop/iso/village-loop/<iter>/;
# stills, frames, contact sheets, gfxinfo and manifest.json stay in <out>. About 7 minutes.
# Every opening passes nu=1 (dev-iso hides its control bar, the map fills the screen), the tier and
# the Prêt mode come from the link (palier=, mode=pret), so no Maestro flow is needed. The one
# exception is zoom-max-forge, whose 8 presses of "+" need the bar: it opens without nu.
# A sheet or still over 2 MB goes out as .webp. ffmpeg runs with -n: nothing is ever overwritten.
set -uo pipefail

out=${1:?usage: loop_capture.sh <output folder>}
root=$(cd "$(dirname "$0")/../.." && pwd) || exit 1
cd "$root" || exit 1
iter=$(basename "$out")
vids="$HOME/.cache/bati-art-loop/iso/village-loop/$iter"
for d in "$out" "$vids"; do
  if [ -d "$d" ] && [ -n "$(ls -A "$d")" ]; then echo "loop_capture.sh: $d is not empty, refusing." >&2; exit 1; fi
done
mkdir -p "$out/frames" "$vids" || exit 1
adb=scripts/iso/team/emu-adb.sh
maestro=scripts/iso/team/emu-maestro.sh
pkg=com.guiforge.bati.perf
head_sha=$(/usr/bin/git rev-parse HEAD)
jl=$(mktemp)
trap 'rm -f "$jl"' EXIT

note() { # file kind palier ambiance zoom detail
  jq -n --arg f "$1" --arg k "$2" --arg p "$3" --arg a "$4" --arg z "$5" --arg d "$6" \
    '{file:$f,kind:$k,palier:$p,ambiance:$a,zoom:$z,detail:$d}' >>"$jl"
}
# Cold start on the map each time: no state left from the previous shot.
open_link() { # full query string of bati://dev-iso
  $adb shell am force-stop $pkg
  $adb shell "am start -W -a android.intent.action.VIEW -d 'bati://dev-iso?$1' $pkg" >/dev/null
  sleep 6
}
# Painted surroundings layers (flags in constants/isoPoc.ts ALENTOURS): ISO_PEINT=aucun to capture without them.
peint="peint=${ISO_PEINT:-tout}"
open_map() { open_link "nu=1&$peint&$1"; }  # bare map: the control bar is hidden
open_bar() { open_link "$peint&$1"; }       # keeps the bar, only for a flow that taps one of its buttons
flow() { $maestro test "$@" >/dev/null 2>&1 || echo "loop_capture.sh: flow failed: $*" >&2; }
shot() { # name: never replaces a file
  [ -e "$out/$1.png" ] && { echo "loop_capture.sh: $1.png exists, not replaced." >&2; return 1; }
  sleep 1; $adb exec-out screencap -p >"$out/$1.png"
}
# Prints the final file name of an image: a PNG over 2 MB is written next to it as .webp and removed.
leger() { # path-without-extension
  local base=$1
  if [ "$(stat -c%s "$base.png")" -gt 2097152 ] && [ ! -e "$base.webp" ] &&
    ffmpeg -loglevel error -n -i "$base.png" -c:v libwebp -quality 90 "$base.webp"; then
    rm "$base.png"; echo "${base##*/}.webp"
  else echo "${base##*/}.png"; fi
}
still() { # name palier ambiance zoom detail [extra query]
  open_map "fige=1&ambiance=$3&palier=$2${6:+&$6}"
  shot "$1" || return
  note "$(leger "$out/$1")" still "$2" "$3" "$4" "$5"
}

# Empty Glide's image cache before the series (it can serve another build's sprite): the flow taps the dev
# button "iso-vider-cache", which only the bar shows, so the map opens WITH the bar; then a force-stop.
open_bar "fige=1&ambiance=jour"
flow .maestro/iso-loop-cache.yaml
$adb shell am force-stop $pkg

# --- Stills: frozen (fige=1), day unless stated ---------------------------------------------------
for p in 1 6 12; do still "palier-$p-jour" $p jour cadre Cadrer; done
still palier-1-nuit 1 nuit cadre Cadrer
still palier-12-nuit 12 nuit cadre Cadrer
still zoom-defaut 12 jour ouverture "cadrage d'ouverture de la page, rien touché"
# The one shot that needs the bar: 8 presses of "+" (a measured drag first, see iso-loop-zoom.yaml).
open_bar "fige=1&ambiance=jour"
flow -e PALIER=12 .maestro/iso-loop-zoom.yaml
shot zoom-max-forge && note "$(leger "$out/zoom-max-forge")" still 12 jour "max" "forge au centre, 8 crans de +, barre de dev visible"
still village-course 12 jour cadre "village de vocation course (statue du coureur)" "vocation=course"
still village-callisthenie 12 jour cadre "village de vocation callisthénie" "vocation=callisthenie"

# --- Videos: 10 s (the rest video 60 s), gfxinfo reset before and read after, frames at 10 fps, contact sheet
video() { # name action palier ambiance zoom [seconds, default 10]
  local n=$1 act=$2 f=/sdcard/loop_$1.mp4 secs=${6:-10}
  # one frame of the sheet in every `step` of the 10 fps sequence: 20 tiles whatever the length
  local step=$((secs * 10 / 20))
  $adb shell dumpsys gfxinfo $pkg reset >/dev/null
  $adb shell screenrecord --bit-rate 8000000 --time-limit "$secs" $f &
  local rec=$!
  sleep 1
  $act
  wait $rec
  $adb shell dumpsys gfxinfo $pkg >"$out/gfxinfo-$n.txt"
  $adb pull $f "$vids/$n.mp4" >/dev/null && $adb shell rm $f
  mkdir -p "$out/frames/$n"
  ffmpeg -loglevel error -n -i "$vids/$n.mp4" -vf "fps=10,scale=540:-2,format=yuvj420p" -q:v 4 "$out/frames/$n/%03d.jpg"
  # A screen that never changes records one frame without a duration, which `fps` drops: keep that frame.
  [ -e "$out/frames/$n/001.jpg" ] || ffmpeg -loglevel error -n -i "$vids/$n.mp4" -vf "scale=540:-2,format=yuvj420p" -q:v 4 -frames:v 1 -fps_mode passthrough "$out/frames/$n/001.jpg"
  # one frame in five, numbered with its position in the 10 fps sequence
  ffmpeg -loglevel error -n -framerate 10 -i "$out/frames/$n/%03d.jpg" \
    -vf "select='not(mod(n,$step))',scale=270:-2,drawtext=fontfile=/usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf:text='%{eif\:n*$step+1\:d}':x=6:y=6:fontsize=30:fontcolor=yellow:box=1:boxcolor=black@0.7,tile=5x4" \
    -frames:v 1 -fps_mode passthrough "$out/$n-planche.png"
  local sheet; sheet=$(leger "$out/$n-planche")
  note "$n.mp4" video "$3" "$4" "$5" "$vids/$n.mp4 (hors dépôt, ${secs} s), frames/$n/, $sheet, gfxinfo-$n.txt"
}
# The clock lives 60 s after focus or a touch (MODE_VIE continu): wake the map with one tap on bare
# grass, as a player would. With nu=1 the map fills the screen and B1 tightened the opening zoom:
# EVERY coordinate below was measured before both and is to be measured again (marked TO REMEASURE).
# Measured on f4609110 (bare map, tier 12 frame fitted to the village, 1080x2400).
act_repos() { $adb shell input tap 540 1800; sleep 8; }  # bare meadow under the village
act_repos60() { $adb shell input tap 540 1800; sleep 61; } # same tap; the beasts' hops at 15, 30, 45 s (H1-08)
act_pret() { sleep 9; } # no tap: mode=pret&jouer=1 claims the ready building itself 1.5 s in (H3-01)
act_glisse() {
  $adb shell input swipe 800 1700 300 1500 700; sleep 1
  for _ in 1 2 3 4 5; do $adb shell input tap 162 782; sleep 0.4; done # the bar's "+" (opened with open_bar)
  $adb shell input swipe 300 1500 800 1800 700
}
open_map "ambiance=jour&palier=12"
video repos act_repos 12 jour cadre
open_map "ambiance=jour&palier=12"
video repos-60s act_repos60 12 jour cadre 60
# jouer=1 claims 1.5 s after mount: open the link while recording, or the reveal is over before the film starts.
act_pret_nuit() { $adb shell am force-stop $pkg; $adb shell "am start -a android.intent.action.VIEW -d 'bati://dev-iso?nu=1&$peint&mode=pret&jouer=1&ambiance=nuit&palier=12' $pkg" >/dev/null; sleep 8; }
act_pret_jour() { $adb shell am force-stop $pkg; $adb shell "am start -a android.intent.action.VIEW -d 'bati://dev-iso?nu=1&$peint&mode=pret&jouer=1&ambiance=jour&palier=12' $pkg" >/dev/null; sleep 8; }
video montee-de-stade-nuit act_pret_nuit 12 nuit cadre
video montee-de-stade-jour act_pret_jour 12 jour cadre
open_bar "ambiance=jour&palier=12"
video glisse-zoom act_glisse 12 jour "cadre puis +5 crans"

# --- Manifest ---------------------------------------------------------------------------------------
jq -s --arg h "$head_sha" --arg d "$(date -Iseconds)" --arg i "$iter" \
  '{iter:$i,head:$h,date:$d,device:"emulator (bati-bench), build .perf",files:.}' "$jl" >"$out/manifest.json"
echo "loop_capture.sh: done, $out/manifest.json"
