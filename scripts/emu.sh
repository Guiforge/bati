#!/usr/bin/env bash
# One emulator per worktree, so two sessions never drive the same one.
#
#   scripts/emu.sh claim     # print this worktree's emulator serial, taking a free one if needed
#   scripts/emu.sh release   # give it back
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
# fails until `release`. It never starts an emulator and never hands out a phone.
set -euo pipefail

ttl_minutes=120
dir="${XDG_CACHE_HOME:-$HOME/.cache}/bati-emu"
mkdir -p "$dir"

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
  claim | release) ;;
  *)
    echo "Usage: scripts/emu.sh [claim|release|list]" >&2
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

if [ "$cmd" = release ]; then
  [ -z "$held" ] || rm -f "$dir/$held"
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

{
  echo "No free emulator for $me. Running: ${running[*]:-none}. Held:"
  list
  echo "Wait for one, or start another only if fewer than two are running."
} >&2
exit 1
