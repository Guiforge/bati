#!/usr/bin/env bash
# adb, pinned to this worktree's emulator. The only way the team reaches a device.
#
#   scripts/iso/team/emu-adb.sh shell dumpsys gfxinfo com.guiforge.bati.perf
#   scripts/iso/team/emu-adb.sh install -r android/app/build/outputs/apk/release/app-release.apk
#
# Refuses: any serial that is not emulator-*, `-s`/`-d`/`-e` passed by the caller, `pm clear`,
# and uninstalling anything but com.guiforge.bati.perf (CLAUDE.md: never wipe Bati's data).
set -uo pipefail

root=$(git rev-parse --show-toplevel) || exit 1
S=$("$root/scripts/emu.sh" claim) || { echo "emu-adb.sh: no emulator claimed (scripts/emu.sh claim failed). Start bati-bench, then retry." >&2; exit 1; }
case "$S" in
  emulator-*) ;;
  *) echo "emu-adb.sh: '$S' is not an emulator, refusing." >&2; exit 1 ;;
esac

# adb's own device options come before the subcommand; after it, `-d` and `-e` belong to the
# subcommand (`am start -d <uri>`, `-e key value`) and are fine.
for a in "$@"; do
  case "$a" in
    -s|-s*|-d|-e|-t|-t*|-H|-P|-L) echo "emu-adb.sh: the device is chosen here, do not pass $a before the subcommand." >&2; exit 64 ;;
    -*) ;;
    *) break ;;
  esac
done
args=" $* "
if grep -qE '[[:space:]](pm|cmd[[:space:]]+package)[[:space:]]+clear[[:space:]]|[[:space:]]run-as[[:space:]]' <<<"$args"; then
  echo "emu-adb.sh: clearing or reaching into an app's data is forbidden (it wipes Bati's data)." >&2; exit 64
fi
if grep -qE '(^|[[:space:]])(emu|reboot|reboot-bootloader|root|unroot|remount|disable-verity|kill-server)([[:space:]]|$)|[[:space:]](reboot|svc[[:space:]]+power|setprop)[[:space:]]' <<<"$args"; then
  echo "emu-adb.sh: the emulator is Guillaume's to start, stop and reconfigure. Tell the lead." >&2; exit 64
fi
if grep -qE '(^|[[:space:]])uninstall[[:space:]]' <<<"$args" &&
  ! grep -qE 'uninstall[[:space:]]+(-k[[:space:]]+)?(--user[[:space:]]+[0-9]+[[:space:]]+)?com\.guiforge\.bati\.perf[[:space:]]*$' <<<"$args"; then
  echo "emu-adb.sh: only com.guiforge.bati.perf may be uninstalled, and only on the emulator." >&2; exit 64
fi

exec adb -s "$S" "$@"
