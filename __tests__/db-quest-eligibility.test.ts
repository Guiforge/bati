import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * What the app is allowed to put in front of a hero.
 * These run against the real seeded catalogue, so a future quest that breaks the rules shows up
 * here rather than in someone's home screen.
 */
describe("quest eligibility", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM user_preferences");
  });

  afterAll(() => {
    t.close();
  });

  function quests() {
    return require("../db/quests") as typeof import("../db/quests");
  }

  function setPreference(key: string, value: string) {
    t.sqlite
      .prepare("INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)")
      .run(key, value);
  }

  /** Titles of the quests that require something the seed tags as equipment. */
  function equipmentQuestTitles(): string[] {
    return t.sqlite
      .prepare(
        `SELECT DISTINCT q.enTitle FROM quests q
         JOIN quest_exercises qe ON qe.questId = q.id
         JOIN exercises e ON e.id = qe.exerciseId
         WHERE e.equipment != 'none'`,
      )
      .all()
      .map((r) => (r as { enTitle: string }).enTitle);
  }

  test("a quest's level is the upper median of its exercises, not its hardest movement", () => {
    const { questTrainingLevel } = quests();

    expect(questTrainingLevel(["easy", "easy", "easy"])).toBe("beginner");
    expect(questTrainingLevel(["medium", "medium", "medium"])).toBe("regular");
    expect(questTrainingLevel(["hard", "hard", "hard"])).toBe("advanced");

    // One hard movement in a mostly moderate session does not make it advanced...
    expect(questTrainingLevel(["hard", "medium", "medium", "easy"])).toBe("regular");
    // ...and one easy finisher does not soften a hard one.
    expect(questTrainingLevel(["hard", "hard", "hard", "easy"])).toBe("advanced");

    expect(questTrainingLevel([])).toBe("regular");
  });

  test("with no preferences set, nothing is filtered out", async () => {
    const { getEligibleQuestIds } = quests();

    const eligible = await getEligibleQuestIds();
    const total = (
      t.sqlite.prepare("SELECT COUNT(DISTINCT questId) AS n FROM quest_exercises").get() as {
        n: number;
      }
    ).n;

    expect(eligible.size).toBe(total);
  });

  test("a bodyweight-only hero is never offered a quest that needs a bar", async () => {
    setPreference("ownedEquipment", "[]");
    const { getEligibleQuestIds } = quests();

    const eligible = await getEligibleQuestIds();
    const excluded = equipmentQuestTitles();
    expect(excluded.length).toBeGreaterThan(0);

    for (const title of excluded) {
      const id = (
        t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = ?").get(title) as { id: number }
      ).id;
      expect(eligible.has(id)).toBe(false);
    }
  });

  test("owning the bar puts those quests back", async () => {
    setPreference("ownedEquipment", JSON.stringify(["pullup_bar"]));
    const { getEligibleQuestIds } = quests();

    const eligible = await getEligibleQuestIds();
    const id = (
      t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = 'Tower Climb'").get() as {
        id: number;
      }
    ).id;

    expect(eligible.has(id)).toBe(true);
  });

  test("a beginner is not handed handstand push-ups, but a regular hero still is", async () => {
    const colossus = (
      t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = 'The Colossus Trial'").get() as {
        id: number;
      }
    ).id;

    setPreference("trainingLevel", "beginner");
    expect((await quests().getEligibleQuestIds()).has(colossus)).toBe(false);

    setPreference("trainingLevel", "regular");
    expect((await quests().getEligibleQuestIds()).has(colossus)).toBe(true);
  });

  /**
   * The bridge from an oath to a session. It runs against the real catalogue on purpose: the
   * failure that matters is not a bad query, it is a rung of the seeded ladder that no quest
   * contains — the hero would swear a goal and Home would silently fall back to weak areas.
   */
  describe("findQuestWithExercise", () => {
    function exerciseId(enName: string): number {
      return (
        t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number }
      ).id;
    }

    test("returns a quest that actually contains the movement", async () => {
      const pullups = exerciseId("Pull-ups");
      const questId = await quests().findQuestWithExercise(pullups);

      expect(questId).not.toBeNull();
      const contains = t.sqlite
        .prepare("SELECT 1 FROM quest_exercises WHERE questId = ? AND exerciseId = ?")
        .get(questId, pullups);
      expect(contains).toBeTruthy();
    });

    test("never hands back a quest the hero cannot train", async () => {
      setPreference("ownedEquipment", "[]");

      const pullups = exerciseId("Pull-ups");
      // Pull-ups need a bar, so every quest holding them is out for a bodyweight-only hero.
      expect(await quests().findQuestWithExercise(pullups)).toBeNull();
    });

    test("returns null for a movement no quest uses", async () => {
      expect(await quests().findQuestWithExercise(-1)).toBeNull();
    });
  });

  test("the daily quest comes from the eligible pool", async () => {
    setPreference("ownedEquipment", "[]");
    setPreference("trainingLevel", "beginner");
    const q = quests();

    const daily = await q.getDailyQuest(q.Difficulty.Medium);
    expect(daily).toBeTruthy();
    if (!daily) throw new Error("no daily quest");

    expect(daily.exercises.every((qex) => qex.exercise.equipment === "none")).toBe(true);
    expect(await q.isDailyQuest(daily.id)).toBe(true);
  });
});
