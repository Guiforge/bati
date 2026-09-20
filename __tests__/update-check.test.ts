import { checkForUpdate, isNewer, RELEASES_URL } from "@/src/updateCheck";

// Fixed here rather than read from app.json: these tests are about the comparison, and a release
// would otherwise quietly change what every case below means.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "2.0.0" } },
}));

// A real key-value store rather than a bag of spies. What matters is the behaviour a hero gets
// out of it — asked once a day, silent when switched off, quiet again once closed — and a mock
// that only records calls cannot show any of that.
jest.mock("@/db/preferences", () => {
  const store: Record<string, string | undefined> = {};
  return {
    preferences: {
      store,
      getUpdateCheckEnabled: () => Promise.resolve(store.updateCheck === "true"),
      getUpdateCheckedAt: () => Promise.resolve(Number(store.updateCheckedAt) || 0),
      setUpdateCheckedAt: (at: number) => {
        store.updateCheckedAt = String(at);
        return Promise.resolve();
      },
      getUpdateLatest: () => Promise.resolve(store.updateLatest ?? null),
      setUpdateLatest: (version: string) => {
        store.updateLatest = version;
        return Promise.resolve();
      },
      getUpdateDismissed: () => Promise.resolve(store.updateDismissed ?? null),
    },
  };
});

// Fetched from the registry, not closed over: `jest.mock` is hoisted above the imports, so a
// module-scope const would still be uninitialised when the factory runs.
const { preferences } = jest.requireMock("@/db/preferences") as {
  preferences: { store: Record<string, string | undefined> };
};

const DAY_MS = 24 * 60 * 60 * 1000;

function replyWith(tag: string): jest.Mock {
  return jest.fn().mockResolvedValue({ ok: true, json: async () => ({ tag_name: tag }) });
}

describe("isNewer", () => {
  test.each([
    ["2.0.1", true],
    ["2.1.0", true],
    ["3.0.0", true],
    ["v2.0.1", true],
    ["2.0.0", false],
    ["1.9.9", false],
    ["2.0", false],
    ["nightly", false],
    ["", false],
  ])("%s against 2.0.0 is %s", (candidate, expected) => {
    expect(isNewer(candidate, "2.0.0")).toBe(expected);
  });

  // Field by field, not through the versionCode integer, whose two-digit fields would make this
  // one a downgrade and offer the hero a version older than the one they have.
  // `appVersion` is "" when the manifest carries no version, and this is what makes that the
  // safe fallback: nothing parses, so nothing is newer, and a build that cannot say what it is
  // says nothing. "0.0.0" would have made every release newer than it.
  test("a build that cannot say what version it is claims nothing", () => {
    expect(isNewer("9.9.9", "")).toBe(false);
  });

  test("a minor past 99 still compares upwards", () => {
    expect(isNewer("1.100.0", "1.99.9")).toBe(true);
    expect(isNewer("1.99.9", "1.100.0")).toBe(false);
  });
});

describe("checkForUpdate", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    for (const key of Object.keys(preferences.store)) delete preferences.store[key];
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("switched off, it asks nobody anything", async () => {
    const fetchMock = replyWith("v9.9.9");
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(preferences.store.updateCheckedAt).toBeUndefined();
  });

  test("switched on, it asks GitHub and keeps the answer", async () => {
    preferences.store.updateCheck = "true";
    const fetchMock = replyWith("v2.6.0");
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBe("2.6.0");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("api.github.com");
    expect(preferences.store.updateLatest).toBe("2.6.0");
  });

  test("it asks once a day, and answers from what it kept in between", async () => {
    preferences.store.updateCheck = "true";
    preferences.store.updateLatest = "2.6.0";
    preferences.store.updateCheckedAt = String(Date.now() - DAY_MS / 2);
    const fetchMock = replyWith("v2.7.0");
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBe("2.6.0");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("nothing newer than this build is nothing to say", async () => {
    preferences.store.updateCheck = "true";
    global.fetch = replyWith("v2.0.0") as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBeNull();
  });

  test("a closed card stays closed for that version and no other", async () => {
    preferences.store.updateCheck = "true";
    preferences.store.updateDismissed = "2.6.0";
    global.fetch = replyWith("v2.6.0") as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBeNull();

    // The next release is a different answer, and asks again.
    preferences.store.updateCheckedAt = "0";
    global.fetch = replyWith("v2.7.0") as unknown as typeof fetch;
    await expect(checkForUpdate()).resolves.toBe("2.7.0");
  });

  test("a stamp from the future asks again instead of locking the check out", async () => {
    preferences.store.updateCheck = "true";
    preferences.store.updateCheckedAt = String(Date.now() + 400 * DAY_MS);
    const fetchMock = replyWith("v2.6.0");
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBe("2.6.0");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Number(preferences.store.updateCheckedAt)).toBeLessThanOrEqual(Date.now());
  });

  test("no network is not an error, and not a retry on every mount either", async () => {
    preferences.store.updateCheck = "true";
    const fetchMock = jest.fn().mockRejectedValue(new Error("Network request failed"));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkForUpdate()).resolves.toBeNull();
    // Stamped despite the failure, so a phone in a basement tries once a day and not once per
    // render of Home.
    expect(Number(preferences.store.updateCheckedAt)).toBeGreaterThan(0);

    await expect(checkForUpdate()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a refused or unreadable answer changes nothing", async () => {
    preferences.store.updateCheck = "true";
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(checkForUpdate()).resolves.toBeNull();
    expect(preferences.store.updateLatest).toBeUndefined();

    preferences.store.updateCheckedAt = "0";
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => null }) as unknown as typeof fetch;
    await expect(checkForUpdate()).resolves.toBeNull();
    expect(preferences.store.updateLatest).toBeUndefined();
  });
});

test("the card sends a hero to a page, never to a file", () => {
  expect(RELEASES_URL).toBe("https://github.com/Guiforge/bati/releases/latest");
  expect(RELEASES_URL.endsWith(".apk")).toBe(false);
});
