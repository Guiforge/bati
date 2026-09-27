import assert from "node:assert/strict";
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

  test("the hour answers without a picker, and in 24 hours", async () => {
    const { is24Hour, pickTime, openChannelSettings } =
      require("@/modules/bati-reminders") as typeof import("@/modules/bati-reminders");
    expect(is24Hour()).toBe(true);
    expect(await pickTime("20:00")).toBeNull();
    expect(() => openChannelSettings()).not.toThrow();
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

describe("bati-reminders, with a native half", () => {
  const native = {
    setPlan: jest.fn().mockReturnValue(true),
    setEnabled: jest.fn().mockReturnValue(true),
    pause: jest.fn().mockReturnValue(true),
    resume: jest.fn().mockReturnValue(true),
    areEnabled: jest.fn().mockReturnValue(true),
    getState: jest.fn(),
    is24Hour: jest.fn().mockReturnValue(false),
    pickTime: jest.fn().mockResolvedValue("07:15"),
    openChannelSettings: jest.fn().mockReturnValue(true),
  };

  const load = () => {
    let mod: typeof import("@/modules/bati-reminders") | undefined;
    jest.isolateModules(() => {
      jest.doMock("expo", () => ({ requireOptionalNativeModule: () => native }));
      mod = require("@/modules/bati-reminders");
    });
    assert(mod);
    return mod;
  };

  test("hands the plan over as JSON, and the switch and pause as they are", () => {
    const mod = load();
    expect(mod.isAvailable()).toBe(true);
    const plan = {
      entries: [{ date: "2026-01-15", time: "20:00", title: "T", body: "", variant: "gallery.0" }],
      dueToday: "yes" as const,
      quietText: "Q",
      horizonDays: 14,
      pauseDays: 7,
      lateMinutes: 60,
      channelName: "Reminders",
      actionLabels: { snooze: "In 1 hour", pause: "Pause 7 days" },
    };
    mod.setPlan(plan);
    expect(JSON.parse(native.setPlan.mock.calls[0]?.[0])).toEqual(plan);
    mod.setEnabled(true);
    mod.pause("2026-01-22");
    mod.resume();
    expect(native.setEnabled).toHaveBeenCalledWith(true);
    expect(native.pause).toHaveBeenCalledWith("2026-01-22");
    expect(native.resume).toHaveBeenCalled();
    expect(mod.areEnabled()).toBe(true);
  });

  test("reads the journal back into the shape the plan takes, whatever Kotlin left out", () => {
    native.getState.mockReturnValue(
      JSON.stringify({
        enabled: true,
        resumeDate: "2026-01-22",
        log: [{ date: "2026-01-14", variant: "boss.1", opened: true, title: "kept natively" }],
      }),
    );
    expect(load().getState()).toEqual({
      enabled: true,
      resumeDate: "2026-01-22",
      log: [
        {
          date: "2026-01-14",
          variant: "boss.1",
          snoozed: false,
          opened: true,
          paused: false,
          postedAt: null,
        },
      ],
    });
  });

  test("the hour goes through Android's picker and its own 24-hour setting", async () => {
    const mod = load();
    expect(mod.is24Hour()).toBe(false);
    expect(await mod.pickTime("20:00")).toBe("07:15");
    expect(native.pickTime).toHaveBeenCalledWith("20:00");
    native.pickTime.mockResolvedValueOnce(null);
    expect(await mod.pickTime("20:00")).toBeNull();
    mod.openChannelSettings();
    expect(native.openChannelSettings).toHaveBeenCalled();
  });

  test("no context on the native side reads as off", () => {
    native.getState.mockReturnValue(null);
    expect(load().getState()).toEqual({ enabled: false, resumeDate: null, log: [] });
  });

  test("a journal missing its fields reads as nothing done", () => {
    native.getState.mockReturnValue(JSON.stringify({ log: [{ date: "2026-01-14" }] }));
    expect(load().getState()).toEqual({
      enabled: false,
      resumeDate: null,
      log: [
        {
          date: "2026-01-14",
          variant: null,
          snoozed: false,
          opened: false,
          paused: false,
          postedAt: null,
        },
      ],
    });
  });
});
