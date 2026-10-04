---
name: android-builds
description: Running Bati on a device or emulator (dev build beside the release, Expo Go limits) and taking performance or cold-start numbers in production conditions (--no-dev --minify, the .perf release build). Use before installing a build or measuring perf.
---

## Running a dev build next to the release

**Expo Go cannot run this app.** [`index.ts`](index.ts) registers the widget task handler from
`react-native-android-widget` at the entry point, and Expo Go does not ship that native module —
it fails before the first screen. Same for the two config plugins under `plugins/`. Use a dev
build (`expo-dev-client` is already installed).

Debug builds carry an `applicationIdSuffix` of `.dev`
([`plugins/withAndroidLocalAppId.js`](plugins/withAndroidLocalAppId.js)), so
`com.guiforge.bati.dev` installs *beside* an existing release instead of colliding with it.
Without it, Android rejects the install (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, the two variants
are signed with different keys) and the usual workaround — uninstalling — takes the SQLite
database with it.

```bash
npx expo run:android          # builds + installs com.guiforge.bati.dev, once
npx expo start --dev-client   # afterwards, just this
```

The dev app has its own sandbox: empty database, so expect to redo onboarding. Both apps claim
the `bati://` scheme, so Android asks which one to open for a deep link. The **release** id stays
exactly `com.guiforge.bati` — suffixing it would orphan every installed copy.

## Measuring like the release, without measuring the release

Never take a performance number in dev. The dev bundle is several times heavier, `__DEV__`
branches run, `console.*` is not stripped, and Hermes is not in the same conditions — the number
means nothing. Two ways to get production conditions locally.

**Production JS in the dev app.** No build, seconds:

```bash
npx expo start --dev-client --no-dev --minify
```

Minified bundle, `__DEV__` false, React in production mode. Good for jank, FPS and render work.
Useless for cold start: the bundle still arrives over HTTP from Metro.

**A real release build, installed beside everything else.** The only thing a TTI number can come
from:

```bash
npm run android:release   # installs com.guiforge.bati.perf
adb shell am start -W -S -n com.guiforge.bati.perf/com.guiforge.bati.MainActivity
```

On the home screen it is `Bati (perf)` behind a cyan icon, next to `Bati (dev)` in amber and the
real `Bati` in the app's own navy — three identical launchers under three identical names is how
the wrong app gets measured.

The `.perf` suffix is what keeps it off the real app
([`plugins/withAndroidLocalAppId.js`](plugins/withAndroidLocalAppId.js), on
`-PbatiLocalId`). Without it a local release build installs *over* the installed release, and on
a machine with no release key that build is debug-signed — Android refuses the update, and the
tempting fix takes the database. Nothing in CI or in the F-Droid recipe passes the flag, so the
published id stays exactly `com.guiforge.bati`.

R8 and resource shrinking are the default now
([`plugins/withAndroidReleaseFlags.js`](plugins/withAndroidReleaseFlags.js)), so this really is
the shipped build rather than a release variant with the expensive parts switched off. Expect the
first one to be slow: `expo.autolinking.buildFromSource` compiles every Expo module.
