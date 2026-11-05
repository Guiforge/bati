import { TRIVIAL_SESSION_SECONDS } from "../constants/sessionFloor";
import { DEFAULT_WEEKLY_QUOTA, weeklyGoal } from "../constants/weeklyTargets";
import {
  countedPainStops,
  countsForPlay as countsWith,
  ladderNeutralSets,
  type PainStop,
  type PlayContext,
  type PlaySession,
  type PlaySet,
} from "../db/completed";

jest.mock("../db/client", () => ({ db: {}, schema: {} }));
jest.mock("../db/preferences", () => ({}));

const set = (over: Partial<PlaySet> = {}): PlaySet => ({
  exerciseId: 1,
  roundIndex: 0,
  sortOrder: 0,
  resultValue: 10,
  targetValue: 10,
  prescribedValue: 10,
  ladderNeutral: false,
  lightWeekNeutral: false,
  sides: 1,
  perSide: false,
  ...over,
});

const NOTHING: PlayContext = { ladder: new Map(), painStops: [] };
const countsForPlay = (session: PlaySession, context = NOTHING) => countsWith(session, context);

const workout = (over: Partial<PlaySession> = {}): PlaySession => ({
  uuid: "s",
  stopReason: null,
  outing: null,
  byHand: null,
  durationSeconds: 600,
  movingSeconds: null,
  leaguesM: null,
  sets: [set(), set()],
  ...over,
});

const outing = (over: Partial<PlaySession> = {}): PlaySession => ({
  uuid: "o",
  stopReason: null,
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

  test("a light week's set counts at its goal, a movement left that same week does not", () => {
    const light = set({ ladderNeutral: true, lightWeekNeutral: true });
    expect(countsForPlay(workout({ sets: [light] }))).toBe(true);
    // The goal itself still has to be met.
    expect(countsForPlay(workout({ sets: [{ ...light, resultValue: 5 }] }))).toBe(false);
    const left = set({ ladderNeutral: true, lightWeekNeutral: false });
    expect(countsForPlay(workout({ sets: [light, left] }))).toBe(false);
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
  const session = (rows: ReturnType<typeof row>[], rounds: number, resultValue = 10) => {
    const flags = ladderNeutralSets(rows, rounds);
    return workout({
      sets: rows.map(({ exerciseId, roundIndex, sortOrder }, i) =>
        set({ exerciseId, roundIndex, sortOrder, resultValue, ladderNeutral: flags[i] ?? false }),
      ),
    });
  };
  // 1 is the hardest, 2 its easier rung, 3 under that. 4 is on no ladder with them.
  const LADDER: PlayContext = {
    ladder: new Map([
      [1, 2],
      [2, 3],
      [3, null],
      [4, null],
    ]),
    painStops: [],
  };

  test("every round done counts", () => {
    expect(countsForPlay(session([row(0, 1), row(1, 1), row(2, 1)], 3))).toBe(true);
  });

  test("a round skipped does not, the last one included, which leaves no row", () => {
    expect(countsForPlay(session([row(0, 1), row(2, 1)], 3))).toBe(false);
    expect(countsForPlay(session([row(0, 1), row(1, 1)], 3))).toBe(false);
  });

  const swap = (to: number) => [row(0, 1), row(1, to, 0, 1), row(2, to, 0, 1)];

  test("an easier rung reached counts, one rung down or two", () => {
    expect(countsForPlay(session(swap(2), 3), LADDER)).toBe(true);
    expect(countsForPlay(session(swap(3), 3), LADDER)).toBe(true);
    const twice = [row(0, 1), row(1, 2, 0, 1), row(2, 3, 0, 2)];
    expect(countsForPlay(session(twice, 3), LADDER)).toBe(true);
  });

  test("an easier rung not reached does not", () => {
    const short = session(swap(2), 3);
    const sets = short.sets.map((s) => (s.exerciseId === 2 ? { ...s, resultValue: 9 } : s));
    expect(countsForPlay({ ...short, sets }, LADDER)).toBe(false);
  });

  test("an easier rung skipped on a round does not", () => {
    expect(countsForPlay(session([row(0, 1), row(1, 2, 0, 1)], 3), LADDER)).toBe(false);
    expect(countsForPlay(session([row(0, 1), row(2, 2, 0, 1)], 3), LADDER)).toBe(false);
  });

  test("a harder or an unrelated swap keeps today's rule", () => {
    const harder = [row(0, 2), row(1, 1, 0, 1), row(2, 1, 0, 1)];
    expect(countsForPlay(session(harder, 3), LADDER)).toBe(false);
    expect(countsForPlay(session(swap(4), 3), LADDER)).toBe(false);
  });

  test("gone down and back up to the planned one is a movement left, as the rule says", () => {
    const back = [row(0, 1), row(1, 2, 0, 1), row(2, 1, 0, 1)];
    expect(countsForPlay(session(back, 3), LADDER)).toBe(false);
  });

  test("a ladder that loops ends the walk instead of hanging", () => {
    const loop: PlayContext = {
      ladder: new Map([
        [1, 2],
        [2, 1],
      ]),
      painStops: [],
    };
    expect(countsForPlay(session(swap(4), 3), loop)).toBe(false);
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

describe("countsForPlay, the pain stop", () => {
  const PARIS = 60;
  const on = (day: string, uuid = day, tzOffsetMin = PARIS): PainStop => ({
    uuid,
    tzOffsetMin,
    // Noon, on the hero's own clock.
    performedAt: new Date(`${day}T12:00:00${tzOffsetMin === PARIS ? "+01:00" : "-05:00"}`),
  });
  const counted = (...stops: PainStop[]) => [...countedPainStops(stops)].sort();
  const stopped = (uuid: string) =>
    workout({ uuid, stopReason: "pain", durationSeconds: 20, sets: [set({ resultValue: 1 })] });

  test("counts though no goal was reached and the clock is short", () => {
    const stop = on("2026-11-02");
    expect(countsForPlay(stopped(stop.uuid), { ...NOTHING, painStops: [stop] })).toBe(true);
  });

  test("a second one inside the seven days counts nothing, and the normal rule does not rescue it", () => {
    const stops = [on("2026-11-02"), on("2026-11-05")];
    const second = workout({ uuid: "2026-11-05", stopReason: "pain" });
    expect(countsForPlay(second, { ...NOTHING, painStops: stops })).toBe(false);
  });

  test("the edge: day six is inside the window, day seven starts a new one", () => {
    expect(counted(on("2026-11-02"), on("2026-11-08"))).toEqual(["2026-11-02"]);
    expect(counted(on("2026-11-02"), on("2026-11-09"))).toEqual(["2026-11-02", "2026-11-09"]);
  });

  test("the window is local days, not hours: 23:50 then 00:10 seven days on", () => {
    const late = {
      uuid: "a",
      tzOffsetMin: PARIS,
      performedAt: new Date("2026-11-02T23:50:00+01:00"),
    };
    const early = {
      uuid: "b",
      tzOffsetMin: PARIS,
      performedAt: new Date("2026-11-09T00:10:00+01:00"),
    };
    expect(counted(late, early)).toEqual(["a", "b"]);
  });

  test("a stop that did not count does not push the next one back", () => {
    const stops = [on("2026-11-02"), on("2026-11-07"), on("2026-11-09")];
    expect(counted(...stops)).toEqual(["2026-11-02", "2026-11-09"]);
  });

  test("two devices that merged agree, whichever order the rows came in", () => {
    const phone = on("2026-11-02", "a");
    const tablet = on("2026-11-02", "b");
    const later = on("2026-11-05", "c");
    expect(counted(phone, tablet, later)).toEqual(["a"]);
    expect(counted(later, tablet, phone)).toEqual(["a"]);
    // A stop from the other device, older than the one this device had counted, takes its place.
    expect(counted(later)).toEqual(["c"]);
    expect(counted(later, phone)).toEqual(["a"]);
  });

  test("each device's day is the one its own row wrote down", () => {
    const newYork = on("2026-11-02", "ny", -300);
    expect(counted(newYork, on("2026-11-09", "paris"))).toEqual(["ny", "paris"]);
  });

  test("a stop written by hand still never counts", () => {
    const stop = on("2026-11-02");
    const typed = workout({ uuid: stop.uuid, stopReason: "pain", byHand: "session" });
    expect(countsForPlay(typed, { ...NOTHING, painStops: [stop] })).toBe(false);
  });
});

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
