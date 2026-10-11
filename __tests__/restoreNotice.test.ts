/**
 * The word a restore leaves for after its reload: "<Village> est de retour : N séances." It is
 * said once, about the database that came back, and N is the journal's own count.
 */

const mockSecure = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string) => Promise.resolve(mockSecure.get(key) ?? null),
  setItemAsync: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockSecure.set(key, value);
    }),
  deleteItemAsync: (key: string) =>
    Promise.resolve().then(() => {
      mockSecure.delete(key);
    }),
}));

let mockFigures = { quests: 0, outings: 0 };
const mockRead = jest.fn(() => Promise.resolve(mockFigures));
jest.mock("@/db/journal", () => ({ getPeriodFigures: () => mockRead() }));
jest.mock("@/db/preferences", () => ({
  preferences: { getVillageName: () => Promise.resolve("Kerbati") },
}));

import { rememberRestoreNotice, takeRestoreNotice } from "@/src/restoreNotice";

beforeEach(() => {
  mockSecure.clear();
  mockRead.mockClear();
  mockFigures = { quests: 0, outings: 0 };
});

test("with no restore behind it, a launch says nothing and reads nothing", async () => {
  expect(await takeRestoreNotice()).toBeNull();
  expect(mockRead).not.toHaveBeenCalled();
});

test("after a restore: the village and every session the journal counts, said once", async () => {
  mockFigures = { quests: 14, outings: 2 };
  await rememberRestoreNotice();

  expect(await takeRestoreNotice()).toEqual({ village: "Kerbati", sessions: 16 });
  expect(await takeRestoreNotice()).toBeNull();
});

test("a restore that brought no session is not announced, and is not kept for later", async () => {
  await rememberRestoreNotice();

  expect(await takeRestoreNotice()).toBeNull();
  mockFigures = { quests: 1, outings: 0 };
  expect(await takeRestoreNotice()).toBeNull();
});

// Seen on a device: the screen that reads the word mounted its effect twice, both reads landed
// before either delete, and the toast came up twice.
test("two readers at once: one of them gets the word, the other nothing", async () => {
  mockFigures = { quests: 1, outings: 0 };
  await rememberRestoreNotice();

  const [first, second] = await Promise.all([takeRestoreNotice(), takeRestoreNotice()]);

  expect([first, second].filter((notice) => notice !== null)).toHaveLength(1);
});
