import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Issue #145: "I can't jump due to physical limitations", and the only answer the app had was to
 * skip the whole warm-up. A set-aside exercise is never served again: a quest slot takes a near
 * substitute, the warm-up skips it, a saved swap to it is dropped.
 *
 * On a real database because every rule here is a join between the ladder, the kit and the list:
 * a stub of any one of them is the rule this file exists to watch drift.
 */
describe("set-aside exercises", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
    questsApi().invalidateQuestTemplates();
  });

  afterAll(() => t.close());

  function questsApi() {
    return require("../db/quests") as typeof import("../db/quests");
  }
  function setAsideApi() {
    return require("../db/setAside") as typeof import("../db/setAside");
  }

  function idOf(enName: string): number {
    return (
      t.sqlite
        .prepare("SELECT id FROM exercises WHERE enName = ? AND creator = 'Admin'")
        .get(enName) as { id: number }
    ).id;
  }

  function questIdOf(enTitle: string): number {
    return (
      t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = ?").get(enTitle) as { id: number }
    ).id;
  }

  /** One on-target session on `exerciseId`, in its own unit. Three of these earn the next rung. */
  function logOnTarget(exerciseId: number, daysAgo: number, type: "reps" | "time" = "reps"): void {
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
         VALUES (?, ?, 0, 0, ?, 30, ?, 30, ?)`,
      )
      .run(Number(info.lastInsertRowid), exerciseId, type, type, at);
  }

  const squatSlot = async () => {
    const quest = await questsApi().getQuestById(questIdOf("Knight Push"), "medium");
    return quest?.exercises.find(
      (qex) =>
        qex.exercise.enName === "Squat" ||
        qex.substitutedFor?.enName === "Squat" ||
        qex.substitutedFor?.setAside === true,
    );
  };

  /**
   * The audit's first blocker. `rankSwapCandidates` ranks the harder rung beside the easier one,
   * and inside that tier prefers the slot's own unit: Squat's easier rung is a hold, so "the first
   * candidate" was Jump Squat. Setting Squat aside for a knee must never hand over a jump.
   */
  test("a set-aside slot takes the easier rung, never the harder one", async () => {
    for (const day of [7, 8, 9]) logOnTarget(idOf("Wall Sit"), day, "time");
    for (const day of [4, 5, 6]) logOnTarget(idOf("Squat"), day);
    expect((await squatSlot())?.exercise.enName).toBe("Squat");

    await setAsideApi().setExerciseAside(idOf("Squat"));
    const slot = await squatSlot();

    expect(slot?.exercise.enName).not.toBe("Jump Squat");
    expect(slot?.exercise.enName).toBe("Wall Sit");
    expect(slot?.substitutedFor).toMatchObject({ enName: "Squat", setAside: true });
  });

  /**
   * Found on the emulator: Jump Squat and Squat both set aside, and the Jump Squat slot served a
   * Lunge. The ladder is walked through prerequisites, and filtering Squat out before the walk cut
   * it at the gap, so Wall Sit, two rungs down, was never seen.
   */
  test("a set-aside rung in the middle does not hide the rung below it", async () => {
    for (const day of [7, 8, 9]) logOnTarget(idOf("Wall Sit"), day, "time");
    for (const day of [4, 5, 6]) logOnTarget(idOf("Squat"), day);
    await setAsideApi().setExerciseAside(idOf("Jump Squat"));
    await setAsideApi().setExerciseAside(idOf("Squat"));

    const journal = await questsApi().loadSlotJournal([idOf("Jump Squat")]);

    expect(journal.replaced.get(idOf("Jump Squat"))).toBe(idOf("Wall Sit"));
  });

  /** The report itself, swept: every seeded quest, every jump set aside, no jump served. */
  test("with every jump set aside, no seeded quest serves one", async () => {
    for (const name of setAsideApi().JUMPING) await setAsideApi().setExerciseAside(idOf(name));

    const quests = questsApi();
    const templates = await quests.listQuestTemplates();
    const loaded = await Promise.all(
      templates.map((tpl) => quests.getQuestById(tpl.id, quests.Difficulty.Medium)),
    );

    const jumps = loaded
      .flatMap((q) => (q ? q.exercises.map((qex) => `${q.enTitle}: ${qex.exercise.enName}`) : []))
      .filter((line) => [...setAsideApi().JUMPING].some((name) => line.endsWith(`: ${name}`)));
    expect(jumps).toEqual([]);
  });

  /** Galleries price cards off `loadSlotJournal`, so they must agree with the screen. */
  test("the journal a gallery reads carries the same replacement", async () => {
    await setAsideApi().setExerciseAside(idOf("Wall Sit"));

    const journal = await questsApi().loadSlotJournal([idOf("Squat")]);
    const replacement = journal.replaced.get(idOf("Squat"));

    expect(replacement).toBeDefined();
    expect(replacement).not.toBe(idOf("Wall Sit"));
    expect(replacement).not.toBe(idOf("Jump Squat"));
  });

  test("nothing set aside, nothing replaced", async () => {
    const journal = await questsApi().loadSlotJournal([idOf("Squat"), idOf("Push-ups")]);

    expect(journal.replaced.size).toBe(0);
  });

  /**
   * A swap saved on the quest screen is applied after the slot is resolved, so a pin to the
   * set-aside exercise would hand it straight back. Setting aside drops it, and only it.
   */
  test("setting aside drops the saved swaps that name it, and keeps the rest", async () => {
    const config = require("../db/questConfig") as typeof import("../db/questConfig");
    await config.saveQuestConfig(1, {
      level: "medium",
      swaps: { "10": idOf("Jump Squat"), "11": idOf("Lunge") },
    });
    await config.saveQuestConfig(2, { level: "hard", swaps: { "20": idOf("Jump Squat") } });

    await setAsideApi().setExerciseAside(idOf("Jump Squat"));

    expect((await config.getQuestConfig(1))?.swaps).toEqual({ "11": idOf("Lunge") });
    const second = await config.getQuestConfig(2);
    expect(second?.swaps).toBeUndefined();
    expect(second?.level).toBe("hard");
  });

  /**
   * A number saved for the written movement would land on its stand-in: "20" set for Jump Squat
   * became 20 of the substitute. Dropped with the swaps, but only where the slot runs as written.
   */
  test("setting aside drops a target saved on a slot that names it, not on a swapped one", async () => {
    const quests = questsApi();
    const templates = await quests.listQuestTemplates();
    const slots = templates.flatMap((q) =>
      q.exercises.map((s) => ({ questId: q.id, slotId: s.id, exerciseId: s.exerciseId })),
    );
    const named = slots.find((s) => s.exerciseId === idOf("Jump Squat"));
    const other = slots.find((s) => s.questId === named?.questId && s.slotId !== named?.slotId);
    assertDefined(named);
    assertDefined(other);

    const config = require("../db/questConfig") as typeof import("../db/questConfig");
    await config.saveQuestConfig(named.questId, {
      level: "medium",
      targets: { [String(named.slotId)]: 20, [String(other.slotId)]: 12 },
    });

    await setAsideApi().setExerciseAside(idOf("Jump Squat"));

    expect((await config.getQuestConfig(named.questId))?.targets).toEqual({
      [String(other.slotId)]: 12,
    });
  });

  /** The population rule: a hero's own "Star Jump" set aside is not the seed Star Jump. */
  test("a hero exercise sharing a seed name does not take the seed one out of the warm-up", async () => {
    const info = t.sqlite
      .prepare(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, imagePath, creator,
           difficulty, equipment, secondsPerRep)
         VALUES ('Star Jump', 'Star Jump', '', '', '', 'hero', 'easy', 'none', 2)`,
      )
      .run();
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    exercises.invalidateExercisesCache();
    try {
      await setAsideApi().setExerciseAside(Number(info.lastInsertRowid));

      expect((await exercises.unavailableMovements()).has("Star Jump")).toBe(false);
    } finally {
      t.sqlite.prepare("DELETE FROM exercises WHERE id = ?").run(Number(info.lastInsertRowid));
      exercises.invalidateExercisesCache();
    }
  });

  test("put back, the slot serves it again", async () => {
    for (const day of [7, 8, 9]) logOnTarget(idOf("Wall Sit"), day, "time");
    await setAsideApi().setExerciseAside(idOf("Squat"));
    await setAsideApi().putExerciseBack(idOf("Squat"));

    const slot = await squatSlot();

    expect(slot?.exercise.enName).toBe("Squat");
    expect(slot?.substitutedFor).toBeUndefined();
  });

  /** The warm-up reads names: a set-aside exercise is unavailable there by the same rule. */
  test("a set-aside exercise is one the warm-up cannot prescribe", async () => {
    await setAsideApi().setExerciseAside(idOf("Star Jump"));

    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const unavailable = await exercises.unavailableMovements();

    expect(unavailable.has("Star Jump")).toBe(true);
    expect(unavailable.has("High Knees")).toBe(false);
  });

  test("setting aside a jump offers the other seeded jumps, not the ones already aside", async () => {
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const catalogue = await exercises.listExercises();
    const starJump = catalogue.find((e) => e.id === idOf("Star Jump"));
    const lunge = catalogue.find((e) => e.id === idOf("Lunge"));
    assertDefined(starJump);
    assertDefined(lunge);

    await setAsideApi().setExerciseAside(idOf("Burpee"));
    const others = (await setAsideApi().otherJumps(starJump)).map((e) => e.enName).sort();

    expect(others).toEqual(["Jump Squat", "Jumping Jack", "Skater Hop"]);
    expect(await setAsideApi().otherJumps(lunge)).toEqual([]);
  });
});

function assertDefined<T>(value: T | undefined): asserts value is T {
  if (value === undefined) throw new Error("expected a value");
}
