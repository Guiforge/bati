import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Roadmap M-02: a set corrected from the History (`correctLoggedSet`) after the session reached
 * another device. Sync names sessions by uuid and never looks inside one it already has, so the
 * correction misses all three steps: the upload, the comparison and the merge.
 *
 * Each test states what sync should do, and fails until it does: M-02 is done when they all pass.
 */
let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-corrected-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");
const completed = () => require("../db/completed") as typeof import("../db/completed");
const records = () => require("../db/personalRecords") as typeof import("../db/personalRecords");

const holdId = () =>
  (
    t.sqlite.prepare("SELECT id FROM exercises WHERE style != 'expedition' LIMIT 1").get() as {
      id: number;
    }
  ).id;

const day = (n: number) => new Date(Date.now() - n * 86_400_000);

function log(daysAgo: number, value: number) {
  return completed().createCompletedSession({
    questId: null,
    performedAt: day(daysAgo),
    durationSeconds: 600,
    xpEarned: 40,
    exercises: [
      {
        exerciseId: holdId(),
        sortOrder: 0,
        result: { type: "time", value },
        performedAt: day(daysAgo),
      },
    ],
  });
}

const setOf = (sessionId: number) =>
  (
    t.sqlite.prepare("SELECT id FROM completed_exercises WHERE sessionId = ?").get(sessionId) as {
      id: number;
    }
  ).id;

const uuidOf = (sessionId: number) =>
  (
    t.sqlite.prepare("SELECT uuid FROM completed_sessions WHERE id = ?").get(sessionId) as {
      uuid: string;
    }
  ).uuid;

const valueHere = (sessionId: number) =>
  (
    t.sqlite
      .prepare("SELECT resultValue v FROM completed_exercises WHERE sessionId = ?")
      .get(sessionId) as { v: number }
  ).v;

/** A snapshot of this database, then `edit` applied to the snapshot only: the other device. */
async function peer(name: string, edit: (sqlite: Database.Database) => void = () => {}) {
  const file = path.join(dir, name);
  await backup().snapshotDatabaseTo(file);
  const sqlite = new Database(file);
  edit(sqlite);
  sqlite.close();
  return file;
}

/** The set of session `uuid` corrected on the other device, as `correctLoggedSet` writes it there. */
const correctThere = (uuid: string, value: number) => (sqlite: Database.Database) => {
  sqlite
    .prepare(
      `UPDATE completed_exercises SET resultValue = ?
       WHERE sessionId = (SELECT id FROM completed_sessions WHERE uuid = ?)`,
    )
    .run(value, uuid);
  sqlite.prepare("UPDATE completed_sessions SET editedAt = unixepoch() WHERE uuid = ?").run(uuid);
};

test("a correction here changes this device's state, so sync uploads it", async () => {
  const id = await log(5, 362);
  const before = await backup().stateFingerprint();

  await records().correctLoggedSet(setOf(id), 35);

  // Today the fingerprint is unchanged and `prepareSyncAtLaunch` skips the upload.
  expect(await backup().stateFingerprint()).not.toBe(before);
});

test("a correction here is news for a device that still has the old figure", async () => {
  const id = await log(5, 362);
  const tablet = await peer("tablet.db");

  await records().correctLoggedSet(setOf(id), 35);

  // Today 0 on both sides: the two devices read as `level`, and no merge ever runs.
  expect(await backup().compareWithPeer(tablet)).toMatchObject({ localChanges: 1 });
});

test("a correction made there is news here", async () => {
  const id = await log(5, 362);
  const tablet = await peer("tablet.db", correctThere(uuidOf(id), 35));

  expect(await backup().compareWithPeer(tablet)).toMatchObject({ peerChanges: 1 });
});

test("a correction made there arrives here when the two merge", async () => {
  const id = await log(5, 362);
  const tablet = await peer("tablet.db", correctThere(uuidOf(id), 35));

  await merge().mergePeer(tablet);

  // Today the session is skipped as already known, and 362 stays here for good.
  expect(valueHere(id)).toBe(35);
});

test("a correction that arrives re-decides the records of what came after it here", async () => {
  const early = await log(10, 362);
  const tablet = await peer("tablet.db", correctThere(uuidOf(early), 35));
  // Logged here only, after the copy: 100 s did not beat 362 s, so no record.
  const later = await log(5, 100);
  const recordsOf = () =>
    t.sqlite.prepare("SELECT records_json j FROM completed_sessions WHERE id = ?").get(later);
  expect(recordsOf()).toEqual({ j: null });

  await merge().mergePeer(tablet);

  // Against 35 s, 100 s is the record; the tablet cannot say so, it never had this session.
  expect(recordsOf()).toEqual({
    j: JSON.stringify([{ t: "exercise_max_time", e: holdId() }]),
  });
});
