# Store listings

One directory, two stores. Google Play and F-Droid both read the
[fastlane supply](https://docs.fastlane.tools/actions/supply/) layout, so the copy is written
once and neither store gets a stale copy of the other's.

```
fastlane/metadata/android/
  en-US/ | fr-FR/
    title.txt               ≤ 30 characters
    short_description.txt   ≤ 80 characters
    full_description.txt    ≤ 4000 characters
    changelogs/<versionCode>.txt
    images/
      icon.png              512×512
      featureGraphic.png    1024×500   (Play only, and required there)
      phoneScreenshots/     1080×1920 or thereabouts, 2 to 8 of them
```

**8 is a hard Play limit, not advice.** A 9th screenshot makes the Play API reject the entire
listing commit — and unless the caller is account admin, the error reads as a bare
`PERMISSION_DENIED` with no mention of screenshots, which cost a day of permission archaeology
on 2026-08-14. F-Droid has no such cap, but this directory feeds both stores, so 8 is the law.

## Screenshots

**Take them after the device pass, not before** — they are the one asset that has to show the
final UI, and re-shooting them is the cost of getting that wrong.

From a connected device, per screen:

```bash
adb exec-out screencap -p > fastlane/metadata/android/en-US/images/phoneScreenshots/1.png
```

The app runs in the device's language, so switch the phone to French and repeat into `fr-FR/`.
Worth showing, in rough order of what sells the idea: a session mid-boss-fight, the village, a
quest, the journal, the victory screen.

## Changelogs

`changelogs/<versionCode>.txt`, where the version code is the integer Android build number, not
the `1.0.1` string. Play shows it as "What's new"; F-Droid shows it in the update prompt. A
missing file is not an error — the entry simply has no notes, which is also how a misnamed file
fails: silently.

[`app.config.js`](../../app.config.js) derives that integer from the version, `major*10000 +
minor*100 + patch`, so `1.0.1` is `10001.txt` and `1.1.0` would be `10100.txt`. Read it off the
build rather than doing the arithmetic in your head:

```bash
npx expo config --type public | grep versionCode
```

## Where these end up

- **F-Droid** — copied into the repository index by `.github/workflows/pages.yml`.
- **Play** — read by `fastlane supply` or uploaded by hand in the Play Console. Nothing automates
  it yet; see [`docs/planning/roadmap.md`](../../docs/planning/roadmap.md) §1.
