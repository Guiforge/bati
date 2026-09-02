import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * An expedition, played to the end, at the database layer.
 *
 * Every other test in this branch proves one half in isolation: the conversion returns zero, the
 * SQL returns zero, the quests exist and pass the content invariants. None of them proves the
 * thing the hero experiences — that walking is a real session which pays, and that the boss
 * feels nothing. Two currencies is a claim about what happens when the two meet, so it is
 * checked where they meet.
 */
describe("an expedition, end to end", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  function walk(): { questId: number; exerciseId: number } {
    const row = t.sqlite
      .prepare(
        `SELECT q.id AS questId, e.id AS exerciseId
           FROM quests q
           JOIN quest_exercises qe ON qe.questId = q.id
           JOIN exercises e ON e.id = qe.exerciseId
          WHERE q.enTitle = 'The Warden''s Round'`,
      )
      .get() as { questId: number; exerciseId: number };
    return row;
  }

  test("the walk is a quest the app can load, with one held movement", async () => {
    const { getQuestById } = require("../db/quests") as typeof import("../db/quests");
    const quest = await getQuestById(walk().questId, "medium");

    expect(quest?.enTitle).toBe("The Warden's Round");
    expect(quest?.rounds).toBe(1);
    expect(quest?.exercises).toHaveLength(1);
    expect(quest?.exercises[0]?.exercise.style).toBe("expedition");
    // Held, not counted — the quest slot and the movement must agree, or a substitution onto it
    // would run in the wrong unit (0039).
    expect(quest?.exercises[0]?.target.type).toBe("time");
  });

  test("twenty-five minutes walked is a saved session, and the boss feels none of it", async () => {
    const { createCompletedSession } =
      require("../db/completed") as typeof import("../db/completed");
    const { getOathProgress, swearOath } = require("../db/oaths") as typeof import("../db/oaths");
    const { questId, exerciseId } = walk();

    // The oath is the probe that reads work units through the SQL path, the same one the boss
    // and the village read. 1500 seconds is 500 rep-equivalents at the strength rate.
    await swearOath({ metric: "exercise_volume", target: 10_000, exerciseId });

    const sessionId = await createCompletedSession({
      questId,
      durationSeconds: 1500,
      xpEarned: 120,
      exercises: [
        {
          exerciseId,
          roundIndex: 0,
          sortOrder: 0,
          result: { type: "time", value: 1500 },
          target: { type: "time", value: 1200 },
        },
      ],
    });

    expect(sessionId).toBeGreaterThan(0);
    // It is a session: it happened, it is in the journal, it paid.
    const saved = t.sqlite
      .prepare("SELECT questId, durationSeconds, xpEarned FROM completed_sessions WHERE id = ?")
      .get(sessionId) as { questId: number; durationSeconds: number; xpEarned: number };
    expect(saved).toMatchObject({ questId, durationSeconds: 1500, xpEarned: 120 });

    // And it is worth no repetitions at all, which is what keeps a 278-HP boss alive.
    expect((await getOathProgress())?.current).toBe(0);
  });
});
