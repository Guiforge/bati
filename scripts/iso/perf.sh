#!/usr/bin/env bash
# Village iso V1: perf run for Guillaume's Fairphone. Never run by the team (hook-blocked).
#
#   scripts/iso/perf.sh <serial>
#
# What it assumes: the .perf build (com.guiforge.bati.perf) is already installed, the hero is past
# onboarding with the village you want measured, and the phone is awake and unlocked. Before you
# start, set the screen timeout to 2 minutes or more (Settings > Display > Screen timeout): the
# run lasts about 10 minutes and stops, with a message, the moment the screen goes off or the .perf
# app is no longer in the foreground.
#
# What it never does: install, uninstall, clear data, reboot, wake the screen, or write or delete
# anything on the phone (uiautomator dumps go to stdout, dumpsys output to this computer). It only
# force-stops the .perf app (cold start), resets that app's gfxinfo counters, sends it a
# RUNNING_CRITICAL trim, and sends taps and swipes to it.
#
# It measures, in this order, the same numbers as the emulator run (docs/designs/village-iso-v1/
# reports/L3-T07.md):
#   temoin      production Village tab (flag off, bati://village): cold start, 3 scroll passes
#               (gfxinfo, meminfo after each), 10 s idle
#   iso-village bati://dev-iso in "Onglet Village" mode: 3 page-scroll passes, 3 pan passes on the
#               map, 10 s idle
#   iso-carte   "Carte seule", tier 12: meminfo at the start zoom, x7, x9, 3 pan passes at max zoom,
#               10 s idle, back to the start zoom, 3 pan passes at that framing (whole village) and
#               3 after iso-zoom-06, 3 round trips (max zoom then Cadrer) with meminfo after each,
#               +30 s, then after a RUNNING_CRITICAL trim (Glide only empties its pools from there)
# Raw dumps and summary.md (scripts/iso/perf-summary.sh) go to
# docs/designs/village-iso-v1/evidence/perf-fairphone/<date>-<serial>/.
set -Eeuo pipefail

PHASE=init
trap 'echo "perf.sh: stopped at line $LINENO (phase: $PHASE)" >&2' ERR

if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  echo "usage: $0 <serial>   (the phone's serial, from 'adb devices'; no default)" >&2
  exit 64
fi
SERIAL=$1
PKG=com.guiforge.bati.perf
if ! [[ $SERIAL =~ ^[A-Za-z0-9][A-Za-z0-9._:-]*$ ]]; then
  echo "perf.sh: '$SERIAL' is not a valid adb serial" >&2; exit 64
fi
case "$SERIAL" in
  emulator-*) echo "perf.sh: $SERIAL is an emulator. This script is for the phone." >&2; exit 64 ;;
esac
command -v adb >/dev/null || { echo "perf.sh: adb not found" >&2; exit 1; }
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
root=$(cd "$here/../.." && pwd)

A() { adb -s "$SERIAL" "$@"; }

state=$(A get-state 2>/dev/null | tr -d '\r' || true)
[ "$state" = device ] || { echo "perf.sh: $SERIAL is not a connected, authorised device (state: ${state:-none})" >&2; exit 1; }
pkgs=$(A shell pm list packages "$PKG" | tr -d '\r')
[[ $'\n'$pkgs$'\n' == *$'\npackage:'"$PKG"$'\n'* ]] || { echo "perf.sh: $PKG is not installed on $SERIAL (install it yourself first)" >&2; exit 1; }

# Awake and unlocked, checked at the start of every phase and before every measurement.
eveille() { # [focus]: with 'focus', the .perf app must also be the focused window
  local p w f
  p=$(A shell dumpsys power | tr -d '\r')
  [[ $p == *mWakefulness=Awake* ]] || { echo "perf.sh: l'ecran n'est pas allume (allumez et deverrouillez le telephone, puis relancez)" >&2; return 1; }
  w=$(A shell dumpsys window | tr -d '\r')
  if [[ $w == *isKeyguardShowing=true* || $w == *mShowingLockscreen=true* ]]; then
    echo "perf.sh: le telephone est verrouille (deverrouillez-le, puis relancez)" >&2; return 1
  fi
  if [[ $w != *isKeyguardShowing=* && $w != *mShowingLockscreen=* ]]; then
    echo "perf.sh: impossible de savoir si le telephone est verrouille (ni isKeyguardShowing ni mShowingLockscreen dans dumpsys window)" >&2; return 1
  fi
  if [ "${1:-}" = focus ]; then
    f=$(printf '%s\n' "$w" | grep mCurrentFocus | sed -n 1p || true)
    [[ $f == *"$PKG"* ]] || { echo "perf.sh: $PKG n'est pas au premier plan (fenetre active: ${f:-aucune}), arret avant tout geste" >&2; return 1; }
  fi
}
eveille

size=$(A shell wm size | tr -d '\r' | grep -oE '[0-9]+x[0-9]+' | tail -1 || true)
[[ $size =~ ^[0-9]+x[0-9]+$ ]] || { echo "perf.sh: cannot read the screen size (wm size gave '${size:-nothing}')" >&2; exit 1; }
W=${size%x*}; H=${size#*x}

stamp=$(date +%Y%m%d-%H%M%S)
out=$root/docs/designs/village-iso-v1/evidence/perf-fairphone/$stamp-$SERIAL
mkdir -p "$out"
echo "perf.sh: writing to $out"
{
  echo "serial: $SERIAL"
  echo "model: $(A shell getprop ro.product.model | tr -d '\r')"
  echo "android: $(A shell getprop ro.build.version.release | tr -d '\r')"
  echo "screen: $size, $(A shell wm density | tr -d '\r' | tail -1)"
  echo "app: $(A shell dumpsys package "$PKG" | tr -d '\r' | grep versionName | sed -n 1p || true)"
  echo "date: $(date -Is)"
} > "$out/device.txt"

# ---------- helpers
ui_dump() { A exec-out uiautomator dump /dev/stdout | tr '>' '\n'; }
bounds_of() { # testID -> "x1 y1 x2 y2" on stdout, empty when the view is not on screen
  ui_dump | grep "resource-id=\"$1\"" | sed -n 1p | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | grep -oE '[0-9]+' | tr '\n' ' ' || true
}
tap_id() { # essential tap: the script stops, with a message, when the view is missing
  local b
  eveille focus
  b=$(bounds_of "$1")
  [ -n "$b" ] || { echo "perf.sh: '$1' is not on screen" >&2; return 1; }
  set -- $b
  A shell input tap $((($1 + $3) / 2)) $((($2 + $4) / 2))
}
mode() { # village|carte: switch the dev-iso mode, whichever one the app reopened in
  local want other
  if [ "$1" = village ]; then want=iso-mode-village; other=iso-mode-carte; else want=iso-mode-carte; other=iso-mode-village; fi
  if [ -n "$(bounds_of "$want")" ]; then tap_id "$want"
  elif [ -z "$(bounds_of "$other")" ]; then echo "perf.sh: no iso mode button on screen (is $PKG on bati://dev-iso?)" >&2; return 1
  fi
  sleep 3
}
swipe() { # screen fractions: fx1 fy1 fx2 fy2 ms
  local x1 y1 x2 y2
  eveille focus
  x1=$(awk -v w="$W" -v f="$1" 'BEGIN{printf "%d", w*f}'); y1=$(awk -v h="$H" -v f="$2" 'BEGIN{printf "%d", h*f}')
  x2=$(awk -v w="$W" -v f="$3" 'BEGIN{printf "%d", w*f}'); y2=$(awk -v h="$H" -v f="$4" 'BEGIN{printf "%d", h*f}')
  A shell input swipe "$x1" "$y1" "$x2" "$y2" "$5"
}
area_swipe() { # testID of the map's frame, then fractions of THAT frame: fx1 fy1 fx2 fy2 ms
  local b x1 y1 x2 y2 l t w h
  eveille focus
  b=$(bounds_of "$1")
  [ -n "$b" ] || { echo "perf.sh: map frame '$1' is not on screen" >&2; return 1; }
  set -- $b "${@:2}"
  l=$1; t=$2; w=$(($3 - $1)); h=$(($4 - $2))
  x1=$(awk -v l="$l" -v w="$w" -v f="$5" 'BEGIN{printf "%d", l+w*f}'); y1=$(awk -v t="$t" -v h="$h" -v f="$6" 'BEGIN{printf "%d", t+h*f}')
  x2=$(awk -v l="$l" -v w="$w" -v f="$7" 'BEGIN{printf "%d", l+w*f}'); y2=$(awk -v t="$t" -v h="$h" -v f="$8" 'BEGIN{printf "%d", t+h*f}')
  A shell input swipe "$x1" "$y1" "$x2" "$y2" "${9}"
}
probe() { # file: the forge probe text of the demo map; the build may not have it
  ui_dump | grep -oE 'text="(forge|windmill) [^"]*"' > "$1" || true
}
mem() { eveille focus; A shell dumpsys meminfo "$PKG" > "$1"; }
reset_gfx() { eveille focus; A shell dumpsys gfxinfo "$PKG" reset >/dev/null; }
dump_gfx() { eveille focus; A shell dumpsys gfxinfo "$PKG" > "$1"; }
cold() { # phase link anchor-testID...: force-stop the .perf app, cold start on the link, check it came up
  local ph=$1 link=$2 res i x
  shift 2
  PHASE=$ph
  eveille
  A shell am force-stop "$PKG"
  sleep 2
  res=$(A shell am start -W -a android.intent.action.VIEW -d "$link" "$PKG" | tr -d '\r')
  printf '%s\n' "$res" > "$out/$ph-coldstart.txt"
  [[ $res == *"Status: ok"* || $res == *TotalTime* ]] || { echo "perf.sh: am start -W on $link did not report Status: ok or TotalTime" >&2; return 1; }
  sleep 4
  for i in 1 2 3 4 5 6 7 8 9 10; do # the expected screen must be up before any gesture
    for x in "$@"; do
      [ -n "$(bounds_of "$x")" ] && return 0
    done
    sleep 1
  done
  echo "perf.sh: $link opened, but none of '$*' appeared (wrong screen?)" >&2
  return 1
}
idle() { sleep 2; reset_gfx; sleep 10; dump_gfx "$out/$1-idle-gfxinfo.txt"; }
page_scroll_passes() { # phase [map-frame-testID]: with a frame, start below it, like the witness
  local k r b fs=0.8 fe=0.25 ph=$1
  if [ -n "${2:-}" ]; then
    b=$(bounds_of "$2")
    [ -n "$b" ] || { echo "perf.sh: map frame '$2' is not on screen" >&2; return 1; }
    set -- $b
    fs=$(awk -v h="$H" -v y="$4" 'BEGIN{printf "%.3f", (y + 0.05*h)/h}')
    awk -v f="$fs" 'BEGIN{exit !(f < 0.9)}' || { echo "perf.sh: the map reaches too far down ($fs of the screen) to scroll the page from below it" >&2; return 1; }
    fe=$(awk -v f="$fs" 'BEGIN{e=f-0.55; if (e<0.15) e=0.15; printf "%.3f", e}')
  fi
  for k in 1 2 3; do
    reset_gfx
    for r in 1 2 3; do
      swipe 0.5 "$fs" 0.5 "$fe" 400; sleep 1
      swipe 0.5 "$fe" 0.5 "$fs" 400; sleep 1
    done
    dump_gfx "$out/$ph-pass$k-gfxinfo.txt"
    mem "$out/$ph-pass$k-meminfo.txt"
  done
}
pan_passes() { # phase frame-testID fast
  local k r
  for k in 1 2 3; do
    reset_gfx
    for r in 1 2 3; do
      area_swipe "$2" 0.8 0.5 0.2 0.5 "$3"; sleep 1.5
      area_swipe "$2" 0.2 0.5 0.8 0.5 "$3"; sleep 1.5
    done
    dump_gfx "$out/$1-pass$k-gfxinfo.txt"
    mem "$out/$1-pass$k-meminfo.txt"
  done
}

# ---------- temoin: production Village tab, flag off
cold temoin "bati://village" village-screen
page_scroll_passes temoin
idle temoin

# ---------- iso-village: the map inside the Village page
cold iso-village "bati://dev-iso" iso-mode-village iso-mode-carte
mode village
page_scroll_passes iso-village iso-village
pan_passes iso-village-pan iso-village 120
idle iso-village

# ---------- iso-carte: the full village (tier 12), + / - buttons
cold iso-carte "bati://dev-iso" iso-mode-village iso-mode-carte
mode carte
tap_id iso-palier-12; sleep 2
tap_id iso-zoom-cadrer; sleep 3
mem "$out/iso-carte-mem-depart.txt"; probe "$out/iso-carte-probe-depart.txt"
for i in 1 2 3 4 5 6 7; do tap_id iso-zoom-plus; sleep 0.5; done
sleep 1
mem "$out/iso-carte-mem-x7.txt"; probe "$out/iso-carte-probe-x7.txt"
for i in 8 9; do tap_id iso-zoom-plus; sleep 0.5; done
sleep 1
mem "$out/iso-carte-mem-x9.txt"; probe "$out/iso-carte-probe-x9.txt"
pan_passes iso-carte-pan-max iso-aire 90
idle iso-carte
tap_id iso-zoom-cadrer; sleep 3
mem "$out/iso-carte-mem-retour.txt"; probe "$out/iso-carte-probe-retour.txt"
# the same pan at the start framing (whole village, small) and at zoom 0.6
pan_passes iso-carte-pan-cadre iso-aire 90
tap_id iso-zoom-06; sleep 3
mem "$out/iso-carte-mem-z06.txt"; probe "$out/iso-carte-probe-z06.txt"
pan_passes iso-carte-pan-z06 iso-aire 90
# leak or cache: three round trips (max zoom, then Cadrer), meminfo after each leg
tap_id iso-zoom-cadrer; sleep 3
for r in 1 2 3; do
  for i in 1 2 3 4 5 6 7 8 9; do tap_id iso-zoom-plus; sleep 0.5; done
  sleep 2
  mem "$out/iso-carte-mem-max-$r.txt"; probe "$out/iso-carte-probe-max-$r.txt"
  tap_id iso-zoom-cadrer; sleep 3
  mem "$out/iso-carte-mem-ret-$r.txt"; probe "$out/iso-carte-probe-ret-$r.txt"
done
sleep 30
mem "$out/iso-carte-mem-retour-30s.txt"; probe "$out/iso-carte-probe-retour-30s.txt"
eveille focus
if ! A shell am send-trim-memory "$PKG" RUNNING_CRITICAL; then
  echo "trim-memory refuse par le telephone: l'etape 'trim' ci-dessous n'est PAS une mesure apres trim" > "$out/iso-carte-trim-refused.txt"
  echo "perf.sh: trim-memory refused, noted in the summary" >&2
fi
sleep 3
mem "$out/iso-carte-mem-trim.txt"; probe "$out/iso-carte-probe-trim.txt"

PHASE=summary
"$here/perf-summary.sh" "$out"
echo "perf.sh: done, summary in $out/summary.md"
