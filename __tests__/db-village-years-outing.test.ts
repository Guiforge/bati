import { clientMock, createTestDb } from "./helpers/testDb";

/** R111: a walk's seconds are no record, so a longer outing breaks nothing in the village's years. */
describe("getVillageYears and outings", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  function add(exerciseId: number, at: number, type: "reps" | "time", value: number, xp = 100_000) {
    const { lastInsertRowid } = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES (?, 'medium', ?, ?)",
      )
      .run(`s-${at}`, xp, at);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, ?, ?, ?)`,
      )
      .run(lastInsertRowid, exerciseId, type, value, at);
  }

  test("a long outing, then a longer one: no record; the same on a rep movement is one", async () => {
    t.sqlite.exec(
      `INSERT INTO exercises (enName, frName, enDescription, frDescription, style, creator, secondsPerRep)
         VALUES ('Test Expedition', 'Expédition de test', '', '', 'expedition', 'hero', 3)`,
    );
    const walk = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = 'Test Expedition'").get() as {
        id: number;
      }
    ).id;
    const rep = (
      t.sqlite
        .prepare("SELECT id FROM exercises WHERE creator = 'Admin' AND style = 'strength' LIMIT 1")
        .get() as { id: number }
    ).id;
    const day = (d: number) => new Date(2026, 0, d, 12).getTime();
    add(walk, day(1), "time", 1800);
    add(walk, day(2), "time", 3600);
    add(rep, day(3), "reps", 10);
    add(rep, day(4), "reps", 12);

    const { getVillageYears } =
      require("../db/villageYears") as typeof import("../db/villageYears");
    const { stones } = await getVillageYears(new Date(2026, 6, 1), "FR");
    const records = stones.flatMap((s) => (s.fact.kind === "record" ? [s.fact.exerciseId] : []));
    expect(records).toContain(rep); // the control: a rep movement does break
    expect(records).not.toContain(walk);
  });
});
