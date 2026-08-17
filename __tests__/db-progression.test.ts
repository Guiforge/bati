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

  /**
   * Log one session of `exerciseId`, one row per entry in `results` — a three-round quest writes
   * three of them. Returns the session id.
   */
  function logSession(
    exerciseId: number,
    results: number[],
    targetValue: number,
    daysAgo = 0,
  ): number {
    const at = Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60;
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(at);
    const sessionId = Number(info.lastInsertRowid);
    const insert = t.sqlite.prepare(
      `INSERT INTO completed_exercises
         (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
          targetValue, performedAt)
       VALUES (?, ?, ?, 0, 'reps', ?, 'reps', ?, ?)`,
    );
    results.forEach((value, roundIndex) => {
      insert.run(sessionId, exerciseId, roundIndex, value, targetValue, at);
    });
    return sessionId;
  }

  /** One session, one round — the common case. */
  const logSet = (
    exerciseId: number,
    resultValue: number,
    targetValue: number,
    daysAgo = 0,
  ): number => logSession(exerciseId, [resultValue], targetValue, daysAgo);

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

  test("three rounds of one evening are one session, not three", async () => {
    const wallPushUp = idOf("Wall Push-Up");
    logSession(wallPushUp, [12, 12, 12], 12);

    // A three-round quest writes three rows in a single night. Counting rows promoted a hero
    // after one workout, which is the "program hopping" the research names as mistake number one.
    const progression = await exercisesApi().getNextProgression(wallPushUp);
    expect(progression?.metTarget).toBe(1);
    expect(progression?.isEarned).toBe(false);
  });

  test("one short round costs the whole session", async () => {
    const wallPushUp = idOf("Wall Push-Up");
    logSession(wallPushUp, [12, 12, 8], 12);

    // "3x12 clean reps", not "one good set out of three".
    expect((await exercisesApi().getNextProgression(wallPushUp))?.metTarget).toBe(0);
  });

  test("sessions older than the window stop counting", async () => {
    const wallPushUp = idOf("Wall Push-Up");
    for (let i = 0; i < 3; i++) logSet(wallPushUp, 12, 12, 200 + i);

    // Ability is current, not historical: a streak from last spring is not evidence today.
    const progression = await exercisesApi().getNextProgression(wallPushUp);
    expect(progression?.metTarget).toBe(0);
    expect(progression?.isEarned).toBe(false);
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

  describe("the chain up to a movement", () => {
    test("reads easiest first and ends on the movement asked for", async () => {
      const chain = await exercisesApi().getChainTo(idOf("Pull-ups"));

      expect(chain?.rungs.map((r) => r.exercise.enName)).toEqual([
        "Towel Door Row",
        "Table Row",
        "Inverted Row",
        "Scapular Pull-Up",
        "Chin-Up",
        "Pull-ups",
      ]);
      // Nothing trained yet: standing on the first rung, not past it.
      expect(chain?.position).toBe(1);
    });

    test("a movement off the ladder has no chain to show", async () => {
      expect(await exercisesApi().getChainTo(idOf("Burpee"))).toBeNull();
    });

    test("the position climbs with each rung mastered", async () => {
      for (let i = 0; i < 3; i++) logSet(idOf("Towel Door Row"), 12, 12);
      for (let i = 0; i < 3; i++) logSet(idOf("Table Row"), 12, 12);

      const chain = await exercisesApi().getChainTo(idOf("Pull-ups"));
      expect(chain?.position).toBe(3);
      expect(chain?.rungs[2]?.exercise.enName).toBe("Inverted Row");
    });

    test("mastering a rung out of order does not count as the ones below it", async () => {
      for (let i = 0; i < 3; i++) logSet(idOf("Chin-Up"), 12, 12);

      // Contiguous from the bottom: the hero still owes every rung under the one they skipped to.
      const chain = await exercisesApi().getChainTo(idOf("Pull-ups"));
      expect(chain?.position).toBe(1);
      expect(chain?.rungs[4]?.isEarned).toBe(true);
    });
  });

  describe("what a session just unlocked", () => {
    test("the third set on target unlocks the next variation", async () => {
      const wallPushUp = idOf("Wall Push-Up");
      logSet(wallPushUp, 12, 12);
      logSet(wallPushUp, 12, 12);
      const sessionId = logSet(wallPushUp, 12, 12);

      const unlocked = await exercisesApi().checkForNewRungs(sessionId);
      expect(unlocked.map((s) => s.next.enName)).toEqual(["Push-ups"]);
      expect(unlocked[0]?.from.enName).toBe("Wall Push-Up");
    });

    test("a rung already earned before tonight is not announced again", async () => {
      const wallPushUp = idOf("Wall Push-Up");
      for (let i = 0; i < 3; i++) logSet(wallPushUp, 12, 12);
      const sessionId = logSet(wallPushUp, 12, 12);

      expect(await exercisesApi().checkForNewRungs(sessionId)).toEqual([]);
    });

    test("two out of three unlocks nothing", async () => {
      const wallPushUp = idOf("Wall Push-Up");
      logSet(wallPushUp, 12, 12);
      logSet(wallPushUp, 8, 12);
      const sessionId = logSet(wallPushUp, 12, 12);

      expect(await exercisesApi().checkForNewRungs(sessionId)).toEqual([]);
    });
  });

  describe("the step worth naming right now", () => {
    test("an earned step beats one still in progress", async () => {
      // Trained more recently, but not earned — the earned one still wins.
      for (let i = 0; i < 3; i++) logSet(idOf("Table Row"), 12, 12);
      logSet(idOf("Wall Push-Up"), 12, 12);

      const step = await exercisesApi().getReadyStep();
      expect(step?.from.enName).toBe("Table Row");
      expect(step?.next.enName).toBe("Inverted Row");
      expect(step?.isEarned).toBe(true);
    });

    test("nothing logged, nothing to suggest", async () => {
      expect(await exercisesApi().getReadyStep()).toBeNull();
    });
  });
});
