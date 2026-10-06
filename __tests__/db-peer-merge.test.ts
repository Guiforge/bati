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

test("a session deleted here is never brought back, by any number of merges with a device that still holds it", async () => {
  const gone = addSession(t.sqlite, 1_000);
  const file = await peer("tablet.db");
  t.sqlite.prepare("DELETE FROM completed_sessions WHERE uuid = ?").run(gone);
  t.sqlite.prepare("INSERT INTO deleted_sessions (uuid, deletedAt) VALUES (?, 1)").run(gone);

  for (let round = 0; round < 3; round++) {
    await merge().mergePeer(file);
    await merge().honourTombstones();
    expect(t.sqlite.prepare("SELECT uuid FROM completed_sessions").all()).toEqual([]);
  }
  await converged(file);
});

// The limits of the merge as of 2.9.0, frozen so a change to them is a decision and not an accident. Both are
// planned for the version that follows ("merge v2" in docs/planning/roadmap.md): tombstones for hero quests and
// movements, and fields of a session that can change after it was saved, the larger XP winning.
describe("what the merge does not carry (frozen as 2.9.0 does it)", () => {
  test("a hero quest deleted here comes back when the device that still has it is merged", async () => {
    heroQuest(t.sqlite, "Porch forge", 100, U1);
    const file = await peer("tablet.db");
    t.sqlite.prepare("DELETE FROM quests WHERE uuid = ?").run(U1);
    expect(heroQuests()).toEqual([]);

    await merge().mergePeer(file);

    expect(heroQuests()).toEqual([{ enTitle: "Porch forge", uuid: U1 }]);
  });

  test("the first copy of a session wins: a bonus added to it afterwards on one device never reaches the other", async () => {
    const uuid = addSession(t.sqlite, 1_000);
    const file = await peer("tablet.db");
    // The oath tips over on this device after the tablet copied the session: its XP goes up here only.
    t.sqlite
      .prepare("UPDATE completed_sessions SET xpEarned = xpEarned + 50 WHERE uuid = ?")
      .run(uuid);

    await merge().mergePeer(file);

    const xp = () =>
      (
        t.sqlite.prepare("SELECT xpEarned FROM completed_sessions WHERE uuid = ?").get(uuid) as {
          xpEarned: number;
        }
      ).xpEarned;
    expect(xp()).toBe(60);
    // And the comparison finds nothing to take: the two devices disagree and nothing says so.
    await converged(file);
    const other = new Database(file);
    const there = (
      other.prepare("SELECT xpEarned FROM completed_sessions WHERE uuid = ?").get(uuid) as {
        xpEarned: number;
      }
    ).xpEarned;
    other.close();
    expect(there).toBe(10);
  });

  test("a bonus added on the other device after the copy is not taken either", async () => {
    const uuid = addSession(t.sqlite, 1_000);
    const file = await peer("tablet.db", (sqlite) => {
      sqlite.prepare("UPDATE completed_sessions SET xpEarned = 99 WHERE uuid = ?").run(uuid);
    });

    await merge().mergePeer(file);

    const row = t.sqlite
      .prepare("SELECT xpEarned FROM completed_sessions WHERE uuid = ?")
      .get(uuid) as {
      xpEarned: number;
    };
    expect(row.xpEarned).toBe(10);
  });
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

test("the reminder days travel with the hero, this phone's reminder answers never do", async () => {
  // The days are the hero's rhythm (docs/designs/rappels.md); when this phone last asked about
  // ignored reminders, and since when it counts them, are this phone's.
  setPref(t.sqlite, "reminderDays", '{"mon":"20:00"}', 100);
  setPref(t.sqlite, "reminderAskedAt", "2026-01-01", 100);
  addSession(t.sqlite, 1_000);
  const file = await peer("tablet.db", (sqlite) => {
    setPref(sqlite, "reminderDays", '{"mon":"20:00","thu":"07:15"}', 200);
    setPref(sqlite, "reminderAskedAt", "2026-02-01", 200);
    setPref(sqlite, "reminderStreakFrom", "2026-02-01", 200);
    setPref(sqlite, "reminderOfferDismissed", "true", 200);
  });

  await merge().mergePeer(file);

  const value = (key: string) =>
    (
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = ?").get(key) as
        | { value: string }
        | undefined
    )?.value;
  expect(value("reminderDays")).toBe('{"mon":"20:00","thu":"07:15"}');
  expect(value("reminderAskedAt")).toBe("2026-01-01");
  expect(value("reminderStreakFrom")).toBeUndefined();
  expect(value("reminderOfferDismissed")).toBeUndefined();
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

test("a tablet that found its hero from onboarding leaves onboarding, whatever it said", async () => {
  const file = await peer("phone.db", (sqlite) => {
    addSession(sqlite, 1_000);
    setPref(sqlite, "hasFinishedOnboarding", "true", 100);
  });
  setPref(t.sqlite, "hasFinishedOnboarding", "false", 900);

  await merge().mergePeer(file);

  expect(
    t.sqlite
      .prepare("SELECT value FROM user_preferences WHERE key = 'hasFinishedOnboarding'")
      .get(),
  ).toEqual({ value: "true" });
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

/** A hero quest written in raw SQL, as another device's row would arrive. */
function heroQuest(sqlite: Database.Database, title: string, at: number, uuid: string | null) {
  return Number(
    sqlite
      .prepare(
        `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt, uuid)
         VALUES (?, ?, '', '', 'hero', ?, ?, ?)`,
      )
      .run(title, title, at, at, uuid).lastInsertRowid,
  );
}

const heroQuests = () =>
  t.sqlite
    .prepare("SELECT enTitle, uuid FROM quests WHERE author = 'hero' ORDER BY enTitle")
    .all() as { enTitle: string; uuid: string | null }[];

const U1 = "0192b000-0000-7000-8000-000000000001";
const U2 = "0192b000-0000-7000-8000-000000000002";

/**
 * Hero content is matched by uuid since 0066. By name, a quest renamed on one device was a new
 * quest on the other, and the old name stayed beside it on both, for good.
 */
test("a hero quest renamed on the other device is the same quest here", async () => {
  heroQuest(t.sqlite, "Porch forge", 100, U1);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE quests SET enTitle = 'Garden forge', updatedAt = 200 WHERE uuid = ?")
      .run(U1);
  });

  await merge().mergePeer(file);

  expect(heroQuests()).toEqual([{ enTitle: "Garden forge", uuid: U1 }]);
  await converged(file);
});

/**
 * The one shape that could break sync for good: here a quest "A" (uuid U1); there the same quest
 * renamed "B", and a new quest that took the name "A" (uuid U2). A match by name would copy U2
 * onto this device's U1 row while U1 still arrives with "B", and the UNIQUE index would roll the
 * merge back on every sync. Matched by uuid first, it is two quests and no conflict.
 */
test("a quest that took another's old name never steals its uuid", async () => {
  const here = heroQuest(t.sqlite, "A", 100, U1);
  const file = await peer("tablet.db", (sqlite) => {
    // The renamed quest moved past the new one in id order, so the new "A" is read first: the
    // order in which a match by name alone would take this device's row for it.
    sqlite
      .prepare("UPDATE quests SET id = 99999, enTitle = 'B', updatedAt = 200 WHERE uuid = ?")
      .run(U1);
    sqlite
      .prepare(
        `INSERT INTO quests (id, enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt, uuid)
         VALUES (99998, 'A', 'A', '', '', 'hero', 300, 300, ?)`,
      )
      .run(U2);
  });

  await merge().mergePeer(file);

  // This device's row is still the quest it was, whatever it is called now: its sessions, its
  // config and its favourite all point at this id.
  expect(t.sqlite.prepare("SELECT enTitle, uuid FROM quests WHERE id = ?").get(here)).toEqual({
    enTitle: "B",
    uuid: U1,
  });
  expect(heroQuests()).toEqual([
    { enTitle: "A", uuid: U2 },
    { enTitle: "B", uuid: U1 },
  ]);
  await converged(file);
});

test("a row neither side ever named still finds its namesake, and takes the other's uuid", async () => {
  heroQuest(t.sqlite, "Old drill", 100, null);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE quests SET uuid = ?, updatedAt = 200 WHERE enTitle = 'Old drill'")
      .run(U1);
  });

  await merge().mergePeer(file);

  expect(heroQuests()).toEqual([{ enTitle: "Old drill", uuid: U1 }]);
  await converged(file);
});

test("a hero movement renamed on the other device is the same movement here", async () => {
  heroExercise(t.sqlite, "Porch dip", 100);
  t.sqlite.prepare("UPDATE exercises SET uuid = ? WHERE enName = 'Porch dip'").run(U1);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE exercises SET enName = 'Step dip', updatedAt = 200 WHERE uuid = ?")
      .run(U1);
  });

  await merge().mergePeer(file);

  expect(
    t.sqlite.prepare("SELECT enName, uuid FROM exercises WHERE creator = 'hero'").all(),
  ).toEqual([{ enName: "Step dip", uuid: U1 }]);
  await converged(file);
});

test("comparing with the other device counts a rename as one change, not a loss and a gain", async () => {
  heroQuest(t.sqlite, "Porch forge", 100, U1);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE quests SET enTitle = 'Garden forge', updatedAt = 200 WHERE uuid = ?")
      .run(U1);
  });

  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 1, localChanges: 0 });
});

/**
 * An outing filed as a quest copies the seed quest's title, so two phones that each did it hold
 * two different quests of one name. By name, the newer was written over the older, its target
 * and the quest of its sessions with it. Both have a uuid, so they are two quests.
 */
test("two quests of one name, each with its own uuid, stay two quests", async () => {
  const here = heroQuest(t.sqlite, "Forest walk", 100, U1);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite.prepare("DELETE FROM quests WHERE uuid = ?").run(U1);
    heroQuest(sqlite, "Forest walk", 200, U2);
  });

  await merge().mergePeer(file);

  expect(t.sqlite.prepare("SELECT uuid FROM quests WHERE id = ?").get(here)).toEqual({ uuid: U1 });
  expect(heroQuests()).toEqual([
    { enTitle: "Forest walk", uuid: U1 },
    { enTitle: "Forest walk", uuid: U2 },
  ]);
});

test("a newer row here that has no uuid takes the other's, so the two devices agree", async () => {
  heroQuest(t.sqlite, "Old drill", 300, null);
  const file = await peer("tablet.db", (sqlite) => {
    sqlite
      .prepare("UPDATE quests SET uuid = ?, updatedAt = 200 WHERE enTitle = 'Old drill'")
      .run(U1);
  });

  await merge().mergePeer(file);

  expect(heroQuests()).toEqual([{ enTitle: "Old drill", uuid: U1 }]);
  expect(await backup().compareWithPeer(file)).toMatchObject({ peerChanges: 0 });
});

describe("error branches", () => {
  const sessionCount = () =>
    (t.sqlite.prepare("SELECT count(*) AS n FROM completed_sessions").get() as { n: number }).n;

  test("an Admin movement of the other build that this build does not have refuses the whole merge", async () => {
    addSession(t.sqlite, 1_000);
    const file = await peer("newer-build.db", (sqlite) => {
      sqlite.exec(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt)
         VALUES ('Only in the next build', 'x', '', '', 'Admin', 'medium', 1, 1)`,
      );
      addSession(sqlite, 2_000);
    });

    await expect(merge().mergePeer(file)).rejects.toThrow(
      "Merge: 1 exercises of the other build are unknown here",
    );

    expect(sessionCount()).toBe(1);
  });

  test("a quest of the other device naming a movement that is neither seeded nor the hero's rolls the merge back", async () => {
    const file = await peer("dangling.db", (sqlite) => {
      sqlite.pragma("foreign_keys = OFF");
      const quest = heroQuest(sqlite, "Orphan", 100, U1);
      sqlite
        .prepare(
          `INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax)
           VALUES (?, 424242, 0, 'reps', 5, 10)`,
        )
        .run(quest);
    });

    await expect(merge().mergePeer(file)).rejects.toThrow("names rows this device lacks");

    expect(heroQuests()).toEqual([]);
  });

  test("rows with no date are older than any date, and two undated copies are a tie that stays here", async () => {
    const undated = (sqlite: Database.Database, name: string) => {
      const id = heroExercise(sqlite, name, 100);
      sqlite.prepare("UPDATE exercises SET updatedAt = NULL WHERE id = ?").run(id);
    };
    heroExercise(t.sqlite, "Dated here", 100);
    t.sqlite.exec("UPDATE exercises SET updatedAt = NULL WHERE enName = 'Dated here'");
    undated(t.sqlite, "Both undated");
    const file = await peer("undated.db", (sqlite) => {
      // Dated there, undated here: the dated one is newer. Undated on both sides: nobody's news.
      sqlite.exec("UPDATE exercises SET updatedAt = 50 WHERE enName = 'Dated here'");
      sqlite.exec("UPDATE exercises SET frName = 'changed there' WHERE enName = 'Both undated'");
    });

    const outcome = await merge().mergePeer(file);

    expect(outcome).toMatchObject({ merged: true, changes: 1 });
    const frName = (en: string) =>
      (
        t.sqlite.prepare("SELECT frName FROM exercises WHERE enName = ?").get(en) as {
          frName: string;
        }
      ).frName;
    expect(frName("Both undated")).toBe("Both undated");
    expect(
      t.sqlite.prepare("SELECT updatedAt FROM exercises WHERE enName = 'Dated here'").get(),
    ).toEqual({
      updatedAt: 50,
    });
  });

  test("a merged session's records follow the movement to this device's id; a record with none, or one this device cannot map, is kept as it was", async () => {
    const pushUp = adminExercise();
    const file = await peer("records.db", (sqlite) => {
      sqlite.pragma("foreign_keys = OFF");
      sqlite.prepare("UPDATE exercises SET id = 90000 WHERE id = ?").run(pushUp);
      sqlite
        .prepare("UPDATE exercise_muscles SET exerciseId = 90000 WHERE exerciseId = ?")
        .run(pushUp);
      sqlite
        .prepare("UPDATE quest_exercises SET exerciseId = 90000 WHERE exerciseId = ?")
        .run(pushUp);
      addSession(sqlite, 2_000);
      sqlite
        .prepare("UPDATE completed_sessions SET records_json = ?")
        .run(JSON.stringify([{ t: "pr", e: 90000 }, { t: "streak" }, { t: "pr", e: 777777 }]));
    });
    const theirs = `0190b000-0000-7000-8000-${String(n).padStart(12, "0")}`;

    await merge().mergePeer(file);

    const row = t.sqlite
      .prepare("SELECT records_json AS json FROM completed_sessions WHERE uuid = ?")
      .get(theirs) as { json: string };
    expect(JSON.parse(row.json)).toEqual([
      { t: "pr", e: pushUp },
      { t: "streak" },
      { t: "pr", e: 777777 },
    ]);
  });

  test("a deletion that the campaign refuses (locked) is not counted, and the session stays", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");
    const adventures = require("../db/adventures") as typeof import("../db/adventures");
    const save = (questId: number | null) =>
      completed.createCompletedSession({
        questId,
        durationSeconds: 600,
        xpEarned: 40,
        exercises: [{ exerciseId: 1, sortOrder: 0, result: { type: "reps", value: 10 } }],
      });
    const adv = (await adventures.listAdventures()).find((a) => a.kind !== "boss");
    assert(adv);
    const run = await adventures.startAdventureRun({ adventureId: adv.id });
    assert(run.activeStep);
    const first = await save(run.activeStep.questId);
    const next = await adventures.completeAdventureRunStep({
      runStepId: run.activeStep.id,
      completedSessionId: first,
    });
    assert(next.nextRunStepId != null);
    const second = await save(next.nextQuestId);
    await adventures.completeAdventureRunStep({
      runStepId: next.nextRunStepId,
      completedSessionId: second,
    });
    const loose = await save(null);
    for (const id of [first, loose]) {
      t.sqlite
        .prepare(
          "INSERT INTO deleted_sessions (uuid, deletedAt) SELECT uuid, 1 FROM completed_sessions WHERE id = ?",
        )
        .run(id);
    }

    expect(await merge().keptSessions()).toBe(2);

    expect(await merge().honourTombstones()).toBe(1);

    const left = t.sqlite
      .prepare("SELECT id FROM completed_sessions WHERE id IN (?, ?)")
      .all(first, loose);
    expect(left).toEqual([{ id: first }]);
    // The one that stayed is counted, so the sync sheet can say so; nothing was deleted for it.
    expect(await merge().keptSessions()).toBe(1);
  });
});
