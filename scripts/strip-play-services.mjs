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

//
// The same scanner deletes a Gradle file that declares a maven repository on a local path.
// react-native-view-shot points one at `node_modules/react-native/android`, a folder React Native
// stopped shipping years ago (its artifacts come from Maven Central and the React Native Gradle
// plugin now), so the block resolves nothing and removing it changes nothing but the scanner's
// verdict. Same reasoning as above for doing it here and not in the recipe's scanignore.

import * as fs from "node:fs";

const EDITS = [
  {
    gradle: "node_modules/@maplibre/maplibre-react-native/android/build.gradle",
    line: /^.*com\.google\.android\.gms:play-services-location.*\n/m,
  },
  {
    gradle: "node_modules/react-native-view-shot/android/build.gradle",
    line: /^\s*maven \{\n(?:\s*\/\/.*\n)*\s*url "\$projectDir\/\.\.\/node_modules\/react-native\/android"\n\s*\}\n/m,
  },
];

for (const { gradle, line } of EDITS) {
  // Absent in a partial install, and there is nothing to do then.
  if (!fs.existsSync(gradle)) continue;
  const source = fs.readFileSync(gradle, "utf8");
  if (line.test(source)) fs.writeFileSync(gradle, source.replace(line, ""));
}
