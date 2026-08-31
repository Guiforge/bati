import type { LocationFix } from "@/modules/bati-location";
import { accept, EMPTY, RULES, type TrackState } from "@/src/gps/track";

const T0 = Date.UTC(2026, 7, 31, 15, 0, 0);

const fix = (over: Partial<LocationFix> & { t: number }): LocationFix => ({
  lat: 48.4728,
  lon: -2.4943,
  ele: 110,
  acc: 4,
  speed: 1.4,
  bearing: 0,
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
    // Ten seconds of doubt before the pause engages, then nothing.
    expect(state.distanceM).toBeLessThan(RULES.movingThresholdM);
    expect(state.distanceM).toBeGreaterThan(0);
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
    expect(state.movingMs).toBeLessThanOrEqual(RULES.pauseAfterMs);
  });

  test("walking again resumes on the first fix that clears the anchor", () => {
    let state = started();
    for (let i = 1; i <= 30; i++) {
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
    state = accept(state, fix({ t: T0 + 34_000, distFromPrev: 12, lat: 48.4730 }));
    expect(state.paused).toBe(false);
    expect(state.distanceM).toBeGreaterThan(12);
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
