const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("@expo/config-plugins");

/**
 * Give debug builds back the network permissions the release blocks.
 *
 * `app.json` blocks INTERNET and ACCESS_NETWORK_STATE for the release — the app is
 * offline-first and ships without them — but the dev-client dies at startup without them:
 * NsdService throws a SecurityException from MainApplication.onCreate before the first
 * screen. The debug manifest is the right place (same mechanism as SYSTEM_ALERT_WINDOW,
 * which Expo's own template puts there), and it was edited by hand — which CI's
 * `expo prebuild --clean` + diff gate rightly rejected, because prebuild regenerates the
 * file without the edit. This plugin is the edit, applied at prebuild time, so the
 * generated manifest and the committed one agree; same reason `withAndroidDebugAppId`
 * exists.
 *
 * A dangerous mod rather than `withAndroidManifest` because that mod targets the *main*
 * manifest; the debug variant's manifest has no typed mod.
 */
const TEMPLATE_LINE =
  '    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>';

const DEBUG_PERMISSIONS_BLOCK = `    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    <!-- Blocked in app.json for release, but the dev-client dies at startup without them:
         NsdService throws a SecurityException from MainApplication.onCreate before the first
         screen. Debug-only, same mechanism as SYSTEM_ALERT_WINDOW above. -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>`;

module.exports = function withAndroidDebugNetworkPermissions(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const manifestPath = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "debug",
        "AndroidManifest.xml",
      );
      const contents = fs.readFileSync(manifestPath, "utf8");
      if (contents.includes("android.permission.INTERNET")) {
        return cfg;
      }
      if (!contents.includes(TEMPLATE_LINE)) {
        throw new Error(
          "withAndroidDebugNetworkPermissions: debug AndroidManifest.xml is not the shape expected",
        );
      }
      fs.writeFileSync(manifestPath, contents.replace(TEMPLATE_LINE, DEBUG_PERMISSIONS_BLOCK));
      return cfg;
    },
  ]);
};
