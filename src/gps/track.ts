import type { LocationFix } from "@/modules/bati-location";

/**
 * The session reducer: what a stream of fixes means.
 *
 * Pure and stateless between calls, so every rule below is testable without a phone, a service
 * or a clock. The service already refused what is implausible (accuracy over 50 m, speed over
 * the mode's cap); what is left here is what only a session can know — whether the hero is
 * moving, and whether a gap in the trace is a walk or a teleport.
 *
 * The rule that earns this file is auto-pause. Measured on a Fairphone 6 lying flat on a table:
 * **6 m of distance in 30 s**, which is a fifth of a metre per second of pure receiver noise. A
 * raw sum invents half a kilometre over a 45-minute stop. Every outdoor app has this problem and
 * every one of them solves it by refusing to count while still.
 */
export const RULES = {
  /** Accuracy the first fix must reach, and hold, before a session may start. */
  startAccuracyM: 10,
  startHoldMs: 3000,
  /**
   * How far from the anchor counts as having gone somewhere.
   *
   * **Displacement, not path length.** The first draft summed `distFromPrev` since the anchor,
   * and a test written against the measured 0.2 m/s of standing drift caught it: path length
   * grows without bound while still, crosses ten metres in fifty seconds, and un-pauses a phone
   * lying on a table. Displacement does not — drift wanders around a point rather than away
   * from it, which is exactly the difference the rule is trying to name.
   */
  movingThresholdM: 10,
  pauseAfterMs: 10_000,
  /** A gap larger than this is not a walk; it breaks the line and its length is not distance. */
  teleportM: 200,
} as const;

/**
 * Metres between two coordinates, flat-earth over the distances this rule cares about.
 *
 * Equirectangular rather than haversine on purpose: at a few hundred metres the error is
 * centimetres, and this runs once per fix. `Location.distanceTo` is the native answer and is
 * what `distFromPrev` already uses — this exists because displacement from an anchor is a pair
 * the service never sees.
 */
export function metresBetween(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const x = (b.lon - a.lon) * toRad * Math.cos(((a.lat + b.lat) / 2) * toRad);
  const y = (b.lat - a.lat) * toRad;
  return Math.hypot(x, y) * R;
}

export type TrackState = {
  /** Metres of movement actually credited — drift while paused is not in here. */
  distanceM: number;
  /** Milliseconds of moving time; a pause does not advance it. */
  movingMs: number;
  paused: boolean;
  /** Fix count that survived into the trace, teleports excluded. */
  points: number;
  /** How many segments the line is in: one more than the number of teleports. */
  segments: number;
  /** Set once the start gate opens, null before. */
  startedAt: number | null;
  // --- internal, carried between fixes ---
  lastAt: number | null;
  /** Where the hero was when the current stillness began. */
  anchor: { lat: number; lon: number; t: number } | null;
  /** Straight-line metres from the anchor to the last fix — never a path length. */
  fromAnchorM: number;
  firstGoodAt: number | null;
};

export const EMPTY: TrackState = {
  distanceM: 0,
  movingMs: 0,
  paused: false,
  points: 0,
  segments: 1,
  startedAt: null,
  lastAt: null,
  anchor: null,
  fromAnchorM: 0,
  firstGoodAt: null,
};

/**
 * The gate, which is its own decision.
 *
 * A session begun on a 40 m fix records its first hundred metres as a lie, and no later
 * filtering takes that back. So nothing is credited until accuracy has been good for long
 * enough that it is not one lucky reading.
 */
function openGate(state: TrackState, fix: LocationFix): TrackState {
  if (fix.acc > RULES.startAccuracyM) return { ...state, firstGoodAt: null };
  const firstGoodAt = state.firstGoodAt ?? fix.t;
  if (fix.t - firstGoodAt < RULES.startHoldMs) return { ...state, firstGoodAt };
  return {
    ...state,
    firstGoodAt,
    startedAt: fix.t,
    lastAt: fix.t,
    points: 1,
    anchor: { lat: fix.lat, lon: fix.lon, t: fix.t },
    fromAnchorM: 0,
  };
}

/** A gap this large is not a journey: it leaves the line broken and its length uncounted. */
function teleport(state: TrackState, fix: LocationFix): TrackState {
  return {
    ...state,
    segments: state.segments + 1,
    points: state.points + 1,
    lastAt: fix.t,
    anchor: { lat: fix.lat, lon: fix.lon, t: fix.t },
    fromAnchorM: 0,
  };
}

/** Fold one fix into the session. */
export function accept(state: TrackState, fix: LocationFix): TrackState {
  if (state.startedAt === null) return openGate(state, fix);
  if (fix.distFromPrev > RULES.teleportM) return teleport(state, fix);

  const elapsed = state.lastAt === null ? 0 : fix.t - state.lastAt;
  const fromAnchorM = state.anchor === null ? 0 : metresBetween(state.anchor, fix);
  const stillFor = state.anchor === null ? 0 : fix.t - state.anchor.t;

  // Far enough from the anchor to have gone somewhere: the anchor moves with the hero.
  if (fromAnchorM >= RULES.movingThresholdM) {
    return {
      ...state,
      distanceM: state.distanceM + fix.distFromPrev,
      // A pause that ends pays for the fix that ended it, not for the stillness before it.
      movingMs: state.movingMs + (state.paused ? 0 : elapsed),
      paused: false,
      points: state.points + 1,
      lastAt: fix.t,
      anchor: { lat: fix.lat, lon: fix.lon, t: fix.t },
      fromAnchorM: 0,
    };
  }

  const paused = state.paused || stillFor >= RULES.pauseAfterMs;
  return {
    ...state,
    // Distance drifts while paused and none of it is credited: that is the whole rule.
    distanceM: paused ? state.distanceM : state.distanceM + fix.distFromPrev,
    movingMs: paused ? state.movingMs : state.movingMs + elapsed,
    paused,
    points: state.points + 1,
    lastAt: fix.t,
    fromAnchorM,
  };
}

/** What a finished outing credited: ground for the road, moving seconds for the XP ceiling. */
export type Credit = { leaguesM: number; movingSeconds: number };

/**
 * What this run is worth, or null when the run has no witness.
 *
 * Null is the whole point of this function. `startedAt` is set the first time the start gate
 * opens, which needs one fix accurate to 10 m held for three seconds, and it covers every way
 * that can fail to happen at all: the hero refused the location prompt, the build has no native
 * half, the phone has no GPS provider, or an hour passed under tree cover and nothing ever
 * locked. A caller that treated those as "zero moving seconds" would pay an honest hour the XP
 * floor with nothing on screen saying why, which is the app punishing someone for declining a
 * permission it called optional. Null means "no opinion", and the caller falls back to the clock.
 *
 * A phone left outside with a working GPS is *not* this case and must not become it: the gate
 * opens within seconds and the reducer then credits no moving time, which is a real zero.
 */
export function credited(track: TrackState): Credit | null {
  if (track.startedAt === null) return null;

  return {
    leaguesM: Math.round(track.distanceM),
    movingSeconds: Math.floor(track.movingMs / 1000),
  };
}
