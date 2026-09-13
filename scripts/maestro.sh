#!/usr/bin/env bash
# Run the Maestro E2E flows. Wrapper for `npm run maestro`.
#
#   npm run maestro                         # all flows in .maestro/
#   npm run maestro -- .maestro/main-journey.yaml   # a single flow
#   ANDROID_SERIAL=emulator-5554 npm run maestro    # pick the device when several are attached
#
# Assumes: an Android device/emulator is connected (`adb devices`) and, for a dev build, Metro
# is running (`npm start`). See .maestro/README.md for the dev-build vs release-build caveat
# (clearState resets the dev-client URL) and for the fast local setup.
set -euo pipefail

# The Maestro installer drops the binary here but does not always export it to
# non-interactive shells (which is what npm scripts run in).
export PATH="$PATH:$HOME/.maestro/bin"

if ! command -v maestro >/dev/null 2>&1; then
  echo "maestro not found. Install it: curl -Ls \"https://get.maestro.mobile.dev\" | bash" >&2
  exit 1
fi

# Maestro ignores ANDROID_SERIAL and runs on whichever device it picks, a phone on USB included,
# and nearly every flow starts with `clearState`. On 2026-09-13 that wiped the dev app on a phone
# plugged in halfway through an emulator run. So the device is always named: the one in
# ANDROID_SERIAL, or the only one attached, and never a guess between several.
if [ -z "${ANDROID_SERIAL:-}" ]; then
  mapfile -t devices < <(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
  if [ "${#devices[@]}" -ne 1 ]; then
    echo "Expected exactly one device, found ${#devices[@]}: ${devices[*]:-none}." >&2
    echo "Pick one: ANDROID_SERIAL=<serial> npm run maestro" >&2
    exit 1
  fi
  export ANDROID_SERIAL="${devices[0]}"
fi

# Keep the screen awake for the whole run. A dozing device screenshots as pure black and every
# assertion fails on an element that is really there — which reads exactly like a crash, and
# cost an afternoon once. `stayon usb` lasts until the device is unplugged.
adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb shell svc power stayon usb >/dev/null 2>&1 || true

# Route the device's localhost:8081 to the host Metro so a dev build can load
# its JS bundle. Harmless (and ignored) for a release build or if no device.
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true

if [ "$#" -eq 0 ]; then
  set -- .maestro/
fi
exec maestro test --device "$ANDROID_SERIAL" "$@"
