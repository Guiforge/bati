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
  // `resetModules` keeps what `doMock` registered: a stub left here answers the next test's merge.
  jest.dontMock("../db/personalRecords");
  jest.dontMock("@/src/reportError");
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
  sqlite
    .prepare("UPDATE completed_sessions SET setsEditedAt = unixepoch() WHERE uuid = ?")
    .run(uuid);
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

/** What the PR audit found in the first answer. */
describe("edit stamps", () => {
  const fingerprint = () => backup().stateFingerprint();
  const stamp = (sessionId: number, offsetSeconds: number) =>
    t.sqlite
      .prepare("UPDATE completed_sessions SET setsEditedAt = unixepoch() + ? WHERE id = ?")
      .run(offsetSeconds, sessionId);

  test("a correction after an edit merged from a phone whose clock runs ahead still uploads", async () => {
    const merged = await log(10, 50);
    const mine = await log(9, 60);
    stamp(merged, 600);
    const before = await fingerprint();

    await records().correctLoggedSet(setOf(mine), 40);

    expect(await fingerprint()).not.toBe(before);
  });

  test("two corrections within one second both upload", async () => {
    const id = await log(5, 362);
    await records().correctLoggedSet(setOf(id), 35);
    const first = await fingerprint();

    await records().correctLoggedSet(setOf(id), 36);

    expect(await fingerprint()).not.toBe(first);
  });

  test("a correction made over a later stamp from the other device is still the later one", async () => {
    const id = await log(5, 362);
    stamp(id, 600);
    const tablet = await peer("tablet.db");

    await records().correctLoggedSet(setOf(id), 35);

    expect(await backup().compareWithPeer(tablet)).toMatchObject({ localChanges: 1 });
  });

  test("a device on a build before 0072 still counts a correction made here as news from here", async () => {
    const id = await log(5, 362);
    const tablet = await peer("old-build.db", (sqlite) => {
      sqlite.exec(
        "ALTER TABLE completed_sessions DROP COLUMN setsEditedAt; ALTER TABLE completed_sessions DROP COLUMN feedbackEditedAt",
      );
    });

    await records().correctLoggedSet(setOf(id), 35);

    // Without it the tablet reads as `ahead`, the merge refuses another build, and taking its
    // version replaces this database without a word about the correction.
    expect(await backup().compareWithPeer(tablet)).toMatchObject({ localChanges: 1 });
  });

  test("a feedback given later on the other device leaves a correction made here alone", async () => {
    const id = await log(5, 362);
    const tablet = await peer("tablet.db", (sqlite) => {
      sqlite
        .prepare(
          "UPDATE completed_sessions SET feedback = 'hard', feedbackEditedAt = unixepoch() + 100 WHERE uuid = ?",
        )
        .run(uuidOf(id));
    });
    await records().correctLoggedSet(setOf(id), 35);

    await merge().mergePeer(tablet);

    expect(valueHere(id)).toBe(35);
    expect(
      t.sqlite.prepare("SELECT feedback f FROM completed_sessions WHERE id = ?").get(id),
    ).toEqual({ f: "hard" });
  });

  test("a correction whose session cannot be stamped leaves the set as it was", async () => {
    const id = await log(5, 362);
    t.sqlite.exec(`CREATE TRIGGER no_stamp BEFORE UPDATE OF setsEditedAt ON completed_sessions
      BEGIN SELECT RAISE(ABORT, 'disk full'); END`);

    await expect(records().correctLoggedSet(setOf(id), 35)).rejects.toThrow("disk full");

    // A value without its stamp is a correction sync never sees: this device alone would hold it.
    expect(valueHere(id)).toBe(362);
  });

  test("records that cannot be decided again do not undo a merge that committed", async () => {
    const id = await log(5, 362);
    const tablet = await peer("tablet.db", correctThere(uuidOf(id), 35));
    const actual = jest.requireActual("../db/personalRecords");
    jest.doMock("../db/personalRecords", () => ({
      ...actual,
      redecideAfterChange: () => Promise.reject(new Error("records")),
    }));
    const reported: string[] = [];
    jest.doMock("@/src/reportError", () => ({
      reportError: (context: string) => reported.push(context),
    }));

    expect(await merge().mergePeer(tablet)).toMatchObject({ merged: true });
    expect(valueHere(id)).toBe(35);
    expect(reported).toEqual(["sync.merge.records"]);
  });

  test("a device nobody edited on keeps the sessions segment it had, so no answer is asked again", async () => {
    const id = await log(5, 362);

    expect((await fingerprint()).split("|")[0]).toBe(`1:${uuidOf(id)}`);
  });

  test("a merge asks again only about the movement whose set changed, and only between its two figures", async () => {
    const other = (
      t.sqlite
        .prepare("SELECT id FROM exercises WHERE style != 'expedition' AND id != ? LIMIT 1")
        .get(holdId()) as { id: number }
    ).id;
    const id = await completed().createCompletedSession({
      questId: null,
      performedAt: day(5),
      durationSeconds: 600,
      xpEarned: 40,
      exercises: [
        { exerciseId: holdId(), sortOrder: 0, result: { type: "time", value: 362 } },
        { exerciseId: other, sortOrder: 1, result: { type: "reps", value: 12 } },
      ],
    });
    const tablet = await peer("tablet.db", (sqlite) => {
      sqlite
        .prepare(
          `UPDATE completed_exercises SET resultValue = 35
           WHERE sessionId = (SELECT id FROM completed_sessions WHERE uuid = ?) AND sortOrder = 0`,
        )
        .run(uuidOf(id));
      sqlite
        .prepare("UPDATE completed_sessions SET setsEditedAt = unixepoch() WHERE uuid = ?")
        .run(uuidOf(id));
    });
    const actual = jest.requireActual("../db/personalRecords");
    const asked: unknown[] = [];
    jest.doMock("../db/personalRecords", () => ({
      ...actual,
      redecideAfterChange: (changes: unknown[]) => {
        asked.push(...changes);
        return actual.redecideAfterChange(changes);
      },
    }));

    await merge().mergePeer(tablet);

    // Every movement of the session, against every later session, is thousands of record checks
    // on a five-year journal for one corrected hold.
    expect(asked).toEqual([{ sessionId: id, exerciseId: holdId(), low: 35, high: 362 }]);
  });

  test("corrections that cross keep the record this device decided on another movement of the session", async () => {
    const other = (
      t.sqlite
        .prepare("SELECT id FROM exercises WHERE style != 'expedition' AND id != ? LIMIT 1")
        .get(holdId()) as { id: number }
    ).id;
    const early = await log(10, 50);
    const later = await completed().createCompletedSession({
      questId: null,
      performedAt: day(5),
      durationSeconds: 600,
      xpEarned: 40,
      exercises: [
        { exerciseId: holdId(), sortOrder: 0, result: { type: "time", value: 40 } },
        { exerciseId: other, sortOrder: 1, result: { type: "reps", value: 10 } },
      ],
    });
    const holdRecord = () =>
      JSON.parse(
        (
          t.sqlite
            .prepare("SELECT records_json j FROM completed_sessions WHERE id = ?")
            .get(later) as { j: string | null }
        ).j ?? "[]",
      ).some((r: { e?: number }) => r.e === holdId());
    // The tablet corrects the other movement of the later session, before it ever hears of this.
    const tablet = await peer("tablet.db", (sqlite) => {
      sqlite
        .prepare(
          `UPDATE completed_exercises SET resultValue = 12
           WHERE sessionId = (SELECT id FROM completed_sessions WHERE uuid = ?) AND sortOrder = 1`,
        )
        .run(uuidOf(later));
      sqlite
        .prepare("UPDATE completed_sessions SET setsEditedAt = unixepoch() + 100 WHERE uuid = ?")
        .run(uuidOf(later));
    });
    // Here the earlier hold goes from 50 s to 30 s: the later 40 s is a record now.
    await records().correctLoggedSet(setOf(early), 30);
    expect(holdRecord()).toBe(true);

    await merge().mergePeer(tablet);

    expect(holdRecord()).toBe(true);
  });
});
