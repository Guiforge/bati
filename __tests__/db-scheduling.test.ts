/**
 * Tests for the scheduled sessions module
 */
import { createTestDb } from "./helpers/testDb";

describe("Scheduling", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
      runMigrations: async () => {},
    }));
  });

  afterAll(() => {
    t.close();
  });

  // Clean up scheduled_sessions before each test
  beforeEach(async () => {
    const { db, schema } = require("../db/client");
    await db.delete(schema.scheduledSessions);
  });

  // Helper to get a quest ID
  async function getFirstQuestId(): Promise<number> {
    const { db, schema } = require("../db/client");
    const [quest] = await db
      .select({ id: schema.quests.id })
      .from(schema.quests)
      .limit(1);
    if (!quest) throw new Error("No quests found");
    return quest.id;
  }

  describe("createScheduledSession", () => {
    test("should create a scheduled session", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const questId = await getFirstQuestId();
      const scheduledDate = new Date();
      scheduledDate.setHours(0, 0, 0, 0);

      const session = await scheduling.createScheduledSession({
        questId,
        scheduledDate,
      });

      expect(session.id).toBeDefined();
      expect(session.questId).toBe(questId);
      expect(session.status).toBe("pending");
    });

    test("should create with optional fields", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const questId = await getFirstQuestId();
      const scheduledDate = new Date();

      const session = await scheduling.createScheduledSession({
        questId,
        scheduledDate,
        preferredHour: 9,
        note: "Morning workout",
      });

      expect(session.preferredHour).toBe(9);
      expect(session.note).toBe("Morning workout");
    });
  });

  describe("getScheduledSessionsInRange", () => {
    test("should return sessions within date range", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const questId = await getFirstQuestId();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Create sessions
      await scheduling.createScheduledSession({
        questId,
        scheduledDate: today,
      });
      await scheduling.createScheduledSession({
        questId,
        scheduledDate: tomorrow,
      });
      await scheduling.createScheduledSession({
        questId,
        scheduledDate: nextWeek,
      });

      // Get this week's sessions (today + 6 days)
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const sessions = await scheduling.getScheduledSessionsInRange(
        today,
        endOfWeek
      );

      // Should include today and tomorrow but not next week
      expect(sessions.length).toBe(2);
    });
  });

  describe("getTodaysScheduledSessions", () => {
    test("should return only today's sessions with quest data", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const questId = await getFirstQuestId();

      const today = new Date();
      today.setHours(10, 0, 0, 0); // Today at 10am

      await scheduling.createScheduledSession({
        questId,
        scheduledDate: today,
      });

      const sessions = await scheduling.getTodaysScheduledSessions();

      expect(sessions.length).toBeGreaterThanOrEqual(1);
      expect(sessions[0].quest).toBeDefined();
      expect(sessions[0].quest.id).toBe(questId);
    });
  });

  describe("updateScheduledSessionStatus", () => {
    test("should update status to skipped", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const { db, schema } = require("../db/client");
      const { eq } = require("drizzle-orm");

      const questId = await getFirstQuestId();
      const session = await scheduling.createScheduledSession({
        questId,
        scheduledDate: new Date(),
      });

      await scheduling.skipScheduledSession(session.id);

      const [row] = await db
        .select()
        .from(schema.scheduledSessions)
        .where(eq(schema.scheduledSessions.id, session.id));

      expect(row?.status).toBe("skipped");
    });

    test("should update status to completed", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const { db, schema } = require("../db/client");
      const { eq } = require("drizzle-orm");

      const questId = await getFirstQuestId();
      const session = await scheduling.createScheduledSession({
        questId,
        scheduledDate: new Date(),
      });

      // Update status without a completed session ID (to avoid FK constraint)
      await scheduling.updateScheduledSessionStatus(session.id, "completed");

      const [row] = await db
        .select()
        .from(schema.scheduledSessions)
        .where(eq(schema.scheduledSessions.id, session.id));

      expect(row?.status).toBe("completed");
    });
  });

  describe("deleteScheduledSession", () => {
    test("should delete a session", async () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const { db, schema } = require("../db/client");
      const { eq } = require("drizzle-orm");

      const questId = await getFirstQuestId();
      const session = await scheduling.createScheduledSession({
        questId,
        scheduledDate: new Date(),
      });

      await scheduling.deleteScheduledSession(session.id);

      const [row] = await db
        .select()
        .from(schema.scheduledSessions)
        .where(eq(schema.scheduledSessions.id, session.id));

      expect(row).toBeUndefined();
    });
  });

  describe("getWeekStartDate", () => {
    test("should return Monday for a Wednesday", () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      // January 8, 2025 is a Wednesday
      const wednesday = new Date(2025, 0, 8);
      const monday = scheduling.getWeekStartDate(wednesday);

      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(6); // January 6, 2025
    });

    test("should return same Monday for Monday", () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      const monday = new Date(2025, 0, 6);
      const weekStart = scheduling.getWeekStartDate(monday);

      expect(weekStart.getDay()).toBe(1);
      expect(weekStart.getDate()).toBe(6);
    });

    test("should return previous Monday for Sunday", () => {
      const scheduling =
        require("../db/scheduling") as typeof import("../db/scheduling");
      // January 12, 2025 is a Sunday
      const sunday = new Date(2025, 0, 12);
      const monday = scheduling.getWeekStartDate(sunday);

      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(6);
    });
  });
});
