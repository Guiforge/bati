import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The committed manifest is what prebuild generates, and CI proves the two agree — so asserting
 * on the file asserts on the build. This exists because `<queries>` once declared only `https`:
 * on Android 11+ package visibility then makes `Linking.canOpenURL("mailto:…")` answer false on
 * a phone with a single mail app, and the Feedback row said "No email app found" with Gmail
 * installed. `plugins/withAndroidMailtoQuery.js` adds the declaration; this pins it.
 */
test("the manifest declares the mailto scheme in <queries>, so canOpenURL can see mail apps", () => {
  const manifest = readFileSync(
    join(__dirname, "..", "android", "app", "src", "main", "AndroidManifest.xml"),
    "utf8",
  );

  const queries = manifest.match(/<queries>([\s\S]*?)<\/queries>/)?.[1] ?? "";
  expect(queries).toContain('android:scheme="mailto"');
});
