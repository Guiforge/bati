import * as fs from "node:fs";
import * as path from "node:path";
import appJson from "../app.json";

// `fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt` is named after the integer,
// not the version string — and a missing file fails *silently*: the store entry simply has no
// release notes and nothing anywhere says so. It is the one invariant on the release path with a
// documented silent-failure mode and, until now, no test, while five siblings guarded lesser
// things (versionCode overflow, scanignore, permissions, i18n keys, seeded content).
//
// The number is easy to get wrong by hand, which is the point: it is derived here the same way
// app.config.js derives it, so a bumped version with a changelog written for the old code fails.

const ROOT = path.resolve(__dirname, "..");
const METADATA = path.join(ROOT, "fastlane", "metadata", "android");

/** Google Play truncates past this; the repo's own convention is to stay under it in both locales. */
const PLAY_CHANGELOG_LIMIT = 500;

function localeDirs(): string[] {
  return fs
    .readdirSync(METADATA, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(METADATA, e.name, "changelogs")))
    .map((e) => e.name);
}

describe("release changelogs", () => {
  const versionCode = appJson.expo.android.versionCode;
  const locales = localeDirs();

  test("the metadata tree still has the locales this asserts against", () => {
    // Without this, a renamed or emptied metadata tree would make every test below pass vacuously.
    expect(locales.sort()).toEqual(["en-US", "fr-FR"]);
  });

  test.each(localeDirs())("%s has release notes for the versionCode being shipped", (locale) => {
    const file = path.join(METADATA, locale, "changelogs", `${versionCode}.txt`);

    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing ${path.relative(ROOT, file)}.\n` +
          `app.json is at version ${appJson.expo.version} (versionCode ${versionCode}), so that ` +
          `is the file name Fastlane and F-Droid look for. Write the notes before tagging: ` +
          `after the tag it is a release with a blank "What's new".`,
      );
    }

    const body = fs.readFileSync(file, "utf8").trim();
    expect(body.length).toBeGreaterThan(0);
    expect(body.length).toBeLessThanOrEqual(PLAY_CHANGELOG_LIMIT);
  });
});
