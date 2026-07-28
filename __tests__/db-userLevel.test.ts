import * as schema from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

const { completedQuest } = schema;

describe("db/userLevel", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.db.delete(completedQuest).run();
  });

  describe("calculateLevelFromXp", () => {
    test("returns level 1 for 0 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(0)).toBe(1);
    });

    test("returns level 1 for 99 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(99)).toBe(1);
    });

    test("returns level 2 for 100 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(100)).toBe(2);
    });

    test("returns level 5 for 1000 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(1000)).toBe(5);
    });

    test("returns level 10 for 4500 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(4500)).toBe(10);
    });

    test("returns level 20 for 19000 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(19000)).toBe(20);
    });

    test("returns level 21 for 21000 XP", () => {
      const { calculateLevelFromXp } =
        require("../db/userLevel") as typeof import("../db/userLevel");
      expect(calculateLevelFromXp(21000)).toBe(21);
    });
  });

  describe("getXpForLevel", () => {
    test("returns 0 for level 1", () => {
      const { getXpForLevel } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getXpForLevel(1)).toBe(0);
    });

    test("returns 100 for level 2", () => {
      const { getXpForLevel } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getXpForLevel(2)).toBe(100);
    });

    test("returns 19000 for level 20", () => {
      const { getXpForLevel } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getXpForLevel(20)).toBe(19000);
    });

    test("returns 21000 for level 21", () => {
      const { getXpForLevel } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getXpForLevel(21)).toBe(21000);
    });
  });

  describe("getLevelTitle", () => {
    test("returns Apprentice for level 1", () => {
      const { getLevelTitle } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getLevelTitle(1).en).toBe("Apprentice");
    });

    test("returns Master for level 10", () => {
      const { getLevelTitle } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getLevelTitle(10).en).toBe("Master");
    });

    test("returns Divine for level 20", () => {
      const { getLevelTitle } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getLevelTitle(20).en).toBe("Divine");
    });

    test("returns Divine 25 for level 25", () => {
      const { getLevelTitle } = require("../db/userLevel") as typeof import("../db/userLevel");
      expect(getLevelTitle(25).en).toBe("Divine 25");
    });
  });

  describe("getTotalXp", () => {
    test("returns 0 for empty database", async () => {
      const { getTotalXp } = require("../db/userLevel") as typeof import("../db/userLevel");
      const result = await getTotalXp();
      expect(result).toBe(0);
    });

    test("sums XP from all sessions", async () => {
      const { getTotalXp } = require("../db/userLevel") as typeof import("../db/userLevel");

      // Add some sessions with XP
      await t.db.insert(completedQuest).values([
        { xpEarned: 100, userLevel: "medium", performedAt: new Date() },
        { xpEarned: 200, userLevel: "medium", performedAt: new Date() },
        { xpEarned: 150, userLevel: "medium", performedAt: new Date() },
      ]);

      const result = await getTotalXp();
      expect(result).toBe(450);
    });
  });

  describe("getUserLevelInfo", () => {
    test("returns level 1 for empty database", async () => {
      const { getUserLevelInfo } = require("../db/userLevel") as typeof import("../db/userLevel");
      const result = await getUserLevelInfo();
      expect(result.level).toBe(1);
      expect(result.totalXp).toBe(0);
      expect(result.title.en).toBe("Apprentice");
    });

    test("returns correct level info for XP", async () => {
      const { getUserLevelInfo } = require("../db/userLevel") as typeof import("../db/userLevel");

      // Add sessions totaling 350 XP (should be level 3)
      await t.db.insert(completedQuest).values([
        { xpEarned: 200, userLevel: "medium", performedAt: new Date() },
        { xpEarned: 150, userLevel: "medium", performedAt: new Date() },
      ]);

      const result = await getUserLevelInfo();
      expect(result.level).toBe(3);
      expect(result.totalXp).toBe(350);
      expect(result.title.en).toBe("Trainee");
      expect(result.currentLevelXp).toBe(50); // 350 - 300 (level 3 start)
      expect(result.xpToNextLevel).toBe(250); // 600 (level 4 start) - 350
    });
  });

  describe("getTotalStats", () => {
    test("returns zeros for empty database", async () => {
      const { getTotalStats } = require("../db/userLevel") as typeof import("../db/userLevel");
      const result = await getTotalStats();
      expect(result.totalSessions).toBe(0);
      expect(result.totalSeconds).toBe(0);
      expect(result.totalXp).toBe(0);
    });

    test("calculates totals correctly", async () => {
      const { getTotalStats } = require("../db/userLevel") as typeof import("../db/userLevel");

      await t.db.insert(completedQuest).values([
        {
          xpEarned: 100,
          durationSeconds: 600,
          userLevel: "medium",
          performedAt: new Date(),
        },
        {
          xpEarned: 200,
          durationSeconds: 1200,
          userLevel: "medium",
          performedAt: new Date(),
        },
      ]);

      const result = await getTotalStats();
      expect(result.totalSessions).toBe(2);
      expect(result.totalSeconds).toBe(1800);
      expect(result.totalXp).toBe(300);
    });
  });
});
