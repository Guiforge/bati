import type { LocationFix } from "@/modules/bati-location";
import { toTrace } from "@/src/gps/trace";
import { RULES } from "@/src/gps/track";

/**
 * The picture and the reducer must break the run in the same places. A trace drawn as one
 * unbroken line across a jump the reducer refused to count tells the hero they ran through it.
 */

const fix = (over: Partial<LocationFix> & { lat: number; lon: number }): LocationFix => ({
  t: 0,
  ele: 110,
  acc: 4,
  speed: 1.4,
  bearing: null,
  distFromPrev: 5,
  ...over,
});

describe("toTrace", () => {
  test("no fixes is no line and no box — the screen has something to check", () => {
    const trace = toTrace([]);
    expect(trace.bounds).toBeNull();
    expect(trace.start).toBeNull();
    expect(trace.end).toBeNull();
    expect(trace.line.geometry.coordinates).toEqual([]);
  });

  test("coordinates are [lon, lat], which is the order MapLibre reads and the opposite of ours", () => {
    const trace = toTrace([fix({ lat: 43.6045, lon: 1.4437, distFromPrev: 0 })]);
    expect(trace.line.geometry.coordinates[0]?.[0]).toEqual([1.4437, 43.6045]);
    expect(trace.start).toEqual([1.4437, 43.6045]);
  });

  test("a jump larger than the reducer's teleport threshold starts a new segment", () => {
    const trace = toTrace([
      fix({ lat: 43.6045, lon: 1.4437, distFromPrev: 0 }),
      fix({ lat: 43.6039, lon: 1.4451 }),
      // The hero came out of a metro station: the reducer refuses this as distance, so the
      // line must not be drawn through it either.
      fix({ lat: 43.61, lon: 1.46, distFromPrev: RULES.teleportM + 1 }),
      fix({ lat: 43.6101, lon: 1.4601 }),
    ]);
    expect(trace.line.geometry.coordinates).toHaveLength(2);
    expect(trace.line.geometry.coordinates[0]).toHaveLength(2);
    expect(trace.line.geometry.coordinates[1]).toHaveLength(2);
    expect(trace.end).toEqual([1.4601, 43.6101]);
  });

  test("the box contains every fix, in [west, south, east, north] order", () => {
    const trace = toTrace([
      fix({ lat: 43.6045, lon: 1.4437, distFromPrev: 0 }),
      fix({ lat: 43.6006, lon: 1.4491 }),
      fix({ lat: 43.602, lon: 1.4468 }),
    ]);
    const [west, south, east, north] = trace.bounds ?? [0, 0, 0, 0];
    expect(west).toBeLessThanOrEqual(1.4437);
    expect(south).toBeLessThanOrEqual(43.6006);
    expect(east).toBeGreaterThanOrEqual(1.4491);
    expect(north).toBeGreaterThanOrEqual(43.6045);
  });

  test("a hero who never moved still gets a box with area, so the camera has something to fit", () => {
    const trace = toTrace([
      fix({ lat: 43.6045, lon: 1.4437, distFromPrev: 0 }),
      fix({ lat: 43.6045, lon: 1.4437, distFromPrev: 0 }),
    ]);
    const [west, south, east, north] = trace.bounds ?? [0, 0, 0, 0];
    expect(east).toBeGreaterThan(west);
    expect(north).toBeGreaterThan(south);
  });
});
