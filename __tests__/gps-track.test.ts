import type { LocationFix } from "@/modules/bati-location";
import { accept, credited, EMPTY, RULES, type TrackState } from "@/src/gps/track";

const T0 = Date.UTC(2026, 7, 31, 15, 0, 0);

const fix = (over: Partial<LocationFix> & { t: number }): LocationFix => ({
  lat: 48.4728,
  lon: -2.4943,
  ele: 110,
  acc: 4,
  speed: 1.4,
  distFromPrev: 0,
  ...over,
});

/** Fold a whole stream, the way a session does. */
function run(fixes: LocationFix[], from: TrackState = EMPTY): TrackState {
  return fixes.reduce(accept, from);
}

/** A session already past its start gate, so a test can be about one rule at a time. */
function started(): TrackState {
  return run([
    fix({ t: T0, acc: 5 }),
    fix({ t: T0 + 1000, acc: 5 }),
    fix({ t: T0 + 3000, acc: 5 }),
  ]);
}

/** Metres, as a difference in latitude — so a walk moves as far as it says it moved. */
function northOf(metres: number): number {
  return metres / 111_195;
}

/** The gate closes at T0 + 3000, so a walk of n seconds ends here. */
const walkEnd = (seconds: number): number => T0 + 3000 + seconds * 1000;

/**
 * A sustained walk, one fix a second, straight north: displacement and path length agree.
 *
 * Every case in this file used to walk at 1.4 m/s, which was the one pace the pause rule was
 * right about — the pair of values it is built from is a floor pace, and nothing below that floor
 * was ever credited. A helper that takes the pace is what makes the floor visible.
 */
function walked(speedMs: number, seconds: number, from: TrackState = started()): TrackState {
  let state = from;
  for (let i = 1; i <= seconds; i++) {
    state = accept(
      state,
      fix({
        t: walkEnd(i),
        distFromPrev: speedMs,
        lat: 48.4728 + northOf(i * speedMs),
      }),
    );
  }
  return state;
}

describe("the start gate", () => {
  test("a session does not begin on a bad fix, however many arrive", () => {
    const state = run([
      fix({ t: T0, acc: 40 }),
      fix({ t: T0 + 1000, acc: 30 }),
      fix({ t: T0 + 9000, acc: 12 }),
    ]);
    expect(state.startedAt).toBeNull();
    expect(state.distanceM).toBe(0);
  });

  test("accuracy alone is not enough — it has to hold for three seconds", () => {
    expect(run([fix({ t: T0, acc: 5 }), fix({ t: T0 + 1000, acc: 5 })]).startedAt).toBeNull();
    expect(started().startedAt).toBe(T0 + 3000);
  });

  test("a fix that goes bad again restarts the hold, rather than banking it", () => {
    const state = run([
      fix({ t: T0, acc: 5 }),
      fix({ t: T0 + 1000, acc: 5 }),
      fix({ t: T0 + 2000, acc: 60 }), // the sky closes
      fix({ t: T0 + 2500, acc: 5 }), // and reopens: the clock starts over
    ]);
    expect(state.startedAt).toBeNull();
  });
});

describe("auto-pause, which is the rule this file exists for", () => {
  // Measured on hardware: a phone flat on a table drifts 6 m in 30 s. A raw sum would call that
  // half a kilometre over a 45-minute stop.
  test("a phone lying still accrues no distance, whatever the receiver claims", () => {
    let state = started();
    for (let i = 1; i <= 60; i++) {
      // Jitter around one point, which is what standing drift looks like: the path length grows
      // by 0.2 m a second while the phone never actually goes anywhere.
      state = accept(
        state,
        fix({
          t: T0 + 3000 + i * 1000,
          distFromPrev: 0.2,
          lat: 48.4728 + (i % 2 === 0 ? 0.00001 : -0.00001),
        }),
      );
    }
    expect(state.paused).toBe(true);
    // Not even the window of doubt: what was credited under an anchor the hero never cleared is
    // taken back when the window closes, so a phone that went nowhere is worth exactly nothing.
    expect(state.distanceM).toBe(0);
  });

  test("moving time stops with it, so pace is not diluted by standing at a crossing", () => {
    let state = started();
    for (let i = 1; i <= 60; i++) {
      state = accept(
        state,
        fix({
          t: T0 + 3000 + i * 1000,
          distFromPrev: 0.2,
          lat: 48.4728 + (i % 2 === 0 ? 0.00001 : -0.00001),
        }),
      );
    }
    expect(state.movingMs).toBe(0);
  });

  test("walking again resumes on the first fix that clears the anchor", () => {
    let state = started();
    for (let i = 1; i <= 45; i++) {
      state = accept(
        state,
        fix({
          t: T0 + 3000 + i * 1000,
          distFromPrev: 0.2,
          lat: 48.4728 + (i % 2 === 0 ? 0.00001 : -0.00001),
        }),
      );
    }
    expect(state.paused).toBe(true);
    // 0.0002 degrees of latitude is about 22 m: the hero has actually left.
    state = accept(state, fix({ t: T0 + 49_000, distFromPrev: 12, lat: 48.473 }));
    expect(state.paused).toBe(false);
    // Twelve metres and not one more: the drift that came before them was refunded when the
    // window closed, so the walk starts again from what the hero actually covered.
    expect(state.distanceM).toBe(12);
  });

  test("a steady walk is never paused, and every metre is credited", () => {
    let state = started();
    for (let i = 1; i <= 60; i++) {
      // 1.4 m a second, walking north: path length and displacement agree.
      state = accept(
        state,
        fix({ t: T0 + 3000 + i * 1000, distFromPrev: 1.4, lat: 48.4728 + i * 0.0000126 }),
      );
    }
    expect(state.paused).toBe(false);
    expect(state.distanceM).toBeCloseTo(60 * 1.4, 1);
    expect(state.movingMs).toBe(60_000);
  });
});

/**
 * The pace floor, which is what the pause rule really is.
 *
 * `movingThresholdM / pauseAfterMs` is a speed: below it the anchor is never cleared before the
 * stillness timer fires, and every fix in between is credited neither ground nor seconds. The
 * first pair encoded 1.0 m/s and silently ate a quarter of a half-hour walk at 0.8 — the pace of
 * the hill, the dog and the eighty-year-old that "La Ronde du Veilleur" invites by name.
 */
describe("slow walks", () => {
  const HALF_HOUR = 1800;
  const within5pc = (credited: number, real: number) =>
    expect(Math.abs(credited - real) / real).toBeLessThan(0.05);

  test("the floor pace the two values encode stays under a slow walk", () => {
    expect((RULES.movingThresholdM / RULES.pauseAfterMs) * 1000).toBeLessThan(0.4);
  });

  test("half an hour at 0.8 m/s is credited as half an hour at 0.8 m/s", () => {
    const state = walked(0.8, HALF_HOUR);
    expect(state.paused).toBe(false);
    within5pc(state.distanceM, 0.8 * HALF_HOUR);
    within5pc(state.movingMs, HALF_HOUR * 1000);
  });

  test("0.4 m/s, which is a walking frame or a very old hero, does not collapse either", () => {
    const state = walked(0.4, HALF_HOUR);
    within5pc(state.distanceM, 0.4 * HALF_HOUR);
    within5pc(state.movingMs, HALF_HOUR * 1000);
  });

  test("and the fast walk it was always right about is unchanged", () => {
    const state = walked(1.4, HALF_HOUR);
    within5pc(state.distanceM, 1.4 * HALF_HOUR);
    expect(state.movingMs).toBe(HALF_HOUR * 1000);
  });

  test("drift on a table is still not a walk, three quarters of an hour later", () => {
    let state = started();
    for (let i = 1; i <= 2700; i++) {
      state = accept(
        state,
        fix({
          t: walkEnd(i),
          distFromPrev: 0.2,
          lat: 48.4728 + (i % 2 === 0 ? 0.00001 : -0.00001),
        }),
      );
    }
    expect(state.paused).toBe(true);
    // Three quarters of an hour of a receiver talking to itself, and the tally is a zero: not
    // the 540 m a raw sum would have invented, and not the window of doubt either.
    expect(state.distanceM).toBe(0);
    expect(state.movingMs).toBe(0);
  });

  test("a ten-minute stop is a stop, and the clock does not run through it", () => {
    let state = walked(1.4, 60);
    const moving = state.movingMs;
    const lat = 48.4728 + northOf(60 * 1.4);
    for (let i = 1; i <= 600; i++) {
      state = accept(state, fix({ t: walkEnd(60 + i), distFromPrev: 0, lat }));
    }
    expect(state.paused).toBe(true);
    // Ten minutes standing adds nothing, and the window that decided it was standing gives back
    // what it had advanced — so the clock can only have gone the other way.
    expect(state.movingMs).toBeLessThanOrEqual(moving);
  });
});

/**
 * What a stop costs, which is what the window is really for.
 *
 * A fix is credited as it lands — the panel's figures have to move every second — so before the
 * refund the whole window sat in `movingMs` by the time the pause engaged, and nothing took it
 * back. At a floor pace of 0.25 m/s that is 40 s of standing per stop, and an urban walk stops
 * at every crossing.
 *
 * These simulate the real reducer at 1 Hz, because that is the only way to see a rule that only
 * exists across a run of fixes.
 */
describe("stops", () => {
  /** Standing: the receiver keeps talking, the hero does not move. */
  function stood(seconds: number, at: number, from: TrackState): TrackState {
    let state = from;
    const lat = 48.4728 + northOf(at);
    const startedAt = state.lastAt ?? T0;
    for (let i = 1; i <= seconds; i++) {
      state = accept(
        state,
        fix({
          t: startedAt + i * 1000,
          distFromPrev: 0.2,
          lat: lat + (i % 2 === 0 ? 0.00001 : -0.00001),
        }),
      );
    }
    return state;
  }

  /** Walking on from where the last fix left off, at a pace, for a number of seconds. */
  function walkOn(speedMs: number, seconds: number, from: number, state0: TrackState): TrackState {
    let state = state0;
    const startedAt = state.lastAt ?? T0;
    for (let i = 1; i <= seconds; i++) {
      state = accept(
        state,
        fix({
          t: startedAt + i * 1000,
          distFromPrev: speedMs,
          lat: 48.4728 + northOf(from + i * speedMs),
        }),
      );
    }
    return state;
  }

  test("a hard stop is not paid for, however the window falls around it", () => {
    // Ten minutes out, two minutes at a level crossing, ten minutes home.
    let state = walked(1.4, 600);
    state = stood(120, 600 * 1.4, state);
    state = walkOn(1.4, 600, 600 * 1.4, state);

    const walking = 1200 * 1000;
    // Not one second of the two minutes is in there. It used to be forty of them.
    expect(state.movingMs).toBeLessThanOrEqual(walking);
    // And the walk itself is still nearly all of it: what a stop costs now is the ramp that was
    // in flight when it happened, at 1.4 m/s about seven seconds either side of it.
    expect(walking - state.movingMs).toBeLessThan(20_000);
    expect(state.distanceM).toBeLessThanOrEqual(1200 * 1.4);
  });

  test("half an hour of an urban walk credits no part of its fifteen stops", () => {
    // 15 crossings of a minute each inside half an hour: 900 s walking, 900 s standing. The old
    // rule paid ten of those fifteen minutes as movement, and about 120 m of drift as ground.
    let state = started();
    let covered = 0;
    for (let i = 0; i < 15; i++) {
      state = walkOn(1.4, 60, covered, state);
      covered += 60 * 1.4;
      state = stood(60, covered, state);
    }

    expect(state.movingMs).toBeLessThanOrEqual(900_000);
    expect(state.distanceM).toBeLessThanOrEqual(900 * 1.4);
    // Still recognisably the walk that happened, rather than a rule that refuses everything.
    expect(state.movingMs).toBeGreaterThan(700_000);
  });

  test("a stop shorter than the window is still a stop the rule cannot see", () => {
    // Written down because it is the ceiling of this pair, not an accident: a displacement test
    // over 40 s cannot tell 30 s of standing from 40 s of walking at the floor pace. Shortening
    // the window is what would find it, and the floor pace is what pays for that.
    let state = walked(1.4, 600);
    const moving = state.movingMs;
    state = stood(30, 600 * 1.4, state);
    state = walkOn(1.4, 60, 600 * 1.4, state);

    expect(state.paused).toBe(false);
    expect(state.movingMs - moving).toBeGreaterThan(60_000);
  });
});

/**
 * `fix.t` is `Location.getTime()`: the system clock, which NTP moves under a walk, and the module
 * says in as many words that callers keep their own monotonic guard. This is the caller.
 */
describe("holes in time", () => {
  const walkedTen = () => walked(1.4, 10);
  // Twenty metres past the last fix, which clears the anchor: the guard has to be what refuses
  // the gap, not the pause rule refusing it by accident on a fix that went nowhere.
  const pastTheGap = (offsetMs: number) =>
    fix({ t: walkEnd(10) + offsetMs, distFromPrev: 20, lat: 48.4728 + northOf(10 * 1.4 + 20) });

  test("an NTP jump forward is not an hour of walking", () => {
    const before = walkedTen();
    const state = accept(before, pastTheGap(3_600_000));
    expect(state.movingMs).toBe(before.movingMs);
    expect(state.distanceM).toBe(before.distanceM);
  });

  test("a jump backwards takes away neither seconds nor metres already earned", () => {
    const before = walkedTen();
    const state = accept(before, pastTheGap(-3_600_000));
    expect(state.movingMs).toBe(before.movingMs);
    expect(state.distanceM).toBe(before.distanceM);
  });

  test("ten minutes underground is not ten minutes of walking, however short the jump", () => {
    const before = walkedTen();
    // 150 m from the mouth of the tunnel: under `teleportM`, so only the time guard sees it.
    const state = accept(
      before,
      fix({ t: walkEnd(10) + 600_000, distFromPrev: 150, lat: 48.4728 + northOf(160) }),
    );
    expect(state.movingMs).toBe(before.movingMs);
    expect(state.distanceM).toBe(before.distanceM);
    expect(state.segments).toBe(2);
  });

  test("the next fix after the hole walks again, off the new anchor", () => {
    let state = accept(walkedTen(), pastTheGap(600_000));
    for (let i = 1; i <= 30; i++) {
      state = accept(
        state,
        fix({
          t: walkEnd(10) + 600_000 + i * 1000,
          distFromPrev: 1.4,
          lat: 48.4728 + northOf(10 * 1.4 + 20 + i * 1.4),
        }),
      );
    }
    expect(state.movingMs).toBe(10_000 + 30_000);
    expect(state.paused).toBe(false);
  });
});

describe("teleports", () => {
  test("a jump is not distance, and it breaks the line", () => {
    let state = started();
    state = accept(state, fix({ t: T0 + 4000, distFromPrev: 5 }));
    const before = state.distanceM;
    state = accept(state, fix({ t: T0 + 5000, distFromPrev: 900 }));
    expect(state.distanceM).toBe(before);
    expect(state.segments).toBe(2);
  });

  test("the fix after a jump anchors there, so the jump cannot resume the clock either", () => {
    let state = started();
    state = accept(state, fix({ t: T0 + 5000, distFromPrev: 900 }));
    expect(state.fromAnchorM).toBe(0);
  });
});

/**
 * The difference between "you covered nothing" and "nobody was watching".
 *
 * XP for an outing is bounded by moving seconds, which is what makes a phone on a windowsill
 * worth nothing. Read naively that same rule pays the XP floor to a hero who declined the
 * location prompt, or whose phone has no GPS, or who spent an hour under trees that never let a
 * fix land - people the panel has already told the tracking is off, and who then get an hour of
 * real walking priced at ten XP with nothing saying why. Null is how the caller learns to stop
 * asking and use the clock instead.
 */
describe("what a run credits", () => {
  test("is nothing at all before a single fix has locked", () => {
    expect(credited(EMPTY)).toBeNull();
  });

  test("is still nothing when fixes arrived but the gate never opened", () => {
    // Every fix too vague to trust: this is a phone in a pocket under cover for an hour.
    const vague = run([
      fix({ t: T0, acc: 40 }),
      fix({ t: T0 + 1000, acc: 55 }),
      fix({ t: T0 + 3000, acc: 48 }),
    ]);
    expect(vague.startedAt).toBeNull();
    expect(credited(vague)).toBeNull();
  });

  test("is a real zero once the gate has opened and nothing moved", () => {
    // The windowsill. The app *was* watching, and what it saw was a phone that stayed put.
    const credit = credited(started());
    expect(credit).not.toBeNull();
    expect(credit?.movingSeconds).toBe(0);
  });

  test("times the outing by its own trace, first fix to last", () => {
    // The half this file owns of the bug the victory screen showed: a walk the OS killed at 45
    // minutes and resumed for ten more has a session clock that reads ten — recovery banks the
    // downtime as pause — and a trace that reads the whole thing. `saveSession` reads this.
    const state = walked(1.4, 600);
    expect(credited(state)?.elapsedSeconds).toBe(600);
    // And it is the trace's own span, not the wall clock's: a session that started ten minutes
    // before the first fix locked is not credited those ten minutes.
    expect(credited(state)?.elapsedSeconds).toBe(
      Math.floor(((state.lastAt ?? 0) - (state.startedAt ?? 0)) / 1000),
    );
  });

  test("is metres and whole seconds once the hero is walking", () => {
    let state = started();
    for (let i = 1; i <= 10; i += 1) {
      state = accept(state, fix({ t: T0 + 3000 + i * 1000, distFromPrev: 1.4 }));
    }
    // Whole metres and whole seconds, off the reducer's own reading rather than a second sum:
    // the road and the recap have to be paid the same number the panel showed.
    const credit = credited(state);
    expect(credit?.leaguesM).toBe(Math.round(state.distanceM));
    expect(credit?.leaguesM).toBeGreaterThan(0);
    expect(credit?.movingSeconds).toBe(Math.floor(state.movingMs / 1000));
  });
});
