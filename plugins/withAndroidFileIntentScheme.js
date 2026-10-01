const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Keep the quest-file intent filter free of any scheme.
 *
 * `app.json` claims `application/json` on ACTION_VIEW so a quest file tapped in a chat or in Files
 * opens Bati (`app/+native-intent.tsx`). A filter that names a MIME type and no scheme matches
 * `content:` and `file:` URIs, which is what every chat app hands over. expo-dev-client's
 * `withGeneratedAndroidScheme` appends `exp+bati` to every VIEW filter of the activity, ours
 * included, and a filter that names a scheme matches only that scheme: the file would never reach
 * Bati again, in a release build as much as in a dev one, since the plugin runs on every prebuild.
 *
 * `__tests__/android-manifest.test.ts` pins the filter as it must stay.
 */
module.exports = function withAndroidFileIntentScheme(config) {
  return withAndroidManifest(config, (cfg) => {
    const filters = (cfg.modResults.manifest.application ?? [])
      .flatMap((application) => application.activity ?? [])
      .flatMap((activity) => activity["intent-filter"] ?? []);
    for (const filter of filters) {
      const data = filter.data ?? [];
      // Ours only: a library's `https` + MIME filter would become a catch-all without its scheme.
      if (data.some((d) => d.$?.["android:mimeType"] === "application/json")) {
        filter.data = data.filter((d) => !d.$?.["android:scheme"]);
        // Expo's marker for the filters it generated: Android lint fails `lintRelease` on it
        // (MissingPrefix), and `prebuild --clean` regenerates the manifest without needing it.
        if (filter.$) delete filter.$["data-generated"];
      }
    }
    return cfg;
  });
};
