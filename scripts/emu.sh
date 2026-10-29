#!/usr/bin/env bash
# One emulator per worktree, so two sessions never drive the same one.
#
#   scripts/emu.sh claim     # print this worktree's emulator serial, taking a free one if needed
#   scripts/emu.sh start     # same, but boots a free AVD slot when nothing is free (max two)
#   scripts/emu.sh release   # give it back
#   scripts/emu.sh stop      # give it back and shut it down, to free the RAM
#   scripts/emu.sh list      # who holds what
#
#   S=$(scripts/emu.sh claim) || exit 1
#   adb -s "$S" shell …
#
# A claim is a file, not a held lock: every command of an agent session is a new shell, and a
# lock would fall between two of them. It ends on `release`, when its worktree is deleted, or
# when another worktree finds no free emulator and this one has not called `claim` for two
# hours, so call `claim` every time you need the serial instead of caching it.
#
# A worktree never changes emulator without being told: if the one it holds has gone, `claim`
# fails until `release` (or `start`, which reboots it). Only `start` boots, never `claim`, and
# nothing here ever hands out a phone.
set -euo pipefail

ttl_minutes=120
dir="${XDG_CACHE_HOME:-$HOME/.cache}/bati-emu"
mkdir -p "$dir"
# Two slots because a third emulator freezes the machine. Fixed ports, so a slot's serial is
# known before it boots and can be claimed first.
slots=("5554 bati-bench" "5556 bati-bench2")

# Called with the lock held and the slot already claimed; drops the lock for the minute-long boot.
boot() {
  local serial="$1" port="${1#emulator-}" avd="" slot pid _
  for slot in "${slots[@]}"; do
    [ "${slot% *}" = "$port" ] && avd="${slot#* }"
  done
  [ -n "$avd" ] || {
    echo "$serial is not an emu.sh slot; start it by hand or \`scripts/emu.sh release\`." >&2
    exit 1
  }
  echo "$me" >"$dir/$serial"
  exec 9>&-
  setsid nohup "$HOME/Android/Sdk/emulator/emulator" -avd "$avd" -port "$port" -no-audio \
    -no-snapshot -gpu host -feature -Vulkan >"$dir/log-$serial" 2>&1 </dev/null &
  pid=$!
  for _ in $(seq 120); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$dir/$serial"
      echo "$avd exited while booting:" >&2
      tail -5 "$dir/log-$serial" >&2
      exit 1
    fi
    [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && {
      echo "$serial"
      exit 0
    }
    sleep 2
  done
  echo "$serial still booting after 4 min, still yours; log: $dir/log-$serial" >&2
  exit 1
}

list() {
  local f
  for f in "$dir"/emulator-*; do
    [ -e "$f" ] && echo "$(basename "$f")  $(cat "$f")"
  done
  return 0
}

take() {
  echo "$me" >"$dir/$1"
  echo "$1"
  exit 0
}

cmd="${1:-claim}"
case "$cmd" in
  list)
    list
    exit 0
    ;;
  claim | start | release | stop) ;;
  *)
    echo "Usage: scripts/emu.sh [claim|start|release|stop|list]" >&2
    exit 2
    ;;
esac

me="$(git rev-parse --show-toplevel)"
exec 9>"$dir/.lock"
flock -w 10 9 || {
  echo "scripts/emu.sh: $dir/.lock is held, another claim is stuck." >&2
  exit 1
}

held=""
for f in "$dir"/emulator-*; do
  [ -e "$f" ] || continue
  owner="$(cat "$f")"
  if [ "$owner" = "$me" ]; then
    held="$(basename "$f")"
  elif [ ! -d "$owner" ]; then
    rm -f "$f"
  fi
done

if [ "$cmd" = release ] || [ "$cmd" = stop ]; then
  if [ -n "$held" ]; then
    [ "$cmd" = release ] || adb -s "$held" emu kill 9>&- >/dev/null 2>&1 || true
    rm -f "$dir/$held"
  fi
  exit 0
fi

# `9>&-`: adb forks its server on first use, and a server holding the lock holds it for good.
devices="$(adb devices 9>&-)"
# Any state counts as running: an emulator `offline` mid-reboot is still somebody's.
mapfile -t running < <(awk 'NR > 1 && $1 ~ /^emulator-/ { print $1 }' <<<"$devices")
mapfile -t ready < <(awk 'NR > 1 && $1 ~ /^emulator-/ && $2 == "device" { print $1 }' <<<"$devices")

if [ -n "$held" ]; then
  case " ${running[*]} " in
    *" $held "*)
      touch "$dir/$held"
      echo "$held"
      exit 0
      ;;
  esac
  # Not dropped: adb lists nothing for a second while its server restarts, and dropping the
  # claim then would let two sessions swap emulators and land on each other's build and data.
  [ "$cmd" = start ] && boot "$held"
  echo "This worktree holds $held, which adb does not list (running: ${running[*]:-none})." >&2
  echo "Restart it, or \`scripts/emu.sh release\` to take another: it will not have your build or database." >&2
  exit 1
fi

for s in "${ready[@]}"; do
  [ -e "$dir/$s" ] || take "$s"
done
# Only now, with nothing free, does an idle claim give way.
for s in "${ready[@]}"; do
  [ -z "$(find "$dir/$s" -mmin "+$ttl_minutes")" ] || take "$s"
done

if [ "$cmd" = start ] && [ "${#running[@]}" -lt "${#slots[@]}" ]; then
  for slot in "${slots[@]}"; do
    s="emulator-${slot% *}"
    case " ${running[*]} " in *" $s "*) continue ;; esac
    # A claim on a stopped slot is a session about to restart it; an AVD can run once only.
    [ -e "$dir/$s" ] && continue
    pgrep -f -- "-avd ${slot#* }( |$)" >/dev/null && continue
    boot "$s"
  done
fi

{
  echo "No free emulator for $me. Running: ${running[*]:-none}. Held:"
  list
  echo "Wait for one, or \`scripts/emu.sh start\` to boot a free slot (max two)."
} >&2
exit 1
