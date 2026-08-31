import type { LocationFix } from "@/modules/bati-location";
import { clientMock, createTestDb } from "./helpers/testDb";

const fix = (over: Partial<LocationFix> & { t: number }): LocationFix => ({
  lat: 48.472781,
  lon: -2.494307,
  ele: 114.6,
  acc: 3.79,
  speed: 1.42,
  bearing: 90,
  distFromPrev: 0,
  ...over,
});

describe("db/gps", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM gps_points");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  function gps() {
    return require("../db/gps") as typeof import("../db/gps");
  }

  // The reason the codec exists at all: four consumers, and one of them dividing by 1e6.
  test("a fix survives the round trip through scaled integers", () => {
    const { encode, decode } = gps();
    const original = fix({ t: 1_760_000_000_000 });
    const back = decode(encode("s1", original));

    expect(back.lat).toBeCloseTo(original.lat, 6);
    expect(back.lon).toBeCloseTo(original.lon, 6);
    expect(back.ele).toBeCloseTo(114.6, 1);
    expect(back.acc).toBeCloseTo(3.8, 1);
    expect(back.speed).toBeCloseTo(1.42, 2);
  });

  test("a fix with no altitude and no speed keeps its nulls rather than inventing zeroes", () => {
    const { encode, decode } = gps();
    const back = decode(encode("s1", fix({ t: 1, ele: null, speed: null })));
    expect(back.ele).toBeNull();
    expect(back.speed).toBeNull();
  });

  test("points come back in time order, whatever order they went in", async () => {
    const g = gps();
    await g.appendPoints("s1", [fix({ t: 3000 }), fix({ t: 1000 }), fix({ t: 2000 })]);
    expect((await g.pointsOf("s1")).map((p) => p.t)).toEqual([1000, 2000, 3000]);
  });

  // The system clock steps backwards when a phone syncs time. One duplicate must cost one point,
  // never the batch: a trace that stops mid-run for an unreported reason is the worse failure.
  test("a duplicate timestamp costs one point, not the whole batch", async () => {
    const g = gps();
    await g.appendPoints("s1", [fix({ t: 1000 }), fix({ t: 2000 })]);
    await g.appendPoints("s1", [fix({ t: 2000 }), fix({ t: 3000 }), fix({ t: 4000 })]);
    expect((await g.pointsOf("s1")).map((p) => p.t)).toEqual([1000, 2000, 3000, 4000]);
  });

  test("two sessions do not read each other's ground", async () => {
    const g = gps();
    await g.appendPoints("s1", [fix({ t: 1000 })]);
    await g.appendPoints("s2", [fix({ t: 1000 }), fix({ t: 2000 })]);
    expect(await g.pointsOf("s1")).toHaveLength(1);
    expect(await g.pointsOf("s2")).toHaveLength(2);
  });

  /**
   * The road is paid what the reducer credited, not what the receiver reported. Those are two
   * different numbers, and the difference is the bug: a phone flat on a table logs 6 m every 30 s
   * (`__tests__/gps-track.test.ts`), so a raw `SUM(distFromPrevCm)` invents half a kilometre over
   * a coffee stop and grows the village by ground the recap correctly refuses to draw.
   */
  describe("leagues", () => {
    const outing = (uuid: string, leaguesM: number | null) =>
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, uuid, leaguesM) VALUES ('medium', 10, ?, ?, ?)",
        )
        .run(Date.now(), uuid, leaguesM);

    test("are metres, summed over every session that credited some", async () => {
      outing("s1", 3);
      outing("s2", 7);
      expect(await gps().totalLeaguesM()).toBe(10);
    });

    test("ignore the sessions that covered no ground", async () => {
      outing("gym", null);
      outing("walk", 2400);
      expect(await gps().totalLeaguesM()).toBe(2400);
    });

    test("do not count a fix the reducer threw away", async () => {
      const g = gps();
      // Two hundred metres of drift on the wire, twelve credited by the reducer.
      await g.appendPoints("s1", [
        fix({ t: 1000, distFromPrev: 0 }),
        fix({ t: 2000, distFromPrev: 200 }),
      ]);
      outing("s1", 12);
      expect(await g.totalLeaguesM()).toBe(12);
    });

    test("are zero before the first outing", async () => {
      expect(await gps().totalLeaguesM()).toBe(0);
    });
  });

  describe("a run the app died in the middle of", () => {
    test("is found by having points and no session", async () => {
      const g = gps();
      await g.appendPoints("orphan", [fix({ t: 1000 })]);
      expect(await g.orphanedSessionIds()).toEqual(["orphan"]);
    });

    test("stops being an orphan once its session lands", async () => {
      const g = gps();
      await g.appendPoints("kept", [fix({ t: 1000 })]);
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, uuid) VALUES ('medium', 10, ?, ?)",
        )
        .run(Date.now(), "kept");
      expect(await g.orphanedSessionIds()).toEqual([]);
    });

    /**
     * This function deletes data, so the test that matters is the one about what it spares.
     * Sweeping without the session the recovery banner is offering would throw away the trace of
     * the run the hero is one tap from resuming.
     */
    describe("the sweep", () => {
      test("keeps the run that is about to be resumed, and takes the rest", async () => {
        const g = gps();
        await g.appendPoints("resuming", [fix({ t: 1000 })]);
        await g.appendPoints("abandoned", [fix({ t: 1000 })]);

        expect(await g.sweepOrphanedPoints("resuming")).toBe(1);
        expect(await g.pointsOf("resuming")).toHaveLength(1);
        expect(await g.pointsOf("abandoned")).toEqual([]);
      });

      test("never touches a session that reached the journal", async () => {
        const g = gps();
        await g.appendPoints("kept", [fix({ t: 1000 })]);
        t.sqlite
          .prepare(
            "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, uuid) VALUES ('medium', 10, ?, ?)",
          )
          .run(Date.now(), "kept");

        expect(await g.sweepOrphanedPoints(null)).toBe(0);
        expect(await g.pointsOf("kept")).toHaveLength(1);
      });

      test("with nothing to resume, every orphan goes", async () => {
        const g = gps();
        await g.appendPoints("a", [fix({ t: 1000 })]);
        await g.appendPoints("b", [fix({ t: 2000 })]);

        expect(await g.sweepOrphanedPoints(null)).toBe(2);
        expect(await g.orphanedSessionIds()).toEqual([]);
      });
    });

    test("and can be thrown away, which is the only thing it ever wrote", async () => {
      const g = gps();
      await g.appendPoints("orphan", [fix({ t: 1000 }), fix({ t: 2000 })]);
      await g.deletePoints("orphan");
      expect(await g.pointsOf("orphan")).toEqual([]);
      expect(await g.orphanedSessionIds()).toEqual([]);
    });
  });
});
