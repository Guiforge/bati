const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Let MainActivity absorb a font-size or display-size change instead of being recreated.
 *
 * Expo's `configChanges` list has no `fontScale` or `density`, so a hero who moves either slider
 * with Bati open (a large-text user does, to find the size that fits) gets the activity torn down
 * and rebuilt: a running session loses its screen. React Native re-reads both from the
 * `Configuration` it is handed, so handling them in the activity is all it takes.
 *
 * `__tests__/android-adaptive.test.ts` pins the committed manifest.
 */
const WANTED = ["fontScale", "density"];

module.exports = function withAndroidFontScaleConfigChanges(config) {
  return withAndroidManifest(config, (cfg) => {
    const activities = (cfg.modResults.manifest.application ?? []).flatMap(
      (application) => application.activity ?? [],
    );
    const main = activities.find((a) => a.$?.["android:name"] === ".MainActivity");
    if (!main)
      throw new Error("withAndroidFontScaleConfigChanges: no .MainActivity in the manifest");
    const current = (main.$["android:configChanges"] ?? "").split("|").filter(Boolean);
    main.$["android:configChanges"] = [
      ...current,
      ...WANTED.filter((w) => !current.includes(w)),
    ].join("|");
    return cfg;
  });
};
