# Maestro E2E Tests

This directory contains End-to-End tests using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. Install Maestro CLI:

   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Have an Android emulator or iOS simulator running, **started with a pinned
   locale** so runs reproduce (see [Locale](#locale) below):

   ```bash
   maestro start-device --platform=android --device-locale=en_US
   ```

3. Build and install the app:

   ```bash
   # For Android
   npx expo run:android

   # For iOS
   npx expo run:ios
   ```

## Running Tests

### Run all tests

```bash
maestro test .maestro/
```

### Run a single test

```bash
maestro test .maestro/app-launch.yaml
```

### Run with Maestro Studio (interactive mode)

```bash
maestro studio
```

### Dev build vs release build (important)

The flows use `launchApp: { clearState: true }`. That works cleanly against a
**release/preview APK** (self-contained JS) — the recommended CI target.

Against a **dev build** (`npx expo run:android`), `clearState` also wipes the
expo-dev-client's saved server URL, so the app boots to the "Development servers"
menu instead of the app. To run locally against a dev build you must have Metro
up and the client pointed at it:

```bash
# 1. Metro
npx expo start --dev-client --port 8081
# 2. Route the device's localhost to the host Metro (physical device or emulator)
adb reverse tcp:8081 tcp:8081
# 3. Load the JS bundle into the client once (or type localhost:8081 → Connect in
#    the dev-launcher menu):
adb shell am start -a android.intent.action.VIEW \
  -d "bati://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
# 4. Then run flows WITHOUT the clearState launch (drive the already-loaded app),
#    or build a release APK for the full clearState flows.
```

## `testID` convention

Flows target `testID`, never translated text. A flow that taps `text: "Continue"`
breaks the day someone runs the emulator in French — a `testID` never does.

**Rule:** kebab-case, screen-namespaced — `<screen>-<element>`.

| Example | Where |
|---------|-------|
| `onboarding-hero-continue` | onboarding hero-setup screen |
| `home-start-session` | home screen CTA |
| `session-complete-exercise` | active exercise footer |
| `session-victory-continue` | victory screen |
| `tab-adventures` | bottom tab bar |

`AppButton` spreads its rest props onto the underlying Tamagui `Button`, so
`testID` passes straight through — pass it at the call site, no component
changes needed.

Check what the device actually exposes with `maestro hierarchy`.

## Locale

The app picks its language from the **device** locale (`expo-localization` →
`getDevicePreferredAppLanguage()`), and `clearState: true` wipes any stored
preference. An emulator in `fr_FR` therefore renders a different app than one in
`en_US`.

Maestro has no per-flow locale setting — pin it when the device starts:

```bash
maestro start-device --platform=android --device-locale=en_US
```

For an already-running Android emulator, `adb shell` it or recreate the AVD with
the locale set. The durable fix is the convention above: assert on `testID`, and
locale drift can't fail a flow.

## Test Files

| File | Description |
|------|-------------|
| `app-launch.yaml` | Fresh install boots to the first onboarding screen |
| `main-journey.yaml` | The core loop: onboarding → home → session → victory |
| `explore-tabs.yaml` | Smoke: each of the 5 main tabs renders its screen |
| `subflows/complete-onboarding.yaml` | Reusable onboarding walk, pulled in via `runFlow:` |

## Screenshots

Screenshots are saved to `.maestro/screenshots/` after test runs.

## Tips

- Use `maestro studio` to interactively build and debug tests
- Use `maestro hierarchy` to inspect the current UI tree
- Add `--debug-output` flag for verbose logging
