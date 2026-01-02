# Maestro E2E Tests

This directory contains End-to-End tests using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Have an Android emulator or iOS simulator running

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

## Test Files

| File | Description |
|------|-------------|
| `app-launch.yaml` | Verifies app launches correctly |
| `home-navigation.yaml` | Tests home screen and scrolling |
| `quest-gallery.yaml` | Tests navigation to quest gallery |

## Screenshots

Screenshots are saved to `.maestro/screenshots/` after test runs.

## Tips

- Use `maestro studio` to interactively build and debug tests
- Use `maestro hierarchy` to inspect the current UI tree
- Add `--debug-output` flag for verbose logging
