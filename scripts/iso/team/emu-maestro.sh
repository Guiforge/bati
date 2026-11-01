#!/usr/bin/env bash
# Maestro, pinned to this worktree's emulator (Maestro ignores ANDROID_SERIAL and once ran
# clearState on the USB phone).
#
#   scripts/iso/team/emu-maestro.sh test .maestro/iso-tap.yaml
set -uo pipefail

root=$(git rev-parse --show-toplevel) || exit 1
S=$("$root/scripts/emu.sh" claim) || { echo "emu-maestro.sh: no emulator claimed (scripts/emu.sh claim failed)." >&2; exit 1; }
case "$S" in
  emulator-*) ;;
  *) echo "emu-maestro.sh: '$S' is not an emulator, refusing." >&2; exit 1 ;;
esac
for a in "$@"; do
  case "$a" in
    --device|--device=*|--udid|--udid=*) echo "emu-maestro.sh: the device is chosen here, do not pass $a." >&2; exit 64 ;;
  esac
done

exec maestro --device "$S" "$@"
