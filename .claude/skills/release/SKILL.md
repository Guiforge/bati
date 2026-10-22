---
name: release
description: Cutting a Bati release (npm run release, tag-driven release.yml, changelog per versionCode, keystore, F-Droid, building an APK artefact without publishing). Use before tagging or touching the release workflow.
disable-model-invocation: true
---

## Releases

Commit to main; the hooks and CI are the gate, not a review step. Cutting a release is one
command:

```bash
npm run release            # 1.0.0 -> 1.0.1
npm run release -- minor   # 1.0.0 -> 1.1.0
```

It refuses a dirty tree, refuses a branch other than main, refuses to run when main and origin
disagree, bumps `package.json` **and** `app.json` together, tags, and pushes. The tag is what
[`.github/workflows/release.yml`](.github/workflows/release.yml) watches: it re-runs every gate
once, then builds twice from that commit (arm64-only, R8-minified — the R8 switches default to on in
`plugins/withAndroidReleaseFlags.js`, so the `-P` flags the workflow and
`fdroid/fdroiddata-recipe.yml` still pass are belt-and-braces rather than the source).

| Build | `EXPO_PUBLIC_DISTRIBUTION` | Produces | Goes to |
|---|---|---|---|
| `foss` | `github` | APK | the GitHub Release, then our F-Droid repository through `pages.yml` |
| `play` | `play` | AAB (plus an APK only the guards read) | Play's internal track, unattended |

f-droid.org is the third distribution (`fdroid`): its bot builds the tag itself from
`fdroid/fdroiddata-recipe.yml`, nothing to do per release. Never attach the AAB or the play APK to
the GitHub Release: `pages.yml` indexes every `*.apk` it finds there. The `github` job waits for
both builds, so a red play build publishes no APK either; it does not wait for the Play *upload*,
which has no approval gate while the track is `internal`. Promotion beyond it is by hand in the
Play Console.

The Play listing is `fastlane/metadata/android` with `fastlane/play/android` laid over it (empty
for now). Changelogs are shared and never go in the overlay, so keep them free of anything that
is true on one store only. [`docs/fdroid.md`](docs/fdroid.md) § Three distributions has the full
table, and `docs/planning/roadmap.md` §1 covers the stores.

The release keystore exists since 2026-07-31 and is wired through
[`plugins/withAndroidReleaseSigning.js`](plugins/withAndroidReleaseSigning.js); a signed build was
verified with `apksigner`. It is the one irreversible asset here — lose it and the published app
can never be updated again.

Three things to know before tagging:

- **Leave the flame pivot alone.** `FLAME_PIVOT` in `constants/flame.ts` is the date of the v2.13.0
  tag, which shipped the sleeping flame. Moving it in a later release turns gaps heroes already saw
  bridged back into breaks (or, earlier, rewrites their past), so it stays at 2026-10-21.
- **Write the changelog first.** `fastlane/metadata/android/*/changelogs/<versionCode>.txt` is
  named after the integer, not the version string, and a missing file fails silently — the entry
  just has no notes. `npx expo config --type public | grep versionCode` tells you the number.
  The same file is what the app shows after an update (`app.config.js` embeds it, see
  `src/whatsNew.ts`), so write it for a hero, not only for a store page.
- **Expo modules build from source** (`expo.autolinking.buildFromSource` in `package.json`), which
  is what lets F-Droid reproduce the build and costs a much slower one. `release.yml` also accepts
  `workflow_dispatch`, and its two publishing jobs are guarded by
  `startsWith(github.ref, 'refs/tags/')` — so you can run it on a branch to run both builds and
  get the foss APK as an artefact without publishing anything.
- **Play the update on an emulator first:** `scripts/upgrade-check.sh` installs the previous APK,
  then the new one over it. No CI job does this. The release workflow also refuses a tag that
  ships two migrations, unless one of them carries `-- multi-migration-ok: <why>`
  (`docs/architecture/data-safety.md`).
