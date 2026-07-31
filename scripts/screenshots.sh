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
adb shell pm clear com.guiforge.bati >/dev/null 2>&1 || true

# Per-app language, so both listings can be shot without touching the phone's own settings.
# After `pm clear`, which resets it. Android 13+; an older device falls back to the system
# language and the caller has to switch that instead.
adb shell cmd locale set-app-locales com.guiforge.bati --locales "${locale%%-*}" >/dev/null 2>&1 || true
# Point the dev-client back at Metro. `pm clear` wipes the saved server URL, and without this
# the app opens its "Development servers" menu instead of itself — the documented debug-build
# caveat in .maestro/README.md. Unconditional: on a release build the deep link is simply
# unhandled and the app opens normally.
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
# `exp+bati://` is the scheme the dev launcher registers — `bati://` is the app's own and the
# launcher never sees it. Both are tried, so this keeps working if the dev-client is dropped.
for scheme in "exp+bati" "bati"; do
  adb shell am start -a android.intent.action.VIEW \
    -d "$scheme://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" >/dev/null 2>&1 || true
  sleep 6
done
sleep 8
adb shell am force-stop com.guiforge.bati >/dev/null 2>&1 || true

rm -rf "$raw"
mkdir -p "$raw"

maestro test .maestro/screenshots.yaml

# Maestro resolves takeScreenshot paths against its own artefact directory, not the project, so
# the flow uses plain names and the files are collected here. Newest run wins.
shots_dir="$(find "$HOME/.maestro/tests" -maxdepth 3 -type d -name screenshots -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
if [ -z "$shots_dir" ]; then
  echo "No Maestro screenshot directory found." >&2
  exit 1
fi
find "$shots_dir" -name '[0-9]-*.png' -exec cp {} "$raw"/ \;
echo "  Collected $(ls -1 "$raw" | wc -l) shots from $shots_dir"

python3 scripts/frame-screenshots.py --locale "$locale" --src "$raw"

echo
echo "  Raw shots:     $raw/"
echo "  Store shots:   fastlane/metadata/android/$locale/images/phoneScreenshots/"
echo "  Look at them before shipping — nothing here asserts they are right."
