import * as fs from "node:fs";
import * as path from "node:path";
import { hasGpsProvider, isAvailable } from "@/modules/bati-location";

const MODULE_ROOT = path.resolve(__dirname, "..", "modules", "bati-location");

// The JS half has to survive the absence of its native half — that is the whole point of
// `requireOptionalNativeModule`. jest is exactly that situation, and so is iOS until premise P4
// of docs/designs/gps-without-google.md is paid: a GPS quest gets hidden, never crashed.
describe("bati-location, without its native half", () => {
  test("reports itself unavailable instead of throwing", () => {
    expect(isAvailable()).toBe(false);
  });

  test("answers the provider question with false rather than a null crash", () => {
    expect(hasGpsProvider()).toBe(false);
  });
});

// Autolinking is invisible until a build fails at the far end of twenty minutes of Gradle. These
// three files are what expo-modules-autolinking looks for; asserting their shape here turns a
// build-time discovery into a test-time one.
describe("bati-location, as something autolinking can find", () => {
  test("declares the Kotlin module class it actually ships", () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(MODULE_ROOT, "expo-module.config.json"), "utf8"),
    ) as { platforms: string[]; android: { modules: string[] } };

    expect(config.platforms).toEqual(["android"]);
    const [declared] = config.android.modules;
    expect(declared).toBe("expo.modules.batilocation.BatiLocationModule");

    const source = path.join(
      MODULE_ROOT,
      "android/src/main/java",
      `${declared?.replace(/\./g, "/")}.kt`,
    );
    expect(fs.existsSync(source)).toBe(true);
  });

  test("its Gradle namespace matches the package the class lives in", () => {
    // A mismatch here compiles and then fails at runtime with a class that cannot be found,
    // which reads as an autolinking bug and is not one.
    const gradle = fs.readFileSync(path.join(MODULE_ROOT, "android/build.gradle"), "utf8");
    expect(gradle).toContain('namespace "expo.modules.batilocation"');
  });
});
