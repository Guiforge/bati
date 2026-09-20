// loadFromDatabase merges every stored preference at once. The bug class it guards
// against is "settings look right, then snap back to defaults": stored values
// losing to the initial state, or one failed read wiping all the others.
//
// Every read the store makes must be mocked here, including new ones: a missing
// mock throws while the Promise.all array is being built, which orphans the
// already-rejected reads and takes the whole jest worker down with it.
//
// The store reads getDevicePreferredAppLanguage() at module-load, so the mocks
// must be registered before the store is required. Same jest.doMock + lazy
// require pattern the db/* tests use.

/** What the OS says about reduce-motion. Swapped per test. */
let deviceReduceMotion: () => Promise<boolean> = () => Promise.resolve(false);

/**
 * The listeners Android's accessibility service would hold, and the handle it hands back.
 *
 * `reduceMotionChanged` is the whole reason the store watches at all, so the mock keeps the
 * handlers rather than swallowing them: a test can then be the OS changing its mind, which is
 * the thing no screenshot can show.
 */
const motionListeners: Array<(reducedMotion: boolean) => void> = [];
const removeMotionListener = jest.fn();

/** Android telling the app the hero just changed the setting. */
function osChangesReduceMotionTo(value: boolean) {
  for (const listener of motionListeners) listener(value);
}

const requestWidgetsUpdate = jest.fn<Promise<void>, []>();
const reportError = jest.fn();

const prefs = {
  getLanguage: jest.fn<Promise<string | null>, []>(),
  getAvatarId: jest.fn<Promise<string | null>, []>(),
  getCustomAvatarUri: jest.fn<Promise<string | null>, []>(),
  getHapticsEnabled: jest.fn<Promise<boolean>, []>(),
  getVillagersEnabled: jest.fn<Promise<boolean>, []>(),
  getSoundEnabled: jest.fn<Promise<boolean>, []>(),
  getDistanceUnit: jest.fn<Promise<"metric" | "imperial">, []>(),
  getMapTilesEnabled: jest.fn<Promise<boolean>, []>(),
  getUpdateCheckEnabled: jest.fn<Promise<boolean>, []>(),
  getPrepMode: jest.fn<Promise<"timer" | "tap">, []>(),
  setLanguage: jest.fn().mockResolvedValue(undefined),
  setAvatarId: jest.fn().mockResolvedValue(undefined),
  setCustomAvatarUri: jest.fn().mockResolvedValue(undefined),
  setHapticsEnabled: jest.fn().mockResolvedValue(undefined),
  setVillagersEnabled: jest.fn().mockResolvedValue(undefined),
  setSoundEnabled: jest.fn().mockResolvedValue(undefined),
  setDistanceUnit: jest.fn().mockResolvedValue(undefined),
  setMapTilesEnabled: jest.fn().mockResolvedValue(undefined),
  setUpdateCheckEnabled: jest.fn().mockResolvedValue(undefined),
  setPrepMode: jest.fn().mockResolvedValue(undefined),
};

beforeAll(() => {
  jest.resetModules();
  jest.doMock("@/db", () => ({ preferences: prefs }));
  jest.doMock("@/i18n", () => ({
    i18n: { changeLanguage: jest.fn().mockResolvedValue(undefined) },
  }));
  jest.doMock("@/src/widget", () => ({ requestWidgetsUpdate }));
  jest.doMock("@/src/reportError", () => ({ reportError }));
  // The *device* is mocked, not the module that reads it: the store and the home screen
  // widget must both resolve the language through the real `resolveAppLanguage`, and a test
  // that stubs that function out is a test that cannot see them disagree. "fr" so the device
  // fallback stays distinguishable from the "en" narrowing.
  jest.doMock("expo-localization", () => ({
    getLocales: () => [{ languageCode: "fr", languageTag: "fr-FR" }],
  }));
  jest.doMock("react-native", () => ({
    AccessibilityInfo: {
      isReduceMotionEnabled: () => deviceReduceMotion(),
      addEventListener: (event: string, handler: (value: boolean) => void) => {
        if (event === "reduceMotionChanged") motionListeners.push(handler);
        return { remove: removeMotionListener };
      },
    },
  }));
});

afterAll(() => {
  jest.resetModules();
});

function settingsStore() {
  return (require("@/stores/settings") as typeof import("@/stores/settings")).useSettingsStore;
}

/** Every read succeeds, returning something different from the store default. */
function storedSettings() {
  prefs.getLanguage.mockResolvedValue("fr");
  prefs.getAvatarId.mockResolvedValue("archmage");
  prefs.getCustomAvatarUri.mockResolvedValue("file:///stored-avatar.jpg");
  prefs.getHapticsEnabled.mockResolvedValue(false);
  prefs.getVillagersEnabled.mockResolvedValue(false);
  prefs.getSoundEnabled.mockResolvedValue(false);
  prefs.getDistanceUnit.mockResolvedValue("imperial");
  prefs.getMapTilesEnabled.mockResolvedValue(true);
  prefs.getUpdateCheckEnabled.mockResolvedValue(true);
  prefs.getPrepMode.mockResolvedValue("tap");
}

const DEFAULTS = {
  language: "fr" as const, // from the mocked device language
  avatarId: "guardian" as const,
  hapticsEnabled: true,
  reducedMotion: false,
  villagersEnabled: true,
  soundEnabled: true,
  distanceUnit: "metric" as const,
  // The two booleans here whose default is a refusal: between them they decide whether the app
  // makes a network request at all.
  mapTilesEnabled: false,
  updateCheckEnabled: false,
  prepMode: "timer" as const,
  isLoaded: false,
};

describe("useSettingsStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deviceReduceMotion = () => Promise.resolve(false);
    requestWidgetsUpdate.mockResolvedValue(undefined);
    settingsStore().setState({ ...DEFAULTS });
  });

  test("stored values win over the defaults, every one of them", async () => {
    storedSettings();

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState()).toMatchObject({
      language: "fr",
      avatarId: "archmage",
      hapticsEnabled: false,
      villagersEnabled: false,
      soundEnabled: false,
      distanceUnit: "imperial",
      mapTilesEnabled: true,
      updateCheckEnabled: true,
      prepMode: "tap",
      isLoaded: true,
    });
  });

  test("a language that was never chosen falls back to the device, not to en", async () => {
    storedSettings();
    prefs.getLanguage.mockResolvedValue(null);

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().language).toBe("fr");
  });

  test("a stored language the app does not ship reads as en", async () => {
    storedSettings();
    prefs.getLanguage.mockResolvedValue("ja");

    await settingsStore().getState().loadFromDatabase();

    // Not the device's "fr": an explicit stored choice is honoured, then narrowed.
    expect(settingsStore().getState().language).toBe("en");
  });

  test("junk in the avatar column normalizes instead of leaking through", async () => {
    storedSettings();
    prefs.getAvatarId.mockResolvedValue("not-an-avatar");

    await settingsStore().getState().loadFromDatabase();

    // normalizeAvatarId falls back to avatarIds[0] ("shadow"), not the store's
    // initial "guardian" default — an unknown id snaps to the first valid avatar.
    expect(settingsStore().getState().avatarId).toBe("shadow");
  });

  test("a failed read still marks the store loaded so the app does not hang", async () => {
    storedSettings();
    prefs.getAvatarId.mockRejectedValue(new Error("db is gone"));

    await settingsStore().getState().loadFromDatabase();

    const state = settingsStore().getState();
    expect(state.isLoaded).toBe(true);
    // The catch sets only isLoaded, so every other field keeps its initial default.
    expect(state.avatarId).toBe("guardian");
  });

  /**
   * Every animated component honours `reducedMotion`, and the OS is the only thing that sets it.
   * A stored override used to be read here and preferred over the device, but no screen ever
   * wrote it — so it was permanently null and the app ignored a hero who had asked Android for
   * fewer animations.
   */
  test("reduced motion follows the device", async () => {
    storedSettings();
    deviceReduceMotion = () => Promise.resolve(true);

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().reducedMotion).toBe(true);
  });

  test("a device that will not answer leaves animations on", async () => {
    storedSettings();
    deviceReduceMotion = () => Promise.reject(new Error("no accessibility bridge"));

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().reducedMotion).toBe(false);
    expect(settingsStore().getState().isLoaded).toBe(true);
  });

  /**
   * A device that answers *late* is not a device that says no.
   *
   * The probe gives the accessibility service a second before the splash stops waiting for it,
   * and that second used to be the whole answer: a slow service meant `false`, so a hero who had
   * asked Android for fewer animations got them anyway, with nothing to do about it but relaunch
   * until a cold start happened to be quick. Takes a real second, because the timeout it is about
   * is a real one.
   */
  test("an answer that arrives after the splash gave up still counts", async () => {
    storedSettings();
    let answer: (value: boolean) => void = () => {};
    deviceReduceMotion = () =>
      new Promise<boolean>((resolve) => {
        answer = resolve;
      });

    await settingsStore().getState().loadFromDatabase();

    // The first frame was not held hostage: the app opened on the default.
    expect(settingsStore().getState().reducedMotion).toBe(false);
    expect(settingsStore().getState().isLoaded).toBe(true);

    answer(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(settingsStore().getState().reducedMotion).toBe(true);
  });

  /**
   * Reading the OS once is not following the OS. The preference was read at cold start and never
   * again, so turning "Remove animations" on in Android's settings and coming back to Bati found
   * it still animating.
   */
  test("the OS changing its mind reaches the store without a relaunch", async () => {
    storedSettings();
    deviceReduceMotion = () => Promise.resolve(false);

    await settingsStore().getState().loadFromDatabase();
    expect(settingsStore().getState().reducedMotion).toBe(false);

    osChangesReduceMotionTo(true);
    expect(settingsStore().getState().reducedMotion).toBe(true);

    // And back, because a hero who turns it off is also asking for something.
    osChangesReduceMotionTo(false);
    expect(settingsStore().getState().reducedMotion).toBe(false);
  });

  /**
   * One subscription for the process. `loadFromDatabase` runs again whenever the root layout
   * remounts, and a watch attached per call would stack copies of itself that nothing removes.
   */
  test("the watch is attached once, however often the load runs", async () => {
    storedSettings();

    await settingsStore().getState().loadFromDatabase();
    await settingsStore().getState().loadFromDatabase();
    await settingsStore().getState().loadFromDatabase();

    expect(motionListeners).toHaveLength(1);
    expect(removeMotionListener).not.toHaveBeenCalled();
  });

  test("every setter updates the store and writes through to the database", async () => {
    const s = () => settingsStore().getState();

    await s().setLanguage("fr");
    await s().setAvatarId("scout");
    await s().setHapticsEnabled(false);
    await s().setCustomAvatarUri("file:///picked.jpg");
    await s().setVillagersEnabled(false);
    await s().setSoundEnabled(false);
    await s().setDistanceUnit("imperial");
    await s().setMapTilesEnabled(true);
    await s().setUpdateCheckEnabled(true);

    expect(s()).toMatchObject({
      language: "fr",
      avatarId: "scout",
      hapticsEnabled: false,
      customAvatarUri: "file:///picked.jpg",
      villagersEnabled: false,
      soundEnabled: false,
      distanceUnit: "imperial",
      mapTilesEnabled: true,
      updateCheckEnabled: true,
    });

    expect(prefs.setLanguage).toHaveBeenCalledWith("fr");
    expect(prefs.setAvatarId).toHaveBeenCalledWith("scout");
    expect(prefs.setHapticsEnabled).toHaveBeenCalledWith(false);
    expect(prefs.setCustomAvatarUri).toHaveBeenCalledWith("file:///picked.jpg");
    expect(prefs.setVillagersEnabled).toHaveBeenCalledWith(false);
    expect(prefs.setSoundEnabled).toHaveBeenCalledWith(false);
    expect(prefs.setDistanceUnit).toHaveBeenCalledWith("imperial");
    expect(prefs.setMapTilesEnabled).toHaveBeenCalledWith(true);
    expect(prefs.setUpdateCheckEnabled).toHaveBeenCalledWith(true);
  });

  /**
   * The store's own default is the refusal, not just the database's. `loadFromDatabase` failing
   * halfway leaves every field on its initial value, and the one field where that matters is
   * this one: a store that woke up saying "the map is allowed" would have the recap fetching
   * tiles off a read that never completed.
   */
  /**
   * The store's *own* initial value, read before any test has written one. Every other assertion
   * in this file starts from `DEFAULTS`, which is a copy — and a copy is exactly what would keep
   * saying "off" the day the store said "on". This is the one field where that difference is a
   * network request nobody asked for, so it is read from the module.
   */
  test("both network switches start refused in the store the app actually creates", () => {
    expect(settingsStore().getInitialState().mapTilesEnabled).toBe(false);
    expect(settingsStore().getInitialState().updateCheckEnabled).toBe(false);
  });

  test("a failed load leaves both network switches refused", async () => {
    storedSettings();
    prefs.getMapTilesEnabled.mockRejectedValue(new Error("db is gone"));

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().mapTilesEnabled).toBe(false);
    expect(settingsStore().getState().updateCheckEnabled).toBe(false);
    expect(settingsStore().getState().isLoaded).toBe(true);
  });

  /**
   * The widgets resolve the language themselves, but only when something redraws them, and the
   * OS tick is 30 minutes away. Storing the choice without poking them left FLAMME on the home
   * screen of a hero who had just switched to English — the tail of F-Droid MR !45076 finding 4,
   * where re-adding the widget was the only cure. Asserts the poke, not the stored string.
   */
  test("switching the language redraws the home screen widgets", async () => {
    await settingsStore().getState().setLanguage("en");

    expect(requestWidgetsUpdate).toHaveBeenCalledTimes(1);
  });

  test("a widget that refuses to redraw does not fail the language change", async () => {
    requestWidgetsUpdate.mockRejectedValue(new Error("no launcher"));

    await expect(settingsStore().getState().setLanguage("en")).resolves.toBeUndefined();
    expect(prefs.setLanguage).toHaveBeenCalledWith("en");
    // And it is not swallowed: a widget that stops redrawing has to leave a trace somewhere.
    await Promise.resolve();
    expect(reportError).toHaveBeenCalledWith("widget.update", expect.any(Error));
  });
});
