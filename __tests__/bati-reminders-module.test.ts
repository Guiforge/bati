import * as fs from "node:fs";
import * as path from "node:path";
import {
  areEnabled,
  getState,
  isAvailable,
  pause,
  resume,
  setEnabled,
  setPlan,
} from "@/modules/bati-reminders";

const MODULE_ROOT = path.resolve(__dirname, "..", "modules", "bati-reminders");
const KOTLIN = path.join(MODULE_ROOT, "android/src/main/java/expo/modules/batireminders");
const kotlin = () =>
  fs
    .readdirSync(KOTLIN)
    .map((file) => fs.readFileSync(path.join(KOTLIN, file), "utf8"))
    .join("\n");

// jest has no native half, and neither will a build without the module: every call answers as if
// the reminders were off, and none throws.
describe("bati-reminders, without its native half", () => {
  test("reports itself unavailable, and off", () => {
    expect(isAvailable()).toBe(false);
    expect(areEnabled()).toBe(false);
    expect(getState()).toEqual({ enabled: false, resumeDate: null, log: [] });
  });

  test("takes a plan, a switch and a pause without throwing", () => {
    expect(() =>
      setPlan({
        entries: [],
        dueToday: "yes",
        quietText: "",
        horizonDays: 14,
        pauseDays: 7,
        lateMinutes: 60,
        channelName: "Reminders",
        actionLabels: { snooze: "In 1 hour", pause: "Pause 7 days" },
      }),
    ).not.toThrow();
    expect(() => setEnabled(true)).not.toThrow();
    expect(() => pause("2026-01-20")).not.toThrow();
    expect(() => resume()).not.toThrow();
  });
});

describe("bati-reminders, both sides of the bridge", () => {
  test("declares the Kotlin module class it actually ships", () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(MODULE_ROOT, "expo-module.config.json"), "utf8"),
    );
    const [name] = config.android.modules as string[];
    const file = `${name?.split(".").at(-1)}.kt`;
    expect(fs.existsSync(path.join(KOTLIN, file))).toBe(true);
  });

  test("every function the JS half calls is one the Kotlin half defines", () => {
    const js = fs.readFileSync(path.join(MODULE_ROOT, "index.ts"), "utf8");
    const called = [...js.matchAll(/native\?\.(\w+)\(/g)].map((m) => m[1]);
    const defined = new Set([...kotlin().matchAll(/Function\("(\w+)"\)/g)].map((m) => m[1]));
    expect(called.length).toBeGreaterThan(0);
    for (const name of called) expect(defined).toContain(name);
  });

  test("never an exact alarm, never a battery exemption (docs/designs/rappels.md)", () => {
    const source = kotlin();
    expect(source).toContain("setAndAllowWhileIdle");
    expect(source).not.toMatch(/setExact|setAlarmClock|setWindow\(/);
    expect(source).not.toMatch(/REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
    const manifest = fs.readFileSync(
      path.join(MODULE_ROOT, "android/src/main/AndroidManifest.xml"),
      "utf8",
    );
    expect(manifest).not.toMatch(/EXACT_ALARM|IGNORE_BATTERY/);
  });

  test("the tap opens the app directly, never through a receiver", () => {
    // A notification trampoline is forbidden from Android 12: the content intent is an activity.
    expect(kotlin()).toMatch(/PendingIntent\s*\.getActivity\(/);
  });
});
