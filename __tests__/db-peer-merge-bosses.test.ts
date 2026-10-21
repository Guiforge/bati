import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The hero's bosses (0079) through the real `mergePeer` and `compareWithPeer`, on two SQLite files
 * built by the migrations. A boss is matched by uuid like a quest, the later `updatedAt` wins, and a
 * deletion travels as a tombstone; an adventure names its boss by uuid, so nothing is translated.
 */
let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-merge-boss-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");
const bosses = () => require("../db/heroBosses") as typeof import("../db/heroBosses");

const B1 = "0192d000-0000-7000-8000-00000000000a";
const B2 = "0192d000-0000-7000-8000-00000000000b";
const A1 = "0192d000-0000-7000-8000-0000000000a1";
const ART = "data:image/jpeg;base64,AAAA";

function boss(sqlite: Database.Database, uuid: string, name: string, at: number, extra = "") {
  sqlite
    .prepare(
      `INSERT INTO hero_bosses (uuid, name, monster, weaknessMuscle, artJson, createdAt, updatedAt)
       VALUES (?, ?, 'assets/images/bosses/iron_golem.jpg', 'chest', ?, ?, ?)`,
    )
    .run(uuid, name, extra || null, at, at);
}

const byUuid = (uuid: string) =>
  t.sqlite.prepare("SELECT * FROM hero_bosses WHERE uuid = ?").get(uuid) as
    | { name: string; artJson: string | null; updatedAt: number }
    | undefined;

async function peer(name: string, edit: (sqlite: Database.Database) => void = () => {}) {
  const file = path.join(dir, name);
  await backup().snapshotDatabaseTo(file);
  const sqlite = new Database(file);
  edit(sqlite);
  sqlite.close();
  return file;
}

async function converged(file: string) {
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0 });
}

const adminQuest = () =>
  (
    t.sqlite.prepare("SELECT id FROM quests WHERE author = 'Admin' ORDER BY id").get() as {
      id: number;
    }
  ).id;

test("a: a boss written on the other device lands here, with its pictures, and a second merge changes nothing", async () => {
  const file = await peer("tablet.db", (sqlite) =>
    boss(sqlite, B1, "Gorgo", 200, JSON.stringify({ fresh: ART })),
  );

  expect(await merge().mergePeer(file)).toMatchObject({ merged: true, changes: 1 });

  expect(byUuid(B1)).toMatchObject({ name: "Gorgo", artJson: JSON.stringify({ fresh: ART }) });
  expect(await merge().mergePeer(file)).toMatchObject({ merged: true, changes: 0 });
  await converged(file);
});

test("b: the newer edit wins whole, and a same-second tie goes to the larger text", async () => {
  boss(t.sqlite, B1, "Gorgo", 100);
  const file = await peer("tablet.db", (sqlite) =>
    sqlite
      .prepare("UPDATE hero_bosses SET name = 'Gorgo II', updatedAt = 200 WHERE uuid = ?")
      .run(B1),
  );
  await merge().mergePeer(file);
  expect(byUuid(B1)?.name).toBe("Gorgo II");
  await converged(file);

  const tie = await peer("tie.db", (sqlite) =>
    sqlite.prepare("UPDATE hero_bosses SET name = 'Zzz' WHERE uuid = ?").run(B1),
  );
  await merge().mergePeer(tie);
  expect(byUuid(B1)?.name).toBe("Zzz");
  await converged(tie);

  const smaller = await peer("smaller.db", (sqlite) =>
    sqlite.prepare("UPDATE hero_bosses SET name = 'Aaa' WHERE uuid = ?").run(B1),
  );
  await merge().mergePeer(smaller);
  expect(byUuid(B1)?.name).toBe("Zzz");
  await converged(smaller);
});

test("c: an adventure naming a boss by uuid and the boss arrive together, and the fight reads the boss", async () => {
  const q = adminQuest();
  const file = await peer("tablet.db", (sqlite) => {
    boss(sqlite, B1, "Gorgo", 200);
    sqlite
      .prepare(
        `INSERT INTO adventures (questId, enTitle, frTitle, deTitle, esTitle, author, sortOrder, kind, isActive,
           imagePath, bossImagePath, createdAt, updatedAt, uuid, heroBossUuid)
         VALUES (?, 'Tale', 'Tale', 'Tale', 'Tale', 'hero', 1000, 'boss', 1, 'the_golem',
           'assets/images/bosses/iron_golem.jpg', 200, 200, ?, ?)`,
      )
      .run(q, A1, B1);
  });
  await merge().mergePeer(file);
  const adv = t.sqlite.prepare("SELECT heroBossUuid FROM adventures WHERE uuid = ?").get(A1) as {
    heroBossUuid: string;
  };
  expect(adv.heroBossUuid).toBe(B1);
  expect(byUuid(B1)?.name).toBe("Gorgo");
  await converged(file);
});

describe("deletions", () => {
  test("d: a boss deleted here is not brought back by an older copy there, and the deletion reaches there", async () => {
    const id = await bosses().createHeroBoss({
      name: "Gorgo",
      monster: "iron_golem",
      weakness: null,
      resistance: null,
      lines: { intro: [], idle: [], crit: [], enrage: [], defeat: [] },
      art: {},
    });
    const uuid = (await bosses().getHeroBoss(id))?.uuid as string;
    const file = await peer("tablet.db");
    await bosses().deleteHeroBoss(id);
    expect(byUuid(uuid)).toBeUndefined();

    await merge().mergePeer(file);
    expect(byUuid(uuid)).toBeUndefined();
    await converged(file);
  });

  test("e: a boss deleted there is removed here by honourTombstones, unless an active adventure ends on it", async () => {
    boss(t.sqlite, B1, "Gorgo", 100);
    boss(t.sqlite, B2, "Used", 100);
    const q = adminQuest();
    t.sqlite
      .prepare(
        `INSERT INTO adventures (questId, enTitle, frTitle, deTitle, esTitle, author, sortOrder, kind, isActive,
           imagePath, createdAt, updatedAt, uuid, heroBossUuid)
         VALUES (?, 'Tale', 'Tale', 'Tale', 'Tale', 'hero', 1000, 'boss', 1, 'the_golem', 100, 100, ?, ?)`,
      )
      .run(q, A1, B2);
    const file = await peer("tablet.db", (sqlite) => {
      sqlite.prepare("DELETE FROM hero_bosses").run();
      sqlite
        .prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, 300), (?, 300)")
        .run(B1, B2);
    });

    await merge().mergePeer(file);
    expect(await merge().honourTombstones()).toBe(1);
    expect(byUuid(B1)).toBeUndefined();
    expect(byUuid(B2)?.name).toBe("Used");
  });

  test("e2: a boss deleted here comes back when an adventure from there ends on it, as a quest does", async () => {
    boss(t.sqlite, B1, "Gorgo", 100);
    const q = adminQuest();
    const file = await peer("tablet.db", (sqlite) =>
      sqlite
        .prepare(
          `INSERT INTO adventures (questId, enTitle, frTitle, deTitle, esTitle, author, sortOrder, kind, isActive,
             imagePath, bossImagePath, createdAt, updatedAt, uuid, heroBossUuid)
           VALUES (?, 'Tale', 'Tale', 'Tale', 'Tale', 'hero', 1000, 'boss', 1, 'the_golem',
             'assets/images/bosses/iron_golem.jpg', 400, 400, ?, ?)`,
        )
        .run(q, A1, B1),
    );
    t.sqlite.prepare("DELETE FROM hero_bosses WHERE uuid = ?").run(B1);
    t.sqlite.prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, 300)").run(B1);

    await merge().mergePeer(file);
    await merge().honourTombstones();
    expect(byUuid(B1)?.name).toBe("Gorgo");
    await converged(file);
  });
});

test("f: a boss only here is this device's news, and moves the fingerprint's content segment", async () => {
  const empty = await peer("empty.db");
  const before = await backup().compareWithPeer(empty);
  boss(t.sqlite, B1, "Gorgo", 100);
  const after = await backup().compareWithPeer(empty);
  expect(after.localChanges).toBe(before.localChanges + 1);
  // The peer's own fingerprint is untouched by what this device holds.
  expect(after.fingerprint).toBe(before.fingerprint);
  const withBoss = await peer("withboss.db");
  expect((await backup().compareWithPeer(withBoss)).fingerprint.split("|")[1]).toBe(
    (await backup().stateFingerprint()).split("|")[1],
  );
});

test("g: a peer before 0079 is compared without error and never merged", async () => {
  boss(t.sqlite, B1, "Gorgo", 100);
  const file = await peer("older.db", (sqlite) => {
    sqlite.exec(`DROP TABLE hero_bosses; ALTER TABLE adventures DROP COLUMN heroBossUuid;
      DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations);`);
  });
  await expect(backup().compareWithPeer(file)).resolves.toBeDefined();
  expect(await merge().mergePeer(file)).toEqual({ merged: false });
});
