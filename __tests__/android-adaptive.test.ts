import * as fs from "node:fs";
import * as path from "node:path";

// The Play Console has two standing complaints about this app's window: deprecated edge-to-edge
// parameters (Android 15) and orientation restrictions on large screens (Android 16). Both
// reduce to generated XML, and the tooling that ought to catch a regression cannot.
//
// Android lint covers exactly half of it. There *are* checks for the orientation side
// (`LockedOrientationActivity`, `NonResizeableActivity`, `SourceLockedOrientationActivity`), and
// `plugins/withAndroidLint.js` writes down which one is disabled and why. There is **no lint
// check at all** for the deprecated system bar attributes: Google's own detection is a scan of
// the built artefact, which means the first report of a regression would be a Play Console
// warning on a release already published.
//
// So this file is the fast half of the gate. It reads the committed prebuild output, which
// `ci.yml`'s prebuild-and-diff step already proves is current, and it runs in milliseconds on
// every push rather than on a Gradle job or a tag.
//
// It is a ratchet, like `android-permissions.test.ts`. It has the same blind spot, for the same
// reason: it reads *our* resources, and a dependency's AAR can merge a theme or a manifest
// attribute that nothing here sees. `apkanalyzer dex packages --defined-only=false` on a release
// APK is what settles that question, and it is not a thing to run on every push.

const ROOT = path.resolve(__dirname, "..");
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");

/**
 * The window attributes deprecated in API 35. Expo's `SystemBars` plugin writes the first two
 * into `AppTheme` unconditionally on every prebuild, and `plugins/withAndroidEdgeToEdgeTheme.js`
 * takes them back out. The rest are the neighbours nothing adds today and nothing should: they
 * are the other half of the same deprecation, and a theme that grows one has silently opted out
 * of edge-to-edge.
 */
const DEPRECATED_WINDOW_ATTRS = [
  "android:statusBarColor",
  "android:navigationBarColor",
  "android:navigationBarDividerColor",
  "android:windowLightStatusBar",
  "android:windowLightNavigationBar",
  "android:windowTranslucentStatus",
  "android:windowTranslucentNavigation",
  "android:windowDrawsSystemBarBackgrounds",
  "android:enforceStatusBarContrast",
  "android:enforceNavigationBarContrast",
];

describe("android adaptive layout", () => {
  test("no theme sets a system bar colour", () => {
    const styles = read("android", "app", "src", "main", "res", "values", "styles.xml");
    for (const attr of DEPRECATED_WINDOW_ATTRS) {
      // If this fails right after an Expo bump, the plugin's mod is no longer biting: check that
      // `AppTheme` is still the group name Expo writes into before reaching for the allow-list.
      expect(styles).not.toContain(attr);
    }
  });

  test("the activity accepts being resized", () => {
    const manifest = read("android", "app", "src", "main", "AndroidManifest.xml");
    // From Android 16 both of these are ignored on large screens anyway, so declaring one buys
    // nothing and reads to a reviewer as an app that refuses to adapt.
    expect(manifest).not.toContain("android:resizeableActivity");
    expect(manifest).not.toContain("android:maxAspectRatio");
    // Locking rotation still works on phones, and portrait is the decision this app has made
    // (see plugins/withAndroidLint.js). Pinning the exact value rather than allowing any is the
    // point: `landscape`, `sensorPortrait` or a removal are all real product changes, and each
    // one should arrive as a deliberate edit to this line.
    expect(/android:screenOrientation="portrait"/.test(manifest)).toBe(true);
    // The resize the OS performs on a tablet is only survivable because the activity handles it
    // rather than being torn down and rebuilt mid-session.
    const configChanges = /android:configChanges="([^"]*)"/.exec(manifest)?.[1] ?? "";
    for (const change of ["orientation", "screenSize", "screenLayout", "smallestScreenSize"]) {
      expect(configChanges.split("|")).toContain(change);
    }
  });
});
