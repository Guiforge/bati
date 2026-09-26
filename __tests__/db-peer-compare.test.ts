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
