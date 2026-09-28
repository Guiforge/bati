const { withMainActivity } = require("expo/config-plugins");

/**
 * Keep Android back reaching JS once the app opts in to predictive back.
 *
 * With `android:enableOnBackInvokedCallback="true"` (app.json `predictiveBackGestureEnabled`),
 * Android 13+ stops calling `Activity.onBackPressed()` and asks the `OnBackPressedDispatcher`
 * instead; with nothing registered there, the system backgrounds the app itself. RN 0.86's
 * `ReactActivity` registers a callback that forwards to `onBackPressed()`, hence to JS
 * `BackHandler` and the router, but only when `isAtLeastTargetSdk36()`, which also requires the
 * *device* to run Android 16. On 13 to 15 every back gesture left the app: the session's pause
 * guard, the village sheet, and plain stack navigation (verified on an API 35 emulator,
 * 2026-09-28). This registers the same callback there; on 16, RN's own is already in place, and
 * below 13 the manifest flag means nothing.
 *
 * The callback must be off while the default back runs. JS answers asynchronously: when nothing
 * handles the press it calls `invokeDefaultOnBackPressed()`, whose `super.onBackPressed()` goes
 * through the dispatcher again, and a live callback re-enters JS forever. Each toggle is a binder
 * call to the system, which killed the process within two seconds ("Too many Binders sent to
 * SYSTEM") on the first back from Home. RN guards its own callback the same way.
 *
 * ponytail: patches generated Kotlin by string. Drop this plugin once RN registers its callback
 * on every API level; `__tests__/android-manifest.test.ts` pins the committed output.
 */
const MARKER = "bati-predictive-back";
const DEFAULT_BACK = "super.invokeDefaultOnBackPressed()";

module.exports = function withAndroidPredictiveBack(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    if (!src.includes(DEFAULT_BACK) || !src.includes("    super.onCreate(null)\n")) {
      throw new Error(
        "withAndroidPredictiveBack: MainActivity.kt no longer has the expected shape",
      );
    }

    src = src
      .replace(
        "import android.os.Bundle\n",
        "import android.os.Bundle\nimport androidx.activity.OnBackPressedCallback\n",
      )
      .replaceAll(DEFAULT_BACK, "defaultBackWithoutJs()")
      .replace(
        "    super.onCreate(null)\n",
        "    super.onCreate(null)\n    if (Build.VERSION.SDK_INT in 33..35) onBackPressedDispatcher.addCallback(this, backToJs)\n",
      )
      .replace(
        "class MainActivity : ReactActivity() {\n",
        `class MainActivity : ReactActivity() {
  // ${MARKER}: see plugins/withAndroidPredictiveBack.js.
  private val backToJs = object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() {
      isEnabled = false
      onBackPressed()
      isEnabled = true
    }
  }

  private fun defaultBackWithoutJs() {
    backToJs.isEnabled = false
    ${DEFAULT_BACK}
    backToJs.isEnabled = true
  }

`,
      );
    cfg.modResults.contents = src;
    return cfg;
  });
};
