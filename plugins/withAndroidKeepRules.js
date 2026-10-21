const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

/**
 * R8 keep rules a dependency should have shipped and did not, appended to `proguard-rules.pro`.
 *
 * SDK 58's template moved release builds from `proguard-android.txt` to
 * `proguard-android-optimize.txt`, and the optimizer removes constructors nothing calls directly.
 * Room builds every database by reflection (`Class.newInstance()` on `<Name>_Impl`), and Room
 * 2.5's consumer rule keeps the class but not its constructor. WorkManager (pulled in by
 * react-native-android-widget) has such a database, so the first SDK 58 release died before the
 * first screen: "Failed to create an instance of class androidx.work.impl.WorkDatabase". WorkManager's
 * own rule has the same hole for its InputMergers, which every one-time request (the widget's
 * renders) builds by reflection: that one fails silently, the widget just stops updating. Nothing
 * in jest or a debug build runs R8; only a release build on a device shows it. R8's
 * `mapping/release/usage.txt` lists every removed `<init>()`: read it when a dependency changes.
 *
 * Expo has no config field for this file, and `prebuild --clean` rewrites it, hence a plugin.
 */
const MARK = "# Added by plugins/withAndroidKeepRules.js";
const RULES = `${MARK}
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
`;

module.exports = function withAndroidKeepRules(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
      const current = fs.readFileSync(file, "utf8");
      // Everything from the marker on is ours, so an edited RULES replaces the old block.
      const own = current.split(MARK)[0]?.trimEnd() ?? "";
      fs.writeFileSync(file, `${own}\n\n${RULES}`);
      return cfg;
    },
  ]);
};
