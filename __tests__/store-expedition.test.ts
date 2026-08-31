import type { LocationFix } from "@/modules/bati-location";

const mockListeners = new Map<string, (payload: never) => void>();
const mockAppendPoints = jest.fn().mockResolvedValue(undefined);
const mockStart = jest.fn().mockReturnValue(true);
const mockStop = jest.fn();
let mockAvailable = true;

jest.mock("@/db/gps", () => ({ appendPoints: (...a: never[]) => mockAppendPoints(...a) }));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => mockAvailable,
  start: (...a: never[]) => mockStart(...a),
  stop: () => mockStop(),
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
    mockStop.mockClear();
    mockAvailable = true;
    store = (require("@/stores/expedition") as typeof import("@/stores/expedition"))
      .useExpeditionStore;
  });

  test("starting subscribes and hands the service the on-foot speed cap", () => {
    expect(store.getState().begin("s1", NOTIFICATION, false)).toBe(true);
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ maxSpeedMs: 8 }));
    expect(mockListeners.has("onLocation")).toBe(true);
  });

  test("a mount gets the cap a bicycle needs, or a descent would be thrown away", () => {
    store.getState().begin("s1", NOTIFICATION, true);
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ maxSpeedMs: 25 }));
  });

  test("without a native half nothing starts, and the reason is readable", () => {
    mockAvailable = false;
    expect(store.getState().begin("s1", NOTIFICATION, false)).toBe(false);
    expect(store.getState().error).toBe("unavailable");
    expect(mockStart).not.toHaveBeenCalled();
  });

  test("fixes fold into the reading the screen shows", () => {
    store.getState().begin("s1", NOTIFICATION, false);
    // Three fixes open the start gate, then the walk is credited.
    for (let i = 0; i < 20; i++) emit(walking(i));

    const { track, lastFix } = store.getState();
    expect(track.startedAt).not.toBeNull();
    expect(track.distanceM).toBeGreaterThan(0);
    expect(track.paused).toBe(false);
    expect(lastFix?.t).toBe(T0 + 19 * 1000);
  });

  // The buffer is what a crash costs. Thirty seconds, never the run.
  test("points are written in batches rather than one at a time", () => {
    store.getState().begin("s1", NOTIFICATION, false);

    for (let i = 0; i < 29; i++) emit(walking(i));
    expect(mockAppendPoints).not.toHaveBeenCalled();

    emit(walking(29));
    expect(mockAppendPoints).toHaveBeenCalledTimes(1);
    expect(mockAppendPoints).toHaveBeenCalledWith("s1", expect.any(Array));
    expect(mockAppendPoints.mock.calls[0]?.[1]).toHaveLength(30);
  });

  test("ending writes what the buffer still holds, then stops the service", async () => {
    store.getState().begin("s1", NOTIFICATION, false);
    for (let i = 0; i < 5; i++) emit(walking(i));

    await store.getState().end();

    expect(mockAppendPoints).toHaveBeenCalledWith("s1", expect.any(Array));
    expect(mockAppendPoints.mock.calls[0]?.[1]).toHaveLength(5);
    expect(mockStop).toHaveBeenCalled();
    expect(store.getState().sessionUuid).toBeNull();
  });

  test("after ending, a stray fix cannot land on the session that just closed", async () => {
    store.getState().begin("s1", NOTIFICATION, false);
    emit(walking(0));
    await store.getState().end();
    mockAppendPoints.mockClear();

    expect(mockListeners.has("onLocation")).toBe(false);
  });

  test("a native error is kept where a screen can read it", () => {
    store.getState().begin("s1", NOTIFICATION, false);
    (mockListeners.get("onError") as (e: { code: string; message: string }) => void)({
      code: "permission",
      message: "denied",
    });
    expect(store.getState().error).toBe("permission");
  });
});
