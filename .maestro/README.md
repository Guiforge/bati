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
| `app-launch.yaml` | Verifies app launches correctly |
| `main-journey.yaml` | The core loop: onboarding → home → session → victory |
| `home-navigation.yaml` | Tests home screen and scrolling |
| `quest-gallery.yaml` | Tests navigation to quest gallery |

## Screenshots

Screenshots are saved to `.maestro/screenshots/` after test runs.

## Tips

- Use `maestro studio` to interactively build and debug tests
- Use `maestro hierarchy` to inspect the current UI tree
- Add `--debug-output` flag for verbose logging
