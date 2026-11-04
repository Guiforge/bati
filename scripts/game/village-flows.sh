#!/usr/bin/env bash
# Run one of the iso village flows (.maestro/village-*.yaml) on an emulator, from a blank app.
#
#   scripts/game/village-flows.sh village-panel [emulator-5554]
#
# Assumes Metro already runs (`npm start`) and the dev build is installed. Touches only the dev
# package (com.guiforge.bati.dev), only on an `emulator-*` serial. The device preamble is copied
# from scripts/screenshots.sh (see its comments for why each line exists).
set -euo pipefail

flow="${1:?usage: village-flows.sh <flow-name> [emulator-serial]}"
serial="${2:-emulator-5554}"
case "$serial" in emulator-*) ;; *) echo "refusing $serial: emulators only" >&2; exit 1 ;; esac
[ -f ".maestro/$flow.yaml" ] || { echo "no .maestro/$flow.yaml" >&2; exit 1; }

export PATH="$PATH:$HOME/.maestro/bin"
pkg=com.guiforge.bati.dev
a() { adb -s "$serial" "$@"; }

a shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
a shell svc power stayon usb >/dev/null 2>&1 || true
# Not Maestro's clearState: on a debug build it erases the dev client's saved server URL.
a shell pm clear "$pkg" >/dev/null 2>&1 || true
a shell cmd locale set-app-locales "$pkg" --locales en >/dev/null 2>&1 || true
a reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
for scheme in "exp+bati" "bati"; do
  a shell am start -a android.intent.action.VIEW -p "$pkg" \
    -d "$scheme://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" >/dev/null 2>&1 || true
  sleep 6
done
sleep 8
a shell am force-stop "$pkg" >/dev/null 2>&1 || true

# Hide the dev client's floating Tools button (it eats taps in the top-right); written after the
# first launch, which would replace an earlier file.
prefs="$(mktemp)"
cat > "$prefs" <<'XML'
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <boolean name="isOnboardingFinished" value="true" />
    <boolean name="showsAtLaunch" value="false" />
    <boolean name="showFab" value="false" />
</map>
XML
chmod 644 "$prefs"
a push "$prefs" /data/local/tmp/devmenu.xml >/dev/null 2>&1 || true
a shell "run-as $pkg sh -c 'mkdir -p shared_prefs && cp /data/local/tmp/devmenu.xml shared_prefs/expo.modules.devmenu.sharedpreferences.xml'"
rm -f "$prefs"

exec maestro --device "$serial" test ".maestro/$flow.yaml"
