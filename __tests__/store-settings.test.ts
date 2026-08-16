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

const prefs = {
  getLanguage: jest.fn<Promise<string | null>, []>(),
  getAvatarId: jest.fn<Promise<string | null>, []>(),
  getCustomAvatarUri: jest.fn<Promise<string | null>, []>(),
  getHapticsEnabled: jest.fn<Promise<boolean>, []>(),
  setLanguage: jest.fn().mockResolvedValue(undefined),
  setAvatarId: jest.fn().mockResolvedValue(undefined),
  setCustomAvatarUri: jest.fn().mockResolvedValue(undefined),
  setHapticsEnabled: jest.fn().mockResolvedValue(undefined),
};

beforeAll(() => {
  jest.resetModules();
  jest.doMock("@/db", () => ({ preferences: prefs }));
  jest.doMock("@/i18n", () => ({
    i18n: { changeLanguage: jest.fn().mockResolvedValue(undefined) },
  }));
  // The *device* is mocked, not the module that reads it: the store and the home screen
  // widget must both resolve the language through the real `resolveAppLanguage`, and a test
  // that stubs that function out is a test that cannot see them disagree. "fr" so the device
  // fallback stays distinguishable from the "en" narrowing.
  jest.doMock("expo-localization", () => ({
    getLocales: () => [{ languageCode: "fr", languageTag: "fr-FR" }],
  }));
  jest.doMock("react-native", () => ({
    AccessibilityInfo: { isReduceMotionEnabled: () => deviceReduceMotion() },
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
}

const DEFAULTS = {
  language: "fr" as const, // from the mocked device language
  avatarId: "guardian" as const,
  hapticsEnabled: true,
  reducedMotion: false,
  isLoaded: false,
};

describe("useSettingsStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deviceReduceMotion = () => Promise.resolve(false);
    settingsStore().setState({ ...DEFAULTS });
  });

  test("stored values win over the defaults, every one of them", async () => {
    storedSettings();

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState()).toMatchObject({
      language: "fr",
      avatarId: "archmage",
      hapticsEnabled: false,
      isLoaded: true,
    });
  });

  test("a language that was never chosen falls back to the device, not to en", async () => {
    storedSettings();
    prefs.getLanguage.mockResolvedValue(null);

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().language).toBe("fr");
  });

  test("a stored language other than fr reads as en", async () => {
    storedSettings();
    prefs.getLanguage.mockResolvedValue("de");

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

  test("every setter updates the store and writes through to the database", async () => {
    const s = () => settingsStore().getState();

    await s().setLanguage("fr");
    await s().setAvatarId("scout");
    await s().setHapticsEnabled(false);

    expect(s()).toMatchObject({
      language: "fr",
      avatarId: "scout",
      hapticsEnabled: false,
    });

    expect(prefs.setLanguage).toHaveBeenCalledWith("fr");
    expect(prefs.setAvatarId).toHaveBeenCalledWith("scout");
    expect(prefs.setHapticsEnabled).toHaveBeenCalledWith(false);
  });
});
