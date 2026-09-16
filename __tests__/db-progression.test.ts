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

    expect(progression?.next.enName).toBe("Knee Push-Up");
    expect(progression?.isEarned).toBe(false);
  });

  test("the top of the ladder has nothing after it", async () => {
    expect(await exercisesApi().getNextProgression(idOf("Handstand Push-Up"))).toBeNull();
  });

  test("a rung that forks reports every movement it opens, not just the first", async () => {
    // Push-ups opens Dip, Pike Push-Up and Diamond Push-Up. The page announced Dip alone.
    const step = await exercisesApi().getNextProgression(idOf("Push-ups"));

    expect([step?.next.enName, ...(step?.alsoNext ?? []).map((m) => m.enName)].sort()).toEqual([
      "Diamond Push-Up",
      "Dip",
      "Pike Push-Up",
    ]);
  });

  test("standing on any branch of a fork earns the rung, not only on the first", async () => {
    // A hero doing Diamond Push-Ups was still told to earn Dip: `above` seeded itself with the
    // first successor alone, so the other branches were invisible to it.
    const pushUps = idOf("Push-ups");
    for (let i = 0; i < 3; i++) logSet(idOf("Diamond Push-Up"), 12, 12, i);

    expect((await exercisesApi().getNextProgression(pushUps))?.isEarned).toBe(true);
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
    logSet(wallPushUp, 12, 12, 2);
    logSet(wallPushUp, 12, 12, 1);
    logSet(wallPushUp, 8, 12);

    const progression = await exercisesApi().getNextProgression(wallPushUp);
    expect(progression?.metTarget).toBe(0);
    expect(progression?.isEarned).toBe(false);
  });

  // The squat report: `[hit, miss, hit]`, most recent first, read "Hit your target 1 more time",
  // and one more clean session made `[hit, hit, miss]`, still not earned. The count is the run.
  test("what is left to hit counts the run of clean sessions, not the clean ones out of three", async () => {
    const wallPushUp = idOf("Wall Push-Up");
    logSet(wallPushUp, 12, 12, 2);
    logSet(wallPushUp, 8, 12, 1);
    logSet(wallPushUp, 12, 12);

    const api = exercisesApi();
    expect((await api.getNextProgression(wallPushUp))?.metTarget).toBe(1);
    expect((await api.getChainTo(idOf("Push-ups")))?.rungs[0]?.metTarget).toBe(1);

    logSet(wallPushUp, 12, 12);
    logSet(wallPushUp, 12, 12);
    const earned = await api.getNextProgression(wallPushUp);
    expect(earned?.metTarget).toBe(3);
    expect(earned?.isEarned).toBe(true);
  });

  describe("the chain up to a movement", () => {
    test("reads easiest first and ends on the movement asked for", async () => {
      const chain = await exercisesApi().getChainTo(idOf("Pull-ups"));

      expect(chain?.rungs.map((r) => r.exercise.enName)).toEqual([
        "Towel Door Row",
        "Table Row",
        "Inverted Row",
        "Dead Hang",
        "Scapular Pull-Up",
        "Negative Pull-Up",
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

    // Rule C, 2026-09-15: this used to read "does not count as the ones below it", and a hero
    // who could do chin-ups was told to do towel rows. What is behind the hero stays there.
    test("mastering a rung out of order puts every rung below it behind the hero", async () => {
      for (let i = 0; i < 3; i++) logSet(idOf("Chin-Up"), 12, 12);

      const chain = await exercisesApi().getChainTo(idOf("Pull-ups"));
      expect(chain?.position).toBe(8);
      expect(chain?.climbed).toBe(false);
      // The rungs skipped are behind, not earned: `isEarned` is still the windowed reading.
      expect(chain?.rungs[0]?.isEarned).toBe(false);
      expect(chain?.rungs[6]?.isEarned).toBe(true);
    });

    test("a hero who owned Wall Push-Up in June and trains Push-ups in September is served Push-ups", async () => {
      // June: Wall Push-Up owned, then never repeated. Knee Push-Up was never logged at all.
      for (let i = 0; i < 3; i++) logSet(idOf("Wall Push-Up"), 12, 12, 95 + i);
      // September: push-ups, one clean session and one short one.
      logSet(idOf("Push-ups"), 12, 12, 3);
      logSet(idOf("Push-ups"), 8, 12, 1);

      const pushUps = idOf("Push-ups");
      // Under the old rule the June sessions had left the window, and the hero was back at the wall.
      expect((await exercisesApi().currentRungFor([pushUps])).get(pushUps)).toBe(pushUps);
      const chain = await exercisesApi().getChainTo(pushUps);
      expect(chain?.position).toBe(3);
      expect(chain?.climbed).toBe(false);
    });

    test("one clean Plank session puts Dead Bug behind the hero", async () => {
      const plank = idOf("Plank");
      logSet(plank, 45, 45);

      const chain = await exercisesApi().getChainTo(plank);
      expect(chain?.rungs.map((r) => r.exercise.enName)).toEqual(["Dead Bug", "Plank"]);
      expect(chain?.position).toBe(2);
      expect((await exercisesApi().currentRungFor([plank])).get(plank)).toBe(plank);
      // The session is on Plank, so Plank itself is not behind yet: one session is not a run.
      expect(chain?.climbed).toBe(false);
    });

    test("the rung below says it is earned once the hero stands above it", async () => {
      const plank = idOf("Plank");
      logSet(plank, 45, 45);

      // Dead Bug was never trained, but it is behind the hero: its next step must not ask for three
      // more Dead Bug sessions while the Plank screen says "You are here".
      const step = await exercisesApi().getNextProgression(idOf("Dead Bug"));
      expect(step?.next.enName).toBe("Plank");
      expect(step?.isEarned).toBe(true);
    });

    test("a short session on a higher rung puts nothing behind the hero", async () => {
      const plank = idOf("Plank");
      logSet(plank, 20, 45);

      expect((await exercisesApi().getChainTo(plank))?.position).toBe(1);
      expect((await exercisesApi().currentRungFor([plank])).get(plank)).toBe(idOf("Dead Bug"));
    });
  });

  describe("what a session just unlocked", () => {
    test("the third set on target unlocks the next variation", async () => {
      const wallPushUp = idOf("Wall Push-Up");
      logSet(wallPushUp, 12, 12);
      logSet(wallPushUp, 12, 12);
      const sessionId = logSet(wallPushUp, 12, 12);

      const unlocked = await exercisesApi().checkForNewRungs(sessionId);
      expect(unlocked.map((s) => s.next.enName)).toEqual(["Knee Push-Up"]);
      expect(unlocked[0]?.from.enName).toBe("Wall Push-Up");
    });

    test("a rung that forks announces every movement it opens, on the seeded ladder", async () => {
      // Push-ups opens three; the victory screen used to hear about the first one alone.
      const pushUps = idOf("Push-ups");
      logSet(pushUps, 12, 12);
      logSet(pushUps, 12, 12);
      const sessionId = logSet(pushUps, 12, 12);

      const [step] = await exercisesApi().checkForNewRungs(sessionId);
      const opened = [step?.next.enName, ...(step?.alsoNext ?? []).map((m) => m.enName)];
      expect(opened.sort()).toEqual(["Diamond Push-Up", "Dip", "Pike Push-Up"]);
      // And the same one illustrated as on the exercise page.
      expect(step?.next.id).toBe((await exercisesApi().getNextProgression(pushUps))?.next.id);
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

  describe("paths climbed for keeps", () => {
    /** Dead Bug -> Hollow Body Hold -> Dragon Flag, the shortest complete route in the catalogue. */
    function climbCorePath() {
      for (const name of ["Dead Bug", "Hollow Body Hold", "Dragon Flag"]) {
        for (let i = 0; i < 3; i++) logSet(idOf(name), 12, 12);
      }
    }

    // Rule C, 2026-09-15: this used to read "only once every rung of it has been owned". A summit
    // owned puts every rung under it behind the hero, and the path card already says "climbed".
    test("a path counts once its summit has been owned, whatever was logged below it", async () => {
      expect(await exercisesApi().countClimbedPaths()).toBe(0);

      for (let i = 0; i < 3; i++) logSet(idOf("Dead Bug"), 12, 12);
      expect(await exercisesApi().countClimbedPaths()).toBe(0);

      for (let i = 0; i < 3; i++) logSet(idOf("Dragon Flag"), 12, 12);
      expect(await exercisesApi().countClimbedPaths()).toBe(1);
      expect((await exercisesApi().getChainTo(idOf("Dragon Flag")))?.climbed).toBe(true);
    });

    test("a climbed path is never taken back", async () => {
      climbCorePath();

      // Detraining, and then bad sessions. The summit is no longer earned today, but it stays
      // behind the hero, and so does the trophy.
      for (let i = 0; i < 3; i++) logSet(idOf("Dragon Flag"), 4, 12);

      const chain = await exercisesApi().getChainTo(idOf("Dragon Flag"));
      expect(chain?.position).toBe(3);
      expect(chain?.rungs[2]?.isEarned).toBe(false);
      expect(chain?.climbed).toBe(true);
      expect(await exercisesApi().countClimbedPaths()).toBe(1);
    });

    test("climbing one reaches the trophy shelf", async () => {
      // A count nothing reads is a control wired to nothing. This is the wire: the same shelf the
      // village shows defeated bosses on, which until now recorded volume and never skill.
      const achievements = require("../db/achievements") as typeof import("../db/achievements");
      t.sqlite.exec("DELETE FROM user_preferences WHERE key = 'unlocked_achievements'");

      climbCorePath();
      const earned = await achievements.checkForNewAchievements({
        durationSeconds: 600,
        xpEarned: 50,
        performedAt: new Date(new Date().setHours(12, 0, 0, 0)),
        questId: null,
        outing: null,
      });

      expect(earned.map((a) => a.code)).toContain("path_climbed");
    });

    test("time passing does not take it back either", async () => {
      for (const name of ["Dead Bug", "Hollow Body Hold", "Dragon Flag"]) {
        for (let i = 0; i < 3; i++) logSet(idOf(name), 12, 12, 400 + i);
      }

      // Every session is far outside the recency window, so nothing reads as earned today...
      const chain = await exercisesApi().getChainTo(idOf("Dragon Flag"));
      expect(chain?.rungs.some((r) => r.isEarned)).toBe(false);
      // ...but a quiet year does not send the hero back to the bottom (rule C, 2026-09-15: this
      // used to expect position 1), and the shelf still holds it.
      expect(chain?.position).toBe(3);
      expect(chain?.climbed).toBe(true);
      expect(await exercisesApi().countClimbedPaths()).toBe(1);
    });
  });

  // The report: "squats sautés" in the warm-up of a hero still earning Squat. Quest slots were
  // already served at the hero's rung (issue #33); the warm-up read nothing but equipment.
  test("the warm-up never asks for a rung the hero has not reached", async () => {
    expect(await exercisesApi().unavailableMovements()).toContain("Jump Squat");

    for (const name of ["Wall Sit", "Squat"]) {
      for (let i = 0; i < 3; i++) logSet(idOf(name), 12, 12, i);
    }

    const unavailable = await exercisesApi().unavailableMovements();
    expect(unavailable).not.toContain("Jump Squat");
    // Off the ladder, or at its bottom, is never withheld.
    expect(unavailable).not.toContain("Wall Sit");
    expect(unavailable).not.toContain("Jumping Jack");
  });
});
