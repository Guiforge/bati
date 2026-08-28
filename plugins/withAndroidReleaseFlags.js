const { withGradleProperties } = require("expo/config-plugins");

/**
 * The gradle.properties a release build needs, in one place.
 *
 * Two of these only make the download smaller:
 *
 * `expo.useLegacyPackaging=true` puts the native libraries back under deflate. Expo's default
 * stores them uncompressed and page-aligned so Android can map them straight out of the APK,
 * which is the right trade for a Play install — Play strips the compression itself and serves
 * per-device splits. It is the wrong trade here: this app is downloaded as a whole APK from
 * F-Droid and from GitHub Releases, where those 25 `.so` were 23.6 MiB of a 67.1 MiB v1.13.0 and
 * deflate to 8.0 MiB. The cost is real and paid once: Android extracts them at install time, so
 * the device carries roughly 8 MiB more and the install takes a moment longer.
 *
 * `expo.gif.enabled=false` drops Fresco's GIF decoders (`libgifimage`, `libanimation-decoder-gif`,
 * 0.56 MiB). Fresco only backs `<Image>` from react-native; every image in this app is drawn by
 * expo-image, which decodes through Glide, and there is not one GIF in `assets/`. Turn it back on
 * the day a GIF appears — the symptom would be a blank image, not a build error.
 *
 * WebP is deliberately left enabled: the same reasoning would apply, but 295 of the app's assets
 * are WebP and a wrong call there is 295 blank images.
 *
 * The other two are the R8 switches. Expo's generated `build.gradle` defaults both to **false**,
 * so a release build only minifies when something passes `-P` on the command line — which
 * `.github/workflows/release.yml` and `fdroid/fdroiddata-recipe.yml` do, and a local
 * `npm run android:release` did not. A build that skips R8 is not the build being shipped, and a
 * measurement taken on it is worth nothing. Defaulting them here makes every release build the
 * same build; the two command lines now pass values that agree with the default.
 */
const PROPERTIES = {
  "expo.useLegacyPackaging": "true",
  "expo.gif.enabled": "false",
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
};

module.exports = function withAndroidReleaseFlags(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      const existing = cfg.modResults.find((item) => item.type === "property" && item.key === key);

      if (existing) {
        existing.value = value;
      } else {
        // Not in Expo's generated file — the R8 switches are only ever read through
        // `findProperty`, so they have to be added rather than overwritten.
        cfg.modResults.push({ type: "property", key, value });
      }
    }
    return cfg;
  });
};
