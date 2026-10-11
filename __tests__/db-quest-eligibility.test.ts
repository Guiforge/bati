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
    t.sqlite.exec("DELETE FROM completed_sessions");
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

    // The *upper* median on an even count: half hard is advanced, half easy is not beginner.
    expect(questTrainingLevel(["hard", "hard", "medium", "easy"])).toBe("advanced");
    expect(questTrainingLevel(["easy", "easy", "medium", "medium"])).toBe("regular");

    // One hard movement in a mostly moderate session does not make it advanced...
    expect(questTrainingLevel(["hard", "medium", "medium", "easy"])).toBe("regular");
    // ...and one easy finisher does not soften a hard one.
    expect(questTrainingLevel(["hard", "hard", "hard", "easy"])).toBe("advanced");

    expect(questTrainingLevel([])).toBe("regular");
  });

  const questId = (enTitle: string): number =>
    (t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = ?").get(enTitle) as { id: number }).id;

  /**
   * Three sessions: past the start, where nothing is known of a hero yet (`startsGently`).
   * Two days ago by default, because the rule counts the sessions logged before today.
   */
  function logThreeSessions(when = "'now', '-2 days'") {
    for (let i = 0; i < 3; i++) {
      t.sqlite
        .prepare(
          `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, strftime('%s', ${when}))`,
        )
        .run();
    }
  }

  // The daily quest is drawn from this set by the date. A pool that grew when tonight's third
  // session was saved pointed the same day at another quest, and paid the daily bonus twice.
  test("what was logged today does not change what the app may suggest today", async () => {
    const before = await quests().getEligibleQuestIds();

    logThreeSessions("'now'");

    expect([...(await quests().getEligibleQuestIds())].sort()).toEqual([...before].sort());
  });

  test("with no preferences set, a hero who has trained is filtered out of nothing", async () => {
    logThreeSessions();
    const { getEligibleQuestIds } = quests();

    const eligible = await getEligibleQuestIds();
    const total = (
      t.sqlite.prepare("SELECT COUNT(DISTINCT questId) AS n FROM quest_exercises").get() as {
        n: number;
      }
    ).n;

    expect(eligible.size).toBe(total);
  });

  // Nothing walks a Burpee or a Skater Hop down a ladder, so a quest built on jumps reached a
  // hero on day one exactly as written. It is still in the gallery; the app just does not pick it.
  test("a quest with a jump in it is not what the app picks for a hero's first sessions", async () => {
    const storm = questId("Storm of Blades");
    const squire = questId("The Squire's Awakening");

    const dayOne = await quests().getEligibleQuestIds();
    expect(dayOne.has(storm)).toBe(false);
    expect(dayOne.has(squire)).toBe(true);

    logThreeSessions();
    expect((await quests().getEligibleQuestIds()).has(storm)).toBe(true);

    // A beginner stays off them for as long as they say they are one.
    setPreference("trainingLevel", "beginner");
    expect((await quests().getEligibleQuestIds()).has(storm)).toBe(false);
  });

  /**
   * The filter asks what this hero would be *served*, the question the warm-up asks too. Jump
   * Squat is the one jump on a ladder: a hero still on Squat gets Squat, so a quest naming it is
   * fine for them; a beginner who has earned Squat gets the jump itself, and the quest is held
   * back. Reading the template alone hid the first quest; exempting every laddered jump let the
   * second through while the same hero's warm-up still withheld Jump Squat.
   */
  test("a quest naming Jump Squat is judged on the rung the hero is served", async () => {
    const exerciseId = (enName: string): number =>
      (t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number })
        .id;
    const quest = Number(
      t.sqlite
        .prepare(
          `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author)
           VALUES ('Only Jump Squats', 'x', '', '', 'Admin')`,
        )
        .run().lastInsertRowid,
    );
    t.sqlite
      .prepare(
        `INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax)
         VALUES (?, ?, 0, 'reps', 10, 12)`,
      )
      .run(quest, exerciseId("Jump Squat"));
    quests().invalidateQuestTemplates();
    setPreference("trainingLevel", "beginner");

    try {
      // Still on the ladder below it: served something that does not jump.
      expect((await quests().getEligibleQuestIds()).has(quest)).toBe(true);

      // Squat earned, three clean sessions before today: now served the jump.
      for (const daysAgo of [2, 3, 4]) {
        const session = Number(
          t.sqlite
            .prepare(
              `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt)
               VALUES ('medium', 10, strftime('%s', 'now', ?))`,
            )
            .run(`-${daysAgo} days`).lastInsertRowid,
        );
        t.sqlite
          .prepare(
            `INSERT INTO completed_exercises
               (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
                targetValue, performedAt)
             VALUES (?, ?, 0, 0, 'reps', 12, 'reps', 12, strftime('%s', 'now', ?))`,
          )
          .run(session, exerciseId("Squat"), `-${daysAgo} days`);
      }
      expect((await quests().getEligibleQuestIds()).has(quest)).toBe(false);
    } finally {
      t.sqlite.exec("DELETE FROM completed_exercises");
      t.sqlite.prepare("DELETE FROM quest_exercises WHERE questId = ?").run(quest);
      t.sqlite.prepare("DELETE FROM quests WHERE id = ?").run(quest);
      quests().invalidateQuestTemplates();
    }
  });

  /**
   * The filter and the quest must give one answer to "would this serve a jump". Asked of every
   * seeded quest, against the slots `getQuestById` actually builds, before and after the hero
   * sets every jump aside. Reading the ladder alone, a beginner who set the jumps aside (so no
   * slot jumps any more) was still kept off every quest that named one, for good.
   */
  test("a quest is held back exactly when one of its slots would run a jump", async () => {
    setPreference("trainingLevel", "beginner");
    const { getEligibleQuestIds, getQuestById, listQuestTemplates, Difficulty } = quests();

    const disagreements = async (): Promise<string[]> => {
      // What the jump filter alone holds back: the difference it makes to the set.
      const [eligible, ignoringJumps] = await Promise.all([
        getEligibleQuestIds(),
        getEligibleQuestIds({ allowJumps: true }),
      ]);
      const out: string[] = [];
      for (const template of await listQuestTemplates()) {
        if (!ignoringJumps.has(template.id)) continue; // held back for kit or level
        const quest = await getQuestById(template.id, Difficulty.Medium);
        const jumps = (quest?.exercises ?? []).some((slot) => slot.exercise.impact === true);
        const heldBack = !eligible.has(template.id);
        if (heldBack !== jumps)
          out.push(`${template.enTitle}: runs a jump ${jumps}, held ${heldBack}`);
      }
      return out;
    };

    expect(await disagreements()).toEqual([]);

    const setAside = require("../db/setAside") as typeof import("../db/setAside");
    expect(await setAside.setImpactAside()).toBe(6);
    quests().invalidateQuestTemplates();

    expect(await disagreements()).toEqual([]);
  });

  // An oath sworn on a jump is the hero's own choice of a jump. The filter that keeps the app
  // from picking one for them left that oath with no quest to offer, and Home dropped it.
  test("an oath on a jump still finds its quest for a beginner", async () => {
    setPreference("trainingLevel", "beginner");
    const starJump = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = 'Star Jump'").get() as {
        id: number;
      }
    ).id;

    expect(await quests().findQuestWithExercise(starJump)).not.toBeNull();
  });

  // Two hard movements out of four rated "regular" under the lower median, and reached beginners.
  test("a beginner is not offered a quest half made of hard movements", async () => {
    logThreeSessions();
    const blade = questId("Forge the Dragon Blade");

    setPreference("trainingLevel", "beginner");
    expect((await quests().getEligibleQuestIds()).has(blade)).toBe(false);

    setPreference("trainingLevel", "regular");
    expect((await quests().getEligibleQuestIds()).has(blade)).toBe(true);
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

    // `isDailyQuest` is the only door the app has to the daily pick, so the test goes through it.
    const templates = await q.listQuestTemplates();
    const flags = await Promise.all(templates.map((tpl) => q.isDailyQuest(tpl.id)));
    const picked = templates.filter((_, i) => flags[i]);
    expect(picked).toHaveLength(1);

    const daily = await q.getQuestById(picked[0]?.id ?? -1, q.Difficulty.Medium);
    expect(daily).toBeTruthy();
    expect(daily?.exercises.every((qex) => qex.exercise.equipment === "none")).toBe(true);
  });
});
