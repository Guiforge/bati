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
[`.github/workflows/release.yml`](.github/workflows/release.yml) watches: it re-runs every gate,
builds the APK (arm64-only, R8-minified — the R8 switches default to on in
`plugins/withAndroidReleaseFlags.js`, so the `-P` flags the workflow and
`fdroid/fdroiddata-recipe.yml` still pass are belt-and-braces rather than the source), and publishes it as a GitHub
Release.

No store is involved yet. [`docs/fdroid.md`](docs/fdroid.md) covers the F-Droid repository that
turns those APKs into something that updates itself, and `docs/planning/roadmap.md` §1 covers
the stores.

The release keystore exists since 2026-07-31 and is wired through
[`plugins/withAndroidReleaseSigning.js`](plugins/withAndroidReleaseSigning.js); a signed build was
verified with `apksigner`. It is the one irreversible asset here — lose it and the published app
can never be updated again.

Two things to know before tagging:

- **Write the changelog first.** `fastlane/metadata/android/*/changelogs/<versionCode>.txt` is
  named after the integer, not the version string, and a missing file fails silently — the entry
  just has no notes. `npx expo config --type public | grep versionCode` tells you the number.
  The same file is what the app shows after an update (`app.config.js` embeds it, see
  `src/whatsNew.ts`), so write it for a hero, not only for a store page.
- **Expo modules build from source** (`expo.autolinking.buildFromSource` in `package.json`), which
  is what lets F-Droid reproduce the build and costs a much slower one. `release.yml` also accepts
  `workflow_dispatch`, and its publish step is guarded by `startsWith(github.ref, 'refs/tags/')` —
  so you can run it on a branch to build the APK as an artefact without publishing anything.
- **Play the update on an emulator first:** `scripts/upgrade-check.sh` installs the previous APK,
  then the new one over it. No CI job does this. The release workflow also refuses a tag that
  ships two migrations, unless one of them carries `-- multi-migration-ok: <why>`
  (`docs/architecture/data-safety.md`).
