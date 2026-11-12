import type { HealthPort } from "@/src/healthExport/port";

/**
 * The JS half of `modules/bati-health`. The permission is asked, then read when the app comes back
 * from Health Connect's screen, or after a grace when Health Connect answers without one: waiting
 * for an activity result that never came left the switch stuck (W-04, API 35).
 */
let mockNative: Record<string, jest.Mock> | null = null;
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

type Listener = (status: string) => void;
const mockListeners: Listener[] = [];
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_type: string, listener: Listener) => {
      mockListeners.push(listener);
      return { remove: () => mockListeners.splice(mockListeners.indexOf(listener), 1) };
    },
  },
}));

function load(): HealthPort {
  let port: HealthPort | undefined;
  jest.isolateModules(() => {
    port = (require("@/modules/bati-health") as typeof import("@/modules/bati-health"))
      .nativeHealth;
  });
  if (!port) throw new Error("module did not load");
  return port;
}

function native(granted: boolean) {
  return {
    sdkStatus: jest.fn(() => 3),
    hasWritePermission: jest.fn(() => Promise.resolve(granted)),
    launchPermissionRequest: jest.fn(() => true),
    upsertSession: jest.fn((_json: string) => Promise.resolve()),
    deleteSessions: jest.fn((_ids: string[]) => Promise.resolve()),
    openSettings: jest.fn(() => true),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockListeners.length = 0;
});

afterEach(() => jest.useRealTimers());

test("without the module, Health Connect is absent and every call is a quiet no", async () => {
  mockNative = null;
  const port = load();
  expect(port.available()).toBe(false);
  expect(await port.hasPermission()).toBe(false);
  expect(await port.requestPermission()).toBe(false);
  await expect(port.upsert({} as never)).resolves.toBeUndefined();
  await expect(port.remove(["x"])).resolves.toBeUndefined();
  expect(() => port.openSettings()).not.toThrow();
});

test("available only when the provider is ready, never when it must be installed or updated", () => {
  mockNative = native(true);
  const port = load();
  expect(port.available()).toBe(true);
  mockNative.sdkStatus?.mockReturnValue(2);
  expect(port.available()).toBe(false);
});

test("the answer is read once the app is back from Health Connect's screen", async () => {
  const fake = native(true);
  mockNative = fake;
  const port = load();

  const answer = port.requestPermission();
  for (const l of [...mockListeners]) l("background");
  jest.advanceTimersByTime(5000);
  expect(fake.hasWritePermission).not.toHaveBeenCalled();
  for (const l of [...mockListeners]) l("active");

  expect(await answer).toBe(true);
  expect(mockListeners).toHaveLength(0);
});

test("Health Connect answering without a screen does not leave the switch waiting", async () => {
  mockNative = native(false);
  const port = load();

  const answer = port.requestPermission();
  // "active" with no departure before it is not a return.
  for (const l of [...mockListeners]) l("active");
  jest.advanceTimersByTime(2000);

  expect(await answer).toBe(false);
  expect(mockListeners).toHaveLength(0);
});

test("no activity to ask from: refused at once", async () => {
  const fake = native(true);
  fake.launchPermissionRequest.mockReturnValue(false);
  mockNative = fake;
  expect(await load().requestPermission()).toBe(false);
  expect(fake.hasWritePermission).not.toHaveBeenCalled();
});

test("a record crosses as JSON, deletions by client id, and the settings link opens", async () => {
  const fake = native(true);
  mockNative = fake;
  const port = load();
  const record = {
    id: "bati-u",
    version: 1,
    title: "t",
    notes: null,
    start: 1,
    end: 2,
    offsetMinutes: 60,
    segments: [],
  };

  await port.upsert(record);
  await port.remove(["bati-u"]);
  port.openSettings();

  expect(JSON.parse(String(fake.upsertSession.mock.calls[0]?.[0]))).toEqual(record);
  expect(fake.deleteSessions).toHaveBeenCalledWith(["bati-u"]);
  expect(fake.openSettings).toHaveBeenCalledTimes(1);
  expect(await port.hasPermission()).toBe(true);
});
