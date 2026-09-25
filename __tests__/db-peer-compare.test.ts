import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Two devices, as two real SQLite files built by the migrations: this database (the test db) and
 * a snapshot of it standing in for the tablet. Sessions are added to one side or the other and
 * the comparison has to say which one is ahead, by session uuid alone.
 */
const t = createTestDb();
let dir: string;

beforeAll(() => {
  jest.resetModules();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-peer-"));
});

afterAll(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");

let n = 0;
function addSession(sqlite: Database.Database, performedAt: number) {
  n += 1;
  const uuid = `0190a000-0000-7000-8000-${String(n).padStart(12, "0")}`;
  sqlite
    .prepare(
      "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, ?)",
    )
    .run(uuid, performedAt);
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
  const file = await peer("level.db");

  expect(await backup().compareWithPeer(file)).toEqual({
    peerOnly: 0,
    localOnly: 0,
    peerLatest: 1_000,
  });
});

test("a device with sessions this one lacks, and none it lacks, is ahead", async () => {
  const file = await peer("ahead.db", (sqlite) => {
    addSession(sqlite, 2_000);
    addSession(sqlite, 3_000);
  });

  expect(await backup().compareWithPeer(file)).toEqual({
    peerOnly: 2,
    localOnly: 0,
    peerLatest: 3_000,
  });
});

test("each side having sessions the other lacks is a divergence, whatever the clocks say", async () => {
  const file = await peer("diverged.db", (sqlite) => addSession(sqlite, 500));
  // Performed *later* here than the peer's: a clock-based rule would call this device newest.
  addSession(t.sqlite, 9_000);

  const comparison = await backup().compareWithPeer(file);
  expect(comparison.peerOnly).toBe(1);
  expect(comparison.localOnly).toBe(1);
});
