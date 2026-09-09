import * as fs from "node:fs";
import * as path from "node:path";

// Play rejects the *entire* listing commit past 8 phone screenshots per language, and it takes the
// AAB down with it: v2.1.3 built, published on GitHub, and never reached the internal track
// because fr-FR held 10. `fastlane/metadata/README.md` has said "8 is a hard Play limit, not
// advice" since 2026-08-14, in prose, which is exactly as much as a directory obeys. F-Droid has
// no cap, but one directory feeds both stores, so 8 is the law here.

const METADATA = path.resolve(__dirname, "..", "fastlane", "metadata", "android");
const PLAY_PHONE_SCREENSHOT_LIMIT = 8;

function shots(locale: string): string[] {
  return fs.readdirSync(path.join(METADATA, locale, "images", "phoneScreenshots"));
}

describe("Play store listing", () => {
  test.each(["en-US", "fr-FR"])("%s ships at most 8 phone screenshots", (locale) => {
    const files = shots(locale);
    // Two, not zero: a listing with one screenshot is rejected as well, and an emptied directory
    // would otherwise pass this silently.
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.length).toBeLessThanOrEqual(PLAY_PHONE_SCREENSHOT_LIMIT);
  });
});
