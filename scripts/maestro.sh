#!/usr/bin/env bash
# Run the Maestro E2E flows. Wrapper for `npm run maestro`.
#
#   npm run maestro                         # all flows in .maestro/
#   npm run maestro -- .maestro/main-journey.yaml   # a single flow
#
# Assumes: an Android device/emulator is connected (`adb devices`) and, for a
# dev build, Metro is running (`npm start`). See .maestro/README.md for the
# dev-build vs release-build caveat (clearState resets the dev-client URL).
set -euo pipefail

# The Maestro installer drops the binary here but does not always export it to
# non-interactive shells (which is what npm scripts run in).
export PATH="$PATH:$HOME/.maestro/bin"

if ! command -v maestro >/dev/null 2>&1; then
  echo "maestro not found. Install it: curl -Ls \"https://get.maestro.mobile.dev\" | bash" >&2
  exit 1
fi

# Route the device's localhost:8081 to the host Metro so a dev build can load
# its JS bundle. Harmless (and ignored) for a release build or if no device.
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true

exec maestro test "${@:-.maestro/}"
