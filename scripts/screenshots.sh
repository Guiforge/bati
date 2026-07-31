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

# The screen must stay awake: a dozing device photographs as pure black.
adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb shell svc power stayon usb >/dev/null 2>&1 || true

rm -rf "$raw"
mkdir -p "$raw"

maestro test .maestro/screenshots.yaml

python3 scripts/frame-screenshots.py --locale "$locale" --src "$raw"

echo
echo "  Raw shots:     $raw/"
echo "  Store shots:   fastlane/metadata/android/$locale/images/phoneScreenshots/"
echo "  Look at them before shipping — nothing here asserts they are right."
