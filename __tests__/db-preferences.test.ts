import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/preferences", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("only a legacy file path with no customAvatar is ported", async () => {
    const { preferences, setPreference, deletePreference } =
      require("../db/preferences") as typeof import("../db/preferences");
    const reset = async () => {
      await deletePreference("customAvatar");
      await deletePreference("customAvatarUri");
    };
    await reset();
    await setPreference("customAvatar", "file:///data/user/0/x/bati.v3.db");
    expect(await preferences.legacyAvatarToPort()).toBeNull();
    await setPreference("customAvatar", "https://attacker.example/p.png");
    expect(await preferences.legacyAvatarToPort()).toBeNull();

    await reset();
    await setPreference("customAvatarUri", "file:///cache/picker.jpg");
    expect(await preferences.legacyAvatarToPort()).toBe("file:///cache/picker.jpg");

    await setPreference("customAvatar", "");
    expect(await preferences.legacyAvatarToPort()).toBeNull();

    await reset();
    await setPreference("customAvatarUri", "content://x/y");
    expect(await preferences.legacyAvatarToPort()).toBeNull();
    await reset();
  });

  test("get/set/delete preference", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");

    expect(await prefs.getPreference("foo")).toBeNull();

    await prefs.setPreference("foo", "bar");
    expect(await prefs.getPreference("foo")).toBe("bar");

    await prefs.setPreference("foo", "baz");
    expect(await prefs.getPreference("foo")).toBe("baz");

    const all = await prefs.getAllPreferences();
    expect(all.foo).toBe("baz");

    await prefs.deletePreference("foo");
    expect(await prefs.getPreference("foo")).toBeNull();
  });

  test("M15: writing a preference again moves updatedAt forward, even with the same value", async () => {
    const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
    const stamp = () =>
      (
        t.sqlite
          .prepare("SELECT updatedAt FROM user_preferences WHERE key = 'crestAnimal'")
          .get() as { updatedAt: number }
      ).updatedAt;
    jest.useFakeTimers({
      now: new Date("2026-01-01T10:00:00Z"),
      doNotFake: ["nextTick", "setImmediate"],
    });
    try {
      await preferences.setCrestAnimal("stag");
      const first = stamp();
      jest.setSystemTime(new Date("2026-01-02T10:00:00Z"));
      await preferences.setCrestAnimal("stag");
      expect(stamp()).toBeGreaterThan(first);
      // The merge (R21) compares these stamps: a choice written back to auto must outrank the stag.
      jest.setSystemTime(new Date("2026-01-03T10:00:00Z"));
      await preferences.setCrestAnimal("auto");
      expect(stamp()).toBeGreaterThan(first + 86400);
    } finally {
      jest.useRealTimers();
    }
  });

  test("crestCoat: no default written, unknown reads as auto, usual and auto round-trip", async () => {
    const { preferences, setPreference } =
      require("../db/preferences") as typeof import("../db/preferences");
    const row = () =>
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = 'crestCoat'").get();
    expect(await preferences.getCrestCoat()).toBe("auto");
    expect(row()).toBeUndefined();
    await preferences.setCrestCoat("usual");
    expect(await preferences.getCrestCoat()).toBe("usual");
    // Going back writes `auto`: a preference has no tombstone for the merge to carry.
    await preferences.setCrestCoat("auto");
    expect(row()).toEqual({ value: "auto" });
    await setPreference("crestCoat", "gold");
    expect(await preferences.getCrestCoat()).toBe("auto");
  });

  test("outingDisplay: no default written, a change round-trips, back to the original writes {} and keeps the row", async () => {
    const { preferences, getPreference } =
      require("../db/preferences") as typeof import("../db/preferences");
    const { withActivity } =
      require("../constants/outingDisplay") as typeof import("../constants/outingDisplay");
    const row = () =>
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = 'outingDisplay'").get();
    expect(await preferences.getOutingDisplay()).toEqual({});
    expect(row()).toBeUndefined();

    // A reset on a device that never set anything writes nothing: no row, no news for a peer.
    await preferences.setOutingDisplay({});
    expect(row()).toBeUndefined();

    const changed = withActivity({}, "ride", { big: "rate", layout: "bigFigures" });
    await preferences.setOutingDisplay(changed);
    expect(await preferences.getOutingDisplay()).toEqual(changed);

    // The reset is {}, never a delete: a missing row would read as the other device being newer.
    await preferences.setOutingDisplay(withActivity(changed, "ride", null));
    expect(await getPreference("outingDisplay")).toBe("{}");
    expect(row()).toEqual({ value: "{}" });
  });

  test("outingDisplay: writing what is already stored does not restamp the row", async () => {
    const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
    const { withActivity } =
      require("../constants/outingDisplay") as typeof import("../constants/outingDisplay");
    const stamp = () =>
      (
        t.sqlite
          .prepare("SELECT updatedAt FROM user_preferences WHERE key = 'outingDisplay'")
          .get() as { updatedAt: number }
      ).updatedAt;
    jest.useFakeTimers({
      now: new Date("2026-02-01T10:00:00Z"),
      doNotFake: ["nextTick", "setImmediate"],
    });
    try {
      const display = withActivity({}, "run", { big: "distance" });
      await preferences.setOutingDisplay(display);
      const first = stamp();
      jest.setSystemTime(new Date("2026-02-02T10:00:00Z"));
      await preferences.setOutingDisplay(display);
      expect(stamp()).toBe(first);
      const two = withActivity(display, "walk", { big: "time" });
      await preferences.setOutingDisplay(two);
      const second = stamp();
      jest.setSystemTime(new Date("2026-02-03T10:00:00Z"));
      await preferences.setOutingDisplay(withActivity(two, "walk", { big: "time" }));
      expect(stamp()).toBe(second);
      await preferences.setOutingDisplay(withActivity(display, "run", { big: "rate" }));
      expect(stamp()).toBeGreaterThan(first);
    } finally {
      jest.useRealTimers();
    }
  });

  test("crestMotto: no default written, unknown reads as none, a motto and none round-trip", async () => {
    const { preferences, setPreference } =
      require("../db/preferences") as typeof import("../db/preferences");
    const row = () =>
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = 'crestMotto'").get();
    expect(await preferences.getCrestMotto()).toBe("none");
    expect(row()).toBeUndefined();
    await preferences.setCrestMotto("stone");
    expect(await preferences.getCrestMotto()).toBe("stone");
    await preferences.setCrestMotto("none");
    expect(row()).toEqual({ value: "none" });
    await setPreference("crestMotto", "free text");
    expect(await preferences.getCrestMotto()).toBe("none");
  });

  test("a corrupt set-aside list reads as empty and is reported, not silently dropped", async () => {
    const { preferences, setPreference } =
      require("../db/preferences") as typeof import("../db/preferences");
    const reporter = require("../src/reportError") as typeof import("../src/reportError");
    const reported = jest.spyOn(reporter, "reportError").mockImplementation(() => {});
    await setPreference("setAsideExercises", "{not json");

    expect(await preferences.getSetAsideExercises()).toEqual([]);

    expect(reported).toHaveBeenCalledWith("preferences.setAside.parse", expect.any(SyntaxError));
    reported.mockRestore();
  });

  test("typed preference helpers", async () => {
    const { preferences } = require("../db/preferences") as typeof import("../db/preferences");

    await preferences.setVillageName("Konoha");
    expect(await preferences.getVillageName()).toBe("Konoha");

    await preferences.setHasFinishedOnboarding(true);
    expect(await preferences.getHasFinishedOnboarding()).toBe(true);

    await preferences.setLanguage("fr", "en");
    expect(await preferences.getLanguage()).toBe("fr");
    expect(await preferences.getLanguageChosenOn()).toBe("en");

    await preferences.setAvatarId("avatar_1");
    expect(await preferences.getAvatarId()).toBe("avatar_1");
  });

  // Metric is the default, and it has to survive a round trip both ways: a hero who switches to
  // imperial and back must not land on "whatever the column happened to hold". Storage is metres
  // either way — this key decides how they are drawn, never how they are written.
  test("the distance unit round-trips, and an unset or junk value reads as the device's", async () => {
    jest.resetModules();
    jest.doMock("expo-localization", () => ({
      getLocales: () => [{ measurementSystem: "metric" }],
    }));
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    const { preferences } = prefs;

    expect(await preferences.getDistanceUnit()).toBe("metric");

    await preferences.setDistanceUnit("imperial");
    expect(await preferences.getDistanceUnit()).toBe("imperial");

    await preferences.setDistanceUnit("metric");
    expect(await preferences.getDistanceUnit()).toBe("metric");

    await prefs.setPreference("distanceUnit", "furlongs");
    expect(await preferences.getDistanceUnit()).toBe("metric");
  });

  // Mock the DEVICE, not the rule: the default follows what expo-localization answers, as the
  // language does.
  test.each([
    ["us", "imperial"],
    ["uk", "imperial"],
    ["metric", "metric"],
    [null, "metric"],
  ] as const)(
    "an unset unit follows the device measurement system (%s -> %s)",
    async (system, expected) => {
      jest.resetModules();
      jest.doMock("expo-localization", () => ({
        getLocales: () => [{ measurementSystem: system }],
      }));
      const prefs = require("../db/preferences") as typeof import("../db/preferences");
      await prefs.deletePreference("distanceUnit");
      expect(await prefs.preferences.getDistanceUnit()).toBe(expected);
      // An explicit choice beats the device.
      await prefs.preferences.setDistanceUnit(expected === "metric" ? "imperial" : "metric");
      expect(await prefs.preferences.getDistanceUnit()).toBe(
        expected === "metric" ? "imperial" : "metric",
      );
      await prefs.deletePreference("distanceUnit");
      jest.dontMock("expo-localization");
    },
  );

  /**
   * The map is the only thing in this app that reaches a network, so "never answered" has to
   * read as no, not as the on-by-default every other boolean here uses. The case that matters is
   * the second one: an installed app updating into a version that has the feature arrives with a
   * populated database and no such key, and it must not start downloading on the strength of a
   * question nobody was asked.
   */
  test("the recap map is off on a fresh database, and off on one that never saw the key", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    const { preferences } = prefs;

    expect(await prefs.getPreference("mapTiles")).toBeNull();
    expect(await preferences.getMapTilesEnabled()).toBe(false);

    await preferences.setMapTilesEnabled(true);
    expect(await preferences.getMapTilesEnabled()).toBe(true);

    await preferences.setMapTilesEnabled(false);
    expect(await preferences.getMapTilesEnabled()).toBe(false);

    // The upgrade case, on a database that is anything but fresh: every other preference set,
    // this one absent. `!== "false"` would answer true here, which is the bug this is against.
    await prefs.deletePreference("mapTiles");
    expect(await preferences.getVillageName()).toBe("Konoha");
    expect(await preferences.getMapTilesEnabled()).toBe(false);

    // And nothing but a written "true" counts as consent.
    await prefs.setPreference("mapTiles", "1");
    expect(await preferences.getMapTilesEnabled()).toBe(false);
  });

  test("the map style is a per-device look: ember by default, a round trip, an unknown id reads ember", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    const { preferences } = prefs;

    expect(await prefs.getPreference("mapStyle")).toBeNull();
    expect(await preferences.getMapStyle()).toBe("ember");

    await preferences.setMapStyle("fiord");
    expect(await preferences.getMapStyle()).toBe("fiord");
    await preferences.setMapStyle("dark");
    expect(await preferences.getMapStyle()).toBe("dark");

    // A style a newer build wrote, unknown here.
    await prefs.setPreference("mapStyle", "midnight");
    expect(await preferences.getMapStyle()).toBe("ember");
  });

  test("the custom avatar: legacy path read, ported with its own date, preset as an empty row", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    const { preferences } = prefs;
    const legacy = "file:///cache/ImagePicker/a.jpg";
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value, updatedAt) VALUES (?, ?, ?)")
      .run("customAvatarUri", legacy, 1_700_000_000);
    expect(await preferences.getCustomAvatarUri()).toBe(legacy);

    // A path that moved since it was read is not ported over.
    expect(await preferences.portCustomAvatar("file:///other.jpg", "data:x")).toBe(false);
    expect(await preferences.portCustomAvatar(legacy, "data:x")).toBe(true);
    expect(await preferences.getCustomAvatarUri()).toBe("data:x");
    expect(await prefs.getPreference("customAvatarUri")).toBeNull();
    // Dated when the hero picked it, so a newer preset on another phone still wins the merge.
    const row = t.sqlite
      .prepare("SELECT updatedAt FROM user_preferences WHERE key = 'customAvatar'")
      .get() as { updatedAt: number };
    expect(row.updatedAt).toBe(1_700_000_000);
    // Once ported, a second port has nothing to do.
    expect(await preferences.portCustomAvatar(legacy, "data:y")).toBe(false);

    await preferences.setCustomAvatarUri(null);
    expect(await prefs.getPreference("customAvatar")).toBe("");
    expect(await preferences.getCustomAvatarUri()).toBeNull();
  });

  test("a newer avatarId never erases the photo it ports (onboarding on a second phone writes one)", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    const { preferences } = prefs;
    const legacy = "file:///cache/ImagePicker/old.jpg";
    t.sqlite.exec(
      "DELETE FROM user_preferences WHERE key IN ('customAvatar', 'customAvatarUri', 'avatarId')",
    );
    const insert = t.sqlite.prepare(
      "INSERT INTO user_preferences (key, value, updatedAt) VALUES (?, ?, ?)",
    );
    insert.run("customAvatarUri", legacy, 1_700_000_000);
    insert.run("avatarId", "knight", 1_700_000_500);

    expect(await preferences.portCustomAvatar(legacy, "data:x")).toBe(true);
    expect(await preferences.getCustomAvatarUri()).toBe("data:x");
    expect(await prefs.getPreference("customAvatarUri")).toBeNull();
  });

  test("a legacy path is dropped once customAvatar exists, and kept while it does not", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    const { preferences } = prefs;
    t.sqlite.exec("DELETE FROM user_preferences WHERE key IN ('customAvatar', 'customAvatarUri')");
    await prefs.setPreference("customAvatarUri", "file:///cache/a.jpg");

    await preferences.dropSupersededLegacyAvatar();
    expect(await prefs.getPreference("customAvatarUri")).toBe("file:///cache/a.jpg");

    await prefs.setPreference("customAvatar", "data:restored");
    await preferences.dropSupersededLegacyAvatar();
    expect(await prefs.getPreference("customAvatarUri")).toBeNull();
  });
});
