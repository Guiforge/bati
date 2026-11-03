import { TRIVIAL_SESSION_SECONDS } from "../constants/sessionFloor";
import { DEFAULT_WEEKLY_QUOTA, weeklyGoal } from "../constants/weeklyTargets";
import { countsForPlay, ladderNeutralSets, type PlaySession, type PlaySet } from "../db/completed";

jest.mock("../db/client", () => ({ db: {}, schema: {} }));
jest.mock("../db/preferences", () => ({}));

const set = (over: Partial<PlaySet> = {}): PlaySet => ({
  resultValue: 10,
  targetValue: 10,
  prescribedValue: 10,
  ladderNeutral: false,
  sides: 1,
  perSide: false,
  ...over,
});

const workout = (over: Partial<PlaySession> = {}): PlaySession => ({
  outing: null,
  byHand: null,
  durationSeconds: 600,
  movingSeconds: null,
  leaguesM: null,
  sets: [set(), set()],
  ...over,
});

const outing = (over: Partial<PlaySession> = {}): PlaySession => ({
  outing: "walk",
  byHand: null,
  durationSeconds: 900,
  movingSeconds: 800,
  leaguesM: 1500,
  sets: [],
  ...over,
});

describe("countsForPlay, a bodyweight session", () => {
  test("over the threshold, every set at its goal", () => {
    expect(countsForPlay(workout())).toBe(true);
    expect(countsForPlay(workout({ durationSeconds: TRIVIAL_SESSION_SECONDS }))).toBe(true);
  });

  test("not under the threshold, however good the sets", () => {
    expect(countsForPlay(workout({ durationSeconds: TRIVIAL_SESSION_SECONDS - 1 }))).toBe(false);
    expect(countsForPlay(workout({ durationSeconds: null }))).toBe(false);
  });

  test("not when one set fell short of what was proposed", () => {
    expect(countsForPlay(workout({ sets: [set(), set({ resultValue: 9 })] }))).toBe(false);
  });

  test("the proposal is what the app prescribed, not a target the hero lowered", () => {
    const lowered = set({ prescribedValue: 12, targetValue: 8, resultValue: 8 });
    expect(countsForPlay(workout({ sets: [lowered] }))).toBe(false);
  });

  test("a row older than 0070 falls back on its target; a row with neither has no goal", () => {
    const old = set({ prescribedValue: null, targetValue: 10 });
    expect(countsForPlay(workout({ sets: [old] }))).toBe(true);
    const none = set({ prescribedValue: null, targetValue: null });
    expect(countsForPlay(workout({ sets: [none] }))).toBe(false);
  });

  test("not when a movement was left on the way, which only the flag can say", () => {
    expect(countsForPlay(workout({ sets: [set(), set({ ladderNeutral: true })] }))).toBe(false);
  });

  test("a lightened quest in a light week does count: the flag means nothing there", () => {
    const light = workout({ sets: [set({ ladderNeutral: true })] });
    expect(countsForPlay(light)).toBe(false);
    expect(countsForPlay(light, true)).toBe(true);
    // The goal itself still has to be met.
    const short = workout({ sets: [set({ ladderNeutral: true, resultValue: 5 })] });
    expect(countsForPlay(short, true)).toBe(false);
  });

  test("a per-side hold stopped before its second side is half the set", () => {
    expect(countsForPlay(workout({ sets: [set({ perSide: true, sides: 1 })] }))).toBe(false);
    expect(countsForPlay(workout({ sets: [set({ perSide: true, sides: 2 })] }))).toBe(true);
  });

  test("a session with no sets reached nothing", () => {
    expect(countsForPlay(workout({ sets: [] }))).toBe(false);
  });
});

/** The rows as `createCompletedSession` flags them, so the flag here is the real rule's. */
describe("countsForPlay, through the real ladderNeutralSets", () => {
  const row = (roundIndex: number, exerciseId: number, sortOrder = 0, swappedIn?: number) => ({
    exerciseId,
    roundIndex,
    sortOrder,
    swappedIn,
    result: { type: "reps" as const, value: 10 },
    target: { type: "reps" as const, value: 10 },
    prescribed: 10,
  });
  const session = (rows: ReturnType<typeof row>[], rounds: number) => {
    return workout({
      sets: ladderNeutralSets(rows, rounds).map((ladderNeutral) => set({ ladderNeutral })),
    });
  };

  test("every round done counts", () => {
    expect(countsForPlay(session([row(0, 1), row(1, 1), row(2, 1)], 3))).toBe(true);
  });

  test("a round skipped does not, the last one included, which leaves no row", () => {
    expect(countsForPlay(session([row(0, 1), row(2, 1)], 3))).toBe(false);
    expect(countsForPlay(session([row(0, 1), row(1, 1)], 3))).toBe(false);
  });

  // Pinned, not endorsed: a hero who swaps to an easier movement mid-session does not count today.
  // Guillaume's to settle (docs/designs/multiplayer/STATE.md), and the rows do not say "easier".
  test("a movement swapped mid-session does not count, the one it left being left", () => {
    expect(countsForPlay(session([row(0, 1), row(1, 2, 0, 1), row(2, 2, 0, 1)], 3))).toBe(false);
  });
});

describe("countsForPlay, an outing", () => {
  test("more than two minutes and at least a kilometre", () => {
    expect(countsForPlay(outing())).toBe(true);
    expect(countsForPlay(outing({ leaguesM: 1000 }))).toBe(true);
    expect(countsForPlay(outing({ movingSeconds: 121 }))).toBe(true);
  });

  test("not at two minutes exactly, nor short of the kilometre", () => {
    expect(countsForPlay(outing({ movingSeconds: 120 }))).toBe(false);
    expect(countsForPlay(outing({ leaguesM: 999 }))).toBe(false);
    expect(countsForPlay(outing({ leaguesM: null }))).toBe(false);
  });

  test("moving time when it exists, the clock when no fix ever locked", () => {
    expect(countsForPlay(outing({ movingSeconds: 60, durationSeconds: 900 }))).toBe(false);
    expect(countsForPlay(outing({ movingSeconds: null, durationSeconds: 900 }))).toBe(true);
  });
});

describe("countsForPlay, what the hero typed", () => {
  test("a session written down never counts, nor a typed distance", () => {
    expect(countsForPlay(workout({ byHand: "session" }))).toBe(false);
    expect(countsForPlay(outing({ byHand: "distance" }))).toBe(false);
  });
});

test.todo("TODO(r1-pain-stop): a pain stop counts at most once per rolling week");
test.todo("TODO(r1-imported-outing): an imported outing counts only with a trace, after dedup");

describe("weeklyGoal", () => {
  test("the baseline with no oath, or one that is not weekly", () => {
    expect(weeklyGoal(null)).toBe(DEFAULT_WEEKLY_QUOTA);
    expect(weeklyGoal(undefined)).toBe(DEFAULT_WEEKLY_QUOTA);
    expect(weeklyGoal(JSON.stringify({ metric: "sessions", target: 1000 }))).toBe(
      DEFAULT_WEEKLY_QUOTA,
    );
  });

  test("the oath's own number when it swore a week", () => {
    const oath = { metric: "weekly_sessions", weeklyTarget: 4 };
    expect(weeklyGoal(JSON.stringify(oath))).toBe(4);
  });

  test("never below one, never a mangled value", () => {
    const zero = { metric: "weekly_sessions", weeklyTarget: 0 };
    expect(weeklyGoal(JSON.stringify(zero))).toBe(1);
    expect(weeklyGoal("{not json")).toBe(DEFAULT_WEEKLY_QUOTA);
    expect(weeklyGoal("3")).toBe(DEFAULT_WEEKLY_QUOTA);
  });
});
