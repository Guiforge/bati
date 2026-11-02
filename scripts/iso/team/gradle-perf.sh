#!/usr/bin/env bash
# The .perf release build for the emulator, with the daemon stop guaranteed.
#
#   scripts/iso/team/heavy.sh --gradle scripts/iso/team/gradle-perf.sh
#
# `--rerun`: Gradle does not track the images, so a new sprite would not reach the bundle.
# On success it writes HEAD's sha in build-commit.txt beside the APK (install-build.sh reads it).
# x86_64 only: the emulator's ABI; the phone build is Guillaume's (perf.sh), never ours.
# The stop runs on success, failure and timeout, so the 3 GB of daemons never sit idle. A run
# longer than ISO_GRADLE_TIMEOUT (default 40 min) is cut: report it instead of retrying blind.
# Call it with the Bash tool in the background (run_in_background) when it may pass 10 minutes.
set -uo pipefail

timeout_s="${ISO_GRADLE_TIMEOUT:-2400}"
root=$(git rev-parse --show-toplevel) || exit 1
# Every build must say which commit it is: refuse uncommitted code (docs/ aside).
[ -z "$(git -C "$root" status --porcelain -- . ':!docs')" ] || { echo "gradle-perf.sh: uncommitted code changes, commit first (the build records HEAD)." >&2; exit 1; }
sha=$(git -C "$root" rev-parse HEAD) || exit 1
cd "$root/android" || exit 1
timeout "$timeout_s" ./gradlew :app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease \
  -PbatiLocalId=.perf -PreactNativeArchitectures=x86_64
rc=$?
./gradlew --stop >/dev/null 2>&1
[ "$rc" -eq 0 ] && echo "$sha" >"$root/android/app/build/outputs/apk/release/build-commit.txt"
if [ "$rc" -eq 124 ]; then echo "gradle-perf.sh: timed out after ${timeout_s}s" >&2; fi
exit "$rc"
