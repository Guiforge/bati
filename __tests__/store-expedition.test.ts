import type { LocationFix } from "@/modules/bati-location";

const mockListeners = new Map<string, (payload: never) => void>();
const mockAppendPoints = jest.fn().mockResolvedValue(undefined);
const mockStart = jest.fn().mockReturnValue(true);
const mockRequestPermission = jest.fn().mockResolvedValue({ granted: true, status: "granted" });
const mockRequestNotificationPermission = jest
  .fn()
  .mockResolvedValue({ granted: true, status: "granted" });
const mockStop = jest.fn();
const mockSetProgress = jest.fn();
let mockAvailable = true;

jest.mock("@/db/gps", () => ({ appendPoints: (...a: never[]) => mockAppendPoints(...a) }));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => mockAvailable,
  start: (...a: never[]) => mockStart(...a),
  requestPermission: () => mockRequestPermission(),
  requestNotificationPermission: () => mockRequestNotificationPermission(),
  stop: () => mockStop(),
  setProgress: (...a: never[]) => mockSetProgress(...a),
  addListener: (event: string, fn: (payload: never) => void) => {
    mockListeners.set(event, fn);
    return { remove: () => mockListeners.delete(event) };
  },
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const NOTIFICATION = {
  title: "Bati",
  acquiring: "a",
  tracking: "t",
  paused: "p",
  gpsOff: "o",
};

const T0 = 1_760_000_000_000;
/** A fix that walks north at 1.4 m/s, which is what a hero does. */
const walking = (i: number): LocationFix => ({
  t: T0 + i * 1000,
  lat: 48.4728 + i * 0.0000126,
  lon: -2.4943,
  ele: 110,
  acc: 4,
  speed: 1.4,
  bearing: 0,
  distFromPrev: i === 0 ? 0 : 1.4,
});

function emit(fix: LocationFix) {
  (mockListeners.get("onLocation") as (f: LocationFix) => void)(fix);
}

describe("stores/expedition", () => {
  let store: typeof import("@/stores/expedition").useExpeditionStore;

  beforeEach(() => {
    jest.resetModules();
    mockListeners.clear();
    mockAppendPoints.mockClear();
    mockStart.mockClear();
    mockRequestPermission.mockClear();
    mockRequestNotificationPermission.mockClear();
    mockRequestNotificationPermission.mockResolvedValue({ granted: true, status: "granted" });
    mockRequestPermission.mockResolvedValue({ granted: true, status: "granted" });
    mockStop.mockClear();
    mockSetProgress.mockClear();
    mockAvailable = true;
    store = (require("@/stores/expedition") as typeof import("@/stores/expedition"))
      .useExpeditionStore;
  });

  test("starting subscribes and hands the service the on-foot speed cap", async () => {
    expect(await store.getState().begin("s1", NOTIFICATION, false, "metric")).toBe(true);
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ maxSpeedMs: 8 }));
    expect(mockListeners.has("onLocation")).toBe(true);
  });

  test("a mount gets the cap a bicycle needs, or a descent would be thrown away", async () => {
    await store.getState().begin("s1", NOTIFICATION, true, "metric");
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ maxSpeedMs: 25 }));
  });

  test("without a native half nothing starts, and the reason is readable", async () => {
    mockAvailable = false;
    expect(await store.getState().begin("s1", NOTIFICATION, false, "metric")).toBe(false);
    expect(store.getState().error).toBe("unavailable");
    expect(mockStart).not.toHaveBeenCalled();
  });

  test("fixes fold into the reading the screen shows", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    // Three fixes open the start gate, then the walk is credited.
    for (let i = 0; i < 20; i++) emit(walking(i));

    const { track, lastFix } = store.getState();
    expect(track.startedAt).not.toBeNull();
    expect(track.distanceM).toBeGreaterThan(0);
    expect(track.paused).toBe(false);
    expect(lastFix?.t).toBe(T0 + 19 * 1000);
  });

  // The buffer is what a crash costs. Thirty seconds, never the run.
  test("points are written in batches rather than one at a time", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");

    for (let i = 0; i < 29; i++) emit(walking(i));
    expect(mockAppendPoints).not.toHaveBeenCalled();

    emit(walking(29));
    expect(mockAppendPoints).toHaveBeenCalledTimes(1);
    expect(mockAppendPoints).toHaveBeenCalledWith("s1", expect.any(Array));
    expect(mockAppendPoints.mock.calls[0]?.[1]).toHaveLength(30);
  });

  test("ending writes what the buffer still holds, then stops the service", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 5; i++) emit(walking(i));

    await store.getState().end();

    expect(mockAppendPoints).toHaveBeenCalledWith("s1", expect.any(Array));
    expect(mockAppendPoints.mock.calls[0]?.[1]).toHaveLength(5);
    expect(mockStop).toHaveBeenCalled();
    expect(store.getState().sessionUuid).toBeNull();
  });

  test("after ending, a stray fix cannot land on the session that just closed", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    emit(walking(0));
    await store.getState().end();
    mockAppendPoints.mockClear();

    expect(mockListeners.has("onLocation")).toBe(false);
  });

  test("a native error is kept where a screen can read it", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    (mockListeners.get("onError") as (e: { code: string; message: string }) => void)({
      code: "permission",
      message: "denied",
    });
    expect(store.getState().error).toBe("permission");
  });

  /**
   * The bug this file exists to make unrepeatable.
   *
   * Android does not grant location on its own, and for a while nothing in the shipped app ever
   * asked: `requestPermission` was called only from the `__DEV__` harness, where the grant had
   * already been given by hand. So the service refused, no point was ever written, the leagues
   * stayed at zero and the High Road never rose - and every test passed, because every test ran
   * where the permission was already there. A control that works everywhere except where it
   * ships.
   */
  /**
   * The notification used to say the same four words for an hour: `setState` only fires when the
   * *state* changes, and "On the road" does not change once a walk has started. The ground
   * covered is the only thing about it that moves, and it is the only reason to look.
   */
  test("the notification is told the ground covered, in the hero's own words", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 30; i += 1) emit(walking(i));

    expect(mockSetProgress).toHaveBeenCalledTimes(1);
    // Twenty-nine steps of 1.4 m, minus the gate the reducer holds open for the first three.
    expect(mockSetProgress.mock.calls[0]?.[0]).toMatch(/^\d+ m$/);
  });

  describe("the permission", () => {
    test("is asked for before the service is ever started", async () => {
      await store.getState().begin("s1", NOTIFICATION, false, "metric");

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(mockRequestPermission.mock.invocationCallOrder[0]).toBeLessThan(
        mockStart.mock.invocationCallOrder[0] as number,
      );
    });

    /**
     * The notification is the feature's whole voice outdoors, and from API 33 it is invisible
     * without its own grant — but it is only the voice. A refused notification must never cost
     * the hero the walk, which is what bundling the two prompts into one request would have done.
     */
    test("for the notification is asked separately, and a refusal costs nothing", async () => {
      mockRequestNotificationPermission.mockResolvedValue({ granted: false, status: "denied" });

      expect(await store.getState().begin("s1", NOTIFICATION, false, "metric")).toBe(true);
      expect(mockRequestNotificationPermission).toHaveBeenCalled();
      expect(mockStart).toHaveBeenCalled();
      expect(store.getState().error).toBeNull();
    });

    test("refused, nothing starts and the panel is told why", async () => {
      mockRequestPermission.mockResolvedValue({ granted: false, status: "denied" });

      expect(await store.getState().begin("s1", NOTIFICATION, false, "metric")).toBe(false);
      expect(mockStart).not.toHaveBeenCalled();
      expect(store.getState().error).toBe("permission");
    });
  });
});
