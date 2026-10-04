---
name: device-check
description: Verifying a change on Android (emulator, adb, Maestro, seeding the dev database, reading screenshots). Use before saying a UI, native, Sheet or data change works, and whenever driving the app by adb or Maestro.
---

# Checking a change on a device

Jest mocks the native bridge, `useToast`, and Tamagui portals, so a green suite says nothing
about them. Three bugs that 3000 green tests missed showed up in one emulator run: a custom type
the Expo bridge cannot convert, `useToast()` inside a Sheet (its content mounts outside the
providers), a hex id decoded as base64. Native work and anything inside a Sheet is not done
until it has run on an emulator.

## Emulator, never the phone

The phone plugged in over USB holds the hero's real release data. Use the AVD:

```bash
~/Android/Sdk/emulator/emulator -avd bati-bench -no-audio -no-snapshot -gpu host -feature -Vulkan &
```

Without `-gpu host -feature -Vulkan` it segfaults on cold boot. Before starting one, check
`adb devices` and `pgrep qemu`: another session may already run one, two emulators freeze the
machine, and never kill someone else's.

- The repo's debug APK is arm64 only and crashes under translation on x86_64. Build
  `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64`.
  For release conditions: `assembleRelease -PbatiLocalId=.perf -PreactNativeArchitectures=x86_64`.
- In a worktree, copy `android/app/debug.keystore` from the main checkout (it is gitignored).
- `./gradlew --stop` afterwards.
- If `screencap` and `uiautomator dump` both return a stale screen (the clock moves, nothing
  else), the emulator display froze under `-gpu host`: `adb reboot`, it is not the app.

**Always pass the serial.** `adb -s emulator-5554 …`, and `maestro test --device emulator-5554`.
Maestro ignores `ANDROID_SERIAL` and picks any device; it once ran 24 `clearState` launches on
the phone and wiped its dev app. Check its `Selected device` log line. In zsh, wrap adb in a
function (`a(){ adb -s emulator-5554 "$@"; }`), since `$A shell` does not word-split.

## Metro and the dev client

- Metro on port P: `npx expo start --dev-client --port P`, then `adb reverse tcp:P tcp:P`
  (the same P on both sides: the dev client switches to the port Metro advertises), then
  `adb shell am start -a android.intent.action.VIEW -d "bati://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3AP"`.
- **Prove the right bundle loaded:** the count of `Android Bundled` lines in *that* Metro's log
  goes up. The emulator reaches the host by 10.0.2.2, so another worktree's Metro stays
  reachable and the app can silently run someone else's code.
- Metro started from `.claude/worktrees/…` sees no file changes (no watchman): neither fast
  refresh nor reload applies an edit. Restart it on a new port after each edit.
- "Unable to load script" with `loadJSBundleFromAssets` in the stack is an unmapped port, not
  a bundle problem: logcat says `Couldn't connect to "ws://127.0.0.1:P/..."`.
- `adb root` restarts adbd and drops every `adb reverse`: redo it, and the deep link.

## Set the state, do not play it

To check a screen that depends on history, seed the dev database instead of playing sessions:

1. `adb shell am force-stop com.guiforge.bati.dev`
2. `adb shell run-as com.guiforge.bati.dev cat files/SQLite/bati.v3.db > dev.db.orig`, plus
   the `-wal` and `-shm` files. The fresh data often lives in the WAL, so run
   `PRAGMA wal_checkpoint(TRUNCATE)` on the local copy. `dev.db.orig` is the backup: never
   modify it, build `work.db` from it.
3. Push back through `/data/local/tmp/` then `run-as … cp`, because piping into `adb shell`
   corrupts the binary. Delete the `-wal`/`-shm` on the device, relaunch with
   `adb shell monkey -p com.guiforge.bati.dev -c android.intent.category.LAUNCHER 1`.
4. At the end, push `dev.db.orig` back and confirm with `cmp -s`.

Make old and recent rows disagree (old sessions felt hard, recent ones easy): correct and
buggy code then show opposite results on one screenshot. Errors reported by `reportError` are
in `user_preferences.errorLog` in that same database.

## Reading the screen

- **A screenshot never lies, a dump can.** `adb exec-out screencap -p > shot.png`. For
  coordinates, `adb exec-out uiautomator dump /dev/tty` (never to a file: a failed dump leaves
  the previous one there) and take the `bounds` of `clickable="true"` nodes. Do not guess
  centres.
- **During a Maestro run, screenshots only.** `uiautomator dump` takes UiAutomation from Maestro
  and kills the run. The crash carries the app's name in logcat, so it reads like an app crash.
- `uiautomator dump` never returns on animated session screens (countdown, boss arena): drive
  them by coordinates read from a screenshot.
- **Tap, capture, decide.** Rest timers and countdowns advance while you read a screenshot, so
  the next tap lands on whatever screen came next. A blind loop of taps once swore an oath. A
  screenshot right after a tap may still show the previous screen; capture twice before calling
  the tap lost.
- Prefer relaunching with `monkey` over the back key: back can leave the app and land in another
  one, and any screenshot taken outside Bati gets deleted.
- The dev-client "Tools" gear sits on top of the Journal's History tab: tap (880,225).
- `bati://dev` opens the dev tools (seed an outing, jump to a 1 HP boss fight).

## Maestro specifics

- Sessions shorter than 120 s (`TRIVIAL_SESSION_SECONDS`) are not saved until "Keep it"
  (`session-victory-keep-short`) is tapped. A flow sped up with `waitToSettleTimeoutMs` can
  drop under that line and fail for a reason unrelated to the change.
- Assert state, not navigation: end a flow on something that only exists once the data was
  written (`session-victory-xp`), or read the database afterwards.
- On a device where new apps get no network (some /e/OS builds apply `REJECT_ALL`), Maestro's
  reinstalled driver gets a new uid each run and cannot start. Check
  `adb shell dumpsys netpolicy | grep <uid>` before assuming it.
