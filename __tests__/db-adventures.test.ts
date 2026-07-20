import { createTestDb } from "./helpers/testDb";

describe("db/adventures", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  test("listAdventures returns seeded campaign adventures", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");

    const all = await adventures.listAdventures();
    expect(all.length).toBeGreaterThan(0);

    // Campaign seed inserts a real multi-step adventure wrapping "Couper du bois".
    const starter = all.find((a) => a.frTitle === "La route du bûcheron");
    expect(starter).toBeTruthy();
    if (!starter) throw new Error("Expected seeded campaign 'La route du bûcheron'");

    expect(starter.author).toBe("Admin");

    expect(starter.coverQuest.id).toBe(starter.coverQuestId);
    expect(starter.coverQuest.author).toBe("Admin");
    expect(starter.coverQuest.exercises.length).toBeGreaterThan(0);
    expect(starter.stepsCount).toBeGreaterThanOrEqual(2);
  });

  test("listAdventures and getAdventureDetails expose the seeded cover imagePath", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");

    const all = await adventures.listAdventures();
    const ironLord = all.find((a) => a.enTitle === "The Iron Lord's Conquest");
    expect(ironLord).toBeTruthy();
    if (!ironLord) throw new Error("Expected seeded adventure 'The Iron Lord's Conquest'");
    expect(ironLord.imagePath).toBe("assets/images/adventures/iron_lord_conquest.jpg");

    const details = await adventures.getAdventureDetails(ironLord.id);
    expect(details?.adventure.imagePath).toBe("assets/images/adventures/iron_lord_conquest.jpg");
    expect(details?.steps[0]?.imagePath).toBeTruthy();
  });

  test("listAdventures includes a seeded boss adventure", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");

    const all = await adventures.listAdventures();
    expect(all.length).toBeGreaterThan(0);

    const boss = all.find((a) => a.frTitle === "Le golem");
    expect(boss).toBeTruthy();
    if (!boss) throw new Error("Expected seeded boss adventure 'Le golem'");

    expect(boss.kind).toBe("boss");
    expect(boss.author).toBe("Admin");
    expect(boss.stepsCount).toBeGreaterThanOrEqual(2);
  });
});
