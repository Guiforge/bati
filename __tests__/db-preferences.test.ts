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
});
