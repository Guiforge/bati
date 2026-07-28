import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The variation ladder (0022). It is a hint, not a gate — these tests assert the reading of it,
 * and there is deliberately nothing here about locking content, because nothing does.
 */
describe("db/exercises — variation ladder", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  afterAll(() => {
    t.close();
  });

  function exercisesApi() {
    return require("../db/exercises") as typeof import("../db/exercises");
  }

  function idOf(enName: string): number {
    return (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number }
    ).id;
  }

  /** Log one set of `exerciseId`, hitting or missing its target. */
  function logSet(exerciseId: number, resultValue: number, targetValue: number) {
    const at = Math.floor(Date.now() / 1000);
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(at);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
            targetValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', ?, 'reps', ?, ?)`,
      )
      .run(Number(info.lastInsertRowid), exerciseId, resultValue, targetValue, at);
  }

  test("the ladder points at the harder variation, not the easier one", async () => {
    const progression = await exercisesApi().getNextProgression(idOf("Wall Push-Up"));

    expect(progression?.next.enName).toBe("Push-ups");
    expect(progression?.isEarned).toBe(false);
  });

  test("the top of the ladder has nothing after it", async () => {
    expect(await exercisesApi().getNextProgression(idOf("Handstand Push-Up"))).toBeNull();
  });

  test("meeting the target three sessions running earns the next step", async () => {
    const wallPushUp = idOf("Wall Push-Up");
    for (let i = 0; i < 3; i++) logSet(wallPushUp, 12, 12);

    const progression = await exercisesApi().getNextProgression(wallPushUp);
    expect(progression?.metTarget).toBe(3);
    expect(progression?.isEarned).toBe(true);
  });

  test("falling short of the target does not count towards it", async () => {
    const wallPushUp = idOf("Wall Push-Up");
    logSet(wallPushUp, 12, 12);
    logSet(wallPushUp, 8, 12);
    logSet(wallPushUp, 12, 12);

    const progression = await exercisesApi().getNextProgression(wallPushUp);
    expect(progression?.metTarget).toBe(2);
    expect(progression?.isEarned).toBe(false);
  });
});
