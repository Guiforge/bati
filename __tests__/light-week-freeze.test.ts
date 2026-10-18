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

  async function cleanPlank(): Promise<void> {
    const { createCompletedSession } =
      require("../db/completed") as typeof import("../db/completed");
    const sets: CompletedExerciseInput[] = [
      {
        exerciseId: idOf("Plank"),
        roundIndex: 0,
        sortOrder: 0,
        result: { type: "time", value: 30 },
        target: { type: "time", value: 30 },
        prescribed: 30,
      },
    ];
    await createCompletedSession({ exercises: sets });
  }
  const lw = () => require("../db/lightWeek") as typeof import("../db/lightWeek");
  const servedPlank = async () => {
    const { loadSlotJournal } = require("../db/quests") as typeof import("../db/quests");
    const plank = idOf("Plank");
    return nameOf((await loadSlotJournal([plank])).served.get(plank));
  };

  test("a clean session during the week promotes nobody; ending the week gives it back", async () => {
    await lw().acceptLightWeek(new Date(Date.now() - DAY));
    await cleanPlank();
    expect(await servedPlank()).toBe("Dead Bug");

    await lw().endLightWeek(new Date());
    expect(await servedPlank()).toBe("Plank");
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
    expect((await getChainTo(plank))?.position).toBe(2);
  });
});
