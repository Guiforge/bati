import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Two devices as two real SQLite files built by the migrations: this database (the test db) and a
 * snapshot of it edited to stand for the tablet. The merge is judged on the rows it leaves, and on
 * the one property that makes sync converge: afterwards, the comparison finds nothing to take.
 */
let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-merge-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");

let n = 0;
function addSession(sqlite: Database.Database, performedAt: number, exerciseId?: number): string {
  n += 1;
  const uuid = `0190b000-0000-7000-8000-${String(n).padStart(12, "0")}`;
  const { lastInsertRowid } = sqlite
    .prepare(
      "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, ?)",
    )
    .run(uuid, performedAt);
  if (exerciseId !== undefined) {
    sqlite
      .prepare(
        `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', 12, ?)`,
      )
      .run(lastInsertRowid, exerciseId, performedAt);
  }
  return uuid;
}

function setPref(sqlite: Database.Database, key: string, value: string, at: number) {
  sqlite
    .prepare(
      `INSERT INTO user_preferences (key, value, updatedAt) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    )
    .run(key, value, at);
}

function heroExercise(sqlite: Database.Database, name: string, at: number, prerequisite?: number) {
  return Number(
    sqlite
      .prepare(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt, prerequisiteExerciseId)
         VALUES (?, ?, '', '', 'hero', 'medium', ?, ?, ?)`,
      )
      .run(name, name, at, at, prerequisite ?? null).lastInsertRowid,
  );
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

const adminExercise = () =>
  (
    t.sqlite
      .prepare("SELECT id FROM exercises WHERE creator = 'Admin' ORDER BY id LIMIT 1")
      .get() as { id: number }
  ).id;

const setsOf = (uuid: string) =>
  t.sqlite
    .prepare(
      `SELECT e.exerciseId AS exerciseId FROM completed_exercises e
       JOIN completed_sessions s ON s.id = e.sessionId WHERE s.uuid = ?`,
    )
    .all(uuid) as { exerciseId: number }[];

async function converged(file: string) {
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0 });
}

test("the other device's sessions arrive with their sets, under ids of this device's", async () => {
  const pushUp = adminExercise();
  const mine = addSession(t.sqlite, 1_000, pushUp);
  // Same integer ids on both sides: the tablet's first session is its row 1 too.
  const file = await peer("tablet.db", (sqlite) => {
    sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
    addSession(sqlite, 2_000, pushUp);
  });
  const theirs = `0190b000-0000-7000-8000-${String(n).padStart(12, "0")}`;

  const outcome = await merge().mergePeer(file);

  expect(outcome).toMatchObject({ merged: true, sessions: 1 });
  expect(setsOf(mine)).toEqual([{ exerciseId: pushUp }]);
  expect(setsOf(theirs)).toEqual([{ exerciseId: pushUp }]);
  await converged(file);
});

test("a movement the other build numbered differently still lands on the same movement", async () => {
  const pushUp = adminExercise();
  const file = await peer("renumbered.db", (sqlite) => {
    // Seeds after 0035 took the next free id, which depends on how many hero rows existed.
    sqlite.pragma("foreign_keys = OFF");
    sqlite.prepare("UPDATE exercises SET id = 90000 WHERE id = ?").run(pushUp);
    sqlite
      .prepare("UPDATE exercise_muscles SET exerciseId = 90000 WHERE exerciseId = ?")
      .run(pushUp);
    sqlite
      .prepare("UPDATE quest_exercises SET exerciseId = 90000 WHERE exerciseId = ?")
      .run(pushUp);
    addSession(sqlite, 2_000, 90000);
  });
  const theirs = `0190b000-0000-7000-8000-${String(n).padStart(12, "0")}`;

  await merge().mergePeer(file);

  expect(setsOf(theirs)).toEqual([{ exerciseId: pushUp }]);
});

test("GPS points come with their session", async () => {
  const file = await peer("walk.db", (sqlite) => {
    const uuid = addSession(sqlite, 2_000);
    sqlite
      .prepare(
        `INSERT INTO gps_points (sessionId, t, latE7, lonE7, accDm, distFromPrevCm) VALUES (?, 1, 488566000, 23522000, 50, 0)`,
      )
      .run(uuid);
  });
  await merge().mergePeer(file);
  expect(t.sqlite.prepare("SELECT count(*) AS n FROM gps_points").get()).toEqual({ n: 1 });
});

test("deletions travel both ways, and a merge never brings back what was deleted", async () => {
  const deletedHere = addSession(t.sqlite, 1_000);
  const deletedThere = addSession(t.sqlite, 2_000);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite.prepare("DELETE FROM completed_sessions WHERE uuid = ?").run(deletedThere);
    sqlite
      .prepare("INSERT INTO deleted_sessions (uuid, deletedAt) VALUES (?, 1)")
      .run(deletedThere);
  });
  t.sqlite.prepare("DELETE FROM completed_sessions WHERE uuid = ?").run(deletedHere);
  t.sqlite.prepare("INSERT INTO deleted_sessions (uuid, deletedAt) VALUES (?, 1)").run(deletedHere);

  await merge().mergePeer(file);
  expect(await merge().honourTombstones()).toBe(1);

  const left = t.sqlite.prepare("SELECT uuid FROM completed_sessions").all();
  expect(left).toEqual([]);
  await converged(file);
});

test("the newer preference wins, its date copied as is, and a tie stays here", async () => {
  setPref(t.sqlite, "villageName", "Hautecombe", 100);
  setPref(t.sqlite, "avatarId", "knight", 300);
  addSession(t.sqlite, 1_000);
  const file = await peer("tablet.db", (sqlite) => {
    setPref(sqlite, "villageName", "Brisecombe", 200);
    setPref(sqlite, "avatarId", "rogue", 300);
  });

  await merge().mergePeer(file);

  const prefs = Object.fromEntries(
    (
      t.sqlite
        .prepare(
          "SELECT key, value, updatedAt FROM user_preferences WHERE key IN ('villageName', 'avatarId')",
        )
        .all() as { key: string; value: string; updatedAt: number }[]
    ).map((r) => [r.key, [r.value, r.updatedAt]]),
  );
  expect(prefs).toEqual({ villageName: ["Brisecombe", 200], avatarId: ["knight", 300] });
  await converged(file);
});

test("a device fresh from onboarding takes the other's preferences, whatever the dates", async () => {
  const file = await peer("phone.db", (sqlite) => {
    addSession(sqlite, 1_000);
    setPref(sqlite, "villageName", "Hautecombe", 100);
  });
  // Named an hour ago, by nobody who meant it twice.
  setPref(t.sqlite, "villageName", "New village", 900);

  await merge().mergePeer(file);

  expect(
    t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = 'villageName'").get(),
  ).toEqual({
    value: "Hautecombe",
  });
});

test("hero movements: the newer edit wins, a new one arrives, and its prerequisite follows", async () => {
  const shared = heroExercise(t.sqlite, "Wall walk", 100);
  addSession(t.sqlite, 1_000);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE exercises SET frName = 'Marche au mur', updatedAt = 200 WHERE id = ?")
      .run(shared);
    // Numbered past everything here, so its id means nothing on this device.
    sqlite.exec(
      "INSERT INTO exercises (id, enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt) VALUES (80000, 'Ring row', 'Ring row', '', '', 'hero', 'medium', 150, 150)",
    );
    heroExercise(sqlite, "Ring pull-up", 160, 80000);
  });

  await merge().mergePeer(file);

  const rows = t.sqlite
    .prepare(
      "SELECT id, enName, frName, prerequisiteExerciseId AS pre FROM exercises WHERE creator = 'hero' ORDER BY enName",
    )
    .all() as { id: number; enName: string; frName: string; pre: number | null }[];
  const byName = Object.fromEntries(rows.map((r) => [r.enName, r]));
  expect(byName["Wall walk"]?.frName).toBe("Marche au mur");
  expect(byName["Wall walk"]?.id).toBe(shared);
  const row = byName["Ring row"];
  assert(row);
  expect(byName["Ring pull-up"]?.pre).toBe(row.id);
  await converged(file);
});

test("a set naming a movement this device lacks rolls the whole merge back", async () => {
  addSession(t.sqlite, 1_000);
  const before = t.sqlite.serialize();
  const file = await peer("broken.db", (sqlite) => {
    sqlite.pragma("foreign_keys = OFF");
    addSession(sqlite, 2_000, 424242);
  });

  await expect(merge().mergePeer(file)).rejects.toThrow("lacks");
  expect(t.sqlite.prepare("SELECT count(*) AS n FROM completed_sessions").get()).toEqual({ n: 1 });
  expect(t.sqlite.serialize().length).toBe(before.length);
});

test("a device on another migration is not merged at all", async () => {
  const file = await peer("older.db", (sqlite) => {
    sqlite.exec(
      "DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations)",
    );
    addSession(sqlite, 2_000);
  });
  expect(await merge().mergePeer(file)).toEqual({ merged: false });
  expect(t.sqlite.prepare("SELECT count(*) AS n FROM completed_sessions").get()).toEqual({ n: 0 });
});

test("merging the same device twice changes nothing the second time", async () => {
  const file = await peer("tablet.db", (sqlite) => addSession(sqlite, 2_000, adminExercise()));
  await merge().mergePeer(file);
  expect(await merge().mergePeer(file)).toEqual({ merged: true, sessions: 0, changes: 0 });
});
