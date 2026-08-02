---
title: Publishing through F-Droid
type: technical
status: active
updated: 2026-08-02
related: [planning/roadmap.md, ../CONTRIBUTING.md]
---

# Publishing through F-Droid

Two different things share the name, and only one of them is a realistic next step.

## Which F-Droid

**The official F-Droid catalogue** builds every app itself, from source, on its own
infrastructure, and rejects anything that pulls in proprietary dependencies. That was written off
here as "a project of its own"; most of it has since been done, and what remains is written down
in [Submitting to the official catalogue](#submitting-to-the-official-catalogue) below.

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

**It has run, and the repository is live.** The index is served and signed, and currently offers:

```
com.guiforge.bati   versionName 1.0.1   versionCode 1   160 MB
```

Read it back yourself rather than trusting this page — it is the only statement of what
subscribers actually see:

```bash
curl -sO https://guiforge.github.io/bati/fdroid/repo/index-v1.jar
unzip -p index-v1.jar index-v1.json | python3 -m json.tool | grep -A3 versionName
```

That `versionCode 1` is the bug `app.config.js` fixes, sitting in production: every build ever
published claimed it, so F-Droid had no way to recognise a newer one. The next release carries
`10002`, which is the first version code that can ever have been an update.

## The order that makes sense

1. Generate the release keystore, back it up, add the signing secrets. *(Unblocks Play too.)*
2. Make the repository public, enable Pages. *(Unblocks the privacy policy too.)*
3. `fdroid init` locally, commit `fdroid/config.yml`, add the repo secrets.
4. Cut a release and see whether the index lands.
5. Give people the URL: `https://guiforge.github.io/bati/fdroid/repo`

Steps 1 and 2 are on the release path anyway. F-Droid is mostly a way of getting something back
for work that has to happen regardless.

## Submitting to the official catalogue

Separate from everything above. The self-hosted repository distributes APKs *we* build; f-droid.org
builds them itself, from source, and will not take a binary we hand it. Four things stood in the
way, three of them now cleared.

### The artwork had no licence we could grant — done

`LICENSE` used to say the MIT grant "does not, and cannot" extend to `assets/`. A reviewer reads
that and stops. The illustrations had been generated through Mammouth, an aggregator whose terms
say nothing at all about generated outputs — section 7 covers Customer Data and usage data and
stops there — and which is itself the upstream account holder, so whatever Midjourney or Google
granted went to Mammouth and no further.

Everything is regenerated against Black Forest Labs directly. The FLUX licence is explicit where
Mammouth is silent: no ownership claim over outputs, any purpose including commercial, and outputs
are not derivatives of the model. That grant follows the API key, which is now ours.
`assets/` is CC BY-SA 4.0, and `scripts/provenance.json` records model, prompt and seed for each
image so the claim can be checked rather than taken on trust.

### Expo shipped 22 prebuilt AARs — done

This was the real blocker, and it was hiding behind the Firebase one. Expo SDK 57 distributes its
native modules as **precompiled `.aar` files** in a bundled `local-maven-repo` — 22 of them, 8 MB,
with the Kotlin sources sitting unused beside them. F-Droid builds from source and rejects prebuilt
binaries, so nothing else mattered while this was true. It also meant a source-level patch to
`expo-notifications` changed nothing: the build consumed the AAR and ignored the file.

The switch is one line in `package.json`:

```json
"expo": { "autolinking": { "buildFromSource": [".*"] } }
```

The value is a list of regexes, and `.*` takes everything. Gradle goes from ~20 subprojects to 42,
`:expo-notifications` among them, and the AARs stop being used. Builds get slower; that is the
price, and it buys a build F-Droid can reproduce.

### expo-notifications pulled Firebase — done

`com.google.firebase:firebase-messaging` is forbidden outright by the inclusion policy, and
`expo-notifications` pulls it whether or not you use push. This app does not: `src/notifications.ts`
schedules one local oath reminder and never requests a token.

A Gradle `exclude` does not work — fourteen files reference FCM, one is a `<service>` in the
library manifest, and three of the fourteen are also on the local path. So
[`scripts/fdroid-strip-firebase.py`](../scripts/fdroid-strip-firebase.py) removes the push-only
files and *edits* the three shared ones to drop their FCM branch. It is idempotent, it verifies
afterwards that no `com.google.firebase` reference survives, and it is what the recipe calls in
`prebuild:`.

### The signing key — the one that is left

F-Droid signs its own builds with its own key. Left as is, **nobody who installed from GitHub
Releases or from our own repository can update to the f-droid.org build**: Android refuses an
install whose signature differs, and uninstalling first takes the SQLite database — hero, streak,
journal — with it. This is the same failure `plugins/withAndroidDebugAppId.js` already avoids in dev.

Two ways out, and they want deciding before the merge request, not after:

- **Reproducible builds plus `AllowedAPKSigningKeys`.** F-Droid rebuilds, compares against our
  signed APK byte for byte, and ships *ours*. Nobody's install breaks. This is the larger job, and
  `buildFromSource` above is a precondition for it — a build that consumes prebuilt AARs cannot be
  reproduced from source in the first place.
- **Accept the break.** Document that f-droid.org is a fresh install, and keep the self-hosted
  repository alive for everyone already on it.

### The recipe

[`fdroid/fdroiddata-recipe.yml`](../fdroid/fdroiddata-recipe.yml) is our copy of the file that has
to live in a fork of `fdroiddata` as `metadata/com.guiforge.bati.yml`. Submitting is a merge request
titled `New App: com.guiforge.bati`; publication follows 24–48 h after it is accepted.

### What is actually verified

Worth being precise, because "it works" and "it compiles" are different claims.

**Verified locally**, with `buildFromSource` on and the strip applied:
`:expo-notifications:compileReleaseKotlin` and `:app:compileReleaseJavaWithJavac` both reach
`BUILD SUCCESSFUL`. The stripped module compiles, and the app compiles against it. The strip is
idempotent and re-checks itself afterwards.

A full `:app:packageRelease` also completes locally, producing an APK that reports
`versionCode='10001' versionName='1.0.1'` — the derivation in `app.config.js`, proven in an
artefact rather than in a config dump.

And the strip is confirmed where it counts: the same APK built from a pristine tree contains five
Firebase entries, and built from a stripped one contains **zero**.

**Not verified:** the oath reminder has never been fired on a device against a stripped build,
which is the failure a compiler cannot catch — a class removed at build time only explodes when
something reaches for it at runtime. Nor has this recipe been through `fdroid build
com.guiforge.bati`, which is the only thing that proves the recipe rather than the patch.

### Two failures worth not repeating

Both cost time because the log was not read.

**`OutOfMemoryError: Metaspace`.** Building 42 modules from source instead of consuming 22 AARs
means Gradle *lints* all of them too, and Expo's generated `-XX:MaxMetaspaceSize=512m` was sized
for the prebuilt case. It surfaces as three unrelated `lintVitalAnalyzeRelease` task failures, and
the real cause is one line further down — raising `-Xmx` would not have helped, because Metaspace
holds class metadata rather than objects. Fixed by `plugins/withAndroidGradleMemory.js`.

**It only appears on a cold cache.** A local `assembleRelease` had 1725 of 1857 tasks up to date,
so lint never re-ran and the machine never hit the limit — the failure was CI-only, and looked
like a CI-only problem. When checking a build-system change, `--rerun-tasks` or a `clean`, or the
cache hides exactly what you are looking for.
