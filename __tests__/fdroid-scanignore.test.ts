import * as fs from "node:fs";
import * as path from "node:path";

// The fdroidserver scanner rewrites node_modules build.gradle files whose maven
// repositories point at a local path ("unknown maven repo"), unless the file is
// listed in the recipe's scanignore. When it strips one, the Gradle subproject
// silently drops out and the APK crashes at runtime — react-native-screens did
// exactly that in MR fdroid/fdroiddata!45076 (Can't find ViewManager 'RNSScreen').
// This test fails when a dependency (re)introduces such a line without a matching
// scanignore entry, before the release ever reaches F-Droid.

const ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(ROOT, "node_modules");
const RECIPE = path.join(ROOT, "fdroid", "fdroiddata-recipe.yml");

const LOCAL_MAVEN_URL =
  /^\s*url[\s(].*(\$rootDir|\$\{?rootDir|reactNativeRootDir|\$projectDir|\$\{?projectDir|\.\.\/)/m;

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
  test("every node_modules build.gradle with a local maven url is scanignored", () => {
    const flagged: string[] = [];
    for (const pkgDir of packageDirs()) {
      for (const gradleFile of gradleFilesOf(pkgDir)) {
        if (LOCAL_MAVEN_URL.test(fs.readFileSync(gradleFile, "utf8"))) {
          flagged.push(path.relative(ROOT, gradleFile));
        }
      }
    }
    expect(flagged.length).toBeGreaterThan(0);

    // ponytail: text scan of the yml, fine while scanignore stays a flat list;
    // switch to a yaml parser if the recipe grows nested structure.
    // A file is covered if its exact path is scanignored, or if its package dir
    // is mentioned at all — the init: step rm -rf's the expo-dev-* packages
    // before the scanner runs, so they need no scanignore entry.
    const recipe = fs.readFileSync(RECIPE, "utf8");
    const missing = flagged.filter((f) => {
      const pkgDir = path.dirname(path.dirname(f));
      return !recipe.includes(`- ${f}`) && !recipe.includes(pkgDir);
    });

    if (missing.length > 0) {
      throw new Error(
        `Add these to scanignore in the fdroiddata fork's metadata/com.guiforge.bati.yml ` +
          `(branch com.guiforge.bati) AND mirror into fdroid/fdroiddata-recipe.yml:\n` +
          missing.map((m) => `  - ${m}`).join("\n"),
      );
    }
  });
});
