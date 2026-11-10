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

/**
 * A Bati file tapped in a chat or in Files opens Bati on the import preview. A `.bati` file has no
 * type Android knows, so it arrives as `application/octet-stream`; the files sent before the
 * extension changed are `application/json`. The filter names both MIME types and no scheme, which is what lets it match `content:` and `file:` URIs: expo-dev-client
 * appends `exp+bati` to every VIEW filter, and `plugins/withAndroidFileIntentScheme.js` takes it
 * back out. With the scheme in, the filter matches nothing a chat app sends.
 */
test("MainActivity opens Bati files, with no scheme narrowing the filter", () => {
  const filters = [
    ...main("AndroidManifest.xml").matchAll(/<intent-filter[^>]*>([\s\S]*?)<\/intent-filter>/g),
  ].map((m) => m[1] ?? "");
  const json = filters.filter((f) => f.includes('android:mimeType="application/json"'));
  expect(json).toHaveLength(1);
  // The same filter: the plugin strips the scheme from the one that names `application/json`.
  expect(json[0]).toContain('android:mimeType="application/octet-stream"');
  expect(json[0]).toContain('android:name="android.intent.action.VIEW"');
  expect(json[0]).toContain('android:name="android.intent.category.DEFAULT"');
  expect(json[0]).not.toContain("android:scheme");
  // Expo's `data-generated` marker failed `lintRelease` in CI (MissingPrefix).
  expect(main("AndroidManifest.xml")).not.toContain("data-generated");
});

/**
 * The scanner's permission stays out of what ships until a lot opens the scanner to players: the
 * install screen and Exodus would list a camera for a screen nobody can reach.
 */
test("the committed manifest strips CAMERA while multiplayer is behind its flag", () => {
  expect(main("AndroidManifest.xml")).toContain(
    '<uses-permission android:name="android.permission.CAMERA" tools:node="remove"/>',
  );
});

/**
 * The sealed link. Verified against getbati.app/.well-known/assetlinks.json (docs/legal), and on one
 * path: a wider filter would pull the site's other pages into the app. A `pathPrefix` would too.
 */
test("MainActivity claims the sealed link's path, verified, and nothing else of the site", () => {
  const filters = [
    ...main("AndroidManifest.xml").matchAll(/<intent-filter([^>]*)>([\s\S]*?)<\/intent-filter>/g),
  ];
  const link = filters.filter((m) => m[2]?.includes('android:host="getbati.app"'));
  expect(link).toHaveLength(1);
  expect(link[0]?.[1]).toContain('android:autoVerify="true"');
  expect(link[0]?.[2]).toContain('android:scheme="https"');
  expect(link[0]?.[2]).toContain('android:path="/d"');
  // autoVerify is refused on a filter with any scheme but http and https.
  expect(link[0]?.[2]).not.toContain("exp+bati");
  expect(link[0]?.[2]).toContain('android:name="android.intent.category.BROWSABLE"');
});

/**
 * A task started by a tapped quest file keeps that VIEW intent as its root. Reopened from recents
 * after the process died, it showed the import preview again, "Update my quest" one tap from
 * overwriting the hero's own edits (seen on the emulator). `plugins/withAndroidStaleFileIntent.js`
 * drops the file before React Native reads its initial URL.
 */
test("MainActivity forgets a quest file when its task is restored, before RN reads it", () => {
  const activity = main("java", "com", "guiforge", "bati", "MainActivity.kt");
  const drop = activity.indexOf("intent = Intent(intent).setData(null)");
  expect(drop).toBeGreaterThan(-1);
  expect(activity).toContain("savedInstanceState != null || fromHistory");
  // The reminder's link opens a form, and a restored task must not open it again.
  expect(activity).toContain('data.getQueryParameter("add") != null');
  // A sealed link holds an invite's secret: restored, it must not ask again.
  expect(activity).toContain('data.scheme == "https"');
  expect(activity).toContain('data.host == "d"');
  expect(activity).toContain("Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY");
  expect(drop).toBeLessThan(activity.indexOf("super.onCreate(null)"));
});

/**
 * Process killed, task still in recents: Android recreates MainActivity on its old MAIN intent and
 * hands the notification's link to `onNewIntent`, where React Native drops it while it has no
 * context. Keeping it as the activity's intent is what lets `getInitialURL` find it.
 */
test("MainActivity keeps the intent onNewIntent receives, for a cold start through a notification", () => {
  const activity = main("java", "com", "guiforge", "bati", "MainActivity.kt");
  expect(activity).toMatch(
    /override fun onNewIntent\(intent: Intent\) \{\s*setIntent\(intent\)\s*super\.onNewIntent\(intent\)/,
  );
});

test("the launcher icon has a monochrome layer for themed icons", () => {
  for (const icon of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    expect(main("res", "mipmap-anydpi-v26", icon)).toContain("<monochrome ");
  }
});
