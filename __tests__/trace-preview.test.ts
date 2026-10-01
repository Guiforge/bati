import assert from "node:assert/strict";
import {
  HIDDEN_ENDS_M,
  traceBounds,
  traceToPath,
  trimEnds,
} from "@/components/journal/tracePreview";
import type { LngLat } from "@/src/gps/trace";
import { clientMock, createTestDb } from "./helpers/testDb";

/** Every "x y" pair of a path, as numbers. */
function coords(d: string): [number, number][] {
  return d
    .split(/[ML]/)
    .filter((part) => part.trim() !== "")
    .map((part) => {
      const [x, y] = part.trim().split(" ").map(Number);
      return [x ?? 0, y ?? 0];
    });
}

/**
 * The journal's trace thumbnails. Pure maths, and the only part of the feature a screenshot
 * cannot check: a line drawn a third too wide still looks like a line.
 */
describe("traceToPath", () => {
  test("a run with nothing to draw draws nothing", () => {
    expect(traceToPath([], 50)).toBeNull();
    expect(traceToPath([[[2.35, 48.85]]], 50)).toBeNull();
    // Every fix inside the receiver's noise, all on one spot: a real row with no shape.
    expect(
      traceToPath(
        [
          [
            [2.35, 48.85],
            [2.35, 48.85],
          ],
        ],
        50,
      ),
    ).toBeNull();
  });

  test("the line stays inside its box", () => {
    const points: LngLat[] = [
      [2.35, 48.85],
      [2.36, 48.86],
      [2.34, 48.855],
      [2.355, 48.845],
    ];

    for (const [x, y] of coords(traceToPath([points], 50) ?? "")) {
      expect(x).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThanOrEqual(46);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y).toBeLessThanOrEqual(46);
    }
  });

  /**
   * The gap is the point. `src/gps/trace.ts` breaks its line wherever `breaksRun` says the run
   * broke, and a thumbnail that drew one unbroken chain across the same hole told the hero they
   * went through the tunnel. One `M` per stretch, and the bounds still span all of them so the
   * two halves of a run stay in scale with each other.
   */
  test("lifts the pen between two stretches instead of drawing through the hole", () => {
    const d =
      traceToPath(
        [
          [
            [2.35, 48.85],
            [2.351, 48.851],
          ],
          [
            [2.36, 48.86],
            [2.361, 48.861],
          ],
        ],
        100,
      ) ?? "";

    // Two moves, two lines: the second stretch starts a new subpath rather than continuing.
    expect(d.match(/M/g)?.length).toBe(2);
    expect(d.match(/L/g)?.length).toBe(2);
  });

  test("north is up, because SVG's y is not latitude's", () => {
    const d = traceToPath(
      [
        [
          [2.35, 48.85],
          [2.35001, 48.86],
        ],
      ],
      50,
    );
    const [south, north] = coords(d ?? "");

    expect(north?.[1]).toBeLessThan(south?.[1] ?? 0);
  });

  /**
   * A degree of longitude is a degree of latitude times `cos(lat)`, which at 48° north is two
   * thirds. Without the correction a square kilometre is drawn half again as wide as it is tall,
   * and every out-and-back up a hill reads as a diagonal.
   */
  test("a square of ground is drawn square, not stretched by longitude", () => {
    // 0.01° of latitude is ~1113 m. The same ground east-west at 48° needs 0.01 / cos(48°).
    const lat = 48;
    const dLon = 0.01 / Math.cos((lat * Math.PI) / 180);
    const square: LngLat[] = [
      [2, lat],
      [2 + dLon, lat],
      [2 + dLon, lat + 0.01],
      [2, lat + 0.01],
      [2, lat],
    ];

    const drawn = coords(traceToPath([square], 100) ?? "");
    const width = Math.max(...drawn.map(([x]) => x)) - Math.min(...drawn.map(([x]) => x));
    const height = Math.max(...drawn.map(([, y]) => y)) - Math.min(...drawn.map(([, y]) => y));

    expect(width / height).toBeCloseTo(1, 1);
  });

  test("a long thin run keeps its proportions rather than filling the square", () => {
    // Ten times as far east as north: the drawing has to be ten times as wide as it is tall.
    const lat = 48;
    const dLon = 0.02 / Math.cos((lat * Math.PI) / 180);
    const drawn = coords(
      traceToPath(
        [
          [
            [2, lat],
            [2 + dLon, lat + 0.002],
          ],
        ],
        100,
      ) ?? "",
    );

    const width = Math.max(...drawn.map(([x]) => x)) - Math.min(...drawn.map(([x]) => x));
    const height = Math.max(...drawn.map(([, y]) => y)) - Math.min(...drawn.map(([, y]) => y));

    expect(width / height).toBeCloseTo(10, 0);
    // And it is centred in what it does not use, rather than pinned to a corner.
    const midY = (Math.max(...drawn.map(([, y]) => y)) + Math.min(...drawn.map(([, y]) => y))) / 2;
    expect(midY).toBeCloseTo(50, 0);
  });
});

/**
 * The read behind them. One query for a whole page of the journal, thinned in SQLite: a
 * six-hour walk is 21 600 fixes, and a list that scrolls cannot carry them into JS to throw
 * 99 % away.
 */
describe("previewPathsFor", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());
  beforeEach(() => t.sqlite.exec("DELETE FROM gps_points"));

  function walk(sessionId: string, fixes: number): void {
    const insert = t.sqlite.prepare(
      "INSERT INTO gps_points (sessionId, t, latE7, lonE7, accDm, distFromPrevCm) VALUES (?, ?, ?, ?, 50, 140)",
    );
    for (let i = 0; i < fixes; i++) {
      insert.run(sessionId, 1_700_000_000 + i, 488_500_000 + i * 100, 23_500_000 + i * 100);
    }
  }

  test("thins a long run to about a thumbnail's worth, and leaves a short one alone", async () => {
    const { previewPathsFor } = require("../db/gps") as typeof import("../db/gps");
    walk("long", 21_600);
    walk("short", 30);

    const paths = await previewPathsFor(["long", "short"]);

    expect(paths.get("long")?.length).toBeLessThanOrEqual(60);
    expect(paths.get("long")?.length).toBeGreaterThan(20);
    expect(paths.get("short")?.length).toBe(30);
  });

  test("keeps each run's points in order, and apart from the others", async () => {
    const { previewPathsFor } = require("../db/gps") as typeof import("../db/gps");
    walk("a", 10);
    walk("b", 10);

    const paths = await previewPathsFor(["a", "b"]);
    const a = paths.get("a") ?? [];

    expect(paths.size).toBe(2);
    expect(a).toHaveLength(10);
    // Written east and north, so both coordinates rise. Out of order, the shape is a scribble.
    expect(a.map(([lon]) => lon)).toEqual([...a.map(([lon]) => lon)].sort((x, y) => x - y));
  });

  test("a session with no points is absent rather than empty, and asking for none reads nothing", async () => {
    const { previewPathsFor } = require("../db/gps") as typeof import("../db/gps");

    expect((await previewPathsFor(["never-walked"])).size).toBe(0);
    expect((await previewPathsFor([])).size).toBe(0);
  });
});

/**
 * The map under a journal row is a picture of `traceBounds`, stretched over the same square the
 * line is drawn in. If the two disagree, the line runs beside its road: nothing crashes and no
 * test that only checks a picture exists would notice.
 */
describe("traceBounds", () => {
  const run: LngLat[] = [
    [2.35, 48.85],
    [2.352, 48.853],
    [2.3535, 48.8545],
    [2.351, 48.857],
  ];

  test("puts every point of the line where the map has that ground", () => {
    const size = 64;
    const bounds = traceBounds([run], size);
    const d = traceToPath([run], size);
    assert(bounds && d);
    const [west, south, east, north] = bounds;

    // Where a map stretched over these bounds draws each point, against where the line does.
    const onMap = run.map(([lon, lat]) => [
      ((lon - west) / (east - west)) * size,
      ((north - lat) / (north - south)) * size,
    ]);
    coords(d).forEach(([x, y], i) => {
      expect(x).toBeCloseTo(onMap[i]?.[0] ?? Number.NaN, 0);
      expect(y).toBeCloseTo(onMap[i]?.[1] ?? Number.NaN, 0);
    });
  });

  test("is square on the ground, so the map is not stretched to fit", () => {
    const bounds = traceBounds([run], 64);
    assert(bounds);
    const [west, south, east, north] = bounds;
    const kx = Math.cos((((48.85 + 48.857) / 2) * Math.PI) / 180);
    expect((east - west) * kx).toBeCloseTo(north - south, 9);
  });

  test("frames nothing when the line has nothing to draw", () => {
    expect(traceBounds([], 64)).toBeNull();
    expect(
      traceBounds(
        [
          [
            [2.35, 48.85],
            [2.35, 48.85],
          ],
        ],
        64,
      ),
    ).toBeNull();
  });
});

/**
 * A shared picture with a map under it must not show where the hero's door is. Only measured
 * along the line can say that: a loop starts and ends on the same doorstep.
 */
describe("trimEnds", () => {
  /** Due north from a doorstep, one point every 60 m, `n` points. */
  const north = (n: number): LngLat[] =>
    Array.from({ length: n }, (_, i) => [2.35, 48.85 + (i * 60) / 111_195] as LngLat);

  test("drops the first and last stretch, and keeps the middle", () => {
    const run = north(21); // 1.2 km
    const [kept] = trimEnds([run], HIDDEN_ENDS_M);
    assert(kept);
    expect(kept[0]).toEqual(run[4]); // 200 m in
    expect(kept[kept.length - 1]).toEqual(run[16]); // 200 m before the end
  });

  test("a run shorter than both margins shows no line at all, not a dot on a house", () => {
    expect(trimEnds([north(8)], HIDDEN_ENDS_M)).toEqual([]);
  });

  test("a gap stays a gap", () => {
    const run = north(41);
    const kept = trimEnds([run.slice(0, 20), run.slice(20)], HIDDEN_ENDS_M);
    expect(kept).toHaveLength(2);
  });
});
