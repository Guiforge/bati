import * as schema from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The bridge from the journal to the native half: what `replanReminders` reads and what it hands
 * over. The native module is the one thing faked, as it is absent in jest; the plan itself is the
 * real `planReminders` over a database the migrations built.
 */
const { completedQuest, userPreferences } = schema;

const mockSetPlan = jest.fn();
let mockState = { enabled: true, resumeDate: null, log: [] as unknown[] };

jest.mock("@/modules/bati-reminders", () => ({
  isAvailable: () => true,
  getState: () => mockState,
  setPlan: (plan: unknown) => mockSetPlan(plan),
}));

describe("replanReminders", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());

  beforeEach(() => {
    mockSetPlan.mockClear();
    mockState = { enabled: true, resumeDate: null, log: [] };
    t.db.delete(completedQuest).run();
    t.db
      .insert(userPreferences)
      .values({ key: "reminderDays", value: JSON.stringify(everyDay) })
      .onConflictDoNothing()
      .run();
  });

  const everyDay = Object.fromEntries(
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => [d, "23:59"]),
  );
  const replan = () =>
    (require("@/src/reminders") as typeof import("@/src/reminders")).replanReminders;

  test("hands over the plan, with the words the native half cannot know", async () => {
    await replan()(false);
    expect(mockSetPlan).toHaveBeenCalledTimes(1);
    const plan = mockSetPlan.mock.calls[0]?.[0];
    expect(plan.entries.length).toBeGreaterThan(0);
    expect(plan.entries[0].title).not.toMatch(/^reminders\./);
    expect(plan.dueToday).toBe("yes");
    expect(plan.channelName).toBe("Training reminders");
    expect(plan.actionLabels).toEqual({ snooze: "In 1 hour", pause: "Pause 7 days" });
    expect(plan.quietText).not.toBe("");
    // The numbers the native half keeps to have one home, db/reminders.ts.
    expect(plan).toMatchObject({ horizonDays: 14, pauseDays: 7, lateMinutes: 60 });
  });

  test("a session under way holds today", async () => {
    await replan()(true);
    expect(mockSetPlan.mock.calls[0]?.[0].dueToday).toBe("hold");
  });

  test("a workout in the journal today cancels it", async () => {
    t.db
      .insert(completedQuest)
      .values({ questId: 1, performedAt: new Date(), userLevel: "medium", xpEarned: 10 })
      .run();
    await replan()(false);
    expect(mockSetPlan.mock.calls[0]?.[0].dueToday).toBe("no");
  });

  test("speaks the app's stored language, not the device's", async () => {
    t.db
      .insert(userPreferences)
      .values({ key: "language", value: "fr" })
      .onConflictDoUpdate({ target: userPreferences.key, set: { value: "fr" } })
      .run();
    await replan()(false);
    const plan = mockSetPlan.mock.calls[0]?.[0];
    expect(plan.channelName).toBe("Rappels d'entraînement");
    expect(plan.actionLabels.snooze).toBe("Dans 1 h");
    t.db.delete(userPreferences).run();
  });

  test("a phone whose switch is off reads nothing and arms nothing", async () => {
    mockState = { ...mockState, enabled: false };
    await replan()(false);
    expect(mockSetPlan).not.toHaveBeenCalled();
  });
});
