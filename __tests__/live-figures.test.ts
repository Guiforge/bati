import { DEFAULT_VIEW, type OutingView } from "@/constants/outingDisplay";
import {
  type FigureContext,
  figureText,
  LAP_START,
  nextLap,
  resolvePlaces,
  screenStaysOn,
} from "@/src/gps/liveFigures";
import { EMPTY, type OutingGoal } from "@/src/gps/track";

const MOVING = { ...EMPTY, startedAt: 1, lastAt: 600_000, movingMs: 600_000, distanceM: 2500 };

function ctx(over: Partial<FigureContext> = {}): FigureContext {
  return {
    track: MOVING,
    recordedSeconds: 600,
    recentSpeedMps: null,
    goal: null,
    goalReached: false,
    unit: "metric",
    language: "en",
    rate: "pace",
    walkRun: false,
    lapFromMs: null,
    ...over,
  };
}
const view = (over: Partial<OutingView> = {}): OutingView => ({ ...DEFAULT_VIEW, ...over });
const climbing = { ...MOVING, climbFrom: 100, ascentM: 85 };

describe("resolvePlaces", () => {
  test("the default view is today's panel: clock, then distance, climb and rate", () => {
    expect(resolvePlaces(view(), ctx({ track: climbing }))).toEqual({
      big: "time",
      bigLabelled: false,
      small: ["distance", "climb", "rate"],
    });
  });

  test("a distance goal leads with the distance and the other small is the clock", () => {
    const goal: OutingGoal = { type: "distance", metres: 5000 };
    expect(resolvePlaces(view(), ctx({ goal, track: climbing }))).toMatchObject({
      big: "distance",
      small: ["time", "climb", "rate"],
    });
  });

  test("acquiring forces the clock in big and hides every small, whatever was chosen", () => {
    const acquiring = ctx({ track: EMPTY, goal: { type: "distance", metres: 5000 } });
    expect(resolvePlaces(view({ big: "rate" }), acquiring)).toEqual({
      big: "time",
      bigLabelled: true,
      small: [],
    });
  });

  test("a walk-run drops the rate and the average from big and from the smalls", () => {
    const places = resolvePlaces(
      view({ big: "rateAvg", small: ["rate", "rateAvg", "distance"] }),
      ctx({ walkRun: true }),
    );
    expect(places.big).toBe("time");
    expect(places.small).toEqual(["distance"]);
  });

  test("the climb is absent without a height, and remaining without a goal or once reached", () => {
    const smalls = view({ small: ["climb", "remaining", "distance"] });
    expect(resolvePlaces(smalls, ctx()).small).toEqual(["distance"]);
    const goal: OutingGoal = { type: "time", seconds: 1200 };
    expect(resolvePlaces(smalls, ctx({ goal, track: climbing })).small).toEqual([
      "climb",
      "remaining",
      "distance",
    ]);
    expect(resolvePlaces(smalls, ctx({ goal, track: climbing, goalReached: true })).small).toEqual([
      "climb",
      "distance",
    ]);
  });

  test("the big and duplicates are removed from the smalls, nothing is shown twice", () => {
    const places = resolvePlaces(
      view({ big: "rate", small: ["rate", "distance", "distance"] }),
      ctx(),
    );
    expect(places.big).toBe("rate");
    expect(places.small).toEqual(["distance"]);
  });

  test("null leaves a place empty", () => {
    expect(resolvePlaces(view({ small: [null, "distance", null] }), ctx()).small).toEqual([
      "distance",
    ]);
  });

  test("auto in a small place is the one of time and distance the big is not", () => {
    expect(resolvePlaces(view({ big: "time", small: ["auto", null, null] }), ctx()).small).toEqual([
      "distance",
    ]);
    expect(
      resolvePlaces(view({ big: "distance", small: ["auto", null, null] }), ctx()).small,
    ).toEqual(["time"]);
    // A big that is neither leaves the one the goal does not lead with.
    expect(resolvePlaces(view({ big: "rate", small: ["auto", null, null] }), ctx()).small).toEqual([
      "distance",
    ]);
  });

  test("bigLabelled is true exactly when the hero chose the big place", () => {
    expect(resolvePlaces(view({ big: "auto" }), ctx()).bigLabelled).toBe(false);
    expect(resolvePlaces(view({ big: "time" }), ctx()).bigLabelled).toBe(true);
  });
});

describe("figureText", () => {
  test("the live rate is the last twenty seconds, the notification's is the average", () => {
    const fast = ctx({ recentSpeedMps: 5 });
    expect(figureText("rate", fast, true)).toBe("3:20 /km");
    expect(figureText("rate", fast, false)).toBe("4:00 /km");
    expect(figureText("rateAvg", fast, true)).toBe("4:00 /km");
  });

  test("the locomotion of the view decides the word and unit of the rate", () => {
    expect(figureText("rateAvg", ctx({ rate: "speed" }), true)).toBe("15.0 km/h");
  });

  test("remaining counts down the distance, or the moving time", () => {
    expect(figureText("remaining", ctx({ goal: { type: "distance", metres: 5000 } }), true)).toBe(
      "2.50 km",
    );
    expect(figureText("remaining", ctx({ goal: { type: "time", seconds: 900 } }), true)).toBe(
      "5:00",
    );
  });
});

describe("screenStaysOn", () => {
  const pure = { exercises: [{ exercise: { style: "expedition" as const } }] };
  const mixed = {
    exercises: [
      { exercise: { style: "expedition" as const } },
      { exercise: { style: "strength" as const } },
    ],
  };

  test("a pure outing only when the hero chose it, a mixed quest always", () => {
    expect(screenStaysOn(pure, { keepAwake: false })).toBe(false);
    expect(screenStaysOn(pure, { keepAwake: true })).toBe(true);
    expect(screenStaysOn(mixed, { keepAwake: false })).toBe(true);
  });
});

describe("the current league", () => {
  const at = (distanceM: number, movingMs: number) => ({ ...MOVING, distanceM, movingMs });

  test("nextLap moves at a crossing and only forward", () => {
    expect(nextLap(LAP_START, at(900, 600_000))).toBe(LAP_START);
    const crossed = nextLap(LAP_START, at(1004, 700_000));
    expect(crossed).toEqual({ league: 1, fromMs: 700_000 });
    // A refund that brings the distance back under the league leaves the mark where it was.
    expect(nextLap(crossed, at(990, 690_000))).toBe(crossed);
    expect(nextLap(crossed, at(2100, 900_000))).toEqual({ league: 2, fromMs: 900_000 });
  });

  test("is kept in its place, with a dash where there is no live lap", () => {
    const places = resolvePlaces(view({ small: ["lap", null, null] }), ctx({ lapFromMs: null }));
    expect(places.small).toEqual(["lap"]);
    expect(figureText("lap", ctx({ lapFromMs: null }), true)).toBe("-");
    expect(figureText("lap", ctx({ lapFromMs: 250_000 }), true)).toBe("5:50");
  });

  test("never reads under zero", () => {
    expect(figureText("lap", ctx({ lapFromMs: 700_000 }), true)).toBe("0:00");
  });
});
