import { traceToPath } from "@/components/journal/tracePreview";
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
    expect(traceToPath([[2.35, 48.85]], 50)).toBeNull();
    // Every fix inside the receiver's noise, all on one spot: a real row with no shape.
    expect(
      traceToPath(
        [
          [2.35, 48.85],
          [2.35, 48.85],
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

    for (const [x, y] of coords(traceToPath(points, 50) ?? "")) {
      expect(x).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThanOrEqual(46);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y).toBeLessThanOrEqual(46);
    }
  });

  test("north is up, because SVG's y is not latitude's", () => {
    const d = traceToPath(
      [
        [2.35, 48.85],
        [2.35001, 48.86],
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

    const drawn = coords(traceToPath(square, 100) ?? "");
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
          [2, lat],
          [2 + dLon, lat + 0.002],
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
