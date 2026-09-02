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
  /**
   * How long the anchor may stay uncleared before the hero counts as stopped.
   *
   * This value and the one above are one number: a **floor pace of 0.25 m/s** (10 m in 40 s).
   * Below it the anchor is never cleared in time, so every fix in between is credited neither
   * distance nor moving time — and the pair started at 10 s, a floor of 1.0 m/s, which threw
   * away 23 % of a half-hour walk at 0.8 m/s and 41 % at 0.6. That is the pace of the hill, the
   * dog and the eighty-year-old "La Ronde du Veilleur" invites by name.
   *
   * The pair is unchanged; **what the window costs is.** It used to be paid at every stop: a fix
   * is credited as it lands, so the whole window was already in `movingMs` and `distanceM` by the
   * time the pause engaged, and nothing took it back. Dropping the floor to 0.25 m/s quadrupled
   * that bill — an urban walk with fifteen crossings banked up to ten minutes of standing as
   * moving time and about 120 m of drift as ground, which is a 25-minute goal met seven minutes
   * early and an XP ceiling paid for the sursis.
   *
   * So the credit is now **advanced, not given**: what is credited under an anchor is tracked
   * (`advancedM` / `advancedMs`) and taken back the moment the window closes on a hero who never
   * cleared it. A stop of any length costs zero credited standing time, where it used to cost a
   * window of it, and the drift under it is refused with the same movement.
   *
   * The residual error changed direction with it: a stop now costs at most the ramp that was in
   * flight when it happened, under-credited (about 7 s at 1.4 m/s, 25 s at 0.4), and nothing is
   * ever over-credited. Under-counting an honest walk is the error this app is allowed to make;
   * paying XP for standing at a light is not.
   *
   * Two things the refund does not fix, and neither is a bug so much as the shape of the pair:
   *
   * - **A stop shorter than the window is invisible.** Thirty seconds at a light clears no anchor
   *   and closes no window, so it is credited exactly as forty seconds of walking at the floor
   *   pace would be. Nothing that reads displacement over 40 s can tell those two apart. A
   *   shorter window could, and the floor pace is the price it would be bought at — which is why
   *   the pair did not move.
   * - **The floor is a cliff now.** Below 0.25 m/s the window closes every time and takes its
   *   advance with it, so half an hour at 0.22 m/s credits seconds where it used to leak 85 %
   *   through. That leak and the paid-for stop were the same leak. 0.25 m/s is 0.9 km/h, a
   *   walking frame does two to three, and refusing what is slower is what this pair has said it
   *   did since it was written.
   */
  pauseAfterMs: 40_000,
  /** A gap larger than this is not a walk; it breaks the line and its length is not distance. */
  teleportM: 200,
  /**
   * The longest silence between two fixes that still describes a pace.
   *
   * The service emits at 1 Hz and already treats 30 s without a fix as an anomaly worth an event
   * (`noFixTimeoutMs`). Past that, nothing witnessed what happened: ten minutes underground and
   * 150 m from the mouth is not 150 m walked, and `fix.t` is `Location.getTime()` — the system
   * clock, which an NTP sync moves by an hour in either direction while the hero walks. Forward,
   * that hour lands in `movingMs` and the goal, the haptics and the XP ceiling all believe it;
   * backward, it takes away time already earned. `modules/bati-location` says callers keep their
   * own monotonic guard, and this is the caller: it is the one that holds the state.
   */
  maxGapMs: 30_000,
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
  /**
   * Credit advanced under the current anchor, and owed back if it is never cleared.
   *
   * Already inside `distanceM` and `movingMs`: the figures on the panel have to move every
   * second, so a fix is credited as it lands rather than held until it is proven. These two are
   * what makes that advance reversible — see `pauseAfterMs`.
   */
  advancedM: number;
  advancedMs: number;
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
  advancedM: 0,
  advancedMs: 0,
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

/**
 * A hole, in space or in time: it leaves the line broken, its length uncounted and its duration
 * unpaid, and the next fix starts a fresh anchor rather than resuming the old one.
 */
function teleport(state: TrackState, fix: LocationFix): TrackState {
  return {
    ...state,
    segments: state.segments + 1,
    points: state.points + 1,
    lastAt: fix.t,
    anchor: { lat: fix.lat, lon: fix.lon, t: fix.t },
    fromAnchorM: 0,
    // The hole ends the old anchor's account: what it advanced is neither refunded nor owed on
    // this side of the break, since the fix that would have proven it is the one that never came.
    advancedM: 0,
    advancedMs: 0,
  };
}

/**
 * Whether the run is broken between the previous fix and this one.
 *
 * Too far, or too long since the last word: a jump in space and a hole in time are the same thing
 * here, an interval with no witness, and neither is worth distance or moving seconds.
 *
 * Exported because the reducer is not the only reader. `src/gps/trace.ts` draws the line and
 * `src/gps/gpx.ts` writes the file, and a picture that runs straight through a gap the reducer
 * refused to count tells the hero they went through it. One rule, three callers: when this was
 * two conditions in two files, the tunnel that cost ten minutes of credit still drew a gold line
 * across the hill.
 */
export function breaksRun(fix: LocationFix, previousAt: number | null): boolean {
  if (fix.distFromPrev > RULES.teleportM) return true;
  if (previousAt === null) return false;
  const elapsed = fix.t - previousAt;
  return elapsed < 0 || elapsed > RULES.maxGapMs;
}

/** Fold one fix into the session. */
export function accept(state: TrackState, fix: LocationFix): TrackState {
  if (state.startedAt === null) return openGate(state, fix);

  const elapsed = state.lastAt === null ? 0 : fix.t - state.lastAt;
  if (breaksRun(fix, state.lastAt)) {
    return teleport(state, fix);
  }

  const fromAnchorM = state.anchor === null ? 0 : metresBetween(state.anchor, fix);
  const stillFor = state.anchor === null ? 0 : fix.t - state.anchor.t;

  // Far enough from the anchor to have gone somewhere: the anchor moves with the hero, and
  // everything advanced under the old one is now proven — the account closes at zero.
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
      advancedM: 0,
      advancedMs: 0,
    };
  }

  // The window closed on an anchor that was never cleared: the hero went nowhere, so the credit
  // advanced under it comes back out. Already paused, `advanced` is zero and this is a no-op —
  // one branch for the stop and for every second of it.
  if (state.paused || stillFor >= RULES.pauseAfterMs) {
    return {
      ...state,
      distanceM: state.distanceM - state.advancedM,
      movingMs: state.movingMs - state.advancedMs,
      advancedM: 0,
      advancedMs: 0,
      paused: true,
      points: state.points + 1,
      lastAt: fix.t,
      fromAnchorM,
    };
  }

  return {
    ...state,
    distanceM: state.distanceM + fix.distFromPrev,
    movingMs: state.movingMs + elapsed,
    advancedM: state.advancedM + fix.distFromPrev,
    advancedMs: state.advancedMs + elapsed,
    points: state.points + 1,
    lastAt: fix.t,
    fromAnchorM,
  };
}

/**
 * What a finished outing credited: ground for the road, moving seconds for the XP ceiling, and
 * the span its own trace witnessed — first fix to last.
 *
 * `elapsedSeconds` is the outing's clock, and the definition is deliberate: **an outing lasted
 * what its trace can prove it lasted**, not what the session's wall clock says. The two disagree
 * the moment the process dies mid-walk. `useSessionRecovery` banks the whole downtime as pause,
 * so the session clock of a walk killed at 45 minutes and resumed for 10 more reads 10 minutes —
 * while the reducer, replaying the points from `gps_points`, reads 55 of moving time. One screen
 * then said "Total 10:00" above "Moving 45:xx" for the same walk. The trace is the half that
 * survived the kill, so the trace is what both halves read now.
 */
export type Credit = { leaguesM: number; movingSeconds: number; elapsedSeconds: number };

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
    // The minutes spent finding the sky are not in here: the gate opens on the first fix good
    // enough to trust, and nothing before it was witnessed. Under-counting the wait is the same
    // choice as under-counting the ramp out of a stop.
    elapsedSeconds: Math.max(
      0,
      Math.floor(((track.lastAt ?? track.startedAt) - track.startedAt) / 1000),
    ),
  };
}

/**
 * What the hero set out to do, in the unit they chose. Seconds are *moving* seconds, the same
 * witness XP is paid in: a goal of "25 minutes" is not met by standing at a crossing.
 */
export type OutingGoal = { type: "time"; seconds: number } | { type: "distance"; metres: number };

export function goalReached(goal: OutingGoal | null, track: TrackState): boolean {
  if (goal === null) return false;
  return goal.type === "time"
    ? track.movingMs >= goal.seconds * 1000
    : track.distanceM >= goal.metres;
}
