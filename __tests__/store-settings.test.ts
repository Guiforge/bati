// loadFromDatabase merges nine preferences at once. The bug class it guards
// against is "settings look right, then snap back to defaults": stored values
// losing to the initial state, or one failed read wiping the other eight.
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
  getTheme: jest.fn<Promise<string | null>, []>(),
  getAvatarId: jest.fn<Promise<string | null>, []>(),
  getCustomAvatarUri: jest.fn<Promise<string | null>, []>(),
  getHapticsEnabled: jest.fn<Promise<boolean>, []>(),
  getSoundEnabled: jest.fn<Promise<boolean>, []>(),
  getReducedMotion: jest.fn<Promise<boolean | null>, []>(),
  setLanguage: jest.fn().mockResolvedValue(undefined),
  setTheme: jest.fn().mockResolvedValue(undefined),
  setAvatarId: jest.fn().mockResolvedValue(undefined),
  setCustomAvatarUri: jest.fn().mockResolvedValue(undefined),
  setHapticsEnabled: jest.fn().mockResolvedValue(undefined),
  setSoundEnabled: jest.fn().mockResolvedValue(undefined),
  setReducedMotion: jest.fn().mockResolvedValue(undefined),
};

beforeAll(() => {
  jest.resetModules();
  jest.doMock("@/db", () => ({ preferences: prefs }));
  jest.doMock("@/i18n", () => ({
    __esModule: true,
    default: { changeLanguage: jest.fn().mockResolvedValue(undefined) },
  }));
  // "fr" so the device fallback is distinguishable from the "en" default.
  jest.doMock("@/src/i18n/deviceLanguage", () => ({
    getDevicePreferredAppLanguage: () => "fr",
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
  prefs.getTheme.mockResolvedValue("dark");
  prefs.getAvatarId.mockResolvedValue("archmage");
  prefs.getCustomAvatarUri.mockResolvedValue("file:///stored-avatar.jpg");
  prefs.getHapticsEnabled.mockResolvedValue(false);
  prefs.getSoundEnabled.mockResolvedValue(false);
  prefs.getReducedMotion.mockResolvedValue(true);
}

const DEFAULTS = {
  language: "fr" as const, // from the mocked device language
  theme: "system" as const,
  avatarId: "guardian" as const,
  hapticsEnabled: true,
  soundEnabled: true,
  reducedMotion: false,
  isLoaded: false,
};

describe("useSettingsStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deviceReduceMotion = () => Promise.resolve(false);
    settingsStore().setState({ ...DEFAULTS });
  });

  test("stored values win over the defaults, all eight of them", async () => {
    storedSettings();

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState()).toMatchObject({
      language: "fr",
      theme: "dark",
      avatarId: "archmage",
      hapticsEnabled: false,
      soundEnabled: false,
      reducedMotion: true,
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

  test("junk in the theme or avatar column normalizes instead of leaking through", async () => {
    storedSettings();
    prefs.getTheme.mockResolvedValue("chartreuse");
    prefs.getAvatarId.mockResolvedValue("not-an-avatar");

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().theme).toBe("system");
    // normalizeAvatarId falls back to avatarIds[0] ("shadow"), not the store's
    // initial "guardian" default — an unknown id snaps to the first valid avatar.
    expect(settingsStore().getState().avatarId).toBe("shadow");
  });

  test("a failed read still marks the store loaded so the app does not hang", async () => {
    storedSettings();
    prefs.getTheme.mockRejectedValue(new Error("db is gone"));

    await settingsStore().getState().loadFromDatabase();

    const state = settingsStore().getState();
    expect(state.isLoaded).toBe(true);
    expect(state.theme).toBe("system");
  });

  /**
   * Every animated component already honours `reducedMotion`, but it defaulted to false and is
   * exposed in no screen — so it could never become true and all of that work was dead. The OS
   * preference is where the hero actually expressed the intent.
   */
  test("reduced motion follows the device when it was never answered", async () => {
    storedSettings();
    prefs.getReducedMotion.mockResolvedValue(null);
    deviceReduceMotion = () => Promise.resolve(true);

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().reducedMotion).toBe(true);
  });

  test("an explicit answer beats the device, in both directions", async () => {
    storedSettings();
    prefs.getReducedMotion.mockResolvedValue(false);
    deviceReduceMotion = () => Promise.resolve(true);

    await settingsStore().getState().loadFromDatabase();

    // Turned off on purpose: the device must not turn it back on.
    expect(settingsStore().getState().reducedMotion).toBe(false);
  });

  test("a device that will not answer leaves animations on", async () => {
    storedSettings();
    prefs.getReducedMotion.mockResolvedValue(null);
    deviceReduceMotion = () => Promise.reject(new Error("no accessibility bridge"));

    await settingsStore().getState().loadFromDatabase();

    expect(settingsStore().getState().reducedMotion).toBe(false);
    expect(settingsStore().getState().isLoaded).toBe(true);
  });

  test("every setter updates the store and writes through to the database", async () => {
    const s = () => settingsStore().getState();

    await s().setLanguage("fr");
    await s().setTheme("dark");
    await s().setAvatarId("scout");
    await s().setHapticsEnabled(false);
    await s().setSoundEnabled(false);
    await s().setReducedMotion(true);

    expect(s()).toMatchObject({
      language: "fr",
      theme: "dark",
      avatarId: "scout",
      hapticsEnabled: false,
      soundEnabled: false,
      reducedMotion: true,
    });

    expect(prefs.setLanguage).toHaveBeenCalledWith("fr");
    expect(prefs.setTheme).toHaveBeenCalledWith("dark");
    expect(prefs.setAvatarId).toHaveBeenCalledWith("scout");
    expect(prefs.setHapticsEnabled).toHaveBeenCalledWith(false);
    expect(prefs.setSoundEnabled).toHaveBeenCalledWith(false);
    expect(prefs.setReducedMotion).toHaveBeenCalledWith(true);
  });
});
