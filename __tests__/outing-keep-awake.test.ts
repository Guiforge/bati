import fs from "node:fs";
import path from "node:path";

const mockStore = new Map<string, string>();
let mockGetFails = false;
jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string) =>
    mockGetFails
      ? Promise.reject(new Error("keystore"))
      : Promise.resolve(mockStore.get(key) ?? null),
  setItemAsync: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockStore.set(key, value);
    }),
  deleteItemAsync: (key: string) =>
    Promise.resolve().then(() => {
      mockStore.delete(key);
    }),
}));
const mockReportError = jest.fn();
jest.mock("@/src/reportError", () => ({ reportError: (...a: never[]) => mockReportError(...a) }));

import { keepAwakeSet, setKeepAwake } from "@/src/outingKeepAwake";

beforeEach(() => {
  mockStore.clear();
  mockGetFails = false;
  mockReportError.mockClear();
});

test("nothing stored is the screen going off everywhere", async () => {
  expect(await keepAwakeSet()).toEqual([]);
});

test("a round trip adds and removes one activity at a time", async () => {
  expect(await setKeepAwake("ride", true)).toEqual(["ride"]);
  expect(await setKeepAwake("walk", true)).toEqual(["walk", "ride"]);
  expect(await keepAwakeSet()).toEqual(["walk", "ride"]);
  expect(await setKeepAwake("walk", false)).toEqual(["ride"]);
  expect(await setKeepAwake("ride", false)).toEqual([]);
  expect(mockStore.size).toBe(0);
});

test("a read that throws reports and reads as off", async () => {
  mockGetFails = true;
  expect(await keepAwakeSet()).toEqual([]);
  expect(mockReportError).toHaveBeenCalledWith("outing.keepAwake.read", expect.any(Error));
});

test("a bad blob reads as off, and unknown activities are dropped", async () => {
  mockStore.set("bati.outing.keepAwake", "{oops");
  expect(await keepAwakeSet()).toEqual([]);
  expect(mockReportError).toHaveBeenCalled();
  mockStore.set("bati.outing.keepAwake", '["run","swim"]');
  expect(await keepAwakeSet()).toEqual(["run"]);
});

// The value is the phone's. If this module ever reaches the database, a sync or a restore can
// carry a handlebar phone's lit screen to a pocket phone.
test("the module never imports the preferences database", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/outingKeepAwake.ts"), "utf8");
  expect(source).not.toMatch(/db\/preferences|@\/db(?!\/schema)/);
});
