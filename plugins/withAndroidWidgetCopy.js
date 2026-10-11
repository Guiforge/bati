const { AndroidConfig, withAndroidManifest, withStringsXml } = require("expo/config-plugins");

/**
 * Let the Android widget picker speak the phone's language.
 *
 * `react-native-android-widget` inlines each widget's `label` into `AndroidManifest.xml` and
 * writes its `description` as a string resource marked `translatable="false"`, so "Bati: Flame"
 * and "Your training flame." were English on every phone. This turns both into ordinary string
 * resources: the label becomes `@string/widget_<name>_label`, and the description loses the flag.
 *
 * The English is `locales/native/en.json`, the one place these four strings are written, and the
 * other languages are the `android` block of `locales/native/<language>.json`, which Expo's
 * `locales` field already writes into `res/values-b+<language>/strings.xml`. Nothing here names
 * a language: a new one is its file and its line under `locales` in `app.json`.
 *
 * Listed before `react-native-android-widget` in `app.json` on purpose. The mod registered last
 * runs first, so being listed earlier is what makes this run after the library has written its
 * receiver and its description. `__tests__/language-surfaces.test.ts` reads the committed
 * prebuild output, which is what fails if the order is ever lost.
 */
const english = require("../locales/native/en.json").android;

const WIDGET = /^\.widget\.(\w+)$/;

module.exports = function withAndroidWidgetCopy(config) {
  const labelled = withAndroidManifest(config, (cfg) => {
    const receivers = (cfg.modResults.manifest.application ?? []).flatMap(
      (application) => application.receiver ?? [],
    );
    for (const receiver of receivers) {
      const name = WIDGET.exec(receiver.$?.["android:name"] ?? "")?.[1];
      if (!name) continue;
      const key = `widget_${name.toLowerCase()}_label`;
      if (!(key in english)) throw new Error(`locales/native/en.json has no android.${key}`);
      receiver.$["android:label"] = `@string/${key}`;
    }
    return cfg;
  });

  return withStringsXml(labelled, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      Object.entries(english).map(([name, value]) => ({
        $: { name },
        _: value.replace(/'/g, "\\'"),
      })),
      cfg.modResults,
    );
    return cfg;
  });
};
