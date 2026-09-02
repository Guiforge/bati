import assert from "node:assert/strict";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The seeder exists so the recap map can be seen without walking outside, which means its trace
 * is the only trace most people will ever look at while working on that screen. A generator whose
 * geometry is wrong produces a picture that looks fine and is not, so the checks below are the
 * ones a picture cannot fail loudly on:
 *
 *  - the coordinates land where they were aimed (the classic bug swaps lat and lon and draws the
 *    run in the Gulf of Guinea, which renders as a perfectly convincing empty sea);
 *  - the loop closes, so it reads as a lap rather than a line;
 *  - the stop is real, so `movingMs` and the elapsed time differ the way a real outing's do;
 *  - clearing takes the points with it. `gps_points` has no foreign key to `completed_sessions`,
 *    so nothing but this function keeps a deleted session's trace from outliving it forever.
 */
describe("db/devSeedExpedition", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());

  function seeder() {
    return require("../db/devSeedExpedition") as typeof import("../db/devSeedExpedition");
  }
  function gps() {
    return require("../db/gps") as typeof import("../db/gps");
  }

  test("seeds one outing with a trace, and reports what it wrote", async () => {
    const seeded = await seeder().seedExpedition();

    expect(seeded.points).toBeGreaterThan(1000);
    // A ~7 km loop at a running pace. Wide bounds on purpose: this asserts the order of
    // magnitude, which is what a coordinate mistake destroys, not the exact geometry.
    expect(seeded.leaguesM).toBeGreaterThan(5000);
    expect(seeded.leaguesM).toBeLessThan(9000);

    const rows = t.sqlite
      .prepare(
        "SELECT uuid, leaguesM, movingSeconds, durationSeconds, xpEarned FROM completed_sessions",
      )
      .all() as Array<{
      uuid: string;
      leaguesM: number;
      movingSeconds: number | null;
      durationSeconds: number;
      xpEarned: number;
    }>;

    expect(rows).toHaveLength(1);
    const row = rows[0];
    assert(row);
    expect(row.uuid).toBe(seeded.uuid);
    expect(row.leaguesM).toBe(seeded.leaguesM);
    // Both halves of the ground reach the row, not just the distance. The recap reads
    // `movingSeconds` and says nothing at all when it is null, so a seeder that writes one and
    // not the other produces a demo screen with one figure where the app shows three. That is
    // exactly what shipped into a store screenshot the day the column was added.
    expect(row.movingSeconds).toBe(seeded.movingSeconds);
    expect(row.xpEarned).toBeGreaterThan(0);

    // The stop, which is the whole reason the demo has one: moving time is short of the clock.
    expect(seeded.movingSeconds).toBeLessThan(row.durationSeconds);
    expect(row.durationSeconds - seeded.movingSeconds).toBeGreaterThan(30);
  });

  test("the trace lands where it was aimed, and comes back to where it started", async () => {
    const { uuid } = await seeder().seedExpedition();
    const fixes = await gps().pointsOf(uuid);

    expect(fixes.length).toBeGreaterThan(1000);
    for (const fix of fixes) {
      // Inside the Bois de Vincennes, generously. Swapping lat and lon fails this on the first fix.
      expect(fix.lat).toBeGreaterThan(48.8);
      expect(fix.lat).toBeLessThan(48.87);
      expect(fix.lon).toBeGreaterThan(2.39);
      expect(fix.lon).toBeLessThan(2.47);
      expect(fix.acc).toBeLessThan(10); // or the reducer's start gate never opens
    }

    const first = fixes[0];
    const last = fixes[fixes.length - 1];
    assert(first);
    assert(last);
    // A closed loop: the finish is within a stone's throw of the start, noise included.
    const metres = Math.hypot(
      (last.lat - first.lat) * 111_320,
      (last.lon - first.lon) * 111_320 * Math.cos(first.lat * (Math.PI / 180)),
    );
    expect(metres).toBeLessThan(30);
  });

  test("clearing takes the points with it, which no foreign key would", async () => {
    const { uuid } = await seeder().seedExpedition();
    expect(await gps().hasPoints(uuid)).toBe(true);

    await seeder().clearSeededExpeditions();

    expect(await gps().hasPoints(uuid)).toBe(false);
    expect(t.sqlite.prepare("SELECT COUNT(*) AS c FROM gps_points").get() as { c: number }).toEqual(
      { c: 0 },
    );
    expect(
      t.sqlite.prepare("SELECT COUNT(*) AS c FROM completed_sessions").get() as { c: number },
    ).toEqual({ c: 0 });
  });

  test("seeding twice leaves one outing, not two", async () => {
    await seeder().seedExpedition();
    await seeder().seedExpedition();

    expect(
      t.sqlite.prepare("SELECT COUNT(*) AS c FROM completed_sessions").get() as { c: number },
    ).toEqual({ c: 1 });
  });
});
