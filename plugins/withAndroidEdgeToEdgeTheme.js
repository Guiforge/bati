const { AndroidConfig, withAndroidStyles } = require("expo/config-plugins");

/**
 * Strip the two system bar colours Expo writes into `AppTheme`, which Android 15 deprecated.
 *
 * The Play Console reports them as "deprecated APIs or parameters for edge-to-edge". They are
 * the *parameters* half of that sentence: `android:statusBarColor` and
 * `android:navigationBarColor` are the theme attributes deprecated in API 35, and with
 * `edgeToEdgeEnabled=true` in `android/gradle.properties` the bars are already transparent and
 * drawn behind, so both items set a value nothing reads.
 *
 * They are not ours. `@expo/config-plugins/build/android/SystemBars.js` adds both
 * unconditionally on every prebuild, with no `app.json` switch to turn it off, which is why this
 * has to be a mod rather than a setting or a hand edit: editing `styles.xml` directly survives
 * exactly until the next `expo prebuild`.
 *
 * Nothing else in the app touches window APIs. `app/_layout.tsx` renders
 * `<StatusBar style="light" />` with no `backgroundColor` and no `translucent`, which maps to
 * `WindowInsetsControllerCompat` and not to the deprecated setters; insets come from
 * `useSafeAreaInsets()` everywhere and the deprecated `<SafeAreaView>` appears nowhere; no
 * Kotlin here calls `setStatusBarColor`, `setNavigationBarColor` or `setDecorFitsSystemWindows`.
 * These two lines were the whole finding.
 *
 * Android lint cannot hold this: there is no check for the deprecated system bar attributes, the
 * Play Console scans the built artefact instead. `__tests__/android-adaptive.test.ts` reads the
 * committed `styles.xml` and is what fails if this plugin ever stops biting.
 */
const REMOVE = ["android:statusBarColor", "android:navigationBarColor"];

module.exports = function withAndroidEdgeToEdgeTheme(config) {
  return withAndroidStyles(config, (cfg) => {
    const { Styles } = AndroidConfig;
    const parent = Styles.getAppThemeGroup();

    // Removing an absent item is a silent no-op, so assert the group itself instead: a missing
    // AppTheme means the template moved and this plugin is quietly doing nothing.
    if (!Styles.getStyleParent(cfg.modResults, parent)) {
      throw new Error("withAndroidEdgeToEdgeTheme: no AppTheme style group in styles.xml");
    }

    for (const name of REMOVE) {
      cfg.modResults = Styles.removeStylesItem({ xml: cfg.modResults, parent, name });
    }
    return cfg;
  });
};
