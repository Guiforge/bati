const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

/**
 * The whole Android lint configuration, in one block.
 *
 * Lint is stricter here than the default and still cannot break a release. `checkReleaseBuilds`
 * is true by default, which limits the analysis inside `assembleRelease` to issues whose
 * severity is `fatal`; `warningsAsErrors` promotes warnings to *errors*, never to fatal. So the
 * strictness below binds on `./gradlew :app:lintRelease`, which is what
 * `.github/workflows/android-lint.yml` runs on every push that touches Android, and a tag keeps
 * failing on exactly what it failed on before. Deliberate: a gate that only fires when you cut a
 * release is the gate this repo already regrets having.
 *
 * ## `disable 'ExtraTranslation'`
 *
 * `expo.locales` in app.json is what localises the iOS permission prompts, generating
 * `ios/Bati/Supporting/{en,fr}.lproj/InfoPlist.strings`, and both stores require those. Expo
 * applies the same field to Android, where it writes the *same keys* into
 * `res/values-b+en/strings.xml` and `values-b+fr/strings.xml`. One of them is
 * `NSPhotoLibraryUsageDescription`, an Info.plist key that means nothing on Android and has no
 * counterpart in the default locale, so `lintVitalRelease` fails with `ExtraTranslation` and
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
 *
 * ## `disable 'LockedOrientationActivity'`
 *
 * `orientation: "portrait"` in app.json is a product decision, not an oversight: this is a
 * one-handed app used between two sets, and the 32 screens are laid out for a tall window. The
 * check fires on the `android:screenOrientation="portrait"` that decision generates.
 *
 * What the Play Console reports about it is worth reading carefully. From Android 16 the
 * attribute is *already ignored* on large screens, meaning tablets and unfolded foldables
 * resize the app today whether the manifest asks for it or not. So the lock costs nothing there
 * and still works on phones, and the real question the warning raises is whether the layout
 * survives a large window, which is a thing to look at rather than a thing to configure.
 * Nothing here declares `resizeableActivity="false"` or a `maxAspectRatio`, and `configChanges`
 * already covers `orientation|screenSize|screenLayout|smallestScreenSize`, so the activity takes
 * the resize without being recreated.
 *
 * Disabled rather than left to the baseline on purpose: a baseline entry is a silent suppression
 * with no room for the paragraph above.
 *
 * `DiscouragedApi` reports the same attribute in the same words and is *not* disabled, because
 * it covers far more than orientation: that one entry sits in the baseline instead, and this
 * paragraph is its justification. If it ever needs a second entry, read the message first.
 *
 * ## `disable 'NewerVersionAvailable'`
 *
 * It fires on Fresco, and it is wrong here. Native dependency versions come from
 * `expo/bundledNativeModules.json`, F-Droid rebuilds them from source against the SDK's React
 * Native, and a version the SDK does not expect is their build error rather than ours, which is
 * the same reason `expo.install.exclude` in package.json is for tooling only. Left enabled it
 * would also rot the baseline on every upstream release, since the message carries the version
 * number.
 *
 * ## `informational 'LintBaseline', 'LintBaselineFixed'`
 *
 * Not decoration. As soon as a baseline filters anything, lint emits a `LintBaseline` reminder,
 * and under `warningsAsErrors` that reminder is itself an error that fails every single build.
 * Since AGP 8.4 "what the baseline filtered" and "what the baseline no longer needs" are two
 * separate ids, so both have to be named. Order matters: severity overrides are applied in the
 * order they are written, so these must come *after* `warningsAsErrors`.
 *
 * ## The baseline lives outside `android/`
 *
 * CI and `.github/workflows/kotlin.yml` both run `npx expo prebuild -p android --clean`, which
 * deletes `android/` outright. `$rootDir` is `android/`, hence the `..`. Regenerate it with
 * `./gradlew :app:updateLintBaseline`, never by hand. It is a ratchet like the coverage
 * thresholds: shrink it, never widen it to make a build pass.
 *
 * Deliberately absent: `checkAllWarnings`, which Google discourages because the checks that are
 * off by default are the slow ones and the false-positive-prone ones; and `checkDependencies`,
 * which would put every AAR under `node_modules` through the analysis.
 *
 * ## `android.lint.useK2Uast=false`
 *
 * Not a preference, a workaround for a crash. `checkDependencies` being off does not stop AGP
 * from running `lintAnalyze` on every library module, and with
 * `expo.autolinking.buildFromSource` every Expo and React Native package *is* a source module.
 * One of them, `react-native-worklets`, kills lint's K2 analysis of its Kotlin build script:
 * `Cannot find a KaModule for the VirtualFile`, thrown out of `LintDriver.checkBuildScripts`,
 * which fails the whole task before `:app` is ever reached. K2 UAST became the default in recent
 * AGP versions; falling back to the previous engine is the whole fix, and the property is the
 * supported way to ask for it.
 *
 * ponytail: pinned to the old engine because a dependency's build script trips the new one.
 *           Drop the property and re-run `:app:lintRelease` when either AGP or worklets moves.
 */
const GRADLE_PROPERTIES = {
  "android.lint.useK2Uast": "false",
};

const LINT_BLOCK = `    lint {
        disable 'ExtraTranslation', 'LockedOrientationActivity', 'NewerVersionAvailable'
        warningsAsErrors = true
        informational 'LintBaseline', 'LintBaselineFixed'
        baseline = file("$rootDir/../android-lint-baseline.xml")
        textReport = true
    }
`;

module.exports = function withAndroidLint(config) {
  const withProperties = withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(GRADLE_PROPERTIES)) {
      const existing = cfg.modResults.find((item) => item.type === "property" && item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: "property", key, value });
      }
    }
    return cfg;
  });

  return withAppBuildGradle(withProperties, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error(
        `withAndroidLint: expected a groovy build.gradle, got ${cfg.modResults.language}`,
      );
    }
    if (cfg.modResults.contents.includes("disable 'ExtraTranslation'")) {
      return cfg;
    }

    // Anchor on `buildTypes {`, which the Expo template always emits inside `android { }`.
    const anchor = "    buildTypes {";
    if (!cfg.modResults.contents.includes(anchor)) {
      throw new Error("withAndroidLint: could not find the buildTypes block");
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(anchor, LINT_BLOCK + anchor);
    return cfg;
  });
};
