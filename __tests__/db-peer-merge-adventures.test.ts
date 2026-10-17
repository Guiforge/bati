import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The hero's adventures through the real `mergePeer`, on two SQLite files built by the migrations.
 * A case that removes a quest an adventure names, or expects a `questId = 0` step, turns
 * `foreign_keys` OFF first, as the phone runs: under the test database's ON it would assert a
 * cascade no device performs, or fail on a reference no device checks.
 */
let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-merge-adv-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");
const adventures = () => require("../db/adventures") as typeof import("../db/adventures");

const U_X = "0192c000-0000-7000-8000-00000000000a";
const U_H = "0192c000-0000-7000-8000-00000000000b";
const U_H2 = "0192c000-0000-7000-8000-00000000000c";

function heroQuest(sqlite: Database.Database, title: string, at: number, uuid: string) {
  return Number(
    sqlite
      .prepare(
        `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt, uuid)
         VALUES (?, ?, '', '', 'hero', ?, ?, ?)`,
      )
      .run(title, title, at, at, uuid).lastInsertRowid,
  );
}

function heroAdventure(
  sqlite: Database.Database,
  o: {
    uuid: string;
    title: string;
    at: number;
    steps: number[];
    kind?: "route" | "boss";
    active?: number;
    narrative?: string;
    bossName?: string;
    bossLinesJson?: string;
  },
) {
  const id = Number(
    sqlite
      .prepare(
        `INSERT INTO adventures (questId, enTitle, frTitle, deTitle, esTitle, author, sortOrder, kind, isActive,
           imagePath, bossImagePath, bossWeaknessMuscle, bossResistanceMuscle, createdAt, updatedAt, uuid,
           bossName, bossLinesJson)
         VALUES (?, ?, ?, ?, ?, 'hero', 1000, ?, ?, 'the_golem', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        o.steps[0],
        o.title,
        o.title,
        o.title,
        o.title,
        o.kind ?? "route",
        o.active ?? 1,
        o.kind === "boss" ? "assets/images/bosses/iron_golem.jpg" : null,
        o.kind === "boss" ? "chest" : null,
        o.kind === "boss" ? "legs" : null,
        o.at,
        o.at,
        o.uuid,
        o.bossName ?? null,
        o.bossLinesJson ?? null,
      ).lastInsertRowid,
  );
  setSteps(sqlite, id, o.steps, o.narrative ?? "");
  return id;
}

function setSteps(sqlite: Database.Database, id: number, steps: number[], narrative: string) {
  sqlite.prepare("DELETE FROM adventure_steps WHERE adventureId = ?").run(id);
  const insert = sqlite.prepare(
    `INSERT INTO adventure_steps (adventureId, stepIndex, questId, enNarrative, frNarrative, deNarrative, esNarrative)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const [i, q] of steps.entries())
    insert.run(id, i, q, narrative, narrative, narrative, narrative);
  sqlite.prepare("UPDATE adventures SET questId = ? WHERE id = ?").run(steps[0], id);
}

/** An active run with its steps copied, the first one active. */
function runOf(sqlite: Database.Database, adventureId: number): number[] {
  const run = Number(
    sqlite
      .prepare(
        "INSERT INTO adventure_runs (adventureId, status, startedAt) VALUES (?, 'active', unixepoch())",
      )
      .run(adventureId).lastInsertRowid,
  );
  const steps = sqlite
    .prepare(
      "SELECT stepIndex, questId FROM adventure_steps WHERE adventureId = ? ORDER BY stepIndex",
    )
    .all(adventureId) as { stepIndex: number; questId: number }[];
  return steps.map((s) =>
    Number(
      sqlite
        .prepare(
          "INSERT INTO adventure_run_steps (runId, stepIndex, questId, status) VALUES (?, ?, ?, ?)",
        )
        .run(run, s.stepIndex, s.questId, s.stepIndex === 0 ? "active" : "locked").lastInsertRowid,
    ),
  );
}

async function peer(name: string, edit: (sqlite: Database.Database) => void = () => {}) {
  const file = path.join(dir, name);
  await backup().snapshotDatabaseTo(file);
  const sqlite = new Database(file);
  edit(sqlite);
  sqlite.close();
  return file;
}

const adminQuests = () =>
  (
    t.sqlite.prepare("SELECT id FROM quests WHERE author = 'Admin' ORDER BY id LIMIT 4").all() as {
      id: number;
    }[]
  ).map((r) => r.id);

const adventureByUuid = (uuid: string) =>
  t.sqlite.prepare("SELECT * FROM adventures WHERE uuid = ?").get(uuid) as
    | {
        id: number;
        questId: number;
        isActive: number;
        kind: string;
        enTitle: string;
        updatedAt: number;
      }
    | undefined;

const stepsOf = (id: number) =>
  t.sqlite
    .prepare(
      "SELECT stepIndex, questId, enNarrative FROM adventure_steps WHERE adventureId = ? ORDER BY stepIndex",
    )
    .all(id) as { stepIndex: number; questId: number; enNarrative: string }[];

const questByUuid = (uuid: string) =>
  t.sqlite.prepare("SELECT id FROM quests WHERE uuid = ?").get(uuid) as { id: number } | undefined;

async function converged(file: string) {
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0 });
}

test("a: an adventure written on the other device lands here, on this device's quest ids", async () => {
  const [q1] = adminQuests();
  if (!q1) throw new Error("seed quest expected");
  const file = await peer("tablet.db", (sqlite) => {
    const h = heroQuest(sqlite, "Porch forge", 100, U_H);
    heroAdventure(sqlite, { uuid: U_X, title: "Tale", at: 200, steps: [q1, h] });
  });

  const outcome = await merge().mergePeer(file);

  expect(outcome).toMatchObject({ merged: true });
  const x = adventureByUuid(U_X);
  expect(x?.enTitle).toBe("Tale");
  const hereH = questByUuid(U_H)?.id;
  expect(hereH).toBeDefined();
  expect(stepsOf(x?.id as number).map((s) => s.questId)).toEqual([q1, hereH]);
  expect(x?.questId).toBe(q1);
  expect(await merge().mergePeer(file)).toMatchObject({ merged: true, changes: 0 });
  await converged(file);
});

test("b: the newer edit wins whole, its steps replaced, and a same-second tie goes to the larger text", async () => {
  const [q1, q2, q3] = adminQuests();
  if (!q1 || !q2 || !q3) throw new Error("seed quests expected");
  const id = heroAdventure(t.sqlite, {
    uuid: U_X,
    title: "Tale",
    at: 100,
    steps: [q1, q2],
    narrative: "old",
  });
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE adventures SET enTitle = 'Tale 2', updatedAt = 200 WHERE uuid = ?")
      .run(U_X);
    setSteps(sqlite, id, [q2, q1, q3], "new");
  });

  await merge().mergePeer(file);

  expect(adventureByUuid(U_X)?.enTitle).toBe("Tale 2");
  expect(stepsOf(id).map((s) => [s.questId, s.enNarrative])).toEqual([
    [q2, "new"],
    [q1, "new"],
    [q3, "new"],
  ]);
  await converged(file);

  // Same second, different text: the larger canonical text wins on both sides.
  const tie = await peer("tie.db", (sqlite) => {
    setSteps(sqlite, id, [q2, q1, q3], "zzz");
  });
  await merge().mergePeer(tie);
  expect(stepsOf(id).map((s) => s.enNarrative)).toEqual(["zzz", "zzz", "zzz"]);
  await converged(tie);

  // This side holds the larger text: nothing to take from the smaller one.
  const smaller = await peer("smaller.db", (sqlite) => {
    setSteps(sqlite, id, [q2, q1, q3], "aaa");
  });
  await merge().mergePeer(smaller);
  expect(stepsOf(id).map((s) => s.enNarrative)).toEqual(["zzz", "zzz", "zzz"]);
  await converged(smaller);
});

test("c: a quest deleted here that an adventure written there names comes back, mapped, tombstone kept", async () => {
  const [q1] = adminQuests();
  if (!q1) throw new Error("seed quest expected");
  const h = heroQuest(t.sqlite, "Porch forge", 100, U_H);
  const file = await peer("tablet.db", (sqlite) => {
    heroAdventure(sqlite, { uuid: U_X, title: "Tale", at: 300, steps: [q1, h] });
  });
  await require("../db/quests").deleteQuest(h);
  expect(questByUuid(U_H)).toBeUndefined();

  await merge().mergePeer(file);

  const back = questByUuid(U_H)?.id;
  expect(back).toBeDefined();
  expect(stepsOf(adventureByUuid(U_X)?.id as number).map((s) => s.questId)).toEqual([q1, back]);
  expect(await merge().honourTombstones()).toBe(0);
  expect(questByUuid(U_H)).toBeDefined();
  expect(
    t.sqlite.prepare("SELECT count(*) AS n FROM deleted_content WHERE uuid = ?").get(U_H),
  ).toEqual({ n: 1 });
  await converged(file);
});

describe("d: a quest deleted there that an adventure names here (foreign keys OFF, as on a phone)", () => {
  /** Retired there, its quest deleted there; here the older copy is active and names the quest. */
  async function setup() {
    t.sqlite.pragma("foreign_keys = OFF");
    const [q1] = adminQuests();
    if (!q1) throw new Error("seed quest expected");
    const h = heroQuest(t.sqlite, "Porch forge", 100, U_H);
    const id = heroAdventure(t.sqlite, { uuid: U_X, title: "Tale", at: 100, steps: [q1, h] });
    const file = await peer("tablet.db", (sqlite) => {
      sqlite.pragma("foreign_keys = OFF");
      sqlite.prepare("UPDATE adventures SET isActive = 0, updatedAt = 400 WHERE uuid = ?").run(U_X);
      sqlite.prepare("DELETE FROM quest_exercises WHERE questId = ?").run(h);
      sqlite.prepare("DELETE FROM quests WHERE id = ?").run(h);
      sqlite.prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, 500)").run(U_H);
    });
    return { q1, h, id, file };
  }

  test("the merge does not roll back: the step is written with questId 0, the quest goes, the retired adventure stays", async () => {
    const { q1, id, file } = await setup();

    await merge().mergePeer(file);

    expect(adventureByUuid(U_X)?.isActive).toBe(0);
    expect(stepsOf(id).map((s) => s.questId)).toEqual([q1, 0]);
    expect(await merge().honourTombstones()).toBe(1);
    expect(questByUuid(U_H)).toBeUndefined();
    expect(adventureByUuid(U_X)).toBeDefined();
    expect(stepsOf(id)).toHaveLength(2);
    await converged(file);
    expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 0 });
    // A second merge changes nothing, in either direction.
    expect(await merge().mergePeer(file)).toMatchObject({ merged: true, changes: 0 });
  });

  test("a run under way here keeps the quest, and finishes", async () => {
    const { h, id, file } = await setup();
    const runSteps = runOf(t.sqlite, id);

    await merge().mergePeer(file);
    expect(await merge().honourTombstones()).toBe(0);
    expect(questByUuid(U_H)?.id).toBe(h);

    const session = (q: number) =>
      Number(
        t.sqlite
          .prepare(
            "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 1, unixepoch())",
          )
          .run(q).lastInsertRowid,
      );
    const first = await adventures().completeAdventureRunStep({
      runStepId: runSteps[0] as number,
      completedSessionId: session(adminQuests()[0] as number),
    });
    expect(first.isFinished).toBe(false);
    const last = await adventures().completeAdventureRunStep({
      runStepId: runSteps[1] as number,
      completedSessionId: session(h),
    });
    expect(last.isFinished).toBe(true);
  });
});

test("e: retired there, newer: retired here, and a second merge changes nothing", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  heroAdventure(t.sqlite, { uuid: U_X, title: "Tale", at: 100, steps: [q1, q2] });
  const file = await peer("tablet.db", (sqlite) => {
    sqlite.prepare("UPDATE adventures SET isActive = 0, updatedAt = 200 WHERE uuid = ?").run(U_X);
  });

  await merge().mergePeer(file);

  expect(adventureByUuid(U_X)?.isActive).toBe(0);
  expect((await adventures().listAdventures()).find((a) => a.enTitle === "Tale")?.isActive).toBe(0);
  expect(await merge().mergePeer(file)).toMatchObject({ merged: true, changes: 0 });
  await converged(file);
});

test.each([
  ["route to boss", "route", "boss"],
  ["boss to route", "boss", "route"],
] as const)(
  "f: steps and kind changed there while a run is active here (%s): the run finishes",
  async (_name, before, after) => {
    const [q1, q2, q3] = adminQuests();
    if (!q1 || !q2 || !q3) throw new Error("seed quests expected");
    const id = heroAdventure(t.sqlite, {
      uuid: U_X,
      title: "Tale",
      at: 100,
      steps: [q1, q2],
      kind: before,
    });
    const runSteps = runOf(t.sqlite, id);
    const file = await peer("tablet.db", (sqlite) => {
      sqlite
        .prepare("UPDATE adventures SET kind = ?, updatedAt = 200 WHERE uuid = ?")
        .run(after, U_X);
      setSteps(sqlite, id, [q3, q2, q1], "");
    });

    await merge().mergePeer(file);

    expect(adventureByUuid(U_X)?.kind).toBe(after);
    const session = (q: number) =>
      Number(
        t.sqlite
          .prepare(
            "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 1, unixepoch())",
          )
          .run(q).lastInsertRowid,
      );
    const one = await adventures().completeAdventureRunStep({
      runStepId: runSteps[0] as number,
      completedSessionId: session(q1),
    });
    const two = await adventures().completeAdventureRunStep({
      runStepId: runSteps[1] as number,
      completedSessionId: session(q2),
    });
    expect(one.isFinished).toBe(false);
    expect(two.isFinished).toBe(true);
    // The narrative of a step whose quest changed under the run is none, not the wrong one.
    const narrative =
      require("../db/adventures-narrative") as typeof import("../db/adventures-narrative");
    expect(await narrative.getAdventureStepNarrative(runSteps[0] as number)).toBeNull();
  },
);

test("g: a hero adventure called like a seeded one stays beside it, and the seeded one is never written", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  const seeded = t.sqlite
    .prepare(
      "SELECT id, updatedAt FROM adventures WHERE author = 'Admin' AND enTitle = 'The Golem'",
    )
    .get() as { id: number; updatedAt: number | null };
  const file = await peer("tablet.db", (sqlite) => {
    heroAdventure(sqlite, { uuid: U_X, title: "The Golem", at: 200, steps: [q1, q2] });
  });

  await merge().mergePeer(file);

  const rows = t.sqlite
    .prepare("SELECT author FROM adventures WHERE enTitle = 'The Golem' ORDER BY author")
    .all();
  expect(rows).toEqual([{ author: "Admin" }, { author: "hero" }]);
  expect(t.sqlite.prepare("SELECT updatedAt FROM adventures WHERE id = ?").get(seeded.id)).toEqual({
    updatedAt: seeded.updatedAt,
  });
  await converged(file);
});

test("h: a new hero adventure is one change and moves only the content segment of the fingerprint", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  const bare = await peer("bare.db");
  const before = (await backup().compareWithPeer(bare)).fingerprint.split("|");
  const file = await peer("tablet.db", (sqlite) => {
    heroAdventure(sqlite, { uuid: U_X, title: "Tale", at: 200, steps: [q1, q2] });
  });

  const cmp = await backup().compareWithPeer(file);

  expect(cmp.peerChanges).toBe(1);
  const after = cmp.fingerprint.split("|");
  expect(after).toHaveLength(4);
  expect(after[0]).toBe(before[0]);
  expect(after[1]).not.toBe(before[1]);
  expect(after[2]).toBe(before[2]);
  expect(after[3]).toBe(before[3]);

  // A device with no hero adventure names its content as it did before: max(updatedAt):count over
  // the hero's quests, movements and preferences alone.
  const here = (await backup().stateFingerprint()).split("|");
  const keys = require("../db/backup").MERGED_PREFERENCES as readonly string[];
  const rows = t.sqlite
    .prepare(
      `SELECT updatedAt AS at FROM exercises WHERE creator = 'hero'
       UNION ALL SELECT updatedAt FROM quests WHERE author = 'hero'
       UNION ALL SELECT updatedAt FROM user_preferences WHERE key IN (${keys.map(() => "?").join(",")})`,
    )
    .all(...keys) as { at: number | null }[];
  const newest = Math.max(0, ...rows.map((r) => r.at ?? 0));
  expect(here[1]).toBe(`${newest}:${rows.length}`);
});

test("i: a peer on 0075 is compared without error, never merged, and its content segment is the one it had", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  heroAdventure(t.sqlite, { uuid: U_X, title: "Tale", at: 200, steps: [q1, q2] });
  const plain = await peer("plain.db");
  const file = await peer("old.db", (sqlite) => {
    sqlite.exec(`ALTER TABLE adventures DROP COLUMN bossLinesJson; ALTER TABLE adventures DROP COLUMN bossName;
      DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations);`);
  });

  const cmp = await backup().compareWithPeer(file);
  expect(cmp).toBeDefined();
  expect(await merge().mergePeer(file)).toEqual({ merged: false });
  // The migration moves no row and no updatedAt, so the content segment is the same.
  const plainCmp = await backup().compareWithPeer(plain);
  expect(cmp.fingerprint.split("|")[1]).toBe(plainCmp.fingerprint.split("|")[1]);
});

test("i2: a peer before 0075 is compared without error and never merged", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  heroAdventure(t.sqlite, { uuid: U_X, title: "Tale", at: 200, steps: [q1, q2] });
  const file = await peer("older.db", (sqlite) => {
    sqlite.exec(`DROP INDEX adventures_uuid_unique; DROP INDEX adventures_admin_title_unique;
      ALTER TABLE adventures DROP COLUMN bossLinesJson; ALTER TABLE adventures DROP COLUMN bossName;
      ALTER TABLE adventures DROP COLUMN uuid;
      DELETE FROM __drizzle_migrations WHERE created_at IN (SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 2);`);
  });

  await expect(backup().compareWithPeer(file)).resolves.toBeDefined();
  expect(await merge().mergePeer(file)).toEqual({ merged: false });
});

test("k: the boss's name and lines travel with the adventure, and a same-second edit converges", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  heroAdventure(t.sqlite, { uuid: U_X, title: "Tale", at: 100, steps: [q1, q2], kind: "boss" });
  const voiceOf = () =>
    t.sqlite.prepare("SELECT bossName, bossLinesJson FROM adventures WHERE uuid = ?").get(U_X) as {
      bossName: string | null;
      bossLinesJson: string | null;
    };
  const edit = (name: string, lines: string, at: number) => (sqlite: Database.Database) => {
    sqlite
      .prepare(
        "UPDATE adventures SET bossName = ?, bossLinesJson = ?, updatedAt = ? WHERE uuid = ?",
      )
      .run(name, lines, at, U_X);
  };

  const newer = await peer(
    "newer.db",
    edit("Nightcoil the Hungry", '{"idle":["Again."],"crit":[],"enrage":[]}', 200),
  );
  await merge().mergePeer(newer);
  expect(voiceOf()).toEqual({
    bossName: "Nightcoil the Hungry",
    bossLinesJson: '{"idle":["Again."],"crit":[],"enrage":[]}',
  });
  await converged(newer);

  // Same second, the larger text wins on both sides.
  const larger = await peer(
    "larger.db",
    edit("Nightcoil the Hungry", '{"idle":["Zzz."],"crit":[],"enrage":[]}', 200),
  );
  await merge().mergePeer(larger);
  expect(voiceOf().bossLinesJson).toBe('{"idle":["Zzz."],"crit":[],"enrage":[]}');
  await converged(larger);

  const smaller = await peer(
    "smaller.db",
    edit("Nightcoil the Hungry", '{"idle":["Aaa."],"crit":[],"enrage":[]}', 200),
  );
  await merge().mergePeer(smaller);
  expect(voiceOf().bossLinesJson).toBe('{"idle":["Zzz."],"crit":[],"enrage":[]}');
  await converged(smaller);
});

test("l: a voice written under a run here is an edit like any other", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  const id = heroAdventure(t.sqlite, {
    uuid: U_X,
    title: "Tale",
    at: 100,
    steps: [q1, q2],
    kind: "boss",
    bossName: "Old name",
  });
  runOf(t.sqlite, id);
  const runSteps = () =>
    t.sqlite
      .prepare("SELECT stepIndex, questId, status FROM adventure_run_steps ORDER BY id")
      .all();
  const before = runSteps();
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE adventures SET bossName = 'New name', updatedAt = 300 WHERE uuid = ?")
      .run(U_X);
  });

  await merge().mergePeer(file);

  expect(
    (
      t.sqlite.prepare("SELECT bossName FROM adventures WHERE uuid = ?").get(U_X) as {
        bossName: string;
      }
    ).bossName,
  ).toBe("New name");
  expect(runSteps()).toEqual(before);
  await converged(file);
});

test("j: an adventure received from the other device is never locked on a free account", async () => {
  const [q1, q2] = adminQuests();
  if (!q1 || !q2) throw new Error("seed quests expected");
  jest.doMock("@/src/plus/source", () => ({
    readEntitlements: jest.fn(() => ({ source: "play", plus: false })),
  }));
  const file = await peer("tablet.db", (sqlite) => {
    heroAdventure(sqlite, { uuid: U_X, title: "Tale", at: 200, steps: [q1, q2] });
  });
  await merge().mergePeer(file);
  const received = adventureByUuid(U_X);
  const { lockedAdventures } = require("@/src/plus/access") as typeof import("@/src/plus/access");
  expect((await lockedAdventures()).has(received?.id as number)).toBe(false);
  const run = await adventures().startAdventureRun({ adventureId: received?.id as number });
  expect(run.activeStep?.stepIndex).toBe(0);
});

test("two hero quests named by one adventure arrive together", async () => {
  const [q1] = adminQuests();
  if (!q1) throw new Error("seed quest expected");
  const file = await peer("tablet.db", (sqlite) => {
    const a = heroQuest(sqlite, "A", 100, U_H);
    const b = heroQuest(sqlite, "B", 100, U_H2);
    heroAdventure(sqlite, { uuid: U_X, title: "Tale", at: 200, steps: [a, q1, b] });
  });
  await merge().mergePeer(file);
  const x = adventureByUuid(U_X);
  expect(stepsOf(x?.id as number).map((s) => s.questId)).toEqual([
    questByUuid(U_H)?.id,
    q1,
    questByUuid(U_H2)?.id,
  ]);
});
