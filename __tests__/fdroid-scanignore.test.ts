import * as fs from "node:fs";
import * as path from "node:path";

// The fdroidserver scanner deletes node_modules build.gradle files it objects to,
// because the recipe sets `scandelete: node_modules`. When it deletes one, the Gradle
// subproject silently drops out, the build stays green, and the APK crashes at runtime
// on the first screen that touches the module. Two scanner rules can do it, and each
// has already shipped a broken F-Droid build:
//
//   1. "unknown maven repo" — a maven repository pointing at a local path.
//      react-native-screens, MR fdroid/fdroiddata!45076: Can't find ViewManager
//      'RNSScreen'.
//   2. "usual suspect" — a proprietary SDK coordinate anywhere in the file, matched
//      against fdroid/suss-gradle-signatures.txt. @maplibre/maplibre-react-native names
//      com.google.android.gms:play-services-location inside a branch it never takes, so
//      2.0.0 reached F-Droid with no MapLibre in it at all and the recap screen died on
//      TurboModuleRegistry.getEnforcing('MLRNCameraModule') (issue #64).
//
// A flagged file has to be neutralised before the scanner sees it, and the scanner runs
// after `npm ci` and after `expo prebuild`. Prefer doing that from this repo, the way
// scripts/strip-play-services.mjs does on postinstall: a fix in the fdroiddata recipe has
// to be re-argued in a merge request, because F-Droid's bot recopies the previous build
// block on every release. The recipe still counts, for what only it can do: a scanignore
// entry for a legitimate local maven url, or the rm -rf of the expo-dev-* packages.

const ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(ROOT, "node_modules");
const RECIPE = path.join(ROOT, "fdroid", "fdroiddata-recipe.yml");

const LOCAL_MAVEN_URL =
  /^\s*url[\s(].*(\$rootDir|\$\{?rootDir|reactNativeRootDir|\$projectDir|\$\{?projectDir|\.\.\/)/m;

/**
 * F-Droid's own list, vendored as data. Lines are regex sources, so they go into one
 * alternation rather than being escaped.
 */
const USUAL_SUSPECTS = new RegExp(
  fs
    .readFileSync(path.join(ROOT, "fdroid", "suss-gradle-signatures.txt"), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .join("|"),
);

function scannerObjectsTo(gradle: string): boolean {
  return LOCAL_MAVEN_URL.test(gradle) || USUAL_SUSPECTS.test(gradle);
}

function gradleFilesOf(pkgDir: string): string[] {
  const android = path.join(pkgDir, "android");
  if (!fs.existsSync(android)) return [];
  return ["build.gradle", "build.gradle.kts"]
    .map((f) => path.join(android, f))
    .filter((f) => fs.existsSync(f));
}

function packageDirs(): string[] {
  const dirs: string[] = [];
  for (const entry of fs.readdirSync(NODE_MODULES)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(NODE_MODULES, entry);
    if (entry.startsWith("@")) {
      for (const scoped of fs.readdirSync(full)) {
        dirs.push(path.join(full, scoped));
      }
    } else {
      dirs.push(full);
    }
  }
  return dirs;
}

describe("F-Droid recipe scanignore", () => {
  test("every node_modules build.gradle the scanner objects to is neutralised", () => {
    const flagged: string[] = [];
    for (const pkgDir of packageDirs()) {
      for (const gradleFile of gradleFilesOf(pkgDir)) {
        if (scannerObjectsTo(fs.readFileSync(gradleFile, "utf8"))) {
          flagged.push(path.relative(ROOT, gradleFile));
        }
      }
    }
    expect(flagged.length).toBeGreaterThan(0);

    // ponytail: text scan of the yml, fine while scanignore stays a flat list;
    // switch to a yaml parser if the recipe grows nested structure.
    // A file is covered if its exact path is scanignored, or if its package dir
    // is mentioned at all — the init: step rm -rf's the expo-dev-* packages
    // before the scanner runs, so they need no scanignore entry. A file the
    // postinstall already cleaned never reaches this list.
    const recipe = fs.readFileSync(RECIPE, "utf8");
    const missing = flagged.filter((f) => {
      const pkgDir = path.dirname(path.dirname(f));
      return !recipe.includes(`- ${f}`) && !recipe.includes(pkgDir);
    });

    if (missing.length > 0) {
      throw new Error(
        `F-Droid will delete these and silently unlink the module. Take the offending ` +
          `line out from scripts/strip-play-services.mjs, or, for a legitimate local ` +
          `maven url, scanignore it in the fdroiddata fork's metadata/com.guiforge.bati.yml ` +
          `(branch com.guiforge.bati) AND mirror into fdroid/fdroiddata-recipe.yml:\n` +
          missing.map((m) => `  - ${m}`).join("\n"),
      );
    }
  });
});
