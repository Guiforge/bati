/**
 * This install's name, and the counter that will sit beside it. One SecureStore item holds both,
 * because they are born together and die together: SecureStore is not in Android's backup, so a
 * restored phone gets neither, and a phone with an id and somebody else's counter is the one state
 * that would let a file be replayed.
 */
const mockSecure = new Map<string, string>();
let mockFailing = false;

jest.mock("@/modules/bati-crypto", () => ({
  batiCrypto: () => require("./helpers/nodeBatiCrypto").nodeBatiCrypto,
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string) =>
    mockFailing
      ? Promise.reject(new Error("keystore down"))
      : Promise.resolve(mockSecure.get(key) ?? null),
  setItemAsync: (key: string, value: string) =>
    mockFailing
      ? Promise.reject(new Error("keystore down"))
      : Promise.resolve().then(() => {
          mockSecure.set(key, value);
        }),
}));

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

type Module = typeof import("@/src/installId");
function fresh(): Module {
  jest.resetModules();
  return require("@/src/installId") as Module;
}

beforeEach(() => {
  mockSecure.clear();
  mockFailing = false;
});

describe("installId", () => {
  test("is a random uuid, the same on every call and after a restart", async () => {
    const first = await fresh().installId();
    expect(first).toMatch(UUID);
    expect(await fresh().installId()).toBe(first);
  });

  test("keeps the id and the counter in one item", async () => {
    const id = await fresh().installId();
    expect(JSON.parse(mockSecure.get("bati.sync.identity") ?? "null")).toEqual({
      installId: id,
      counter: 0,
    });
  });

  test("adopts the id the previous build wrote, so no device renames itself on update", async () => {
    mockSecure.set("bati.sync.install", "0f0e0d0c-0b0a-4908-8706-050403020100");
    const id = await fresh().installId();
    expect(id).toBe("0f0e0d0c-0b0a-4908-8706-050403020100");
    expect(JSON.parse(mockSecure.get("bati.sync.identity") ?? "null")).toEqual({
      installId: id,
      counter: 0,
    });
    // Left as it was: a rollback to the previous build must still find its name.
    expect(mockSecure.get("bati.sync.install")).toBe("0f0e0d0c-0b0a-4908-8706-050403020100");
  });

  test("two callers racing at launch get one id", async () => {
    const m = fresh();
    const [a, b] = await Promise.all([m.installId(), m.installId()]);
    expect(a).toBe(b);
  });

  test("a counter reserved while the id is being made does not make a second id", async () => {
    const m = fresh();
    const [id, counter] = await Promise.all([m.installId(), m.reserveCounter()]);
    expect(counter).toBe("1");
    expect(JSON.parse(mockSecure.get("bati.sync.identity") ?? "null")).toEqual({
      installId: id,
      counter: 1,
    });
  });

  test("an unreadable item is not replaced by a new id", async () => {
    mockSecure.set("bati.sync.identity", "{not json");
    await expect(fresh().installId()).rejects.toThrow();
    expect(mockSecure.get("bati.sync.identity")).toBe("{not json");
  });

  test("throws when the keystore is down, because sync cannot run without a name", async () => {
    mockFailing = true;
    await expect(fresh().installId()).rejects.toThrow("keystore down");
  });

  test("a failed read is not remembered: the next call tries again", async () => {
    const m = fresh();
    mockFailing = true;
    await expect(m.installId()).rejects.toThrow();
    mockFailing = false;
    await expect(m.installId()).resolves.toMatch(UUID);
  });
});

describe("shortInstallId", () => {
  test("is the first eight hex digits, enough to tell two devices apart in a file name", async () => {
    mockSecure.set("bati.sync.install", "0f0e0d0c-0b0a-4908-8706-050403020100");
    expect(await fresh().shortInstallId()).toBe("0f0e0d0c");
  });

  test("is null, not a throw, when the keystore is down", async () => {
    // `backupBeforeMigrations` forgets the folder on a throw: a keystore that is down at launch
    // must cost a backup its device tag, never the feature.
    mockFailing = true;
    await expect(fresh().shortInstallId()).resolves.toBeNull();
  });
});

describe("reserveCounter", () => {
  test("counts from one, and what it hands out is already saved", async () => {
    const m = fresh();
    expect(await m.reserveCounter()).toBe("1");
    expect(await m.reserveCounter()).toBe("2");
    // Saved before it is returned: a crash right after still never hands the number out again.
    expect(JSON.parse(mockSecure.get("bati.sync.identity") ?? "null").counter).toBe(2);
    expect(await fresh().reserveCounter()).toBe("3");
  });

  test("keeps the id it sits beside", async () => {
    const m = fresh();
    const id = await m.installId();
    await m.reserveCounter();
    expect(JSON.parse(mockSecure.get("bati.sync.identity") ?? "null").installId).toBe(id);
  });

  test("callers that start together get different numbers", async () => {
    const m = fresh();
    const got = await Promise.all([m.reserveCounter(), m.reserveCounter(), m.reserveCounter()]);
    expect(new Set(got).size).toBe(3);
    expect(got.map(Number).sort()).toEqual([1, 2, 3]);
  });

  test("a failure does not jam the queue", async () => {
    const m = fresh();
    mockFailing = true;
    await expect(m.reserveCounter()).rejects.toThrow("keystore down");
    mockFailing = false;
    expect(await m.reserveCounter()).toBe("1");
  });

  test("refuses rather than go past what JavaScript can count exactly", async () => {
    mockSecure.set(
      "bati.sync.identity",
      JSON.stringify({
        installId: "0f0e0d0c-0b0a-4908-8706-050403020100",
        counter: Number.MAX_SAFE_INTEGER,
      }),
    );
    await expect(fresh().reserveCounter()).rejects.toThrow("exhausted");
  });
});
