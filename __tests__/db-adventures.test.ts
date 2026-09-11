import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/adventures", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
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

  test("listAdventures reports what a campaign trains, from every step and not just the cover", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");

    const all = await adventures.listAdventures();
    for (const a of all) {
      // The whole point: a poster that says nothing is the bug this replaced.
      expect(a.focus.muscles.length).toBeGreaterThan(0);
      // A campaign touches all six groups somewhere; the ranking must drop the incidental ones.
      expect(a.focus.muscles.length).toBeLessThanOrEqual(3);
      expect(new Set(a.focus.muscles).size).toBe(a.focus.muscles.length);
    }

    const ironLord = all.find((a) => a.enTitle === "The Iron Lord's Conquest");
    if (!ironLord) throw new Error("Expected seeded adventure 'The Iron Lord's Conquest'");

    // Details must agree with the gallery — two screens, one rule.
    const details = await adventures.getAdventureDetails(ironLord.id);
    expect(details?.adventure.focus).toEqual(ironLord.focus);
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

  test("getFinishedRunCountsByAdventure counts only finished runs, per adventure", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");

    const all = await adventures.listAdventures();
    const [first, second] = all;
    assert(first && second);

    expect((await adventures.getFinishedRunCountsByAdventure()).size).toBe(0);

    t.sqlite.exec(
      `INSERT INTO adventure_runs (adventureId, status) VALUES
        (${first.id}, 'finished'),
        (${first.id}, 'finished'),
        (${second.id}, 'finished'),
        (${second.id}, 'active')`,
    );

    const counts = await adventures.getFinishedRunCountsByAdventure();
    expect(counts.get(first.id)).toBe(2);
    expect(counts.get(second.id)).toBe(1);

    t.sqlite.exec(`DELETE FROM adventure_runs`);
  });

  // The gallery card says how dangerous a campaign is *before* the hero starts one, and the
  // `boss_fights` row only exists once a session has swung at it — so the pool has to travel on
  // the adventure itself.
  test("listAdventures carries each boss's pool, and no pool on a route", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");

    const all = await adventures.listAdventures();
    const bosses = all.filter((a) => a.kind === "boss");
    expect(bosses.length).toBeGreaterThan(0);
    for (const b of bosses) expect(b.bossTotalHp).toBeGreaterThan(0);

    const golem = all.find((a) => a.enTitle === "The Golem");
    assert(golem);
    expect(golem.bossTotalHp).toBe(278);
  });
});

describe("adventureOrder", () => {
  const catalogue = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const ids = (rows: { id: number }[]) => rows.map((r) => r.id);
  // Required inside the tests, not at collection time: `db/adventures` pulls in `db/client`,
  // which opens a real connection unless the mock above is already installed.
  const order = () =>
    (require("../db/adventures") as typeof import("../db/adventures")).adventureOrder;

  test("a hero who has beaten nothing sees the authored ramp untouched", () => {
    expect(ids(order()(catalogue, null, new Map()))).toEqual([1, 2, 3, 4]);
  });

  test("a campaign already beaten sinks, and keeps the authored order among its peers", () => {
    const beaten = new Map([
      [1, 3],
      [3, 1],
    ]);
    expect(ids(order()(catalogue, null, beaten))).toEqual([2, 4, 1, 3]);
  });

  test("the campaign under way outranks everything, beaten or not", () => {
    const beaten = new Map([[3, 2]]);
    expect(ids(order()(catalogue, 3, beaten))).toEqual([3, 1, 2, 4]);
  });
});
