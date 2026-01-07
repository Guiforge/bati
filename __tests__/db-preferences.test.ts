import { createTestDb } from "./helpers/testDb";

describe("db/preferences", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../src/db/client", () => ({
      db: t.db,
      schema: require("../src/db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  test("get/set/delete preference", async () => {
    const prefs = require("../src/db/preferences") as typeof import("../src/db/preferences");

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
    const { preferences } =
      require("../src/db/preferences") as typeof import("../src/db/preferences");

    await preferences.setVillageName("Konoha");
    expect(await preferences.getVillageName()).toBe("Konoha");

    await preferences.setHasFinishedOnboarding(true);
    expect(await preferences.getHasFinishedOnboarding()).toBe(true);

    await preferences.setLanguage("fr");
    expect(await preferences.getLanguage()).toBe("fr");

    await preferences.setTheme("dark");
    expect(await preferences.getTheme()).toBe("dark");

    await preferences.setAvatarId("avatar_1");
    expect(await preferences.getAvatarId()).toBe("avatar_1");
  });
});
