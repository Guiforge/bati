/**
 * The twelve words on the clipboard: marked sensitive where Android knows the flag, kept a minute, and taken off at
 * the next return to the foreground when the minute passed while the app was suspended (a timer does not fire then).
 */
const mockClip = { text: "" };
const mockSensitive: string[] = [];
let mockNativeThrows = false;
let mockReadThrows = false;
const mockListeners: ((state: string) => void)[] = [];
const mockReported: string[] = [];

jest.mock("expo-clipboard", () => ({
  setStringAsync: (value: string) => {
    mockClip.text = value;
    return Promise.resolve(true);
  },
  getStringAsync: () =>
    mockReadThrows ? Promise.reject(new Error("denied")) : Promise.resolve(mockClip.text),
}));
jest.mock("@/modules/bati-save", () => ({
  batiSave: () => ({
    copySensitive: (value: string) => {
      if (mockNativeThrows) return Promise.reject(new Error("no module"));
      mockSensitive.push(value);
      mockClip.text = value;
      return Promise.resolve();
    },
  }),
}));
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      mockListeners.push(listener);
      return { remove: () => mockListeners.splice(mockListeners.indexOf(listener), 1) };
    },
  },
}));
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReported.push(context),
}));

import { clearIfDue, copySensitive, KEEP_MS } from "@/src/sensitiveClipboard";

const WORDS = "one two three four five six seven eight nine ten eleven twelve";

beforeEach(() => {
  jest.useFakeTimers();
  mockClip.text = "";
  mockSensitive.length = 0;
  mockNativeThrows = false;
  mockReadThrows = false;
  mockListeners.length = 0;
  mockReported.length = 0;
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test("the words go through the sensitive copy", async () => {
  await copySensitive(WORDS);

  expect(mockSensitive).toEqual([WORDS]);
  expect(mockClip.text).toBe(WORDS);
});

test("without the native module a plain copy still happens, and still clears", async () => {
  mockNativeThrows = true;

  await copySensitive(WORDS);
  expect(mockClip.text).toBe(WORDS);

  await jest.advanceTimersByTimeAsync(KEEP_MS);
  expect(mockClip.text).toBe("");
});

test("the minute is kept: nothing is cleared before it", async () => {
  await copySensitive(WORDS);

  await jest.advanceTimersByTimeAsync(KEEP_MS - 1_000);
  expect(mockClip.text).toBe(WORDS);

  await jest.advanceTimersByTimeAsync(1_000);
  expect(mockClip.text).toBe("");
});

test("something copied since is left alone", async () => {
  await copySensitive(WORDS);
  mockClip.text = "a shopping list";

  await jest.advanceTimersByTimeAsync(KEEP_MS);

  expect(mockClip.text).toBe("a shopping list");
});

test("the app suspended past the minute clears at its return to the foreground, not before", async () => {
  await copySensitive(WORDS);
  const start = Date.now();

  // The timer never fired (the app was suspended): only the clock moved.
  jest.setSystemTime(start + KEEP_MS - 5_000);
  for (const listener of [...mockListeners]) listener("active");
  await Promise.resolve();
  expect(mockClip.text).toBe(WORDS);

  jest.setSystemTime(start + KEEP_MS + 5_000);
  for (const listener of [...mockListeners]) listener("active");
  await jest.advanceTimersByTimeAsync(0);

  expect(mockClip.text).toBe("");
  // Done with it: nothing left listening.
  expect(mockListeners).toHaveLength(0);
});

test("a clipboard that cannot be read is reported, not thrown", async () => {
  await copySensitive(WORDS);
  mockReadThrows = true;

  await clearIfDue(Date.now() + KEEP_MS + 1);

  expect(mockReported).toEqual(["backup.recoveryClear"]);
});
