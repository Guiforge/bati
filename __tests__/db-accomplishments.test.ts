import { clientMock, createTestDb } from "./helpers/testDb";

// The two queries behind the village detail sheet: what the hero finished (adventures) and
// what fed a building (sessions per muscle/style). Both read history nothing else exposes.

describe("accomplishment queries", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM adventure_run_steps");
    t.sqlite.exec("DELETE FROM adventure_runs");
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

  function adventureIds(): number[] {
    return (
      t.sqlite.prepare("SELECT id FROM adventures ORDER BY id").all() as { id: number }[]
    ).map((r) => r.id);
  }

  function finishRun(adventureId: number, finishedIso: string) {
    t.sqlite
      .prepare(
        `INSERT INTO adventure_runs (adventureId, status, startedAt, finishedAt)
         VALUES (?, 'finished', ?, ?)`,
      )
      .run(adventureId, seconds(finishedIso), seconds(finishedIso));
  }

  test("listFinishedRunSummaries groups replays and keeps both dates", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");
    const [first, second, third] = adventureIds();

    expect(await adventures.listFinishedRunSummaries()).toEqual([]);

    finishRun(first, "2026-01-05T00:00:00Z");
    finishRun(first, "2026-03-05T00:00:00Z");
    finishRun(second, "2026-02-05T00:00:00Z");
    // An active run is not an accomplishment.
    t.sqlite
      .prepare("INSERT INTO adventure_runs (adventureId, status) VALUES (?, 'active')")
      .run(third);

    const summaries = await adventures.listFinishedRunSummaries();

    // Most recently finished first, so the replayed one leads.
    expect(summaries.map((s) => s.adventureId)).toEqual([first, second]);
    expect(summaries[0].timesFinished).toBe(2);
    expect(summaries[0].firstFinishedAt).toEqual(new Date("2026-01-05T00:00:00Z"));
    expect(summaries[0].lastFinishedAt).toEqual(new Date("2026-03-05T00:00:00Z"));
    expect(summaries[0].enTitle).toBeTruthy();
    expect(summaries[1].timesFinished).toBe(1);
  });

  test("getRecentContributingSessions sums work units per session, newest first", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");

    // Push-ups train chest and arms; the seeded row set is the same one muscle balance reads.
    const pushup = t.sqlite
      .prepare("SELECT id, style FROM exercises WHERE enName = 'Push-ups'")
      .get() as { id: number; style: string } | undefined;
    if (!pushup) throw new Error("Expected seeded exercise 'Push-ups'");

    const older = seconds("2026-01-01T00:00:00Z");
    const newer = seconds("2026-02-01T00:00:00Z");
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${older}), (2, ${newer});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (1, ${pushup.id}, 'reps', 20, ${older}, 0),
               (2, ${pushup.id}, 'reps', 30, ${newer}, 0),
               (2, ${pushup.id}, 'reps', 12, ${newer}, 1);
    `);

    const chest = await completed.getRecentContributingSessions({ muscle: "chest" });

    expect(chest.map((s) => s.sessionId)).toEqual([2, 1]);
    // Both rounds of session 2 count once each — the muscle join must not multiply them.
    expect(chest[0].volume).toBe(42);
    expect(chest[0].performedAt).toEqual(new Date("2026-02-01T00:00:00Z"));
    expect(chest[1].volume).toBe(20);

    // A muscle push-ups never train has no contributing session.
    expect(await completed.getRecentContributingSessions({ muscle: "legs" })).toEqual([]);

    const byStyle = await completed.getRecentContributingSessions({
      style: pushup.style as never,
    });
    expect(byStyle.map((s) => s.sessionId)).toEqual([2, 1]);
  });

  test("getRecentContributingSessions honours its limit", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");

    const pushupId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = 'Push-ups'").get() as {
        id: number;
      }
    ).id;

    const base = seconds("2026-01-01T00:00:00Z");
    for (let i = 1; i <= 5; i++) {
      const at = base + i * 86_400;
      t.sqlite.prepare("INSERT INTO completed_sessions (id, performedAt) VALUES (?, ?)").run(i, at);
      t.sqlite
        .prepare(
          `INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
           VALUES (?, ?, 'reps', 10, ?, 0)`,
        )
        .run(i, pushupId, at);
    }

    expect(await completed.getRecentContributingSessions({ muscle: "chest" })).toHaveLength(3);
    expect(await completed.getRecentContributingSessions({ muscle: "chest" }, 2)).toHaveLength(2);
  });
});
