import assert from "node:assert/strict";
import type { LocationFix } from "@/modules/bati-location";
import { toTrace } from "@/src/gps/trace";
import { METRES_PER_LEAGUE, RULES } from "@/src/gps/track";

/**
 * The picture and the reducer must break the run in the same places, and must call the same
 * ground "moving". A trace drawn as one unbroken line across a jump the reducer refused to count
 * tells the hero they ran through it; a stretch painted at the slow end of the ramp where the
 * reducer credited nothing tells them they walked where they stood.
 */

const fix = (over: Partial<LocationFix> & { lat: number; lon: number }): LocationFix => ({
  t: 0,
  ele: 110,
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

  test("the best league is the quickest continuous one, and it is drawn where it happened", () => {
    // A slow first kilometre at 1 m/s and a quick second at 2 m/s, one fix a second throughout.
    // The best league is the second one, and the answer must be its pace and not the whole walk's.
    const slow = walkEast(1000, 1);
    const anchor = slow.at(-1);
    assert(anchor);
    const lonPerMetre = 1 / (111_320 * Math.cos((43.6 * Math.PI) / 180));
    const quick = Array.from({ length: 500 }, (_, i) =>
      fix({
        t: anchor.t + (i + 1) * 1000,
        lat: 43.6,
        lon: anchor.lon + (i + 1) * 2 * lonPerMetre,
        distFromPrev: 2,
        speed: 2,
      }),
    );

    const trace = toTrace([...slow, ...quick]);
    const best = trace.bestLeague;
    assert(best);
    expect(best.metres).toBeGreaterThanOrEqual(METRES_PER_LEAGUE);
    // A league at 2 m/s is 500 s. The whole walk averages 1.33 m/s, so anything near 750 s means
    // the window slid over the fast half without noticing it was faster.
    expect(best.ms / 1000).toBeLessThan(560);

    // And it is painted on the second half of the trace, not merely reported. Measured against
    // the 900th metre rather than the 1000th: a stretch begins on the last vertex of the one
    // before it, which is the overlap the test above exists to hold, so the lit run starts one
    // fix short of the transition by design.
    const lit = trace.line.features.filter((f) => f.properties.best);
    expect(lit.length).toBeGreaterThan(0);
    const first = lit[0]?.geometry.coordinates[0];
    const ninthHundredth = slow[900];
    assert(first);
    assert(ninthHundredth);
    expect(first[0]).toBeGreaterThan(ninthHundredth.lon);
  });
});
