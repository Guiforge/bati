import * as fs from "node:fs";
import * as path from "node:path";

// The release build died at startup on SDK 58 without this rule (plugins/withAndroidKeepRules.js),
// and nothing short of a release build on a device shows it. CI's prebuild diff keeps the
// committed file in sync with the plugin; this keeps the plugin from leaving quietly.
test("R8 keeps the constructor Room instantiates by reflection", () => {
  const rules = fs.readFileSync(
    path.join(__dirname, "..", "android", "app", "proguard-rules.pro"),
    "utf8",
  );
  expect(rules).toContain("-keep class * extends androidx.room.RoomDatabase { <init>(); }");
});
