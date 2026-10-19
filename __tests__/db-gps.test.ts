import type { LocationFix } from "@/modules/bati-location";
import { ROUTE } from "@/src/gps/route";
import { clientMock, createTestDb } from "./helpers/testDb";

const fix = (over: Partial<LocationFix> & { t: number }): LocationFix => ({
  lat: 48.472781,
  lon: -2.494307,
  ele: 114.6,
  baro: null,
  acc: 3.79,
  speed: 1.42,
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

  /**
   * The recap reaches a run by the name its points are filed under and knows nothing else about
   * it, so every figure it prints comes back through here. Both of them are columns: replaying
   * the fixes for the clock was a second answer to a question the reducer already answered, and
   * the two part company whenever a flush fails — a dropped batch is in the distance and not in
   * the replay, and the pace between them is wrong with nothing able to notice.
   */
  describe("the session behind a trace", () => {
    test("carries the ground and the moving time the reducer credited", async () => {
      const { outingSession } = gps();
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, leaguesM, movingSeconds) VALUES ('0192-walk', 'medium', 10, ?, ?, ?)",
        )
        .run(Math.floor(Date.now() / 1000), 4580, 2_700);

      const session = await outingSession("0192-walk");
      expect(session?.leaguesM).toBe(4580);
      expect(session?.movingSeconds).toBe(2_700);
    });

    test("says null for an outing saved before the column existed", async () => {
      const { outingSession } = gps();
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, leaguesM) VALUES ('0191-older', 'medium', 10, ?, ?)",
        )
        .run(Math.floor(Date.now() / 1000), 4580);

      const session = await outingSession("0191-older");
      expect(session?.leaguesM).toBe(4580);
      expect(session?.movingSeconds).toBeNull();
    });
  });

  /**
   * The preview on "Affichage des sorties" is fed by the hero's last outing of the activity, and
   * by nothing invented: a row with no ground or no time would draw zeros as if they were a result.
   */
  describe("the last outing of an activity", () => {
    const insert = (
      uuid: string,
      at: number,
      outing: string | null,
      m: number | null,
      s: number | null,
    ) =>
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, leaguesM, movingSeconds, ascentM, outing) VALUES (?, 'medium', 10, ?, ?, ?, 12, ?)",
        )
        .run(uuid, at, m, s, outing);

    test("is the newest of that activity, not of the others", async () => {
      const { lastOutingOf } = gps();
      insert("w-old", 1_000, "walk", 3000, 1800);
      insert("w-new", 2_000, "walk", 5000, 3000);
      insert("r-newest", 3_000, "run", 8000, 2400);

      expect((await lastOutingOf("walk"))?.leaguesM).toBe(5000);
      expect((await lastOutingOf("run"))?.leaguesM).toBe(8000);
    });

    test("skips an outing that measured no ground or no time, and a workout", async () => {
      const { lastOutingOf } = gps();
      insert("good", 1_000, "ride", 20_000, 3600);
      insert("no-ground", 2_000, "ride", null, 600);
      insert("no-time", 3_000, "ride", 900, null);
      insert("workout", 4_000, null, null, null);

      expect((await lastOutingOf("ride"))?.leaguesM).toBe(20_000);
    });

    test("says null for an activity never done", async () => {
      const { lastOutingOf } = gps();
      expect(await lastOutingOf("run")).toBeNull();
    });
  });

  // The reason the codec exists at all: four consumers, and one of them dividing by 1e6.
  test("a fix survives the round trip through scaled integers", () => {
    const { encode, decode } = gps();
    const original = fix({ t: 1_760_000_000_000 });
    const back = decode(encode("s1", original));

    expect(back.lat).toBeCloseTo(original.lat, 6);
    expect(back.lon).toBeCloseTo(original.lon, 6);
    expect(back.ele).toBeCloseTo(114.6, 1);
    expect(back.baro).toBeNull();
    expect(decode(encode("s1", fix({ t: 1, baro: 52.37 }))).baro).toBeCloseTo(52.37, 2);
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

    test("whether any trace exists at all, for the one line that depends on it", async () => {
      const g = gps();
      expect(await g.hasGpsHistory()).toBe(false);

      await g.appendPoints("walk", [fix({ t: 1000 })]);
      expect(await g.hasGpsHistory()).toBe(true);

      await g.deletePoints("walk");
      expect(await g.hasGpsHistory()).toBe(false);
    });

    test("and can be thrown away, which is the only thing it ever wrote", async () => {
      const g = gps();
      await g.appendPoints("orphan", [fix({ t: 1000 }), fix({ t: 2000 })]);
      await g.deletePoints("orphan");
      expect(await g.pointsOf("orphan")).toEqual([]);
      expect(await g.orphanedSessionIds()).toEqual([]);
    });
  });

  /**
   * The route ghost's history read: pure outings of one activity that started at today's door,
   * newest first, thinned in SQLite. `performedAt` is raw seconds in these INSERTs (drizzle's
   * `timestamp` mode), so `before` is built from milliseconds.
   */
  describe("route candidates", () => {
    const LAT = 48.85;
    const LON = 2.35;
    const door = { lat: LAT, lon: LON };
    const M = 1 / 111_320; // one metre of latitude, in degrees
    const insertSession = (
      uuid: string,
      at: number,
      outing: string | null,
      leaguesM: number | null,
    ) =>
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, leaguesM, outing) VALUES (?, 'medium', 10, ?, ?, ?)",
        )
        .run(uuid, at, leaguesM, outing);
    const insertPoints = (uuid: string, n: number, startOffsetM = 0) => {
      const stmt = t.sqlite.prepare(
        "INSERT INTO gps_points (sessionId, t, latE7, lonE7, accDm, distFromPrevCm) VALUES (?, ?, ?, ?, 30, 0)",
      );
      for (let k = 0; k < n; k++) {
        stmt.run(
          uuid,
          k + 1,
          Math.round((LAT + (startOffsetM + k * 5) * M) * 1e7),
          Math.round(LON * 1e7),
        );
      }
    };
    const before = new Date(1_000_000 * 1000);

    test("only that activity, pure, credited, before, and never the session itself", async () => {
      const { routeCandidates } = gps();
      insertSession("ok", 2_000, "run", 5000);
      insertSession("walk", 2_100, "walk", 5000);
      insertSession("mixed", 2_200, null, 5000);
      insertSession("nothing", 2_300, "run", 0);
      insertSession("null-m", 2_400, "run", null);
      insertSession("later", 2_000_000, "run", 5000);
      insertSession("me", 2_500, "run", 5000);
      for (const u of ["ok", "walk", "mixed", "nothing", "null-m", "later", "me"])
        insertPoints(u, 20);

      const got = await routeCandidates("run", door, before, "me");
      expect(got.map((c) => c.id)).toEqual(["ok"]);
      expect(got[0]?.performedAt.getTime()).toBe(2_000 * 1000);
    });

    test("a start 150 m away is kept, 300 m away dropped; newest first; points thinned in t order", async () => {
      const { routeCandidates } = gps();
      insertSession("old", 1_000, "run", 5000);
      insertSession("new", 3_000, "run", 5000);
      insertSession("far", 2_000, "run", 5000);
      insertPoints("old", 23, 150);
      insertPoints("new", 23, 0);
      insertPoints("far", 23, 300);

      const got = await routeCandidates("run", door, before, "x");
      expect(got.map((c) => c.id)).toEqual(["new", "old"]);
      expect(got[0]?.points).toHaveLength(Math.ceil(23 / ROUTE.stride));
      const lats = got[0]?.points.map((p) => p.lat) ?? [];
      expect(lats).toEqual([...lats].sort((a, b) => a - b));
      expect(got[0]?.points[1]?.lat).toBeCloseTo(LAT + 25 * M, 6);
    });

    test("an outing with no points is no candidate, and without any the second query is never issued", async () => {
      const { routeCandidates } = gps();
      insertSession("empty", 2_000, "run", 5000);
      const prepare = jest.spyOn(t.sqlite, "prepare");
      expect(await routeCandidates("run", door, before, "x")).toEqual([]);
      expect(prepare.mock.calls.filter(([q]) => /ROW_NUMBER/.test(q))).toHaveLength(0);
      prepare.mockRestore();
    });

    test("at most 20 candidates", async () => {
      const { routeCandidates } = gps();
      for (let i = 0; i < 25; i++) {
        insertSession(`s${i}`, 1_000 + i, "run", 5000);
        insertPoints(`s${i}`, 12);
      }
      const got = await routeCandidates("run", door, before, "x");
      expect(got).toHaveLength(20);
      expect(got[0]?.id).toBe("s24");
    });

    test("a 5-year history: the plan seeks the primary key, 20 ids, two points statements", async () => {
      const { routeCandidates } = gps();
      // One run a day for five years from 4 doors, 120 fixes each, plus 300 workouts.
      t.sqlite.transaction(() => {
        const ses = t.sqlite.prepare(
          "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, leaguesM, outing) VALUES (?, 'medium', 10, ?, ?, ?)",
        );
        const pts = t.sqlite.prepare(
          "INSERT INTO gps_points (sessionId, t, latE7, lonE7, accDm, distFromPrevCm) VALUES (?, ?, ?, ?, 30, 0)",
        );
        for (let d = 0; d < 1825; d++) {
          const door = d % 4; // 0 is today's door; the others are 1 km apart
          ses.run(`run${d}`, 10_000 + (d * 86_400) / 1000, 5000, "run");
          for (let k = 0; k < 120; k++) {
            pts.run(
              `run${d}`,
              k + 1,
              Math.round((LAT + (door * 1000 + k * 5) * M) * 1e7),
              Math.round(LON * 1e7),
            );
          }
        }
        for (let w = 0; w < 300; w++) ses.run(`w${w}`, 10_000 + w, null, null);
      })();

      const prepare = jest.spyOn(t.sqlite, "prepare");
      const started = Date.now();
      const got = await routeCandidates("run", door, new Date(9_000_000 * 1000), "x");
      const elapsed = Date.now() - started;
      const seen = prepare.mock.calls.map(([q]) => q);
      prepare.mockRestore();

      expect(got).toHaveLength(20);
      expect(got.every((c) => Number(c.id.slice(3)) % 4 === 0)).toBe(true);
      const ids = got.map((c) => Number(c.id.slice(3)));
      expect(ids).toEqual([...ids].sort((a, b) => b - a));

      const q1 = seen.find((q) => /from "completed_sessions"/.test(q) && /gps_points/.test(q));
      const q2 = seen.filter((q) => /ROW_NUMBER/.test(q));
      expect(q1).toBeDefined();
      expect(q2).toHaveLength(1);
      expect(seen.filter((q) => /gps_points/.test(q))).toHaveLength(2);
      expect(q2[0]?.match(/IN \(([^)]*)\)/)?.[1]?.split(",")).toHaveLength(20);

      const marks = (q1?.match(/\?/g) ?? []).length;
      const plan = t.sqlite
        .prepare(`EXPLAIN QUERY PLAN ${q1}`)
        .all(...["run", 0, "x", 9_000_000].slice(0, marks)) as { detail: string }[];
      const details = plan.map((r) => r.detail);
      // The two subqueries scan nothing: `g` is gps_points, sought on its primary key.
      expect(
        details.filter((d) => /^SEARCH g USING (COVERING )?(INDEX|PRIMARY KEY)/.test(d)),
      ).toHaveLength(2);
      expect(details.some((d) => /^SCAN/.test(d))).toBe(false);
      // Loose, a sanity bound for a loaded box; the plan above is the proof.
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
