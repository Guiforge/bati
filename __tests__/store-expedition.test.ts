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
const mockSetReached = jest.fn();
let mockAvailable = true;

const mockPointsOf = jest.fn().mockResolvedValue([]);
jest.mock("@/db/gps", () => ({
  appendPoints: (...a: never[]) => mockAppendPoints(...a),
  pointsOf: (...a: never[]) => mockPointsOf(...a),
}));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => mockAvailable,
  start: (...a: never[]) => mockStart(...a),
  requestPermission: () => mockRequestPermission(),
  requestNotificationPermission: () => mockRequestNotificationPermission(),
  // Asked once per process by whichever door got there first, so the mock keeps the
  // call visible while the real one is the module's own business.
  // Swallows, because the real one does: a refused or broken notification grant must never
  // cancel a walk. Its breadcrumb is asserted where it now lives, in bati-location-module.
  ensureNotificationPermission: async () => {
    await mockRequestNotificationPermission().catch(() => undefined);
  },
  stop: () => mockStop(),
  setProgress: (...a: never[]) => mockSetProgress(...a),
  setReached: (...a: never[]) => mockSetReached(...a),
  addListener: (event: string, fn: (payload: never) => void) => {
    mockListeners.set(event, fn);
    return { remove: () => mockListeners.delete(event) };
  },
}));
const mockReportError = jest.fn();
jest.mock("@/src/reportError", () => ({
  reportError: (...a: never[]) => mockReportError(...a),
}));

/**
 * The one thing this store now asks the session store for: how long the hero has been out.
 *
 * Mocked rather than run, for two reasons. The real function reads the session store, which
 * would drag the SQLite client into a test that has none; and the import goes back into a module
 * that already imports this one, so mocking it is also the cheapest place to notice if that
 * cycle ever stops being harmless. The number itself is what the assertions are about.
 */
let mockElapsedSeconds = 0;
jest.mock("@/stores/session", () => ({
  recordedDurationSeconds: () => mockElapsedSeconds,
}));

const mockHaptic = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-haptics", () => ({
  notificationAsync: (...a: never[]) => mockHaptic(...a),
  NotificationFeedbackType: { Success: "success" },
}));

const NOTIFICATION = {
  title: "Bati",
  acquiring: "a",
  tracking: "t",
  paused: "p",
  gpsOff: "o",
  reached: "r",
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
    mockPointsOf.mockClear();
    mockPointsOf.mockResolvedValue([]);
    mockStart.mockClear();
    mockRequestPermission.mockClear();
    mockRequestNotificationPermission.mockClear();
    mockRequestNotificationPermission.mockResolvedValue({ granted: true, status: "granted" });
    mockRequestPermission.mockResolvedValue({ granted: true, status: "granted" });
    mockStop.mockClear();
    mockSetProgress.mockClear();
    mockSetReached.mockClear();
    mockReportError.mockClear();
    mockHaptic.mockClear();
    mockAvailable = true;
    mockElapsedSeconds = 0;
    store = (require("@/stores/expedition") as typeof import("@/stores/expedition"))
      .useExpeditionStore;
  });

  // The notification's line is now driven by an interval, and `end()` is the only thing that
  // clears it. A test that begins a run and never ends it would leave one ticking on a module
  // `resetModules` can no longer reach.
  afterEach(async () => {
    await store.getState().end();
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

  test("a distance goal buzzes once when the ground is covered, and says so in the notification", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric", {
      type: "distance",
      metres: 10,
    });
    // 1.4 m per fix; the start gate eats the first three, so ten metres land around fix 11.
    for (let i = 0; i < 20; i++) emit(walking(i));

    expect(store.getState().goalReached).toBe(true);
    expect(mockHaptic).toHaveBeenCalledTimes(1);
    expect(mockSetReached).toHaveBeenCalledTimes(1);
  });

  test("a time goal is measured in moving seconds", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric", {
      type: "time",
      seconds: 10,
    });
    for (let i = 0; i < 8; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(false);
    for (let i = 8; i < 20; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(true);
    expect(mockHaptic).toHaveBeenCalledTimes(1);
  });

  test("a time goal stays unmet on elapsed wall clock alone, once the hero stops moving", async () => {
    // A goal of 60 s of *moving* time. Walking stops at fix 10, 9.8 m from the anchor — short of
    // the 10 m that would reset it — so under 10 s of credited moving time and the goal unmet.
    await store.getState().begin("s1", NOTIFICATION, false, "metric", {
      type: "time",
      seconds: 60,
    });
    for (let i = 0; i < 11; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(false);

    // The hero stands still from here on: same spot as fix 10, one fix per second. The reducer
    // credits the window of doubt before auto-pause engages — `RULES.pauseAfterMs`, a floor pace
    // rather than an instant verdict — and then stops, so three and a half minutes of wall clock
    // must not buzz a goal that moving time never reached.
    for (let i = 11; i < 211; i++) emit({ ...walking(10), t: T0 + i * 1000, distFromPrev: 0 });
    expect(store.getState().goalReached).toBe(false);
    expect(mockHaptic).not.toHaveBeenCalled();
  });

  test("haptics off means no buzz, the notification still says it", async () => {
    await store
      .getState()
      .begin("s1", NOTIFICATION, false, "metric", { type: "distance", metres: 10 }, false);
    for (let i = 0; i < 20; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(true);
    expect(mockHaptic).not.toHaveBeenCalled();
    expect(mockSetReached).toHaveBeenCalledTimes(1);
  });

  test("no goal never reaches anything", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 40; i++) emit(walking(i));
    expect(store.getState().goalReached).toBe(false);
    expect(mockHaptic).not.toHaveBeenCalled();
    expect(mockSetReached).not.toHaveBeenCalled();
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
    mockPointsOf.mockClear();
    mockPointsOf.mockResolvedValue([]);

    expect(mockListeners.has("onLocation")).toBe(false);
  });

  /**
   * The OEM kills the app at 2.4 km, the hero taps resume, and only `startSession` ever started
   * the tracking - so the panel said "Finding the sky" for the rest of the walk and the reducer
   * finished with no witness at all. The points are on disk under the same name and the reducer
   * is pure, so replaying them is the reading; anything else is a second rule for the same walk.
   */
  test("a resumed outing picks the reading back up from the ground already measured", async () => {
    const walked = Array.from({ length: 20 }, (_, i) => walking(i));
    mockPointsOf.mockResolvedValue(walked);

    await store.getState().begin("s1", NOTIFICATION, false, "metric");

    expect(mockPointsOf).toHaveBeenCalledWith("s1");
    const { track, sessionUuid, lastFix } = store.getState();
    expect(sessionUuid).toBe("s1");
    expect(track.startedAt).not.toBeNull();
    expect(track.distanceM).toBeGreaterThan(20);
    expect(lastFix?.t).toBe(T0 + 19 * 1000);

    // And it keeps going from there rather than from zero.
    const before = store.getState().track.distanceM;
    emit({ ...walking(20), t: T0 + 20_000 });
    expect(store.getState().track.distanceM).toBeGreaterThan(before);
  });

  test("a resumed outing that already met its goal knows it", async () => {
    mockPointsOf.mockResolvedValue(Array.from({ length: 20 }, (_, i) => walking(i)));

    await store.getState().begin("s1", NOTIFICATION, false, "metric", {
      type: "distance",
      metres: 10,
    });

    expect(store.getState().goalReached).toBe(true);
  });

  // The reading is a convenience; the walk is the feature. A database that will not answer costs
  // the resumed total, never the tracking.
  test("a trace that cannot be read back still starts the walk", async () => {
    mockPointsOf.mockRejectedValue(new Error("db went away"));

    expect(await store.getState().begin("s1", NOTIFICATION, false, "metric")).toBe(true);
    expect(mockReportError).toHaveBeenCalledWith("expedition.resumeTrack", expect.any(Error));
    expect(store.getState().track.startedAt).toBeNull();
    expect(store.getState().track.distanceM).toBe(0);
  });

  /**
   * Two sorties in one process, the second refused. `begin` used to return on `permission`
   * before it reset anything, so the first walk's five kilometres were still in state at DONE:
   * credited to the High Road a second time, with the first run's pace on the victory screen.
   */
  test("a refused second outing never inherits the first one's ground", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 20; i++) emit(walking(i));
    expect(store.getState().track.distanceM).toBeGreaterThan(0);

    mockRequestPermission.mockResolvedValue({ granted: false, status: "denied" });
    expect(await store.getState().begin("s2", NOTIFICATION, false, "metric")).toBe(false);

    expect(store.getState().track.distanceM).toBe(0);
    expect(store.getState().track.startedAt).toBeNull();
    expect(store.getState().lastFix).toBeNull();
  });

  test("and neither does one refused for having no native half", async () => {
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 20; i++) emit(walking(i));

    mockAvailable = false;
    expect(await store.getState().begin("s2", NOTIFICATION, false, "metric")).toBe(false);

    expect(store.getState().track.distanceM).toBe(0);
  });

  /**
   * `start()` returning false is the service saying no - on API 31+ that is
   * ForegroundServiceStartNotAllowedException, and the panel used to sit on "Finding the sky"
   * for the length of a walk nothing was measuring.
   */
  test("a service that refuses to start leaves a reason on screen", async () => {
    mockStart.mockReturnValueOnce(false);

    expect(await store.getState().begin("s1", NOTIFICATION, false, "metric")).toBe(false);
    expect(store.getState().error).toBe("foreground-denied");
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
    mockElapsedSeconds = 1924;
    await store.getState().begin("s1", NOTIFICATION, false, "metric");
    for (let i = 0; i < 30; i += 1) emit(walking(i));

    expect(mockSetProgress).toHaveBeenCalledTimes(1);
    // Twenty-nine steps of 1.4 m, minus the gate the reducer holds open for the first three.
    // Time first, because it is the only half that exists on every walk.
    expect(mockSetProgress.mock.calls[0]?.[0]).toMatch(/^32:04 · \d+ m$/);
  });

  /**
   * The line the whole feature is read through, on the walk that needs it most.
   *
   * A sortie whose sky never opens produces no fix, so nothing used to push the notification and
   * it repeated "Finding the sky" for an hour - the one surface readable without unlocking,
   * saying nothing about a walk that was happening. The clock is now what drives it, so the time
   * shows up with or without a fix, and it comes from the session store's rule rather than a
   * second one kept here.
   */
  test("the line carries the time before anything else, fix or no fix", async () => {
    jest.useFakeTimers();
    try {
      mockElapsedSeconds = 65;
      await store.getState().begin("s1", NOTIFICATION, false, "metric");

      jest.advanceTimersByTime(30_000);
      expect(mockSetProgress).toHaveBeenLastCalledWith(`1:05 · ${NOTIFICATION.acquiring}`);

      for (let i = 0; i < 5; i += 1) emit(walking(i));
      mockElapsedSeconds = 95;
      jest.advanceTimersByTime(30_000);
      expect(mockSetProgress).toHaveBeenLastCalledWith(expect.stringMatching(/^1:35 · \d+ m$/));

      await store.getState().end();
      mockSetProgress.mockClear();
      jest.advanceTimersByTime(60_000);
      expect(mockSetProgress).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * Both mean "the trace is broken and the hero may still be walking". The reducer decides what
   * that costs; here they are worth a breadcrumb, because a GPS that drops out on a de-Googled
   * ROM is exactly the field report nobody can reproduce at a desk.
   */
  describe("a trace that goes quiet", () => {
    test("leaves a breadcrumb when the provider is switched off", async () => {
      await store.getState().begin("s1", NOTIFICATION, false, "metric");

      (mockListeners.get("onProviderEnabled") as (e: { enabled: boolean }) => void)({
        enabled: false,
      });
      expect(mockReportError).toHaveBeenCalledWith("expedition.providerOff", expect.any(Error));
      // And says so where the hero is looking, not only in the log: the figures freeze either
      // way, and the notification two swipes away already said the GPS was off.
      expect(store.getState().error).toBe("gps-off");

      // Coming back is not news.
      mockReportError.mockClear();
      (mockListeners.get("onProviderEnabled") as (e: { enabled: boolean }) => void)({
        enabled: true,
      });
      expect(mockReportError).not.toHaveBeenCalled();
      expect(store.getState().error).toBeNull();
    });

    test("leaves one when no fix has arrived for a while", async () => {
      await store.getState().begin("s1", NOTIFICATION, false, "metric");

      (mockListeners.get("onNoFixTimeout") as (e: { sinceLastFixMs: number }) => void)({
        sinceLastFixMs: 30_000,
      });
      expect(mockReportError).toHaveBeenCalledWith("expedition.noFix", expect.any(Error));
      expect(store.getState().error).toBe("no-fix");

      // A fix landing ends it: silence is the only thing either of these two errors is about.
      emit(walking(0));
      expect(store.getState().error).toBeNull();
    });

    // The pill must not un-say a refusal the hero has to fix in Android's settings.
    test("a fix arriving does not clear a refused permission", async () => {
      await store.getState().begin("s1", NOTIFICATION, false, "metric");
      (mockListeners.get("onError") as (e: { code: string; message: string }) => void)({
        code: "permission",
        message: "denied",
      });

      emit(walking(0));
      expect(store.getState().error).toBe("permission");
    });
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
