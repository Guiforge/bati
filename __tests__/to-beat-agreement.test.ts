import assert from "node:assert/strict";

import { tonightLine } from "@/components/home/tonightLine";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * D-21: one "to beat" rule, the wall's `toBeat`. The wall reads it off its entry, the set and
 * Home off the ghost through `beatInputOf`, and the victory's record line is the same rule by
 * construction (a record is a strict `>` of the previous best, which is `value >= best + 1`).
 * One journal feeds all of them here, so a drift in any reader shows as two different numbers.
 */
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const { getRecordWall } = require("../db/journal") as typeof import("../db/journal");
const { getExerciseHistory, ghostKey, checkForNewRecords } =
  require("../db/personalRecords") as typeof import("../db/personalRecords");
const { beatInputOf, toBeat } = require("../db/progress") as typeof import("../db/progress");
const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

const DAY = 86_400;
const NOW_S = Math.floor(Date.now() / 1000);
const NOW = new Date(NOW_S * 1000);
const CRUNCH = 6;
const JACK = 17;

function session(exerciseId: number, value: number, daysAgo: number): number {
  const at = NOW_S - daysAgo * DAY;
  const id = Number(
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(at).lastInsertRowid,
  );
  t.sqlite
    .prepare(
      `INSERT INTO completed_exercises
         (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
          targetValue, performedAt)
       VALUES (?, ?, 0, 0, 'reps', ?, 'reps', ?, ?)`,
    )
    .run(id, exerciseId, value, value, at);
  return id;
}

beforeEach(() => {
  t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
  // Crunch: a recent record of 15, last 12. Jumping Jack: a record of 40 a hundred days ago, and
  // a season (the last 90 days) that peaked at 12.
  session(CRUNCH, 15, 30);
  session(CRUNCH, 12, 5);
  session(JACK, 40, 100);
  session(JACK, 10, 20);
  session(JACK, 12, 5);
});

afterAll(() => t.close());

test("the wall and the set give the same number, Home the session objective, for a recent record and an old one", async () => {
  const wall = await getRecordWall(6);
  const history = await getExerciseHistory([CRUNCH, JACK]);
  const catalogue = await listExercises();

  for (const [id, expected] of [
    [CRUNCH, 16],
    [JACK, 13],
  ] as const) {
    const entry = wall.find((e) => e.exerciseId === id);
    assert(entry);
    const ghost = history.get(ghostKey(id, "reps"));
    assert(ghost);
    const exercise = catalogue.find((e) => e.id === id);
    assert(exercise);

    const onWall = toBeat(entry, NOW);
    const onSet = toBeat(beatInputOf(ghost), NOW);
    const onHome = tonightLine(
      { exercises: [{ id: 1, exercise, images: [], target: { type: "reps", value: 13 }, ghost }] },
      "en",
    )?.value;

    expect(onWall).toBe(expected);
    expect(onSet).toBe(expected);
    // Home says the session objective, not the record to beat (PARK-1).
    expect(onHome).toBe(13);
  }
});

test("the victory names a record exactly when the set reached the number to beat", async () => {
  const ghost = (await getExerciseHistory([CRUNCH])).get(ghostKey(CRUNCH, "reps"));
  assert(ghost);
  const target = toBeat(beatInputOf(ghost), NOW);

  const short = session(CRUNCH, target - 1, 0);
  expect((await checkForNewRecords(short)).some((r) => r.exerciseId === CRUNCH)).toBe(false);

  const reached = session(CRUNCH, target, 0);
  const records = await checkForNewRecords(reached);
  expect(records.find((r) => r.exerciseId === CRUNCH)).toMatchObject({
    newValue: target,
    previousValue: ghost.best,
  });
});
