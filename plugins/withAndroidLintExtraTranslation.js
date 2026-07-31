const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Let a release APK assemble despite Expo copying iOS-only strings into Android resources.
 *
 * `expo.locales` in app.json is what localises the iOS permission prompts — it generates
 * `ios/Bati/Supporting/{en,fr}.lproj/InfoPlist.strings`, and both stores require those. Expo
 * applies the same field to Android, where it writes the *same keys* into
 * `res/values-b+en/strings.xml` and `values-b+fr/strings.xml`. One of them is
 * `NSPhotoLibraryUsageDescription`, an Info.plist key that means nothing on Android and has no
 * counterpart in the default locale — so `lintVitalRelease` fails with `ExtraTranslation` and
 * **no release build can be produced at all**. Debug builds skip that task, which is why this
 * went unnoticed until the first release assemble.
 *
 * Moving `locales` under `ios` in app.json silences Android but silently stops generating the
 * iOS `.lproj` files, trading a build error for a store rejection. Verified, not assumed.
 *
 * Disabling this one check costs close to nothing here: the app ships no Android string
 * resources of its own beyond the app name, so the only "extra translations" that can exist are
 * the Info.plist keys Expo puts there. User-facing copy lives in `locales/*.json` and is checked
 * by `__tests__/i18n-keys.test.ts`, which compares the two locales key by key.
 *
 * ponytail: disables the whole ExtraTranslation check rather than whitelisting the two keys,
 *           because Gradle lint has no per-string ignore that survives a prebuild. If real
 *           Android string resources ever land, whitelist instead.
 */
const LINT_BLOCK = `    lint {
        disable 'ExtraTranslation'
    }
`;

module.exports = function withAndroidLintExtraTranslation(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error(
        "withAndroidLintExtraTranslation: expected a groovy build.gradle, got " +
          cfg.modResults.language,
      );
    }
    if (cfg.modResults.contents.includes("disable 'ExtraTranslation'")) {
      return cfg;
    }

    // Anchor on `buildTypes {`, which the Expo template always emits inside `android { }`.
    const anchor = "    buildTypes {";
    if (!cfg.modResults.contents.includes(anchor)) {
      throw new Error("withAndroidLintExtraTranslation: could not find the buildTypes block");
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(anchor, LINT_BLOCK + anchor);
    return cfg;
  });
};
