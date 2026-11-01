#!/usr/bin/env bash
# Run one heavy command for the village-iso agent team, holding one of two machine-wide slots.
#
#   scripts/iso/team/heavy.sh npx jest
#   scripts/iso/team/heavy.sh --gradle scripts/iso/team/gradle-perf.sh
#
# Why: CLAUDE.md caps heavy work because jest, tsc and Gradle each hold gigabytes and the suites
# OOM under load. With several teammates working at once, the cap moves from "agents" to
# "commands": at most two heavy commands run at a time, and at most one of them is Gradle.
# A command waits for a free slot instead of failing; the wait is printed so a teammate knows why
# it is idle. The locks are flock(1) on files, released by the kernel even if the command crashes.

set -uo pipefail

lock_dir="${XDG_RUNTIME_DIR:-/tmp}/bati-heavy"
mkdir -p "$lock_dir"

gradle=0
if [ "${1:-}" = "--gradle" ]; then
  gradle=1
  shift
fi
if [ "$#" -eq 0 ]; then
  echo "usage: heavy.sh [--gradle] <command> [args...]" >&2
  exit 64
fi

# Gradle first: only one Gradle build at a time, whatever the slots say.
if [ "$gradle" -eq 1 ]; then
  exec {gradle_fd}>"$lock_dir/gradle.lock"
  if ! flock -n "$gradle_fd"; then
    echo "heavy.sh: waiting for the Gradle lock" >&2
    flock "$gradle_fd"
  fi
fi

announced=0
while :; do
  for slot in 1 2; do
    exec {slot_fd}>"$lock_dir/slot$slot.lock"
    if flock -n "$slot_fd"; then
      # The child gets no copy of the lock descriptors: a daemon it leaves behind (Gradle, Metro)
      # must not keep the slot. This shell keeps them, so the slot stays held until "$@" returns.
      if [ "$gradle" -eq 1 ]; then
        "$@" {slot_fd}>&- {gradle_fd}>&-
      else
        "$@" {slot_fd}>&-
      fi
      status=$?
      exit "$status"
    fi
    exec {slot_fd}>&-
  done
  if [ "$announced" -eq 0 ]; then
    echo "heavy.sh: two heavy commands already running, waiting for a slot" >&2
    announced=1
  fi
  sleep 5
done
