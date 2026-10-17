import assert from "node:assert/strict";
import type { LocationFix } from "@/modules/bati-location";
import { toTrace } from "@/src/gps/trace";
import { accept, EMPTY, METRES_PER_LEAGUE, RULES } from "@/src/gps/track";

/**
 * The picture and the reducer must break the run in the same places, and must call the same
 * ground "moving". A trace drawn as one unbroken line across a jump the reducer refused to count
 * tells the hero they ran through it; a stretch painted at the slow end of the ramp where the
 * reducer credited nothing tells them they walked where they stood.
 */

const fix = (over: Partial<LocationFix> & { lat: number; lon: number }): LocationFix => ({
  t: 0,
  ele: 110,
  baro: null,
  acc: 4,
  speed: 1.4,
  distFromPrev: 5,
  ...over,
});

/**
 * A run that clears the start gate and then walks east, one fix a second.
 *
 * The gate wants three seconds of accuracy under 10 m before anything is credited, so a test that
 * cares about distance, pace or pauses has to pay it first — otherwise every fix lands before
 * `startedAt` and the reducer is right to say the run is worth nothing.
 */
function walkEast(
  count: number,
  metresPerFix: number,
  over: (index: number) => Partial<LocationFix> = () => ({}),
): LocationFix[] {
  const lonPerMetre = 1 / (111_320 * Math.cos((43.6 * Math.PI) / 180));
  return Array.from({ length: count }, (_, i) =>
    fix({
      t: i * 1000,
      lat: 43.6,
      lon: 1.44 + i * metresPerFix * lonPerMetre,
      distFromPrev: i === 0 ? 0 : metresPerFix,
      speed: metresPerFix,
      ...over(i),
    }),
  );
}

/**
 * Legs of different pace, one fix a second, east along lat 43.6. A leg may end with a stop: fixes
 * on the spot, no distance, speed zero.
 */
function walkLegs(legs: { metres: number; mps: number; stopS?: number }[]): LocationFix[] {
  const lonPerMetre = 1 / (111_320 * Math.cos((43.6 * Math.PI) / 180));
  const out: LocationFix[] = [];
  let metres = 0;
  const push = (distFromPrev: number, speed: number) => {
    metres += distFromPrev;
    out.push(
      fix({
        t: out.length * 1000,
        lat: 43.6,
        lon: 1.44 + metres * lonPerMetre,
        distFromPrev,
        speed,
      }),
    );
  };
  push(0, 0);
  for (const leg of legs) {
    // A whole number of fixes, so a leg is exactly `metres` long at (almost exactly) `mps`.
    const fixes = Math.round(leg.metres / leg.mps);
    for (let i = 0; i < fixes; i += 1) push(leg.metres / fixes, leg.mps);
    for (let i = 0; i < (leg.stopS ?? 0); i += 1) push(0, 0);
  }
  return out;
}

describe("toTrace", () => {
  test("no fixes is no line and no box — the screen has something to check", () => {
    const trace = toTrace([]);
    expect(trace.bounds).toBeNull();
    expect(trace.start).toBeNull();
    expect(trace.end).toBeNull();
    expect(trace.line.features).toEqual([]);
    expect(trace.leagues.features).toEqual([]);
    expect(trace.speedRange).toBeNull();
    expect(trace.bestLeague).toBeNull();
  });

  // The reducer refuses a hole in time as firmly as a jump in space, and for the same reason:
  // an interval with no witness. It learned that before this file did, and for one commit a
  // ten minute tunnel cost the hero their credit while the map drew a straight gold line over
  // the hill they had walked around.
  test("a hole in time breaks the line, exactly like a jump in space", () => {
    const trace = toTrace([
      fix({ lat: 43.6, lon: 1.44, t: 0, distFromPrev: 0 }),
      fix({ lat: 43.601, lon: 1.441, t: 1000 }),
      // out of the tunnel: near in space, ten minutes away in time
      fix({ lat: 43.6015, lon: 1.4415, t: 1000 + 10 * 60_000, distFromPrev: 150 }),
      fix({ lat: 43.602, lon: 1.4421, t: 2000 + 10 * 60_000 }),
    ]);

    expect(trace.line.features).toHaveLength(2);
    expect(trace.line.features[0]?.geometry.coordinates).toHaveLength(2);
    expect(trace.line.features[1]?.geometry.coordinates).toHaveLength(2);
  });

  test("coordinates are [lon, lat], which is the order MapLibre reads and the opposite of ours", () => {
    const trace = toTrace([
      fix({ lat: 43.6045, lon: 1.4437, t: 0, distFromPrev: 0 }),
      fix({ lat: 43.6046, lon: 1.4438, t: 1000 }),
    ]);
    expect(trace.line.features[0]?.geometry.coordinates[0]).toEqual([1.4437, 43.6045]);
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
    expect(trace.line.features).toHaveLength(2);
    expect(trace.line.features[0]?.geometry.coordinates).toHaveLength(2);
    expect(trace.line.features[1]?.geometry.coordinates).toHaveLength(2);
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

  // Every stretch is drawn from the last vertex of the one before it. Without that overlap the
  // line shows a hole at every change of colour, which on a twelve-band ramp is a dotted trace.
  test("consecutive stretches share a vertex, so the line has no hole at a colour change", () => {
    const fixes = walkEast(400, 2, (i) => ({ speed: i < 200 ? 0.7 : 2.6 }));
    const trace = toTrace(fixes);

    expect(trace.line.features.length).toBeGreaterThan(1);
    for (let i = 1; i < trace.line.features.length; i += 1) {
      const previous = trace.line.features[i - 1]?.geometry.coordinates.at(-1);
      const next = trace.line.features[i]?.geometry.coordinates[0];
      expect(next).toEqual(previous);
    }
  });

  // The wide layers read `path`, not `line`: a 14 px glow drawn from the bands beads at every
  // colour change with round caps and notches with flat ones. Both were seen on a phone.
  test("the unbroken path breaks only where the run does, never at a colour change", () => {
    const changing = toTrace(walkEast(400, 2, (i) => ({ speed: i < 200 ? 0.7 : 2.6 })));
    expect(changing.line.features.length).toBeGreaterThan(1);
    expect(changing.path.geometry.coordinates).toHaveLength(1);

    const broken = toTrace([
      fix({ lat: 43.6045, lon: 1.4437, t: 0, distFromPrev: 0 }),
      fix({ lat: 43.6039, lon: 1.4451, t: 1000 }),
      fix({ lat: 43.61, lon: 1.46, t: 2000, distFromPrev: RULES.teleportM + 1 }),
      fix({ lat: 43.6101, lon: 1.4601, t: 3000 }),
    ]);
    expect(broken.path.geometry.coordinates).toHaveLength(2);
  });

  // MapLibre refuses a line of one point, in a red box: "A line string must have two or more
  // coordinate points". The first fix of every live walk is exactly that, and the recap met it too
  // wherever a break left a single fix on its own.
  test("the path never hands MapLibre a line of one point", () => {
    const first = toTrace([fix({ lat: 43.6045, lon: 1.4437, distFromPrev: 0 })]);
    expect(first.path.geometry.coordinates).toEqual([]);
    // The hero is still somewhere: the pip reads `end`, which a lone fix does have.
    expect(first.end).toEqual([1.4437, 43.6045]);

    const stranded = toTrace([
      fix({ lat: 43.6045, lon: 1.4437, t: 0, distFromPrev: 0 }),
      fix({ lat: 43.6039, lon: 1.4451, t: 1000 }),
      // A jump the reducer refuses, then nothing yet: one fix alone on the far side.
      fix({ lat: 43.61, lon: 1.46, t: 2000, distFromPrev: RULES.teleportM + 1 }),
    ]);
    expect(stranded.path.geometry.coordinates).toHaveLength(1);
    expect(stranded.path.geometry.coordinates[0]).toHaveLength(2);
  });

  test("the best league's cuff is one line, and it is empty when there is no best league", () => {
    expect(toTrace(walkEast(300, 2)).bestLine.features).toEqual([]);

    const trace = toTrace(walkEast(1500, 2));
    expect(trace.bestLine.features).toHaveLength(1);
    expect(trace.bestLine.features[0]?.geometry.coordinates.length).toBeGreaterThan(2);
  });

  test("a walk held at one pace draws no gradient, so the screen keeps its flat gold line", () => {
    const trace = toTrace(walkEast(120, 1.4));
    expect(trace.speedRange).toBeNull();
    // One band means one feature: nothing changes colour along the way.
    expect(trace.line.features).toHaveLength(1);
  });

  test("a walk that changes pace gets a ramp, and it is this run's own two ends", () => {
    const trace = toTrace(walkEast(400, 2, (i) => ({ speed: i < 200 ? 0.6 : 2.8 })));
    const range = trace.speedRange;
    assert(range);
    expect(range[0]).toBeLessThan(range[1]);
    expect(range[0]).toBeGreaterThan(0.4);
    expect(range[1]).toBeLessThan(3);
  });

  // The whole point of reading `accept` rather than deciding again: the hero stood at a light,
  // and the reducer already refused to call it movement.
  test("ground the reducer refused to credit is painted as a stop, not as the slow end", () => {
    // Ten minutes of standing drift after two minutes of walking: under the moving threshold, so
    // the anchor is never cleared and the window closes.
    const walking = walkEast(120, 1.4);
    const last = walking.at(-1);
    assert(last);
    const standing = Array.from({ length: 600 }, (_, i) =>
      fix({
        t: last.t + (i + 1) * 1000,
        lat: last.lat + (i % 2 === 0 ? 0.00001 : -0.00001),
        lon: last.lon,
        distFromPrev: 1.1,
        speed: 0.2,
      }),
    );

    const trace = toTrace([...walking, ...standing]);
    expect(trace.line.features.some((f) => f.properties.paused)).toBe(true);
  });

  test("a receiver that reports no speed still gets a gradient, derived from the trace", () => {
    const trace = toTrace(
      walkEast(400, 2, (i) => ({ speed: null, distFromPrev: i === 0 ? 0 : i < 200 ? 0.6 : 2.8 })),
    );
    expect(trace.speedRange).not.toBeNull();
  });

  test("a league marker per thousand credited metres, and none before the first", () => {
    // 1400 m of credited ground: one marker, and it is not at the end.
    const trace = toTrace(walkEast(700, 2));
    expect(trace.leagues.features).toHaveLength(1);
    expect(trace.leagues.features[0]?.properties.league).toBe(1);

    const marker = trace.leagues.features[0]?.geometry.coordinates;
    assert(marker);
    assert(trace.start);
    assert(trace.end);
    // Placed where the run crossed the league, which is between the two ends and nearer the end.
    expect(marker[0]).toBeGreaterThan(trace.start[0]);
    expect(marker[0]).toBeLessThan(trace.end[0]);
  });

  test("a walk shorter than a league has no marker and no best league", () => {
    const trace = toTrace(walkEast(300, 2));
    expect(trace.leagues.features).toEqual([]);
    expect(trace.bestLeague).toBeNull();
  });

  test("the best league is the quickest league of the table, drawn pip to pip", () => {
    // 1 100 fixes at 1 m/s, then 1 050 at 2 m/s. With the 3 s gate: league 1 is slow (~1 000 s),
    // league 2 straddles the change (~548 s), league 3 is all quick (500 s), a ~196 m partial.
    const trace = toTrace(
      walkLegs([
        { metres: 1100, mps: 1 },
        { metres: 2100, mps: 2 },
      ]),
    );
    expect(trace.splits).toHaveLength(4);
    expect(trace.splits[2]?.best).toBe(true);
    expect(trace.splits[3]?.metres).toBeLessThan(METRES_PER_LEAGUE);
    expect(trace.splits[3]?.best).toBe(false);
    expect(trace.bestLeague?.ms).toBe(trace.splits[2]?.movingMs);
    expect(Math.abs((trace.bestLeague?.ms ?? 0) / 1000 - 500)).toBeLessThanOrEqual(2);

    const pip2 = trace.leagues.features[1]?.geometry.coordinates;
    const pip3 = trace.leagues.features[2]?.geometry.coordinates;
    const line = trace.bestLine.features[0]?.geometry.coordinates;
    assert(pip2);
    assert(pip3);
    assert(line);
    expect(line[0]?.[0]).toBeCloseTo(pip2[0] ?? 0, 9);
    expect(line.at(-1)?.[0]).toBeCloseTo(pip3[0] ?? 0, 9);

    // The lit stretches start no earlier than one quick step (2 m) before pip 2, and end before pip 3.
    const lit = trace.line.features.filter((f) => f.properties.best);
    expect(lit.length).toBeGreaterThan(0);
    const metreDeg = 1 / (111_320 * Math.cos((43.6 * Math.PI) / 180));
    const litLons = lit.flatMap((f) => f.geometry.coordinates.map((c) => c[0] ?? 0));
    expect(Math.min(...litLons)).toBeGreaterThanOrEqual((pip2[0] ?? 0) - 2 * metreDeg - 1e-9);
    expect(Math.max(...litLons)).toBeLessThan(pip3[0] ?? 0);
  });

  test("a simulated 12 km walk gives 12 true rows, and the quickest is league 9", () => {
    const legs = Array.from({ length: 12 }, (_, i) => ({
      // 10 m on the first leg pays the start gate, 30 on the last keeps the end past pip 12
      metres: i === 0 ? 1010 : i === 11 ? 1030 : 1000,
      mps: i === 8 ? 2 : i === 2 ? 1.2 : 1.4,
    }));
    const trace = toTrace(walkLegs(legs));
    expect(trace.splits).toHaveLength(12);
    trace.splits.forEach((split, i) => {
      const mps = i === 8 ? 2 : i === 2 ? 1.2 : 1.4;
      expect(split.metres).toBe(METRES_PER_LEAGUE);
      expect(Math.abs(split.movingMs - (1000 / mps) * 1000)).toBeLessThanOrEqual(2000);
    });
    expect(trace.splits.filter((s) => s.best)).toHaveLength(1);
    expect(trace.splits[8]?.best).toBe(true);
    expect(trace.bestLeague?.ms).toBe(trace.splits[8]?.movingMs);

    const pips = trace.leagues.features.map((f) => f.geometry.coordinates);
    const line = trace.bestLine.features[0]?.geometry.coordinates;
    assert(line);
    const lo = (pips[7]?.[0] ?? 0) - 1e-9;
    const hi = (pips[8]?.[0] ?? 0) + 1e-9;
    expect(line[0]?.[0]).toBeCloseTo(pips[7]?.[0] ?? 0, 9);
    expect(line.at(-1)?.[0]).toBeCloseTo(pips[8]?.[0] ?? 0, 9);
    for (const c of line) {
      expect(c[0]).toBeGreaterThanOrEqual(lo);
      expect(c[0]).toBeLessThanOrEqual(hi);
    }
  });

  test("a partial row needs 100 m; under one league there is no table", () => {
    const partial = toTrace(walkLegs([{ metres: 1010 + 11_000 + 400, mps: 1.4 }]));
    expect(partial.splits).toHaveLength(13);
    expect(partial.splits[12]?.metres).toBeGreaterThan(300);
    expect(partial.splits[12]?.best).toBe(false);

    expect(toTrace(walkLegs([{ metres: 1010 + 11_000 + 50, mps: 1.4 }])).splits).toHaveLength(12);
    const short = toTrace(walkLegs([{ metres: 900, mps: 1.4 }]));
    expect(short.splits).toEqual([]);
    expect(short.bestLeague).toBeNull();
  });

  test("a stop in the middle of a league does not make it slow, moving time is the clock", () => {
    const base = toTrace(walkLegs([{ metres: 5010, mps: 1.4 }]));
    const stopped = toTrace(
      walkLegs([
        { metres: 4010, mps: 1.4 }, // first 4 km, then 500 m into league 5 is below
        { metres: 500, mps: 1.4, stopS: 180 },
        { metres: 500, mps: 1.4 },
      ]),
    );
    const a = base.splits[4]?.movingMs ?? 0;
    const b = stopped.splits[4]?.movingMs ?? 0;
    // Not zero: the reducer pays no moving time for the ~10 m it takes to clear the anchor after a
    // stop. What the 180 s stop must not cost is three minutes.
    expect(Math.abs(a - b)).toBeLessThanOrEqual(10_000);
  });

  test("a stop just before a marker does not shorten the next league", () => {
    // 1.4 m/s throughout, a 60 s stop ~30 m before pip 2, then ~21 s of walking across it.
    const trace = toTrace(
      walkLegs([
        { metres: 1980, mps: 1.4, stopS: 60 },
        { metres: 1100, mps: 1.4 },
      ]),
    );
    const expected = (1000 / 1.4) * 1000;
    expect(Math.abs((trace.splits[1]?.movingMs ?? 0) - expected)).toBeLessThanOrEqual(2000);
    expect(trace.splits).toHaveLength(3);
    expect(Math.abs((trace.splits[2]?.movingMs ?? 0) - expected)).toBeLessThanOrEqual(2000);
  });

  test("climb per row only where the barometer measured it", () => {
    // 3.4 km (+10 m gate leg), baro rising 10 m per league.
    const fixes = walkLegs([{ metres: 3410, mps: 2 }]).map((f, i, all) => ({
      ...f,
      ele: null,
      baro: (i / all.length) * 34,
    }));
    const trace = toTrace(fixes);
    expect(trace.splits).toHaveLength(4);
    const climbs = trace.splits.map((s) => s.climbM);
    [10, 10, 10, 4].forEach((m, i) => {
      expect(Math.abs((climbs[i] ?? Number.NaN) - m)).toBeLessThanOrEqual(3.5);
    });
    let track = EMPTY;
    for (const f of fixes) track = accept(track, f);
    const sum = climbs.reduce<number>((acc, c) => acc + (c ?? 0), 0);
    expect(sum).toBe(track.ascentM);

    // The last 300 m on GPS height only: the partial row loses its climb, the rest keep it.
    const mixed = toTrace(
      fixes.map((f, i) => (i > fixes.length - 150 ? { ...f, baro: null, ele: 100 + i } : f)),
    );
    expect(mixed.splits[0]?.climbM).not.toBeNull();
    expect(mixed.splits[3]?.climbM).toBeNull();

    const gpsOnly = toTrace(fixes.map((f, i) => ({ ...f, baro: null, ele: 100 + i * 0.1 })));
    expect(gpsOnly.splits.every((s) => s.climbM === null)).toBe(true);
  });
});
