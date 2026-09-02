import type { LocationFix } from "@/modules/bati-location";
import { accept, breaksRun, EMPTY, METRES_PER_LEAGUE } from "./track";

/**
 * The stored fixes, as the four things a map needs: a line to draw, a box to frame it in, the
 * markers along it and the scale its colours are read against.
 *
 * Pure, so the shape of a run is testable without a phone, a tile or a renderer — which matters
 * more here than usual, because nothing in this file has ever been seen on a device.
 *
 * It calls `breaksRun` rather than owning a threshold of its own: `accept` refuses to count what
 * that rule rejects, and a picture that then draws a straight line across the gap tells the hero
 * they ran through it. The reducer and the trace break the run in the same places or they are two
 * answers to one question, which is what happened the day the reducer learned about holes in time
 * and this file only knew about jumps in space.
 *
 * The same rule is why the colour reads `accept`'s own `paused` and `distanceM` rather than
 * deciding again what counts as movement. A stretch the reducer refused to credit is painted as a
 * stop, never as the slow end of the ramp: those are two different sentences about the same
 * ground, and only one of them is true.
 */

/** `[longitude, latitude]`, MapLibre's order — never the other way round. */
export type LngLat = [number, number];

/** What one stretch of the line says about itself. The layers read nothing else. */
export type Stretch = {
  /** Metres per second, quantised to the middle of this stretch's colour band. */
  speed: number;
  /** The reducer credited no movement here. Its own colour, never the bottom of the ramp. */
  paused: boolean;
  /** Inside `bestLeague`. */
  best: boolean;
};

export type Trace = {
  /** One `LineString` per stretch of one colour, never crossing a break in the run. */
  line: GeoJSON.FeatureCollection<GeoJSON.LineString, Stretch>;
  /**
   * The same ground as `line`, unbroken: one part per unbroken run and no cut at a change of
   * colour.
   *
   * It exists for the layers that are wider than the stroke. A 14 px glow behind 12 px of blur
   * puts a 38 px bead at every join if its caps are round, and a dark notch at every join if they
   * are flat, because two flat caps meeting at an angle do not close the wedge between them. Both
   * were visible on a phone. The stroke is the only layer narrow enough for its own caps to
   * disappear into it, so the stroke is the only one that reads the banded features.
   */
  path: GeoJSON.Feature<GeoJSON.MultiLineString>;
  /**
   * The best league as one continuous line, for the same reason `path` exists. Empty rather than
   * `null` on a run with no best league: an empty collection draws nothing, where a `null` would
   * put a branch in the screen for a source that is happy to be handed no features.
   */
  bestLine: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  /** One point per completed league, placed where the run crossed it. */
  leagues: GeoJSON.FeatureCollection<GeoJSON.Point, { league: number }>;
  /**
   * The two speeds the colour ramp is stretched between, in metres per second, or `null` when
   * this run has no gradient worth drawing. The screen paints one flat gold line on `null`.
   */
  speedRange: [number, number] | null;
  /** The quickest continuous league of the run, as `formatPace` wants it. */
  bestLeague: { metres: number; ms: number } | null;
  /** `[west, south, east, north]`, which is what `Camera`'s `bounds` prop takes. */
  bounds: [number, number, number, number] | null;
  start: LngLat | null;
  end: LngLat | null;
};

/**
 * Half the smallest box the camera is asked to frame, in degrees — about 5 m of latitude.
 *
 * A hero who starts a session and stops on the spot leaves one point, or several within a metre
 * of each other, and a zero-area bounding box is not a viewport: it asks the camera to fit
 * nothing, which is a division by zero somewhere in `fitBounds`. Widening the box is the answer
 * that needs no special case in the screen.
 */
const MIN_HALF_SPAN_DEG = 0.00005;

/**
 * How much of the walk one point's colour is allowed to be about.
 *
 * A receiver emits at 1 Hz and its speed wobbles by tenths of a metre per second between two
 * fixes taken standing still. Painted raw, that is confetti rather than a gradient, and the eye
 * reads noise as information. Twenty seconds is short enough to keep a hill and long enough to
 * lose the wobble.
 *
 * The number that most wants a real walk to settle it: it was picked from the receiver's
 * behaviour, not from a screen. Widen it if the line still flickers on a phone.
 */
const SPEED_WINDOW_MS = 20_000;

/**
 * How many colours the ramp is cut into.
 *
 * Not a continuous gradient: each band is one `LineString`, and a fix that keeps its own colour
 * for a whole minute is one feature instead of sixty. Twelve is under what the eye separates on a
 * 4 px line, so the steps read as a gradient while the source stays a few dozen features on a
 * three thousand point walk.
 */
const BANDS = 12;

/**
 * The narrowest spread of pace still worth a gradient, in metres per second.
 *
 * 0.3 m/s is about 1 km/h. Under it the run was held at one pace, and stretching a hundredth of a
 * metre per second across the full ramp would paint receiver noise as a story about effort. The
 * screen falls back to the plain gold line, which is the truth about that walk.
 */
const MIN_SPREAD_M_S = 0.3;

/** One fix, with everything the drawing needs decided about it. */
type Step = {
  at: LngLat;
  t: number;
  /** Credited metres since the start of the outing, never decreasing. */
  covered: number;
  paused: boolean;
  /** Metres per second as measured, `null` where nothing witnessed one. */
  raw: number | null;
  /** `raw` over `SPEED_WINDOW_MS`, filled by the second pass. */
  speed: number | null;
  /** Which unbroken run of the trace this fix belongs to. */
  segment: number;
};

/**
 * The speed of one fix, and why the fallback is only a fallback.
 *
 * `fix.speed` is the receiver's own Doppler reading, and the native half writes `null` whenever
 * `Location.hasSpeed()` is false — some chipsets, and every fix of a run recorded before that
 * field existed. The fallback is the division commit 1a612308 refused to *print*, and it is safe
 * here only because nothing prints it: it is averaged over twenty seconds and then clamped to the
 * run's own percentiles before it is ever a colour. A single 100 ms gap that reads 50 m/s moves a
 * band, not a number the hero is told to believe.
 */
function rawSpeed(fix: LocationFix, broken: boolean, elapsedMs: number): number | null {
  if (fix.speed !== null) return fix.speed;
  if (broken || elapsedMs <= 0) return null;
  return fix.distFromPrev / (elapsedMs / 1000);
}

/** Every fix, folded through the reducer that already owns what counts as movement. */
function walk(fixes: readonly LocationFix[]): Step[] {
  const steps: Step[] = [];
  let state = EMPTY;
  let previousAt: number | null = null;
  let segment = 0;
  let covered = 0;

  for (const fix of fixes) {
    const broken = breaksRun(fix, previousAt);
    if (broken && steps.length > 0) segment += 1;
    const elapsed = previousAt === null ? 0 : fix.t - previousAt;
    state = accept(state, fix);
    // A running maximum, not the reducer's figure as it stands: a window that closes on a hero
    // who never moved takes its advance back, so `distanceM` steps backwards, and a league marker
    // may not. The overshoot is one window of drift, about eight metres at the 0.2 m/s measured on
    // a table, against a marker placed every thousand.
    covered = Math.max(covered, state.distanceM);
    steps.push({
      at: [fix.lon, fix.lat],
      t: fix.t,
      covered,
      paused: state.paused,
      raw: rawSpeed(fix, broken, elapsed),
      speed: null,
      segment,
    });
    previousAt = fix.t;
  }
  return steps;
}

/** The rolling mean over one unbroken run, in one pass with two pointers. */
function smoothRun(steps: Step[], from: number, to: number): void {
  const half = SPEED_WINDOW_MS / 2;
  let lo = from;
  let hi = from;
  let sum = 0;
  let count = 0;

  // `NaN` for an index that is not there, so both window conditions below are false and the
  // pointer stops. An `undefined` check inside each loop says the same thing in three more lines.
  const timeAt = (index: number): number => steps[index]?.t ?? Number.NaN;
  const shift = (index: number, sign: 1 | -1): void => {
    const raw = steps[index]?.raw;
    if (raw === undefined || raw === null) return;
    sum += sign * raw;
    count += sign;
  };

  for (let i = from; i <= to; i += 1) {
    const step = steps[i];
    if (step === undefined) continue;
    while (hi <= to && timeAt(hi) <= step.t + half) {
      shift(hi, 1);
      hi += 1;
    }
    while (lo < hi && timeAt(lo) < step.t - half) {
      shift(lo, -1);
      lo += 1;
    }
    step.speed = count > 0 ? sum / count : null;
  }
}

/** Smoothing stops at every break: a window that spans a tunnel averages across the hole. */
function smooth(steps: Step[]): void {
  let from = 0;
  for (let i = 1; i <= steps.length; i += 1) {
    const here = steps[i];
    const start = steps[from];
    if (here !== undefined && start !== undefined && here.segment === start.segment) continue;
    smoothRun(steps, from, i - 1);
    from = i;
  }
}

/**
 * The two ends of the ramp, as this run's own tenth and ninetieth percentiles.
 *
 * Relative to the outing rather than absolute: an absolute scale paints a steady walk in one
 * colour, which reads as a broken feature. Percentiles rather than the extremes, because one fix
 * against a wall spends the whole ramp on a single second of the walk. The legend prints both
 * ends as paces, so the colours still say something a hero can check.
 */
function percentileRange(steps: readonly Step[]): [number, number] | null {
  const moving = steps.flatMap((step) => (step.paused || step.speed === null ? [] : [step.speed]));
  if (moving.length < 2) return null;
  moving.sort((a, b) => a - b);

  const at = (quantile: number): number => moving[Math.round(quantile * (moving.length - 1))] ?? 0;
  const lo = at(0.1);
  const hi = at(0.9);
  return hi - lo < MIN_SPREAD_M_S ? null : [lo, hi];
}

/**
 * The quickest thousand credited metres of the run, and where they are.
 *
 * A window may span a break in the trace without a special case: a break credits no distance and
 * carries its whole silence in `t`, so any window containing one loses on pace to every window
 * that does not. The same is true of a stop, which is the answer this wants.
 */
function bestLeague(
  steps: readonly Step[],
): { metres: number; ms: number; from: number; to: number } | null {
  let best: { metres: number; ms: number; from: number; to: number } | null = null;
  let lo = 0;

  for (let hi = 0; hi < steps.length; hi += 1) {
    const end = steps[hi];
    if (end === undefined) continue;
    // Keep the window as short as it can be while still covering a league. `NaN` past the end
    // makes the comparison false, so the pointer stops without a second condition.
    while (end.covered - (steps[lo + 1]?.covered ?? Number.NaN) >= METRES_PER_LEAGUE) lo += 1;
    const start = steps[lo];
    if (start === undefined) continue;
    const metres = end.covered - start.covered;
    const ms = end.t - start.t;
    if (metres < METRES_PER_LEAGUE || ms <= 0) continue;
    // Cross-multiplied rather than dividing twice: both sides are positive, and this is the
    // comparison of two paces without inventing a third number that rounds.
    if (best === null || ms * best.metres < best.ms * metres)
      best = { metres, ms, from: lo, to: hi };
  }
  return best;
}

/** Where the run crossed each thousandth metre, interpolated between the two fixes around it. */
function leaguePips(
  steps: readonly Step[],
): GeoJSON.FeatureCollection<GeoJSON.Point, { league: number }> {
  const features: GeoJSON.Feature<GeoJSON.Point, { league: number }>[] = [];
  let league = 1;

  for (let i = 1; i < steps.length; i += 1) {
    const previous = steps[i - 1];
    const step = steps[i];
    if (previous === undefined || step === undefined) continue;
    while (step.covered >= league * METRES_PER_LEAGUE) {
      const span = step.covered - previous.covered;
      const fraction = span <= 0 ? 0 : (league * METRES_PER_LEAGUE - previous.covered) / span;
      features.push({
        type: "Feature",
        properties: { league },
        geometry: {
          type: "Point",
          coordinates: [
            previous.at[0] + (step.at[0] - previous.at[0]) * fraction,
            previous.at[1] + (step.at[1] - previous.at[1]) * fraction,
          ],
        },
      });
      league += 1;
    }
  }
  return { type: "FeatureCollection", features };
}

/** Which of the twelve colours a speed falls in, and the speed that band is painted at. */
function bandSpeed(speed: number | null, range: [number, number] | null): number {
  if (speed === null || range === null) return 0;
  const [lo, hi] = range;
  const band = Math.min(BANDS - 1, Math.max(0, Math.floor(((speed - lo) / (hi - lo)) * BANDS)));
  return lo + ((band + 0.5) * (hi - lo)) / BANDS;
}

/**
 * The line, cut into one feature per colour.
 *
 * Every stretch begins on the last vertex of the one before it, or the line shows a hole at each
 * of the twelve bands and a walk is drawn as a dotted trace. A break in the run is the one place
 * that must not happen: there, the hole is the point.
 */
function stretches(
  steps: readonly Step[],
  range: [number, number] | null,
  best: { from: number; to: number } | null,
): GeoJSON.Feature<GeoJSON.LineString, Stretch>[] {
  const features: GeoJSON.Feature<GeoJSON.LineString, Stretch>[] = [];
  let coordinates: LngLat[] = [];
  let painted: Stretch | null = null;
  let previous: Step | null = null;

  const close = () => {
    // Two coordinates or it is not a line. A one-fix segment draws nothing here and drew nothing
    // before; the start and end pips are what say a hero stood somewhere.
    if (coordinates.length >= 2 && painted !== null) {
      features.push({
        type: "Feature",
        properties: painted,
        geometry: { type: "LineString", coordinates },
      });
    }
  };

  const differs = (a: Stretch | null, b: Stretch): boolean =>
    a === null || a.speed !== b.speed || a.paused !== b.paused || a.best !== b.best;

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (step === undefined) continue;

    const here: Stretch = {
      speed: bandSpeed(step.speed, range),
      paused: step.paused,
      best: best !== null && i >= best.from && i <= best.to,
    };
    const broke = previous !== null && previous.segment !== step.segment;

    if (broke || differs(painted, here)) {
      close();
      const tail = coordinates.at(-1);
      coordinates = broke || tail === undefined ? [] : [tail];
      painted = here;
    }

    coordinates.push(step.at);
    previous = step;
  }
  close();
  return features;
}

/** The unbroken geometry, cut only where the reducer refused to join two fixes. */
function path(steps: readonly Step[]): GeoJSON.Feature<GeoJSON.MultiLineString> {
  const parts: LngLat[][] = [];
  let current: LngLat[] = [];
  let previous: Step | null = null;

  for (const step of steps) {
    if (previous !== null && previous.segment !== step.segment && current.length > 0) {
      parts.push(current);
      current = [];
    }
    current.push(step.at);
    previous = step;
  }
  if (current.length > 0) parts.push(current);

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiLineString", coordinates: parts },
  };
}

/** The best league, as one line rather than as the bands it happens to be painted in. */
function bestLine(
  steps: readonly Step[],
  best: { from: number; to: number } | null,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const coordinates = best === null ? [] : steps.slice(best.from, best.to + 1).map((s) => s.at);
  return {
    type: "FeatureCollection",
    features:
      coordinates.length < 2
        ? []
        : [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }],
  };
}

/** The box the camera is asked to fit, widened where the run has no area of its own. */
function boundingBox(steps: readonly Step[]): [number, number, number, number] | null {
  if (steps.length === 0) return null;
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const step of steps) {
    west = Math.min(west, step.at[0]);
    east = Math.max(east, step.at[0]);
    south = Math.min(south, step.at[1]);
    north = Math.max(north, step.at[1]);
  }
  return [
    Math.min(west, east - MIN_HALF_SPAN_DEG * 2),
    Math.min(south, north - MIN_HALF_SPAN_DEG * 2),
    Math.max(east, west + MIN_HALF_SPAN_DEG * 2),
    Math.max(north, south + MIN_HALF_SPAN_DEG * 2),
  ];
}

export function toTrace(fixes: readonly LocationFix[]): Trace {
  const steps = walk(fixes);
  smooth(steps);
  const speedRange = percentileRange(steps);
  const best = bestLeague(steps);
  const first = steps[0];
  const last = steps.at(-1);

  return {
    line: { type: "FeatureCollection", features: stretches(steps, speedRange, best) },
    path: path(steps),
    bestLine: bestLine(steps, best),
    leagues: leaguePips(steps),
    speedRange,
    bestLeague: best === null ? null : { metres: best.metres, ms: best.ms },
    bounds: boundingBox(steps),
    start: first ? first.at : null,
    end: last ? last.at : null,
  };
}
