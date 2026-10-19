const { withMainActivity } = require("expo/config-plugins");

/**
 * Forget the quest file a task was started with, once that task is brought back. The same goes for
 * the reminder's "Fait ailleurs ?" link (`bati:///journal?add=past`): a form opened from a
 * notification must not open again when the task is restored from recents after the process died,
 * and the store that says "already opened" died with the process.
 *
 * A quest file tapped in a chat starts Bati's task with an ACTION_VIEW intent carrying the file's
 * `content://` URI (`app/+native-intent.tsx`), and Android keeps that intent as the task's root.
 * After the process dies, reopening the task from recents recreates the activity with the same
 * intent, React Native's `getInitialURL` reads it again, and the import preview came back, its
 * "Update my quest" one tap from overwriting what the hero had changed since (verified on an
 * API 35 emulator, 2026-10-02). An activity recreated from saved state, or launched from history,
 * is not a file being opened: its data is dropped before React Native asks for it.
 *
 * ponytail: patches generated Kotlin by string, like `withAndroidPredictiveBack.js`. The ceiling is
 * that an Expo upgrade reshaping `MainActivity.onCreate` leaves the anchor unfound; the plugin then
 * throws at prebuild and `__tests__/android-manifest.test.ts` pins the committed output, so it is a
 * red build and never a silent one. Move to a real modifier when Expo ships one.
 */
const MARKER = "bati-stale-file-intent";
const ANCHOR = "    super.onCreate(null)\n";

module.exports = function withAndroidStaleFileIntent(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    if (!src.includes(ANCHOR) || !src.includes("import android.os.Bundle\n")) {
      throw new Error(
        "withAndroidStaleFileIntent: MainActivity.kt no longer has the expected shape",
      );
    }

    src = src
      .replace(
        "import android.os.Bundle\n",
        "import android.content.Intent\nimport android.os.Bundle\n",
      )
      .replace(
        ANCHOR,
        `    // ${MARKER}: see plugins/withAndroidStaleFileIntent.js.
    val fromHistory = (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0
    val data = intent.data
    val stale = data != null && (data.scheme == "content" || (data.scheme == "bati" && data.getQueryParameter("add") != null))
    if ((savedInstanceState != null || fromHistory) && stale) {
      intent = Intent(intent).setData(null)
    }
${ANCHOR}`,
      );
    // A task alive in recents but with a dead process is recreated on its old MAIN intent, and the
    // notification's link arrives in onNewIntent while React Native has no context to give it to.
    // Keeping it as the activity's intent lets getInitialURL find it; the guard above still sees
    // the system's own intent in onCreate, so a task restored later forgets it.
    src = src.replace(
      "\n  /**\n   * Returns the name of the main component",
      `
  // ${MARKER}: the link of a notification that restarts a dead process.
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }

  /**
   * Returns the name of the main component`,
    );
    cfg.modResults.contents = src;
    return cfg;
  });
};
