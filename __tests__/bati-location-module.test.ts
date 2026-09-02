import * as fs from "node:fs";
import * as path from "node:path";
import {
  addListener,
  hasGpsProvider,
  isAvailable,
  requestNotificationPermission,
  requestPermission,
  setProgress,
  setReached,
  start,
  stop,
} from "@/modules/bati-location";

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

  test("refuses to start, and says nothing started", () => {
    expect(
      start({
        notification: {
          title: "Bati",
          acquiring: "…",
          tracking: "…",
          paused: "…",
          gpsOff: "…",
          reached: "…",
        },
      }),
    ).toBe(false);
  });

  test("stopping something that never started is not an error", () => {
    expect(() => stop()).not.toThrow();
  });

  test("reports the permission denied rather than resolving undefined", async () => {
    // A caller branches on `granted`; without the fallback it would branch on `undefined?.granted`
    // and crash the screen that was meant to explain why GPS is unavailable.
    await expect(requestPermission()).resolves.toMatchObject({
      granted: false,
      canAskAgain: false,
    });
  });

  test("reports the notification permission denied too, and separately", async () => {
    // Separate from the location prompt because a hero who refuses the notification has still
    // granted the thing the feature needs; one shape for both answers so the caller branches once.
    await expect(requestNotificationPermission()).resolves.toMatchObject({
      granted: false,
      canAskAgain: false,
    });
  });

  test("moving a notification that does not exist is not an error", () => {
    // Called from a flush that can race the hero tapping Done, and on every build with no
    // service at all.
    expect(() => setProgress("2.40 km")).not.toThrow();
  });

  test("reaching a goal that has no notification to reach is not an error", () => {
    expect(() => setReached()).not.toThrow();
  });

  test("hands back a subscription that can still be removed", () => {
    // Callers unsubscribe in a cleanup they do not get to make conditional.
    expect(() => addListener("onLocation", () => {}).remove()).not.toThrow();
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
