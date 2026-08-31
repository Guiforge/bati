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

    await preferences.setLanguage("fr");
    expect(await preferences.getLanguage()).toBe("fr");

    await preferences.setAvatarId("avatar_1");
    expect(await preferences.getAvatarId()).toBe("avatar_1");
  });

  // Metric is the default, and it has to survive a round trip both ways: a hero who switches to
  // imperial and back must not land on "whatever the column happened to hold". Storage is metres
  // either way — this key decides how they are drawn, never how they are written.
  test("the distance unit round-trips, and an unset or junk value reads as metric", async () => {
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
});
