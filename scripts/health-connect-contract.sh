#!/usr/bin/env bash
# The Health Connect contract check (W-04): runs modules/bati-health's own write and delete code
# against the real Health Connect of an Android 14+ device and reads back what it holds. It is
# what proves the jest suites' fake (`__tests__/helpers/fakeHealthConnect.ts`) tells the truth,
# and the only test that touches a real Health Connect.
#
#   scripts/health-connect-contract.sh            # on the emulator this worktree claims
#   ANDROID_SERIAL=<serial> scripts/health-connect-contract.sh
#
# Needs a prebuilt android/ (it is committed). The test APK is its own package and holds the read
# permissions; Bati never does.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${ANDROID_SERIAL:-}" ]; then
  ANDROID_SERIAL=$(scripts/emu.sh claim)
  export ANDROID_SERIAL
fi
sdk=$(adb -s "$ANDROID_SERIAL" shell getprop ro.build.version.sdk | tr -d '\r')
if [ "$sdk" -lt 34 ]; then
  echo "Android 14+ (API 34) needed, $ANDROID_SERIAL is API $sdk." >&2
  exit 2
fi

status=0
(cd android && ./gradlew -q :bati-health:connectedDebugAndroidTest) || status=$?
(cd android && ./gradlew --stop >/dev/null)
exit "$status"
