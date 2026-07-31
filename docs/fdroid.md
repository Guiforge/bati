---
title: Publishing through F-Droid
type: technical
status: active
updated: 2026-07-31
related: [../road2release.md, ../CONTRIBUTING.md]
---

# Publishing through F-Droid

Two different things share the name, and only one of them is a realistic next step.

## Which F-Droid

**The official F-Droid catalogue** builds every app itself, from source, on its own
infrastructure, and rejects anything that pulls in proprietary dependencies. An Expo app is a
hard sell there: the build has to be reproducible from a clean checkout with no prebuilt
binaries, and `expo-notifications` reaches for Firebase Cloud Messaging on Android. Possible, but
it is a project of its own.

**Your own repository** is what [the tutorial](https://f-droid.org/en/tutorials/create-repo/)
describes: you generate a signed index over your own APKs and host it anywhere. Users add the URL
once in the F-Droid client and get update notifications from then on. That is the realistic
option, and it is strictly better than handing out APK links — the whole point is that an update
arrives without anyone re-downloading anything by hand.

## What it needs that we do not have yet

**A stable APK signing key.** This is the blocker, and it is the same one Play has
(`road2release.md` phase 0.3). Android will only install an update over an existing app if both
are signed with the same key. Today `android/app/build.gradle` signs release builds with Expo's
**debug** keystore, which is fine for handing someone a one-off APK and useless for a repository
that exists to ship updates. Generate the real key once, keep it off the repo, and use it for
F-Droid, Play and the GitHub Releases APK alike.

```bash
keytool -genkeypair -v -keystore bati-release.keystore \
  -alias bati -keyalg RSA -keysize 4096 -validity 10000
```

Store it somewhere you will still have in five years, then put it in the repository secrets as
base64 so CI can sign with it:

```bash
base64 -w0 bati-release.keystore   # -> SIGNING_KEYSTORE_BASE64
```

Plus `SIGNING_STORE_PASSWORD` and `SIGNING_KEY_ALIAS`. `SIGNING_KEY_PASSWORD` is optional:
keytool's default store type is PKCS12, where the key password *is* the store password, so the
workflow falls back rather than failing on a secret that had no reason to exist.

**A public repository with Pages.** The index has to be served over HTTPS. GitHub Pages does it
for free on a public repo — the same requirement that gates the privacy policy, so one decision
covers both.

**A second key, for the repo itself.** `fdroid init` generates it. It signs the *index*, not the
APKs, and it is what tells the client "this catalogue is still the one you subscribed to". Losing
it means every user has to re-add the repository.

## Setting it up, once

```bash
sudo apt install fdroidserver        # or: pipx install fdroidserver
mkdir -p fdroid && cd fdroid
fdroid init                          # creates config.yml and the repo keystore
```

Then edit `fdroid/config.yml` — the name and description are what users see in the client:

```yaml
repo_url: https://guiforge.github.io/bati/fdroid/repo
repo_name: Bati
repo_description: >-
  Dark-fantasy fitness RPG. Offline-first, no tracking, no accounts.
```

Drop a signed APK into `fdroid/repo/`, run `fdroid update -c`, and the index appears beside it.
Publish the `fdroid/` directory through Pages and the repository URL is live.

## What is verified, and what is not

`plugins/withAndroidReleaseSigning.js` is verified at the level that matters for *correctness of
the config*: prebuild was run and the generated `android/app/build.gradle` was read back — the
`release` signing config is there and `buildTypes.release` picks it when `MYAPP_UPLOAD_STORE_FILE`
is set. Without the plugin, Expo's template points release at the **debug** key and reads no
upload properties at all, so CI would have produced a debug-signed APK and reported success.

**A signed build has not been run end to end.** A local `./gradlew assembleRelease` fails on a
`node` process during configuration, with no message beyond the exit code, on a machine that
builds fine through `expo run:android`. It looks environmental rather than related to signing,
but it was not chased to the bottom. Treat the first CI release as the real test, and check the
signature of the APK it produces before handing it to anyone:

```bash
keytool -printcert -jarfile bati-1.0.1.apk
```

If it says `CN=Android Debug`, the signing did not take effect and the APK must not be published
— an app shipped under the debug key cannot be updated by a properly signed one later.

## Automating it

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) does the recurring half: it takes
the APK the release workflow built, folds it into the repository index and publishes. It needs
`FDROID_KEYSTORE_BASE64` and `FDROID_KEYSTORE_PASSWORD` on top of the signing secrets above, and
skips itself cleanly when they are missing.

It lives in the Pages workflow rather than its own because **a GitHub Pages site has a single
deployment**: two workflows each uploading their own artefact do not merge, the second wipes the
first. So the privacy policy and the F-Droid index are assembled together or not at all.

> **Untested.** It is written from the documented procedure, not from a run — there is no signing
> key and no Pages site yet, so nothing has exercised it end to end. Treat the first run as part
> of the setup rather than as a regression if it fails.

## The order that makes sense

1. Generate the release keystore, back it up, add the signing secrets. *(Unblocks Play too.)*
2. Make the repository public, enable Pages. *(Unblocks the privacy policy too.)*
3. `fdroid init` locally, commit `fdroid/config.yml`, add the repo secrets.
4. Cut a release and see whether the index lands.
5. Give people the URL: `https://guiforge.github.io/bati/fdroid/repo`

Steps 1 and 2 are on the release path anyway. F-Droid is mostly a way of getting something back
for work that has to happen regardless.
