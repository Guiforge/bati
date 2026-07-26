// The user store holds onboarding completion and the village name, both mirrored
// to the preferences table. Same jest.doMock + lazy require pattern the db/* and
// settings tests use, so the real @/db (native better-sqlite3) is never loaded.

const prefs = {
  getHasFinishedOnboarding: jest.fn<Promise<boolean>, []>(),
  getVillageName: jest.fn<Promise<string>, []>(),
  setHasFinishedOnboarding: jest.fn().mockResolvedValue(undefined),
  setVillageName: jest.fn().mockResolvedValue(undefined),
};

beforeAll(() => {
  jest.resetModules();
  jest.doMock("@/db", () => ({ preferences: prefs }));
});

afterAll(() => {
  jest.resetModules();
});

function userStore() {
  return (require("@/stores/user") as typeof import("@/stores/user")).useUserStore;
}

const DEFAULTS = {
  hasFinishedOnboarding: false,
  villageName: "",
  isLoaded: false,
};

describe("useUserStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userStore().setState({ ...DEFAULTS });
  });

  test("loadFromDatabase pulls stored values in and marks the store loaded", async () => {
    prefs.getHasFinishedOnboarding.mockResolvedValue(true);
    prefs.getVillageName.mockResolvedValue("Rivendell");

    await userStore().getState().loadFromDatabase();

    expect(userStore().getState()).toMatchObject({
      hasFinishedOnboarding: true,
      villageName: "Rivendell",
      isLoaded: true,
    });
  });

  test("a failed read still marks the store loaded so the app does not hang", async () => {
    prefs.getVillageName.mockRejectedValue(new Error("db is gone"));

    await userStore().getState().loadFromDatabase();

    const state = userStore().getState();
    expect(state.isLoaded).toBe(true);
    expect(state.villageName).toBe(""); // kept the default
  });

  test("setters update the store and write through to the database", async () => {
    await userStore().getState().setHasFinishedOnboarding(true);
    await userStore().getState().setVillageName("Gondor");

    expect(userStore().getState()).toMatchObject({
      hasFinishedOnboarding: true,
      villageName: "Gondor",
    });
    expect(prefs.setHasFinishedOnboarding).toHaveBeenCalledWith(true);
    expect(prefs.setVillageName).toHaveBeenCalledWith("Gondor");
  });
});
