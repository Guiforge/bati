import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Deleting a session from the journal. XP, streak, village and records are all derived from
 * `completed_sessions`, so they follow the row on their own; what this file holds is everything
 * that is *stored* and has to be put back by hand — the boss's HP and the campaign's step — and
 * the child rows a device keeps because its foreign keys are off.
 */
describe("deleteSession", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const completed = () => require("../db/completed") as typeof import("../db/completed");
  const adventures = () => require("../db/adventures") as typeof import("../db/adventures");

  function saveOne(questId: number | null = null, xpEarned = 40): Promise<number> {
    return completed().createCompletedSession({
      questId,
      durationSeconds: 600,
      xpEarned,
      exercises: [{ exerciseId: 1, sortOrder: 0, result: { type: "reps", value: 10 } }],
    });
  }

  function count(sql: string, ...args: unknown[]): number {
    return (t.sqlite.prepare(sql).get(...args) as { n: number }).n;
  }

  test("removes the row, its sets and its trace, and the XP goes with it", async () => {
    const keep = await saveOne(null, 25);
    const id = await saveOne(null, 40);
    const uuid = (
      t.sqlite.prepare("SELECT uuid FROM completed_sessions WHERE id = ?").get(id) as {
        uuid: string;
      }
    ).uuid;
    t.sqlite
      .prepare(
        "INSERT INTO gps_points (sessionId, t, latE7, lonE7, accDm, distFromPrevCm) VALUES (?, 1, 0, 0, 10, 0)",
      )
      .run(uuid);

    expect(await completed().deleteSession(id)).toBe("deleted");

    expect(count("SELECT count(*) n FROM completed_sessions WHERE id = ?", id)).toBe(0);
    // Counted, not trusted to a cascade: the device runs with foreign keys off.
    expect(count("SELECT count(*) n FROM completed_exercises WHERE sessionId = ?", id)).toBe(0);
    expect(count("SELECT count(*) n FROM gps_points WHERE sessionId = ?", uuid)).toBe(0);
    expect(count("SELECT count(*) n FROM completed_sessions WHERE id = ?", keep)).toBe(1);
    // Remembered by uuid, so another device still holding it is not read as newer (0064).
    expect(count("SELECT count(*) n FROM deleted_sessions WHERE uuid = ?", uuid)).toBe(1);
    expect(
      count(
        "SELECT coalesce(sum(xpEarned), 0) n FROM completed_sessions WHERE id IN (?, ?)",
        keep,
        id,
      ),
    ).toBe(25);
  });

  test("gives the boss back the damage the session dealt", async () => {
    const id = await saveOne();
    t.sqlite.exec("INSERT INTO adventures (id, questId, kind) VALUES (950, 1, 'boss')");
    t.sqlite.exec(
      "INSERT INTO boss_fights (id, adventureId, totalHp, currentHp, defeatedAt) VALUES (950, 950, 100, 0, 1)",
    );
    t.sqlite
      .prepare(
        "INSERT INTO boss_damage_log (bossFightId, completedSessionId, damageDealt) VALUES (950, ?, 30), (950, ?, 5)",
      )
      .run(id, id);

    expect(await completed().deleteSession(id)).toBe("deleted");

    const fight = t.sqlite
      .prepare("SELECT currentHp, defeatedAt FROM boss_fights WHERE id = 950")
      .get() as { currentHp: number; defeatedAt: number | null };
    expect(fight).toEqual({ currentHp: 35, defeatedAt: null });
    expect(count("SELECT count(*) n FROM boss_damage_log WHERE completedSessionId = ?", id)).toBe(
      0,
    );
  });

  test("reopens the campaign step it completed, and locks the one it opened", async () => {
    const adv = (await adventures().listAdventures()).find((a) => a.kind !== "boss");
    if (!adv) throw new Error("Expected a seeded campaign");
    const run = await adventures().startAdventureRun({ adventureId: adv.id });
    const step0 = run.activeStep;
    if (!step0) throw new Error("Expected an active step");
    const id = await saveOne(step0.questId);
    await adventures().completeAdventureRunStep({ runStepId: step0.id, completedSessionId: id });

    expect(await completed().deleteSession(id)).toBe("deleted");

    const after = await adventures().getActiveAdventureRun(adv.id);
    expect(after?.activeStep?.id).toBe(step0.id);
    expect(after?.steps.find((s) => s.stepIndex === 1)?.status).toBe("locked");
  });

  test("refuses a step the campaign has already walked past", async () => {
    const adv = (await adventures().listAdventures()).find((a) => a.kind !== "boss");
    if (!adv) throw new Error("Expected a seeded campaign");
    t.sqlite.prepare("DELETE FROM adventure_runs WHERE adventureId = ?").run(adv.id);
    const run = await adventures().startAdventureRun({ adventureId: adv.id });
    const step0 = run.activeStep;
    if (!step0) throw new Error("Expected an active step");
    const first = await saveOne(step0.questId);
    const next = await adventures().completeAdventureRunStep({
      runStepId: step0.id,
      completedSessionId: first,
    });
    if (next.nextRunStepId == null) throw new Error("Expected a second step");
    const second = await saveOne(next.nextQuestId);
    await adventures().completeAdventureRunStep({
      runStepId: next.nextRunStepId,
      completedSessionId: second,
    });

    expect(await completed().deleteSession(first)).toBe("locked");
    expect(count("SELECT count(*) n FROM completed_sessions WHERE id = ?", first)).toBe(1);
    expect(
      count(
        "SELECT count(*) n FROM deleted_sessions WHERE uuid = (SELECT uuid FROM completed_sessions WHERE id = ?)",
        first,
      ),
    ).toBe(0);
  });
});
