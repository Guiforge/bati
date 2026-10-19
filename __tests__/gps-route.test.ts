import {
  ROUTE,
  type RoutePoint,
  type RouteShape,
  routeGhostAllowed,
  routeGhostOf,
  startsTogether,
  strided,
  toGhostLine,
} from "@/src/gps/route";

/**
 * Route recognition on simulated traces. Geometry is written in metres east/north of a door and
 * converted once, so every expectation below can be checked on paper against the 50 m cells.
 */

const LAT0 = 48.85;
const LON0 = 2.35;
const M_LAT = 111_320;
const M_LON = M_LAT * Math.cos((LAT0 * Math.PI) / 180);
const at = (x: number, y: number): RoutePoint => ({ lat: LAT0 + y / M_LAT, lon: LON0 + x / M_LON });

/** A polyline in metres, sampled every `stepM`, with optional seeded noise (an LCG, never Math.random). */
function walk(corners: [number, number][], stepM: number, noiseM = 0, seed = 7): RoutePoint[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return (s / 4294967296) * 2 - 1;
  };
  const out: RoutePoint[] = [];
  corners.forEach((c, i) => {
    const prev = corners[i - 1];
    if (!prev) return;
    const n = Math.max(1, Math.round(Math.hypot(c[0] - prev[0], c[1] - prev[1]) / stepM));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      out.push(
        at(
          prev[0] + ((c[0] - prev[0]) * k) / n + rnd() * noiseM,
          prev[1] + ((c[1] - prev[1]) * k) / n + rnd() * noiseM,
        ),
      );
    }
  });
  return out;
}

const shape = (id: string, points: RoutePoint[], day = 1): RouteShape => ({
  id,
  points,
  performedAt: new Date(Date.UTC(2026, 0, day)),
});

// Route A: a 1200 x 1000 rectangle, 4 400 m, started at the door.
const A: [number, number][] = [
  [0, 0],
  [1200, 0],
  [1200, -1000],
  [0, -1000],
  [0, 0],
];
// Route B: A's first 1 200 m, then north (perpendicular to A's next leg, which goes south).
const B: [number, number][] = [
  [0, 0],
  [1200, 0],
  [1200, 1800],
];

describe("matching a route", () => {
  test("the same loop twice with 15 m of noise matches, and run the other way round too", () => {
    const past = shape("a", walk(A, 40, 15, 1));
    expect(routeGhostOf(walk(A, 10, 15, 2), [past], "done")?.id).toBe("a");
    expect(routeGhostOf(walk([...A].reverse(), 10, 15, 3), [past], "done")?.id).toBe("a");
  });

  test("loop B shares 1 200 m with A: it matches live there, never once done", () => {
    const past = shape("a", walk(A, 40));
    expect(routeGhostOf(walk(B.slice(0, 2), 10), [past], "live")?.id).toBe("a");
    // 600 m past the fork: (1 200 shared + about 80 m still in the corridor) / 1 800 m = 71 %,
    // under the 85 % that ROUTE.share asks. Never retune ROUTE.share to make this pass.
    const forked: [number, number][] = [
      [0, 0],
      [1200, 0],
      [1200, 600],
    ];
    expect(routeGhostOf(walk(forked, 10), [past], "live")).toBeNull();
    expect(routeGhostOf(walk(B, 10), [past], "done")).toBeNull();
  });

  test("the first half of A is not A once done: the shape does not follow today", () => {
    const past = shape("a", walk(A, 40));
    const half = walk(A.slice(0, 3), 10);
    expect(routeGhostOf(half, [past], "live")?.id).toBe("a");
    expect(routeGhostOf(half, [past], "done")).toBeNull();
  });

  test("vertices 200 m apart leave no hole: densified", () => {
    const past = shape("a", walk(A, 200));
    expect(routeGhostOf(walk(A, 10), [past], "live")?.id).toBe("a");
  });

  test("a street 30 m off always matches, one 150 m off never does", () => {
    const past = shape("a", walk(A, 40));
    for (const dx of [0, 13, 29, 41]) {
      const shifted = walk(A, 10).map((p) =>
        at((p.lon - LON0) * M_LON + dx, (p.lat - LAT0) * M_LAT + 30),
      );
      expect(routeGhostOf(shifted, [past], "done")?.id).toBe("a");
    }
    const far = walk(A, 10).map((p) => at((p.lon - LON0) * M_LON, (p.lat - LAT0) * M_LAT + 150));
    expect(routeGhostOf(far, [past], "live")).toBeNull();
  });

  test("the newest of two matching candidates wins; too few points never match", () => {
    const newest = shape("new", walk(A, 40), 9);
    const older = shape("old", walk(A, 40), 2);
    expect(routeGhostOf(walk(A, 10), [newest, older], "done")?.id).toBe("new");
    expect(routeGhostOf(walk(A, 10).slice(0, 9), [newest], "live")).toBeNull();
    expect(routeGhostOf(walk(A, 10), [shape("tiny", walk(A, 40).slice(0, 5))], "live")).toBeNull();
  });

  test("starts: 150 m together, 500 m apart", () => {
    expect(startsTogether(at(0, 0), at(150, 0))).toBe(true);
    expect(startsTogether(at(0, 0), at(500, 0))).toBe(false);
  });

  test("strided keeps every fifth, from the first", () => {
    expect(strided([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([0, 5, 10]);
  });

  test("the ghost line carries [lon, lat] and the shape's id", () => {
    expect(toGhostLine(null)).toBeNull();
    const line = toGhostLine(shape("a", [at(0, 0), at(10, 0)]));
    expect(line?.id).toBe("a");
    expect(line?.line.geometry.coordinates[0]).toEqual([LON0, LAT0]);
  });
});

test("the coach rule: never on a walk-run, never when switched off", () => {
  expect(routeGhostAllowed({ routeGhost: true, walkRun: true })).toBe(false);
  expect(routeGhostAllowed({ routeGhost: false, walkRun: false })).toBe(false);
  expect(routeGhostAllowed({ routeGhost: true, walkRun: false })).toBe(true);
});

describe("memo and cost", () => {
  /** An array whose numeric reads are counted. `length` is free. */
  function counted<T>(items: T[]): { items: T[]; reads: () => number; reset: () => void } {
    let n = 0;
    const proxy = new Proxy(items, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && /^\d+$/.test(prop)) n++;
        return Reflect.get(target, prop, receiver);
      },
    });
    return {
      items: proxy,
      reads: () => n,
      reset: () => {
        n = 0;
      },
    };
  }

  // Four hours of 1 Hz fixes thinned by 5: 2 880 points, 20 of them, none near today.
  const ride = walk(
    [
      [5000, 5000],
      [20000, 5000],
    ],
    5,
  ).slice(0, 2880);
  const wrapped = Array.from({ length: 20 }, () => counted(ride.slice()));
  const candidates = wrapped.map((w, i) => shape(`c${i}`, w.items, i + 1));
  const total = () => wrapped.reduce((n, w) => n + w.reads(), 0);

  test("grids are built once per shape, whatever the list or the length of today", () => {
    const today = walk(A, 10);
    expect(routeGhostOf(today, candidates, "live")).toBeNull();
    expect(wrapped.every((w) => w.reads() >= ride.length)).toBe(true);

    for (const w of wrapped) w.reset();
    for (let k = 0; k < 100; k++) routeGhostOf(today.slice(0, 20 + k), candidates, "live");
    expect(total()).toBe(0);

    routeGhostOf(
      today,
      candidates.map((c) => ({ ...c })),
      "live",
    );
    expect(total()).toBe(0);
  });

  test("today is sampled: at most ROUTE.sample reads per candidate tested", () => {
    const big = counted(
      walk(
        [
          [0, 0],
          [30000, 0],
        ],
        3,
      ),
    );
    expect(big.items.length).toBeGreaterThan(9000);
    routeGhostOf(big.items, candidates, "live");
    expect(big.reads()).toBeLessThanOrEqual(ROUTE.sample * candidates.length);
  });

  test("the 101 calls together stay well under 2 s (a sanity bound, not the proof)", () => {
    const today = walk(A, 10);
    const t0 = Date.now();
    for (let k = 0; k < 101; k++) routeGhostOf(today, candidates, "live");
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
