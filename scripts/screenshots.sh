#!/usr/bin/env bash
# Capture and dress the store screenshots, end to end.
#
#   npm run screenshots              # en-US
#   npm run screenshots -- fr-FR     # after switching the phone to French
#
# Wraps the Maestro flow in Android's demo mode, so the status bar shows a fixed clock, a full
# battery and no notification icons. Without it every shot carries whoever's phone took it —
# unread mail, a messaging badge, 38% battery — which is the difference between a screenshot and
# a store screenshot.
set -euo pipefail

locale="${1:-en-US}"
raw="fastlane/raw"
[ "$locale" = "en-US" ] || raw="fastlane/raw-${locale%%-*}"

# The same device dance serves the UX audit, which wants other flows, another destination, no
# store framing, and the shots even when a step drifted. Three env vars rather than a second copy
# of the demo-mode, DND and dev-client preamble below — that preamble is where every
# device-specific trap already lives.
flow="${FLOW:-.maestro/screenshots.yaml}"
raw="${RAW:-$raw}"

export PATH="$PATH:$HOME/.maestro/bin"

if ! adb get-state >/dev/null 2>&1; then
  echo "No device. Plug one in and enable USB debugging." >&2
  exit 1
fi

demo() { adb shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null 2>&1 || true; }

cleanup() {
  adb shell cmd notification set_dnd off >/dev/null 2>&1 || true
  demo exit
  adb shell settings put global sysui_demo_allowed 0 >/dev/null 2>&1 || true
}
trap cleanup EXIT

adb shell settings put global sysui_demo_allowed 1 >/dev/null 2>&1 || true
demo enter
demo clock -e hhmm 0940          # a plausible morning, the hour someone trains
demo battery -e level 100 -e plugged false
demo network -e wifi show -e level 4
demo network -e mobile show -e level 4 -e datatype false
demo notifications -e visible false
# Demo mode empties the status bar but does not stop a heads-up banner dropping over the app
# mid-capture — one arrived in the middle of a session shot, carrying a real name and a real
# subject line into a picture meant for a store page. Do Not Disturb is what actually silences it.
adb shell cmd notification set_dnd priority >/dev/null 2>&1 || true

# The screen must stay awake: a dozing device photographs as pure black.
adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb shell svc power stayon usb >/dev/null 2>&1 || true

# Start from a blank app every time, so the seeded hero below is the only history in the shots.
# Done here rather than with Maestro's `clearState`, which on a debug build also erases the
# dev-client's saved server URL and boots the app into the "Development servers" menu.
adb shell pm clear com.guiforge.bati.dev >/dev/null 2>&1 || true

# Per-app language, so both listings can be shot without touching the phone's own settings.
# After `pm clear`, which resets it. Android 13+; an older device falls back to the system
# language and the caller has to switch that instead.
adb shell cmd locale set-app-locales com.guiforge.bati.dev --locales "${locale%%-*}" >/dev/null 2>&1 || true
# Point the dev-client back at Metro. `pm clear` wipes the saved server URL, and without this
# the app opens its "Development servers" menu instead of itself — the documented debug-build
# caveat in .maestro/README.md. Unconditional: on a release build the deep link is simply
# unhandled and the app opens normally.
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
# `exp+bati://` is the scheme the dev launcher registers — `bati://` is the app's own and the
# launcher never sees it. Both are tried, so this keeps working if the dev-client is dropped.
# `-p` is not optional: three variants are installed side by side on a development machine
# (`.dev`, `.perf` and the release) and all three claim `bati://`. Without the package the intent
# resolves to nothing rather than to a chooser, the dev client never learns the server URL, and
# the run fails on the very first assertion with the app sitting on "Development servers".
for scheme in "exp+bati" "bati"; do
  adb shell am start -a android.intent.action.VIEW -p com.guiforge.bati.dev \
    -d "$scheme://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" >/dev/null 2>&1 || true
  sleep 6
done
sleep 8
adb shell am force-stop com.guiforge.bati.dev >/dev/null 2>&1 || true

# The dev-client's floating "Tools" button lands exactly where this app puts its own top-right
# controls, and it wins every tap: it opened the dev menu on top of a session instead of pausing
# it, and it photographs as a grey gear glued to the corner of every shot. Its preference is app
# data, so `pm clear` above resets it. It has to be written here rather than next to the clear:
# the first launch writes the whole preference map from its own defaults, so a file written
# before it is silently replaced. Debug build, hence `run-as`.
devmenu_prefs="$(mktemp)"
cat > "$devmenu_prefs" <<'XML'
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <boolean name="showsAtLaunch" value="false" />
    <boolean name="showFab" value="false" />
</map>
XML
adb push "$devmenu_prefs" /data/local/tmp/devmenu.xml >/dev/null 2>&1 || true
adb shell run-as com.guiforge.bati.dev sh -c \
  'mkdir -p shared_prefs && cp /data/local/tmp/devmenu.xml shared_prefs/expo.modules.devmenu.sharedpreferences.xml' \
  >/dev/null 2>&1 || true
rm -f "$devmenu_prefs"

rm -rf "$raw"
mkdir -p "$raw"

# A marker to collect against, rather than "the newest run directory wins". Maestro leaves a
# directory behind when it tears the driver down, so the newest one after a run is sometimes an
# empty one made a minute after the shots — and the collector below reported zero while eight
# screenshots sat in the directory before it.
run_marker="$(mktemp)"

# An audit keeps whatever it managed to photograph: twenty-five good screens are worth more than
# a red run. A store run still aborts, because a half-captured listing must never get framed.
maestro test "$flow" || [ -n "${AUDIT:-}" ]

# Maestro resolves takeScreenshot paths against its own artefact directory, not the project, so
# the flow uses plain names and the files are collected here.
#
# Everything this run wrote, wherever it wrote it. Two guesses were wrong before this: a
# subdirectory named `screenshots` (Maestro moved the named shots to `<run>/<flow>/takeScreenshot/`
# and kept `screenshots/` for the ones it takes when a step fails), then the newest run directory
# (Maestro leaves an empty one behind when it tears the driver down). Both collected zero and said
# so only in a count nobody reads. `step-*.png` is excluded by the leading digit, the failure
# shots are the other kind.
find "$HOME/.maestro/tests" -name '[0-9]*-*.png' -newer "$run_marker" -exec cp {} "$raw"/ \;
rm -f "$run_marker"
collected="$(find "$raw" -type f | wc -l)"
echo "  Collected $collected shots"
[ "$collected" -gt 0 ] || echo "  Nothing collected. The flow died before its first takeScreenshot." >&2

if [ -n "${AUDIT:-}" ]; then
  echo
  echo "  Shots: $raw/"
  exit 0
fi

python3 scripts/frame-screenshots.py --locale "$locale" --src "$raw"

echo
echo "  Raw shots:     $raw/"
echo "  Store shots:   fastlane/metadata/android/$locale/images/phoneScreenshots/"
echo "  Look at them before shipping — nothing here asserts they are right."
