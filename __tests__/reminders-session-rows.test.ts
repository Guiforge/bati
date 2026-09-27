import * as schema from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The reminders judge sessions already in memory, so `isWorkout` and `countsAsSession` exist twice:
 * as SQL in `db/completed.ts` and as row predicates in `db/reminders.ts`. Two writers of one rule
 * drift, so the same rows go through both here, on a database the migrations built.
 */
const { completedQuest } = schema;

describe("reminder session predicates", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());

  const load = () => ({
    completed: require("../db/completed") as typeof import("../db/completed"),
    reminders: require("../db/reminders") as typeof import("../db/reminders"),
  });

  test("say what the SQL says, row for row", async () => {
    const { completed, reminders } = load();
    const rows = [
      { outing: null, movingSeconds: null, durationSeconds: 1800 },
      { outing: "walk", movingSeconds: 540, durationSeconds: 3600 },
      { outing: "walk", movingSeconds: 600, durationSeconds: 700 },
      { outing: "run", movingSeconds: null, durationSeconds: 900 },
      { outing: "ride", movingSeconds: null, durationSeconds: 60 },
    ] as const;
    for (const row of rows) {
      await t.db.insert(completedQuest).values({
        questId: 1,
        performedAt: new Date(2026, 0, 10, 12),
        userLevel: "medium",
        xpEarned: 10,
        ...row,
      });
    }

    const all = await t.db
      .select({
        id: completedQuest.id,
        performedAt: completedQuest.performedAt,
        outing: completedQuest.outing,
        movingSeconds: completedQuest.movingSeconds,
        durationSeconds: completedQuest.durationSeconds,
      })
      .from(completedQuest)
      .orderBy(completedQuest.id);
    const ids = async (where: ReturnType<typeof completed.isWorkout>) =>
      (await t.db.select({ id: completedQuest.id }).from(completedQuest).where(where)).map(
        (r) => r.id,
      );

    expect(all.filter(reminders.isWorkoutRow).map((r) => r.id)).toEqual(
      await ids(completed.isWorkout()),
    );
    expect(all.filter(reminders.countsAsSessionRow).map((r) => r.id)).toEqual(
      await ids(completed.countsAsSession()),
    );
  });

  test("the days go through the preferences and come back as they went", async () => {
    const { reminders } = load();
    expect(await reminders.getReminderDays()).toEqual({});

    await reminders.setReminderDays({ mon: "20:00", sat: "09:30" });
    expect(await reminders.getReminderDays()).toEqual({ mon: "20:00", sat: "09:30" });
  });

  test("an impossible hour is dropped on the way in, not stored for later", async () => {
    const { reminders } = load();
    await reminders.setReminderDays({ mon: "25:00", tue: "06:00" });
    expect(await reminders.getReminderDays()).toEqual({ tue: "06:00" });
  });
});
