/**
 * "Update the protection" is hidden for 14 days after this version first runs. A hero with two
 * phones updates one; if its vault became format 3 at once, the other (still on 2.9, F-Droid
 * sometimes arrives days later) could no longer read it. For those days a format 2 vault keeps
 * writing format 2, and nothing is ever migrated without the hero's own gesture.
 *
 * The first-run date lives in SecureStore and nowhere else: not in the database (a restore
 * replaces it, a sync could carry another phone's), not in Android's backup (a new phone is a new
 * first run, which is the safe direction).
 */
const mockSecure = new Map<string, string>();
let mockFailing = false;

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
// The database must not be a way in: reading or writing a preference here fails the test.
jest.mock("@/db/preferences", () => ({
  getPreference: () => {
    throw new Error("the first-run date must not live in the database");
  },
  setPreference: () => {
    throw new Error("the first-run date must not live in the database");
  },
}));

import { noteFirstLaunch, UPDATE_DELAY_DAYS, vaultUpdateOffered } from "@/src/vaultUpdateDelay";

const DAY = 86_400_000;
const T0 = new Date("2026-10-10T09:00:00Z");
const onDay = (days: number, extraMs = 0) => new Date(T0.getTime() + days * DAY + extraMs);

beforeEach(() => {
  mockSecure.clear();
  mockFailing = false;
});

describe("the 14 days", () => {
  test("the delay is the one decided", () => {
    expect(UPDATE_DELAY_DAYS).toBe(14);
  });

  test("not offered on the first day, the first launch is what starts the count", async () => {
    await noteFirstLaunch(T0);

    expect(await vaultUpdateOffered(T0)).toBe(false);
  });

  test("still hidden on day 13, even a minute before day 14", async () => {
    await noteFirstLaunch(T0);

    expect(await vaultUpdateOffered(onDay(13))).toBe(false);
    expect(await vaultUpdateOffered(onDay(14, -60_000))).toBe(false);
  });

  test("offered from day 14", async () => {
    await noteFirstLaunch(T0);

    expect(await vaultUpdateOffered(onDay(14))).toBe(true);
  });

  test("the first launch is noted once, a later launch does not push the day back", async () => {
    await noteFirstLaunch(T0);
    await noteFirstLaunch(onDay(10));

    expect(await vaultUpdateOffered(onDay(14))).toBe(true);
  });

  test("asked before any launch was noted, the answer is no and the count starts now", async () => {
    expect(await vaultUpdateOffered(T0)).toBe(false);
    expect(await vaultUpdateOffered(onDay(14))).toBe(true);
  });
});

describe("a clock the hero moves", () => {
  test("set back after the line appeared: it stays, nothing crashes", async () => {
    await noteFirstLaunch(T0);
    expect(await vaultUpdateOffered(onDay(20))).toBe(true);

    expect(await vaultUpdateOffered(onDay(-30))).toBe(true);
    expect(await vaultUpdateOffered(T0)).toBe(true);
  });

  test("set back before the line appeared: still hidden, never an error", async () => {
    await noteFirstLaunch(T0);

    expect(await vaultUpdateOffered(onDay(-400))).toBe(false);
    // And the count was not rewound: the real day 14 still opens it.
    expect(await vaultUpdateOffered(onDay(14))).toBe(true);
  });

  test("set far forward: offered, which only ever shows a line earlier than planned", async () => {
    await noteFirstLaunch(T0);

    expect(await vaultUpdateOffered(onDay(5000))).toBe(true);
  });
});

describe("where the date lives", () => {
  test("only in SecureStore, so a restore of the database and a sync cannot touch it", async () => {
    await noteFirstLaunch(T0);

    expect([...mockSecure.keys()]).toEqual(["bati.vault.firstSeen"]);
    // The preferences mock above throws on any use: reaching here without it firing is the proof.
    expect(await vaultUpdateOffered(onDay(20))).toBe(true);
  });

  test("a restored database changes nothing: the answer is the same before and after", async () => {
    await noteFirstLaunch(T0);
    const before = await vaultUpdateOffered(onDay(13));

    // A restore replaces the database file and leaves the keystore alone: nothing to do here,
    // which is the point. The count is still the one from the first launch.
    expect(before).toBe(false);
    expect(await vaultUpdateOffered(onDay(14))).toBe(true);
  });

  test("an unreadable date starts a new count instead of offering at once", async () => {
    mockSecure.set("bati.vault.firstSeen", "not a date");

    expect(await vaultUpdateOffered(T0)).toBe(false);
    expect(await vaultUpdateOffered(onDay(14))).toBe(true);
  });

  test("a keystore that is down says no and does not throw", async () => {
    mockFailing = true;

    await expect(vaultUpdateOffered(onDay(30))).resolves.toBe(false);
    await expect(noteFirstLaunch(T0)).resolves.toBeUndefined();
  });
});
