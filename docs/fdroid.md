---
title: Publishing through F-Droid
type: technical
status: active
updated: 2026-07-31
related: [planning/roadmap.md, ../CONTRIBUTING.md]
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
(see `docs/planning/roadmap.md` §1). Android will only install an update over an existing app if both
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

## Why nobody can find it by searching

A self-hosted repository is invisible to F-Droid's search until the user has added it — the client
only ever searches repositories it already knows. This is not a misconfiguration and there is no
setting that changes it; the main catalogue at f-droid.org is a separate repository with its own
submission process (a merge request against `fdroiddata`, and builds F-Droid can reproduce from
source). Until then, every install starts by adding the address.

So the address is only half of it. The other half is the **repository fingerprint** — the SHA-256
of the certificate the index is signed with, which pins the key every future update must carry:

```
089db12838d660caf285be855d8e6d023407a50d98051b3843095ea09bba2d97
```

Read it back off the published index rather than trusting a note in a file:

```bash
curl -sO https://guiforge.github.io/bati/fdroid/repo/index-v1.jar
unzip -o -q index-v1.jar 'META-INF/*'
keytool -J-Duser.language=en -printcert -file META-INF/*.RSA | grep SHA256
```

`keytool` here reads a JAR signature, which is exactly what `index-v1.jar` carries — unlike the
APK case above, where v1-only parsing is a trap. It also needs the English locale forced: under a
French one it dies with `MissingFormatArgumentException: Format specifier '%2$s'`, which looks
like a broken file rather than a broken message catalogue.

## What is verified, and what is not

`plugins/withAndroidReleaseSigning.js` is verified at the level that matters for *correctness of
the config*: prebuild was run and the generated `android/app/build.gradle` was read back — the
`release` signing config is there and `buildTypes.release` picks it when `MYAPP_UPLOAD_STORE_FILE`
is set. Without the plugin, Expo's template points release at the **debug** key and reads no
upload properties at all, so CI would have produced a debug-signed APK and reported success.

**A signed build has now been run end to end**, with a throwaway key, and `apksigner` reports the
throwaway certificate rather than the debug one. The wiring works.

Check any APK before handing it out:

```bash
$ANDROID_HOME/build-tools/*/apksigner verify --print-certs bati-1.0.1.apk
```

`CN=Android Debug` means the signing did not take effect and the APK must not be published — an
app shipped under the debug key can never be updated by a properly signed one.

**Do not use `keytool -printcert -jarfile` for this.** It reads v1/JAR signatures only, and
modern Gradle signs with APK Signature Scheme v2/v3, so keytool answers "unsigned" for a
perfectly signed APK. That answer is worth recognising as a false alarm.

### The failure that hid all of this

Both the local and the CI build died on `Process 'command 'node'' finished with non-zero exit
value 1`, with nothing else to go on. The cause was appending the signing properties to
`android/gradle.properties` with `>>`: Expo generates that file **without a trailing newline**, so
the first property glued itself onto the last existing line —
`expo.inlineModules.watchedDirectories=[]MYAPP_UPLOAD_STORE_FILE=...` — and autolinking then
choked on a value it could not parse. The workflow writes a newline first.

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
