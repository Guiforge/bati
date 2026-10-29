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

The phone plugged in over USB holds the hero's real release data. Use an AVD, and let
`scripts/emu.sh start` boot it: it reuses a free running emulator, else boots a free slot
(`bati-bench` on 5554, `bati-bench2` on 5556) with the flags it needs (without
`-gpu host -feature -Vulkan` it segfaults on cold boot), waits for the boot and claims it. It
never runs a third one, since more than two freeze the machine, and never kills someone else's.
Do not launch `emulator` by hand: two sessions doing it at once race for the same AVD or port.

- The repo's debug APK is arm64 only and crashes under translation on x86_64. Build
  `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64`.
  For release conditions: `assembleRelease -PbatiLocalId=.perf -PreactNativeArchitectures=x86_64`.
- In a worktree, copy `android/app/debug.keystore` from the main checkout (it is gitignored).
- `./gradlew --stop` afterwards.
- If `screencap` and `uiautomator dump` both return a stale screen (the clock moves, nothing
  else), the emulator display froze under `-gpu host`: `adb reboot`, it is not the app.

**Claim your emulator, then always pass its serial.** Several sessions work in several worktrees
at once, and two of them on one emulator overwrite each other's build, database and taps.
`scripts/emu.sh claim` prints the serial this worktree holds, taking a free emulator the first
time, and fails when every running one is held by another worktree: then wait, or
`scripts/emu.sh start` to boot the free slot. Never type a serial by hand, and call it
again in every command rather than remembering the answer: a claim left alone for two hours
gives way to a worktree that finds nothing free. It never moves you silently. If your emulator
has gone it fails until you `start` it again or `release`, since another one has neither your
build nor your database:

```bash
scripts/emu.sh start >/dev/null || exit 1   # once, at the start of device work
S=$(scripts/emu.sh claim) || exit 1
adb -s "$S" shell …
npm run maestro                          # claims by itself; bare: maestro test --device "$S"
```

`scripts/emu.sh stop` when the device work is over (releases and shuts it down, the RAM is
short), `release` to keep it running for someone else, `list` to see who holds what. Maestro ignores `ANDROID_SERIAL` and picks any device; it once ran 24 `clearState`
launches on the phone and wiped its dev app. Check its `Selected device` log line.

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

## Gotchas from past sessions

Emulator and devices:

- The USB phone is a Fairphone 6 (/e/OS or LineageOS, 1116x2484, density 480, so x3). Bottom
  tabs at y=2360: Home x=110, Adventures 335, Quests 555, Village 779, Journal 1003. Settings
  open only from the Home avatar (~150,230). Hardware back on a quest sheet exits to Home.
- `bati-bench2` (emulator-5556) is the second AVD, allowed when another session holds
  `bati-bench`. Its font scale is 1.3 and display 1080x1920 (so it is the large-font check), it
  carries a 185-session dev hero one migration behind, and loading a bundle migrates it: back up
  `bati.v3.db` + `-wal` + `-shm` first, restore at the end, or the next worktree's migration with
  the same number is skipped. An old dev client there loads a new JS bundle without Gradle.
- Briefs for agents that touch an emulator say: `scripts/emu.sh start`, then `claim` and
  `-s <serial>` everywhere, `scripts/emu.sh stop` at the end. Do not delete a
  log another agent's `until grep` loop waits on (5 orphan loops ran forever).
- Audits run at font scale 1.0; 1.3 only as a quick pass on new pages. Restore the AVD's saved
  font scale afterwards.
- `adb root` also lets you: `cmd alarm set-time <epoch ms>` (toybox `date` cannot), `dumpsys
  alarm | grep -A2 <pkg>`, and `am broadcast -n <pkg>/<Receiver> -a <action> --es …` on
  `exported=false` receivers. Undo: `settings put global auto_time 1`, `deviceidle unforce`,
  `battery reset`, `adb unroot`.
- Kill "like Android" without cancelling alarms: `kill -9 $(pidof …)` as root, never
  `am force-stop`. After it, relaunch with `monkey`, the deep link goes to a dead task.
- zsh does not word-split `A="adb -s …"; $A shell`. Use `a(){ adb -s "$S" "$@"; }`.
- `pkill -f <pattern>` kills the shell that runs it (exit 144): `pgrep -f` then `kill <pids>`.
- Two emulators of different sessions cost ~6 GB and freeze under swap.
- GPS on the AVD: loop `adb -s "$S" emu geo fix <lon> <lat> 50` once a second, advancing latitude
  (0.00005 deg is about 20 km/h). It always reports speed 0; `geo nmea` is ignored.

Network policy on /e/OS and some LineageOS builds:

- A fresh install may get `REJECT_ALL` in netpolicy: every outbound connection, `adb reverse`
  loopback included, is refused, while `curl` from `adb shell` works. Check
  `adb shell dumpsys netpolicy | grep <uid>` (uid from `dumpsys package <pkg> | grep userId`)
  before applying anything; the dev app often has none. Lift it with
  `adb shell service call netpolicy 1 i32 <uid> i32 0`, again after any reinstall that changes
  the uid. "Works in dev and perf, not in the installed release" (map without tiles): check the
  release uid first.
- Maestro reinstalls its two driver packages every run, so each gets a fresh blocked uid and
  "driver did not start up in time" follows. Run a background loop that re-reads both uids and
  calls the service every second while Maestro launches. Never uninstall the Maestro packages.
- Maestro without `--device` ignores `ANDROID_SERIAL` and takes the USB phone: it ran 24
  `clearState` launches on the Fairphone and wiped its dev app. Always `--device <serial>`
  (`a,b` for shards) and read the `Selected device` line.
- Any new `waitToSettleTimeoutMs` cap on an animated screen needs the 120 s check above; village
  building rows tapped under 1 s after the village appears do not open their sheet, keep those
  uncapped. A `when` on a screen with a ticking timer waits ~11 s to settle.

Metro, bundle and reload:

- Before any Reload, `adb reverse tcp:P tcp:P`; the tunnel drops when the cable or adb daemon
  restarts and the failure ("Unable to load script") looks like a bundle crash. `adb reverse
  --list` must show `UsbFfs tcp:P tcp:P`.
- `am force-stop` on the dev build loses the Metro URL: it reopens on an empty "Development
  servers" screen and the deep link does not reconnect. Fix: reverse, tap the `http://` field
  (~555,1105), `input text 'http://localhost:P'`, Connect (~555,1274). Prefer Reload over
  force-stop. A first launch after `pm clear` opens the dev menu: Continue, then the cross.
- The three Bati apps all claim `bati://`: a chooser appears, tap "Bati (dev)" then "Just once".
  Do not force a component with `-n`, it bypasses the dev-launcher routing.
- An `import` or module change is sometimes ignored by fast refresh on a mounted screen:
  keyevent 82, Reload. A stale ErrorBoundary needs its Retry tapped.
- With several worktrees running Metro, the dev client may load another worktree's bundle
  (the emulator reaches the host by 10.0.2.2). Check the `Android Bundled` count rose in your own
  Metro log.

Database and migrations on the dev app:

- Remove the last row of `__drizzle_migrations` to test the pre-migration path. The migration
  reapplies on launch and fails if it is an `ALTER TABLE ADD` (duplicate column); the database
  is intact (rolled back), restoring the copy fixes it.
- Language for captures: set only `user_preferences.language` (`fr|en|de|es|ru`) in the dev
  database. Never touch `languageChosenOn` (it holds the device language; overwriting it made
  forty "French" captures come out Spanish).
- Deep links for capture: `am start -a VIEW -d "bati://<route>" com.guiforge.bati.dev` with
  `xp`, `privacy`, `safety`, `oath`, `settings` (does not navigate: tap the avatar gear
  ~140,203), `journal`, `journal/lifetime|bosses|achievements|balance|<sessionId>`, `quests/<id>`,
  `adventures/<id>`, `exercises/<id>`, `encryption`, `whats-new`, `onboarding/first-session`,
  `village?grown=forge:4:5`. Onboarding village-setup and training-level redirect home once done.
- Boss fight: `bati://dev`, swipe up twice, "Jump to boss fight (1 HP)" (kills the boss on the
  first hit, the session continues), start the quest, skip the warm-up. A fight left open is
  resumed by the next jump. "Seed an outing" sits at (555,1673) after the two swipes and clears
  earlier seeds first.

Reading and driving the screen:

- Pixel debugging: `screencap` then an ASCII luminance map (PIL) to measure a crop. Native
  frames from `uiautomator` bounds are clipped to the visible parent, so a row half out of a
  scroll reads under 44 without being at fault (a node that differs per screen size is a clip;
  the same node at every size is a real target).
- RN `ScrollView` has `flexShrink: 1`: an overflowing column squashes it and Android crops the
  children. Onboarding art "cut at the top" was letterbox bars baked into the webp: check the
  first rows' luminance before blaming layout.
- `uiautomator dump` cannot read the village either (embers never idle); screenshots only.
- A dev-client gear sits over the Journal History tab on 1080x2400 (tap 880,225, not 950,212);
  the menu it opens looks like a frozen screen. MapLibre snapshots always paint the source
  attribution (`logo: false` only drops the logo).
- Text inputs: a swipe that starts on a field does not scroll the quest editor, start at x=150.
  `font_scale` or `wm density` changes recreate the activity and the dev client shows a LogBox
  ("linking configured in multiple places"): Dismiss before capturing.
- A `while read` loop calling `adb shell` stops after one turn (adb eats stdin): `exec 3<&0
  </dev/null; while read … <&3`.
- Lost-tap diagnosis: a touch with no responder grant means disabled, covered, or not a
  pressable. Instrument grant/release/terminate plus root `onTouchStartCapture` first. A press in
  a ScrollView is lost past ~8 dp of drift (`input swipe x y x y+d 100`), but real thumbs drift 0
  dp, so that is not the usual cause. Look for a villager cameo over the list or a disabled
  button ("Saving…").
- `hitSlop` only enlarges the touch area: an adjacent sibling still wins the event. Prove a
  target with `adb shell input tap <x> <bottom+4>` and a screenshot, never by reading the code,
  and read each site rather than classing 36x36 targets by size.

Filming (`npm run video`):

- Release only (the user refused dev: "Refreshing…" banner, Dev tools in clips). Three phases:
  `video-stage.yaml` seeds the hero in the debug build, the database is transplanted as root into
  `.perf` (x86_64 release) with boss HP lowered in SQL, `video.yaml` films `.perf` with `.dev`
  disabled so `bati://` opens no chooser. `video.sh` deletes the `__dev_xp` / `__dev_expedition`
  journal notes the dev seeds leave.
- Maestro `startRecording` is unusable for marketing (~1 Mbit/s, smeared dark gradients). Use
  `adb emu screenrecord` (60 fps, 20M, VP9) driven by a local HTTP server that the flow calls via
  `evalScript: ${http.get(...)}`. Both recorders cap at 180 s per clip.
- After an emulator cold boot `hideKeyboard` breaks (floating Gboard sends back): use
  `pressKey: Enter`. `autoVerify` on `openLink` does not resolve the "Open with" chooser. Under
  `pipefail`, `unzip -l | grep -q` fails with SIGPIPE: drop `-q`. The village reward card
  vanishes 5.2 s after arrival: start recording before the link.
