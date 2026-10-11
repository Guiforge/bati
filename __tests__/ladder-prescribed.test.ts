import type { CompletedExerciseInput } from "@/db/completed";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * What the ladder judges since `0070`: the value the app prescribed, not the one the hero set,
 * and never a set it was told to leave alone. Through `createCompletedSession`, the one writer of
 * both columns, and read back through `currentRungFor`, the function a quest slot asks.
 *
 * The bug underneath: a target lowered to 1 earned a rung on a single rep, and one clean round
 * followed by "I couldn't" read as a clean session, because a skip writes no row.
 */
describe("what the ladder judges", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  afterAll(() => t.close());

  const idOf = (enName: string): number =>
    (t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number })
      .id;

  const set = (
    exerciseId: number,
    roundIndex: number,
    done: number,
    handed: number,
    prescribed?: number,
    sortOrder = 0,
  ): CompletedExerciseInput => ({
    exerciseId,
    roundIndex,
    sortOrder,
    result: { type: "time", value: done },
    target: { type: "time", value: handed },
    prescribed,
  });

  async function save(exercises: CompletedExerciseInput[]): Promise<void> {
    const completed = require("../db/completed") as typeof import("../db/completed");
    await completed.createCompletedSession({ exercises });
  }

  /** The rung a slot that names Plank is served. */
  async function servedForPlank(): Promise<string> {
    const { currentRungFor } = require("../db/exercises") as typeof import("../db/exercises");
    const plank = idOf("Plank");
    const served = (await currentRungFor([plank])).get(plank);
    return (
      t.sqlite.prepare("SELECT enName FROM exercises WHERE id = ?").get(served) as {
        enName: string;
      }
    ).enName;
  }

  test("a hero with no history is served the bottom of the chain", async () => {
    expect(await servedForPlank()).toBe("Dead Bug");
  });

  test("one clean Plank puts Dead Bug behind the hero: I can already do this", async () => {
    await save([set(idOf("Plank"), 0, 30, 30, 30)]);

    expect(await servedForPlank()).toBe("Plank");
  });

  test("a target lowered to 1 and met there earns nothing, and is not a miss either", async () => {
    await save([set(idOf("Plank"), 0, 1, 1, 30)]);

    expect(await servedForPlank()).toBe("Dead Bug");
    const row = t.sqlite
      .prepare("SELECT prescribedValue, ladderNeutral, targetValue FROM completed_exercises")
      .get();
    // The Journal still shows what the hero was handed; the ladder was told to look away.
    expect(row).toEqual({ prescribedValue: 30, ladderNeutral: 1, targetValue: 1 });
  });

  test("a lowered target still counts when the prescribed value was reached anyway", async () => {
    await save([set(idOf("Plank"), 0, 30, 10, 30)]);

    expect(await servedForPlank()).toBe("Plank");
  });

  test("a raised target judged on the prescribed value: 35 of a handed 60 is clean", async () => {
    await save([set(idOf("Plank"), 0, 35, 60, 30)]);

    expect(await servedForPlank()).toBe("Plank");
  });

  test("one clean round then a skip does not bring the Plank back", async () => {
    // Three rounds, two slots. The Plank was held in round one and skipped after: no row for it
    // in rounds two and three, which is all a skip leaves behind.
    const plank = idOf("Plank");
    const squat = idOf("Wall Sit");
    await save([
      set(plank, 0, 30, 30, 30),
      set(squat, 0, 30, 30, 30, 1),
      set(squat, 1, 30, 30, 30, 1),
      set(squat, 2, 30, 30, 30, 1),
    ]);

    expect(await servedForPlank()).toBe("Dead Bug");
  });

  test("a row from before the column is judged on its handed target, as it always was", async () => {
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, strftime('%s', 'now'))",
      )
      .run();
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
            targetValue, performedAt)
         VALUES (?, ?, 0, 0, 'time', 30, 'time', 30, ?)`,
      )
      .run(Number(info.lastInsertRowid), idOf("Plank"), Math.floor(Date.now() / 1000));

    expect(await servedForPlank()).toBe("Plank");
  });
});

describe("ladderNeutralSets", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  // Required late: the module imports the database client, which only the mock above can stand in for.
  const ladderNeutralSets = (sets: CompletedExerciseInput[]) =>
    (require("../db/completed") as typeof import("../db/completed")).ladderNeutralSets(sets);

  const set = (
    exerciseId: number,
    roundIndex: number,
    done = 10,
    sortOrder = 0,
  ): CompletedExerciseInput => ({
    exerciseId,
    roundIndex,
    sortOrder,
    result: { type: "reps", value: done },
    target: { type: "reps", value: 10 },
    prescribed: 10,
  });

  test("a movement done on every round is judged", () => {
    expect(ladderNeutralSets([set(1, 0), set(1, 1), set(1, 2)])).toEqual([false, false, false]);
  });

  test("a movement swapped away from is neutral, its replacement counts", () => {
    // Push-ups (1) on round one, then Knee Push-Ups (2) for the two that remained.
    expect(ladderNeutralSets([set(1, 0), set(2, 1), set(2, 2)])).toEqual([true, false, false]);
  });

  test("a replacement skipped later is neutral too", () => {
    // Slot 0: Push-ups, then a replacement for round two only. Slot 1 did all three rounds.
    expect(
      ladderNeutralSets([
        set(1, 0),
        set(2, 1),
        set(3, 0, 10, 1),
        set(3, 1, 10, 1),
        set(3, 2, 10, 1),
      ]),
    ).toEqual([true, true, false, false, false]);
  });

  // A skip leaves no row, so the rounds a movement is missing *before* its first row are skips
  // too. Counted from its first row only, "I couldn't" in round one followed by two clean rounds
  // was a clean session, on a pin the same skip had just given up.
  test("skipped in round one and done after, a movement is still one the hero left", () => {
    expect(
      ladderNeutralSets([
        set(1, 1),
        set(1, 2),
        set(3, 0, 10, 1),
        set(3, 1, 10, 1),
        set(3, 2, 10, 1),
      ]),
    ).toEqual([true, true, false, false, false]);
  });

  test("a single-round quest judges what was done", () => {
    expect(ladderNeutralSets([set(1, 0), set(2, 0, 10, 1)])).toEqual([false, false]);
  });

  test("a missed set at the prescribed target is a miss, not a neutral set", () => {
    expect(ladderNeutralSets([set(1, 0, 6)])).toEqual([false]);
  });
});
