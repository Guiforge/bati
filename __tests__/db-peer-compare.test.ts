import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Two devices, as two real SQLite files built by the migrations: this database (the test db) and
 * a snapshot of it standing in for the tablet. Sessions, deletions and hero content are added to
 * one side or the other, and the comparison has to say what each side has that the other lacks.
 */
let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-peer-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");

let n = 0;
function addSession(sqlite: Database.Database, performedAt: number): string {
  n += 1;
  const uuid = `0190a000-0000-7000-8000-${String(n).padStart(12, "0")}`;
  sqlite
    .prepare(
      "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, ?)",
    )
    .run(uuid, performedAt);
  return uuid;
}

function deleteSession(sqlite: Database.Database, uuid: string) {
  sqlite.prepare("DELETE FROM completed_sessions WHERE uuid = ?").run(uuid);
  sqlite.prepare("INSERT INTO deleted_sessions (uuid, deletedAt) VALUES (?, 1)").run(uuid);
}

function setPref(sqlite: Database.Database, key: string, value: string, at: number) {
  sqlite
    .prepare(
      `INSERT INTO user_preferences (key, value, updatedAt) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    )
    .run(key, value, at);
}

/** A snapshot of this database, then `edit` applied to the snapshot only: the other device. */
async function peer(name: string, edit: (sqlite: Database.Database) => void = () => {}) {
  const file = path.join(dir, name);
  await backup().snapshotDatabaseTo(file);
  const sqlite = new Database(file);
  edit(sqlite);
  sqlite.close();
  return file;
}

test("a snapshot of this very database is level", async () => {
  addSession(t.sqlite, 1_000);
  const comparison = await backup().compareWithPeer(await peer("level.db"));
  expect(comparison).toMatchObject({ peerChanges: 0, localChanges: 0, peerLatest: 1_000 });
});

// An undated hero row compared as NULL >= NULL, which is never true, so it read as news against
// its own copy for good, and the device that held it was `ahead` of a copy of itself.
test("an undated hero row is no news against its own copy, and a dated one is news against an undated one", async () => {
  t.sqlite.exec(
    `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt)
     VALUES ('Undated', 'x', '', '', 'hero', 'medium', 1, NULL)`,
  );
  const level = await backup().compareWithPeer(await peer("undated-level.db"));
  expect(level).toMatchObject({ peerChanges: 0, localChanges: 0 });

  const dated = await peer("undated-dated.db", (sqlite) =>
    sqlite.exec("UPDATE exercises SET updatedAt = 50 WHERE enName = 'Undated'"),
  );
  expect(await backup().compareWithPeer(dated)).toMatchObject({ peerChanges: 1, localChanges: 0 });
});

// A session the other device deleted that this one keeps (its campaign moved on, `deleteSession` said "locked")
// carries the same tombstone here after the merge. It was read as the other's news on every sync, so this device
// stayed behind the other and never sent anything again until it recorded something new.
test("a session kept despite the other device's tombstone is no news, and no reason to hold back", async () => {
  const kept = addSession(t.sqlite, 1_000);
  const file = await peer("deleted-there.db", (sqlite) => {
    sqlite.prepare("DELETE FROM completed_sessions WHERE uuid = ?").run(kept);
    sqlite.prepare("INSERT INTO deleted_sessions (uuid, deletedAt) VALUES (?, 1)").run(kept);
  });
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 1, localChanges: 0 });

  // The merge copies the tombstone here and the delete is refused: the session stays, tombstoned.
  t.sqlite.prepare("INSERT INTO deleted_sessions (uuid, deletedAt) VALUES (?, 1)").run(kept);

  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 0 });
});

test("a device with sessions this one lacks, and none it lacks, has news and nothing to lose", async () => {
  const file = await peer("ahead.db", (sqlite) => {
    addSession(sqlite, 2_000);
    addSession(sqlite, 3_000);
  });
  expect(await backup().compareWithPeer(file)).toMatchObject({
    peerOnly: 2,
    peerChanges: 2,
    localChanges: 0,
    peerLatest: 3_000,
  });
});

test("each side with sessions the other lacks has diverged, whatever the clocks say", async () => {
  const file = await peer("diverged.db", (sqlite) => addSession(sqlite, 500));
  // Performed *later* here than the peer's: a clock-based rule would call this device newest.
  addSession(t.sqlite, 9_000);

  const comparison = await backup().compareWithPeer(file);
  expect(comparison).toMatchObject({ peerOnly: 1, localOnly: 1 });
  expect(comparison.localChanges).toBeGreaterThan(0);
});

test("a session deleted here is this device's news, not the other device's", async () => {
  const kept = addSession(t.sqlite, 1_000);
  const file = await peer("stale.db");
  deleteSession(t.sqlite, kept);

  // The tablet still has it. Without the tombstone it looked like the tablet had a session this
  // phone lacked, and taking its version brought the deleted session back.
  expect(await backup().compareWithPeer(file)).toMatchObject({
    peerOnly: 0,
    peerChanges: 0,
    localChanges: 1,
  });
});

test("a deletion on the other device is its news", async () => {
  const gone = addSession(t.sqlite, 1_000);
  const file = await peer("deleted-there.db", (sqlite) => deleteSession(sqlite, gone));
  expect(await backup().compareWithPeer(file)).toMatchObject({
    localOnly: 0,
    peerChanges: 1,
    localChanges: 0,
  });
});

test("hero content written here makes this device something to lose, sessions or not", async () => {
  const file = await peer("tablet.db", (sqlite) => addSession(sqlite, 5_000));
  setPref(t.sqlite, "villageName", "Hautecombe", 9_000);

  // The tablet has a session, and this phone renamed its village: taking the tablet's version
  // would silently undo the rename, so this is a divergence, not a hand-off.
  const comparison = await backup().compareWithPeer(file);
  expect(comparison.peerChanges).toBe(1);
  expect(comparison.localChanges).toBe(1);
});

test("derived caches rewritten on both sides every day are not news", async () => {
  const file = await peer("caches.db", (sqlite) => setPref(sqlite, "streak_current", "4", 9_000));
  setPref(t.sqlite, "streak_current", "5", 9_500);
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 0 });
});

test("the other device's state is named by content, so sealing it anew changes nothing", async () => {
  addSession(t.sqlite, 1_000);
  const a = await backup().compareWithPeer(await peer("a.db"));
  const b = await backup().compareWithPeer(await peer("b.db"));
  expect(a.fingerprint).toBe(b.fingerprint);

  const c = await backup().compareWithPeer(await peer("c.db", (s) => addSession(s, 2_000)));
  expect(c.fingerprint).not.toBe(a.fingerprint);
  expect(await backup().stateFingerprint()).toBe(a.fingerprint);
});

test("a device on a build from before 0064 has no tombstones, and is still read", async () => {
  addSession(t.sqlite, 1_000);
  const file = await peer("old-build.db", (sqlite) => {
    sqlite.exec("DROP TABLE deleted_sessions");
    addSession(sqlite, 2_000);
  });
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerOnly: 1, localChanges: 0 });
});

test("a device on a build from before 0066 names its hero rows by name, and the comparison still reads it", async () => {
  t.sqlite.exec(
    `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt)
     VALUES ('Ring row', 'Ring row', '', '', 'hero', 'medium', 100, 100)`,
  );
  // A quest only this device has, which the other cannot name by a uuid it does not have.
  t.sqlite.exec(
    `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt)
     VALUES ('Mine', 'Mienne', '', '', 'hero', 100, 100)`,
  );
  const file = await peer("pre-0066.db", (sqlite) => {
    sqlite.exec(
      "DROP INDEX quests_uuid_unique; DROP INDEX exercises_uuid_unique; ALTER TABLE quests DROP COLUMN uuid; ALTER TABLE exercises DROP COLUMN uuid;",
    );
    sqlite.exec("DELETE FROM quests WHERE author = 'hero'");
  });

  // The exercise matches by name on both sides; the quest is only here.
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 1 });
});

test("two devices that never picked an animal do not diverge, however often the crest is read", async () => {
  const exercise = (
    t.sqlite
      .prepare("SELECT id FROM exercises WHERE creator = 'Admin' AND style = 'strength' LIMIT 1")
      .get() as { id: number }
  ).id;
  for (let i = 0; i < 8; i++) {
    const uuid = addSession(t.sqlite, 1_000 + i);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         SELECT id, ?, 0, 0, 'reps', 12, 1000 FROM completed_sessions WHERE uuid = ?`,
      )
      .run(exercise, uuid);
  }
  const file = await peer("twin.db");
  const { getCrest } = require("../db/crest") as typeof import("../db/crest");

  expect(await getCrest()).toMatchObject({ animal: "bear", manual: false });
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 0 });
  expect(
    t.sqlite.prepare("SELECT key FROM user_preferences WHERE key = 'crestAnimal'").all(),
  ).toEqual([]);

  // A pick, on the other hand, is the hero's work and is news.
  const picked = await peer("picked.db", (sqlite) => setPref(sqlite, "crestAnimal", "stag", 5_000));
  expect(await backup().compareWithPeer(picked)).toMatchObject({ peerChanges: 1, localChanges: 0 });
});

// Merge v2 (roadmap 4.18b).
const U1 = "0192b000-0000-7000-8000-000000000001";

function heroQuest(sqlite: Database.Database, at: number, uuid = U1) {
  sqlite
    .prepare(
      `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt, uuid)
       VALUES ('Porch forge', 'Forge', '', '', 'hero', ?, ?, ?)`,
    )
    .run(at, at, uuid);
}

const deleteContent = (sqlite: Database.Database, at: number) => {
  sqlite.prepare("DELETE FROM quests WHERE uuid = ?").run(U1);
  sqlite.prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, ?)").run(U1, at);
};

test("a hero quest deleted here is this device's news, not the other's", async () => {
  heroQuest(t.sqlite, 100);
  const file = await peer("tablet.db");
  deleteContent(t.sqlite, 150);

  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 1 });
});

test("a deletion of a hero quest on the other device is its news", async () => {
  heroQuest(t.sqlite, 100);
  const file = await peer("tablet.db", (sqlite) => deleteContent(sqlite, 150));

  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 1, localChanges: 0 });
});

test("a session with more XP on one side is news for the other", async () => {
  const uuid = addSession(t.sqlite, 1_000);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite.prepare("UPDATE completed_sessions SET xpEarned = 90 WHERE uuid = ?").run(uuid);
  });

  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 1, localChanges: 0 });
});

describe("a device on the previous build", () => {
  // No `deleted_content` and a newest migration this build has already passed.
  const previous = (sqlite: Database.Database) => {
    sqlite.exec(
      "DROP TABLE deleted_content; DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations)",
    );
  };

  test("has no content tombstones and is still read", async () => {
    heroQuest(t.sqlite, 100);
    const file = await peer("old.db", previous);

    expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 0 });
  });

  test("differing only by a session's XP or a same-second edit is level, and still counts a session this device lacks", async () => {
    const uuid = addSession(t.sqlite, 1_000);
    heroQuest(t.sqlite, 100);
    const file = await peer("old.db", (sqlite) => {
      previous(sqlite);
      sqlite.prepare("UPDATE completed_sessions SET xpEarned = 90 WHERE uuid = ?").run(uuid);
      sqlite.prepare("UPDATE quests SET enTitle = 'Zed' WHERE uuid = ?").run(U1);
    });
    expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0, localChanges: 0 });

    const withNews = await peer("old2.db", (sqlite) => {
      previous(sqlite);
      addSession(sqlite, 2_000);
    });
    expect(await backup().compareWithPeer(withNews)).toMatchObject({ peerChanges: 1 });
  });
});
