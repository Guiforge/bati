import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_LANGUAGES } from "@/src/i18n/deviceLanguage";

const main = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "android", "app", "src", "main", ...parts), "utf8");

/**
 * The committed manifest is what prebuild generates, and CI proves the two agree — so asserting
 * on the file asserts on the build. This exists because `<queries>` once declared only `https`:
 * on Android 11+ package visibility then makes `Linking.canOpenURL("mailto:…")` answer false on
 * a phone with a single mail app, and the Feedback row said "No email app found" with Gmail
 * installed. `plugins/withAndroidMailtoQuery.js` adds the declaration; this pins it.
 */
test("the manifest declares the mailto scheme in <queries>, so canOpenURL can see mail apps", () => {
  const queries = main("AndroidManifest.xml").match(/<queries>([\s\S]*?)<\/queries>/)?.[1] ?? "";
  expect(queries).toContain('android:scheme="mailto"');
});

/**
 * Android's per-app language picker lists what `locales_config.xml` declares, and prebuild writes
 * that file from `expo-localization`'s options in `app.json`, not from the app's own list. German
 * and Spanish shipped missing from the system settings, and from `resourceConfigurations` too.
 */
test("the system language picker offers every app language", () => {
  const declared = [
    ...main("res", "xml", "locales_config.xml").matchAll(/android:name="([^"]+)"/g),
  ];
  expect(declared.map((m) => m[1]).sort()).toEqual([...APP_LANGUAGES].sort());
});

/**
 * Play flags an app that opts out of predictive back. RN 0.86's `ReactActivity` still routes the
 * gesture through an always-enabled `OnBackPressedCallback`, so every `BackHandler` keeps working.
 */
test("the app opts in to predictive back", () => {
  expect(main("AndroidManifest.xml")).toContain('android:enableOnBackInvokedCallback="true"');
});

/**
 * RN only registers that callback on Android 16, so the opt-in alone sent every back gesture on
 * 13 to 15 straight out of the app. `plugins/withAndroidPredictiveBack.js` fills the gap, and must
 * keep the callback off during the default back, or the first back from Home loops until the
 * system kills the process.
 */
test("MainActivity forwards back to JS on Android 13 to 15, without re-entering it", () => {
  const activity = main("java", "com", "guiforge", "bati", "MainActivity.kt");
  expect(activity).toContain(
    "if (Build.VERSION.SDK_INT in 33..35) onBackPressedDispatcher.addCallback(this, backToJs)",
  );
  // The default back is only ever reached through the wrapper that switches the callback off.
  expect(activity.match(/super\.invokeDefaultOnBackPressed\(\)/g)?.length).toBe(1);
  expect(activity.match(/defaultBackWithoutJs\(\)/g)?.length).toBe(3);
});

test("the launcher icon has a monochrome layer for themed icons", () => {
  for (const icon of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    expect(main("res", "mipmap-anydpi-v26", icon)).toContain("<monochrome ");
  }
});
