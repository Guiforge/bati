import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Issue #33 — a beginner did wall push-ups on day one, and "Chop Wood" handed them classical
 * push-ups on day two. They entered "1", the lowest the field accepts, and went off to do incline
 * push-ups instead.
 *
 * `getQuestById` now serves the rung the hero is actually working. These tests are about the
 * prescription, not the ladder itself — `db-progression.test.ts` owns that.
 */
describe("db/quests — a slot serves the rung the hero stands on", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    questsApi().invalidateQuestTemplates();
  });

  afterAll(() => t.close());

  function questsApi() {
    return require("../db/quests") as typeof import("../db/quests");
  }

  function idOf(enName: string): number {
    return (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number }
    ).id;
  }

  function questIdOf(enTitle: string): number {
    return (
      t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = ?").get(enTitle) as { id: number }
    ).id;
  }

  /** One on-target session on `exerciseId`. Three of these earn the rung. */
  function logOnTarget(exerciseId: number, daysAgo = 0): void {
    const at = Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60;
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
         VALUES (?, ?, 0, 0, 'reps', 10, 'reps', 10, ?)`,
      )
      .run(Number(info.lastInsertRowid), exerciseId, at);
  }

  const pushUpSlot = async (questTitle = "Chop Wood") => {
    const quest = await questsApi().getQuestById(questIdOf(questTitle), "medium");
    return quest?.exercises.find(
      (qex) => qex.exercise.enName === "Push-ups" || qex.substitutedFor?.enName === "Push-ups",
    );
  };

  /**
   * The report, replayed with its own numbers. `PROGRESSION_SESSIONS_REQUIRED` is 3; on day two
   * the hero has *one* wall push-up session, so they are standing on the bottom rung — and that
   * is what the quest must hand them. Word for word what they asked for: "wall push-ups again".
   */
  test("day two of the bug report: the push-up slot serves Wall Push-Up", async () => {
    logOnTarget(idOf("Wall Push-Up"), 1);

    const slot = await pushUpSlot();

    expect(slot?.exercise.enName).toBe("Wall Push-Up");
    expect(slot?.substitutedFor?.enName).toBe("Push-ups");
  });

  test("a hero with no history at all is not handed the top of the chain either", async () => {
    const slot = await pushUpSlot();

    expect(slot?.exercise.enName).toBe("Wall Push-Up");
  });

  /** Earn every rung below, and the quest reads as written — no caption, no substitution. */
  test("once the rungs below are owned, the written movement is served", async () => {
    for (const day of [1, 2, 3]) logOnTarget(idOf("Wall Push-Up"), day);
    for (const day of [4, 5, 6]) logOnTarget(idOf("Knee Push-Up"), day);

    const slot = await pushUpSlot();

    expect(slot?.exercise.enName).toBe("Push-ups");
    expect(slot?.substitutedFor).toBeUndefined();
  });

  test("a substituted slot is priced and tagged as the movement that will actually run", async () => {
    logOnTarget(idOf("Wall Push-Up"), 1);

    const slot = await pushUpSlot();

    // The session prices XP by these two, and the village counts the muscles. Reading them off
    // the written movement would price wall push-ups as classical ones.
    expect(slot?.exercise.difficulty).toBe("easy");
    expect(slot?.exercise.muscles.length).toBeGreaterThan(0);
    // The quest's own art is of the movement the template wrote.
    expect(slot?.images).toEqual([]);
  });

  test("a quest the hero authored is served exactly as they wrote it", async () => {
    logOnTarget(idOf("Wall Push-Up"), 1);

    const info = t.sqlite
      .prepare(
        "INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, rounds, restSeconds) VALUES ('Mine', 'Mine', '', '', 'hero', 1, 30)",
      )
      .run();
    const questId = Number(info.lastInsertRowid);
    t.sqlite
      .prepare(
        "INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax, imagesJson) VALUES (?, ?, 0, 'reps', 8, 12, '[]')",
      )
      .run(questId, idOf("Push-ups"));

    const quest = await questsApi().getQuestById(questId, "medium");

    expect(quest?.exercises[0]?.exercise.enName).toBe("Push-ups");
    expect(quest?.exercises[0]?.substitutedFor).toBeUndefined();
  });
});
