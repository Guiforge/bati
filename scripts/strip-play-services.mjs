// Takes the one Play Services line out of MapLibre's Gradle file, right after install.
//
// F-Droid's scanner reads every file under node_modules and, because the recipe sets
// `scandelete: node_modules`, deletes the ones that name a proprietary SDK. MapLibre's
// android/build.gradle names com.google.android.gms:play-services-location inside
// `if (locationEngine == "google")`, a branch this app never takes: the default is
// "default" and the APK built on GitHub from the same commit holds zero
// com/google/android/gms classes. The scanner reads the line anyway. In the 2.0.0 build
// it deleted the whole file, autolinking then found no android project for the package,
// and the APK shipped with no MapLibre in it at all, 4 MiB lighter and with a recap
// screen that died on TurboModuleRegistry.getEnforcing('MLRNCameraModule') on a build
// that had said BUILD SUCCESSFUL. That is issue #64.
//
// Their scanner runs after `npm ci` and after `expo prebuild`, so removing the line from
// a postinstall is early enough. Doing it here rather than in the recipe is the point:
// F-Droid's bot recopies the previous build block on every release, so a fix that lives
// there has to be re-argued in a merge request, and a fix that lives here travels with
// the commit the bot pins. `__tests__/fdroid-scanignore.test.ts` fails if this stops
// working, or if another dependency arrives with the same problem.

import * as fs from "node:fs";

const GRADLE = "node_modules/@maplibre/maplibre-react-native/android/build.gradle";
const LINE = /^.*com\.google\.android\.gms:play-services-location.*\n/m;

// Absent in a partial install, and there is nothing to do then.
if (fs.existsSync(GRADLE)) {
  const source = fs.readFileSync(GRADLE, "utf8");
  if (LINE.test(source)) {
    fs.writeFileSync(GRADLE, source.replace(LINE, ""));
  }
}
