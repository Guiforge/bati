import type { CompletedExerciseInput } from "@/db/completed";
import { clientMock, createTestDb } from "./helpers/testDb";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Owner decision of 18/10: a running light week freezes the ladder (no rung promotion) and
 * tonight's progressive target (+1); only one round fewer. Through the writer and the readers a
 * quest slot actually calls.
 */
describe("a running light week freezes the ladder and the target", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
  });
  afterAll(() => t.close());

  const idOf = (enName: string): number =>
    (t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number })
      .id;
  const nameOf = (id: number | undefined): string =>
    (t.sqlite.prepare("SELECT enName FROM exercises WHERE id = ?").get(id) as { enName: string })
      .enName;

  async function clean(name: string): Promise<void> {
    const { createCompletedSession } =
      require("../db/completed") as typeof import("../db/completed");
    const sets: CompletedExerciseInput[] = [
      {
        exerciseId: idOf(name),
        roundIndex: 0,
        sortOrder: 0,
        result: { type: "time", value: 30 },
        target: { type: "time", value: 30 },
        prescribed: 30,
      },
    ];
    await createCompletedSession({ exercises: sets });
  }
  const cleanPlank = () => clean("Plank");
  const cleanDeadBug = () => clean("Dead Bug");
  const lw = () => require("../db/lightWeek") as typeof import("../db/lightWeek");
  const servedPlank = async () => {
    const { loadSlotJournal } = require("../db/quests") as typeof import("../db/quests");
    const plank = idOf("Plank");
    return nameOf((await loadSlotJournal([plank])).served.get(plank));
  };

  test("a clean session during the week promotes nobody, and stays neutral after it", async () => {
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    await cleanPlank();
    expect(await servedPlank()).toBe("Dead Bug");

    await lw().endLightWeek(new Date());
    expect(await servedPlank()).toBe("Dead Bug");
  });

  test("three clean week sessions on the served rung earn nothing; the series restarts after", async () => {
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    for (let i = 0; i < 3; i++) await cleanDeadBug();
    await lw().endLightWeek(new Date());
    expect(await servedPlank()).toBe("Dead Bug");
    // One normal session is one of the three, not the end of the week's three.
    await cleanDeadBug();
    expect(await servedPlank()).toBe("Dead Bug");
    await cleanDeadBug();
    await cleanDeadBug();
    expect(await servedPlank()).toBe("Plank");
  });

  test("week sessions are neutral, not erased: the series spans the week", async () => {
    for (let i = 0; i < 2; i++) await cleanDeadBug();
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    for (let i = 0; i < 3; i++) await cleanDeadBug();
    await lw().endLightWeek(new Date());
    expect(await servedPlank()).toBe("Dead Bug");
    await cleanDeadBug();
    expect(await servedPlank()).toBe("Plank");
  });

  test("week sessions are stored neutral, a normal one is not", async () => {
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    await cleanPlank();
    await lw().endLightWeek(new Date());
    await cleanPlank();
    const flags = t.sqlite
      .prepare("SELECT ladderNeutral AS n FROM completed_exercises ORDER BY id")
      .all() as { n: number }[];
    expect(flags.map((f) => f.n)).toEqual([1, 0]);
  });

  test("the +1 resumes from the pre-week target", async () => {
    const plank = idOf("Plank");
    const { loadSlotJournal, progressiveSlot } =
      require("../db/quests") as typeof import("../db/quests");
    await repsSessionAt(plank, 10, 10);
    await lw().acceptLightWeek(new Date(Date.now() - 5 * DAY));
    for (const d of [3, 2, 1]) await repsSessionAt(plank, d, 14);
    await lw().endLightWeek(new Date());
    const journal = await loadSlotJournal([plank]);
    const { target } = progressiveSlot({
      base: { type: "reps", min: 6, max: 14 },
      fallback: { type: "reps", value: 8 },
      exercise: { id: plank, style: "standard" } as never,
      level: "medium",
      journal,
    });
    // Without the week the three clean 14s would have pushed it to the cap; it stays at 14.
    expect(target.value).toBe(14);
  });

  test("a hero quest keeps its rounds in a light week", () => {
    const { lightenRounds } = lw();
    expect(lightenRounds({ rounds: 3, author: "hero" }, null, true).rounds).toBe(3);
    expect(lightenRounds({ rounds: 3, author: "Admin" }, null, true).rounds).toBe(2);
  });

  test("the exercise page's next step does not announce a rung the quest does not serve", async () => {
    const { getNextProgression } = require("../db/exercises") as typeof import("../db/exercises");
    const deadBug = idOf("Dead Bug");
    await cleanPlank();
    expect((await getNextProgression(deadBug))?.isEarned).toBe(true);

    // The week began a day ago: the session before it is gone from the standing, as for the quest.
    await t.sqlite.exec("DELETE FROM completed_exercises");
    await t.sqlite.exec("DELETE FROM completed_sessions");
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    await cleanPlank();
    expect((await getNextProgression(deadBug))?.isEarned).toBe(false);
  });

  test("a session before the week still counts", async () => {
    await cleanPlank();
    await lw().acceptLightWeek(new Date(Date.now() + 1000));
    expect(await servedPlank()).toBe("Plank");
  });

  test("the progressive target ignores sessions from the week", () => {
    const { progressiveSlot } = require("../db/quests") as typeof import("../db/quests");
    const now = Date.now();
    const mark = (at: number, prescribed: number) => ({
      prescribed,
      met: true,
      at,
      level: "medium" as const,
    });
    const history = new Map([
      [
        "1:reps",
        {
          last: 11,
          best: 11,
          at: now - 1000,
          bestAt: now - 1000,
          seasonBest: 11,
          recent: [mark(now - 1000, 11), mark(now - 3 * DAY, 10)],
        },
      ],
    ]);
    const run = (freezeAt?: number) =>
      progressiveSlot({
        base: { type: "reps", min: 6, max: 14 },
        fallback: { type: "reps", value: 8 },
        exercise: { id: 1, style: "standard" } as never,
        level: "medium",
        journal: { history, readAt: now, ...(freezeAt == null ? {} : { freezeAt }) },
      }).target.value;
    // Not frozen, the last clean 11 moves on to 12; frozen at 2 days ago, the 10 moves to 11.
    expect(run()).toBe(12);
    expect(run(now - 2 * DAY)).toBe(11);
  });

  async function repsSessionAt(exerciseId: number, daysAgo: number, reps: number) {
    const { createCompletedSession } =
      require("../db/completed") as typeof import("../db/completed");
    await createCompletedSession({
      performedAt: new Date(Date.now() - daysAgo * DAY),
      exercises: [
        {
          exerciseId,
          roundIndex: 0,
          sortOrder: 0,
          result: { type: "reps", value: reps },
          target: { type: "reps", value: reps },
          prescribed: reps,
        },
      ],
    });
  }
  const frozenSlot = async (squat: number, freezeAt: number) => {
    const { loadSlotJournal, progressiveSlot } =
      require("../db/quests") as typeof import("../db/quests");
    await lw().acceptLightWeek(new Date(freezeAt));
    const journal = await loadSlotJournal([squat]);
    return progressiveSlot({
      base: { type: "reps", min: 6, max: 14 },
      fallback: { type: "reps", value: 8 },
      exercise: { id: squat, style: "standard" } as never,
      level: "medium",
      journal,
    });
  };

  test("three sessions inside the week do not push the frozen target back to the band", async () => {
    const squat = idOf("Plank");
    await repsSessionAt(squat, 12, 10);
    await repsSessionAt(squat, 10, 11);
    for (const d of [3, 2, 1]) await repsSessionAt(squat, d, 12);
    const { target, why } = await frozenSlot(squat, Date.now() - 5 * DAY);
    expect(why).not.toBe("band");
    expect(target.value).toBe(12);
  });

  test("a session since the freeze is not a return from a break", async () => {
    const squat = idOf("Plank");
    await repsSessionAt(squat, 15, 10);
    await repsSessionAt(squat, 1, 12);
    const { why } = await frozenSlot(squat, Date.now() - 5 * DAY);
    expect(why).not.toBe("comeback");
  });

  test("the warm-up, the cap offer and the victory read the frozen ladder", async () => {
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    await cleanPlank();
    const { unavailableExerciseIds, checkForNewRungs } =
      require("../db/exercises") as typeof import("../db/exercises");
    const { checkCapOffers } = require("../db/capOffer") as typeof import("../db/capOffer");
    const plank = idOf("Plank");
    // Same answer as the quest (`servedPlank`): Plank itself is behind the rung not yet earned.
    expect((await unavailableExerciseIds()).has(plank)).toBe(true);
    const sessionId = (
      t.sqlite.prepare("SELECT max(id) AS id FROM completed_sessions").get() as {
        id: number;
      }
    ).id;
    expect(await checkForNewRungs(sessionId)).toEqual([]);
    expect(await checkCapOffers(1, [], "medium")).toEqual([]);
  });

  test("the chain position follows the rung the quest serves, not the live ladder", async () => {
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    await cleanPlank();
    const { getChainTo } = require("../db/exercises") as typeof import("../db/exercises");
    const plank = idOf("Plank");
    const chain = await getChainTo(plank);
    const served = await servedPlank();
    expect(chain?.rungs[(chain?.position ?? 1) - 1]?.exercise.enName).toBe(served);
    expect(chain?.position).toBe(1);

    await lw().endLightWeek(new Date());
    expect((await getChainTo(plank))?.position).toBe(1);
  });
});
