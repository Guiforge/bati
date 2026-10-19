import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Edits the app makes to something the other device already holds, which sync does not see: the
 * same shape as M-02 (db-sync-corrected-set.test.ts), found elsewhere. Each test states what sync
 * should do, through the writer the app calls, and fails until it does.
 */
let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-unseen-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");
const completed = () => require("../db/completed") as typeof import("../db/completed");
const exercisesDb = () => require("../db/exercises") as typeof import("../db/exercises");
const questsDb = () => require("../db/quests") as typeof import("../db/quests");
const oaths = () => require("../db/oaths") as typeof import("../db/oaths");
const prefs = () => require("../db/preferences") as typeof import("../db/preferences");

/** A snapshot of this database: the other device, as it stood before the edit made here. */
async function peer(name: string) {
  const file = path.join(dir, name);
  await backup().snapshotDatabaseTo(file);
  return file;
}

/**
 * An old preference, written well before the edits below, as the other device copied it. With a
 * session beside it: a device with nothing of its own takes the other's preferences whatever
 * their dates, and a hero who swore an oath has trained.
 */
function oldPref(key: string, value: string) {
  t.sqlite
    .prepare("INSERT INTO user_preferences (key, value, updatedAt) VALUES (?, ?, 100)")
    .run(key, value);
  t.sqlite.exec(
    "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES ('0193b000-0000-7000-8000-0000000000aa', 'medium', 10, 100)",
  );
}

test("feedback given after the other device copied the session is news for it", async () => {
  const id = await completed().createCompletedSession({
    questId: null,
    durationSeconds: 600,
    xpEarned: 40,
    exercises: [
      {
        exerciseId: (
          t.sqlite.prepare("SELECT id FROM exercises WHERE creator = 'Admin' LIMIT 1").get() as {
            id: number;
          }
        ).id,
        sortOrder: 0,
        result: { type: "reps", value: 12 },
      },
    ],
  });
  const tablet = await peer("tablet.db");

  // The victory screen writes it when the hero taps a chip, after the session row exists.
  await completed().updateSessionFeedback(id, "easy");

  expect(await backup().compareWithPeer(tablet)).toMatchObject({ localChanges: 1 });
});

test("retiring a hero movement is news for the other device, and so is bringing it back", async () => {
  const id = Number(
    t.sqlite
      .prepare(
        `INSERT INTO exercises (uuid, enName, frName, enDescription, frDescription, creator, difficulty, createdAt, updatedAt)
         VALUES ('0193b000-0000-7000-8000-000000000001', 'Porch dips', 'Porch dips', '', '', 'hero', 'medium', 100, 100)`,
      )
      .run().lastInsertRowid,
  );
  const tablet = await peer("tablet.db");

  await exercisesDb().retireUserExercise(id);
  expect(await backup().compareWithPeer(tablet)).toMatchObject({ localChanges: 1 });

  // Days pass before the hero brings it back: a date in seconds cannot order two edits in one.
  t.sqlite.prepare("UPDATE exercises SET updatedAt = 200 WHERE id = ?").run(id);
  const retired = await peer("retired.db");
  await exercisesDb().unretireUserExercise(id);
  expect(await backup().compareWithPeer(retired)).toMatchObject({ localChanges: 1 });
});

test("an oath broken here is not brought back by the device that still holds it", async () => {
  oldPref("oath", JSON.stringify({ kind: "sessions", target: 3 }));
  const tablet = await peer("tablet.db");

  await oaths().breakOath();
  await merge().mergePeer(tablet);

  expect(await oaths().getOath()).toBeNull();
});

test("equipment set back to all here is not undone by the device that still holds a list", async () => {
  oldPref("ownedEquipment", JSON.stringify(["pullup_bar"]));
  const tablet = await peer("tablet.db");

  // Settings cycles none, bar, bar and dips, then all, which is written as no preference at all.
  await prefs().preferences.setOwnedEquipment(null);
  await merge().mergePeer(tablet);

  expect(await prefs().preferences.getOwnedEquipment()).toBeNull();
});

test("changing a hero quest's slots is news for the other device", async () => {
  const exerciseId = (
    t.sqlite.prepare("SELECT id FROM exercises WHERE creator = 'Admin' LIMIT 1").get() as {
      id: number;
    }
  ).id;
  const questId = Number(
    t.sqlite
      .prepare(
        `INSERT INTO quests (uuid, enTitle, frTitle, enDescription, frDescription, author, rounds, restSeconds, createdAt, updatedAt)
         VALUES ('0193b000-0000-7000-8000-000000000002', 'My circuit', 'Mon circuit', '', '', 'hero', 1, 30, 100, 100)`,
      )
      .run().lastInsertRowid,
  );
  const tablet = await peer("tablet.db");

  await questsDb().setQuestExercises(questId, [
    { exerciseId, images: [], baseTarget: { type: "reps", min: 8, max: 12 }, style: "standard" },
  ] as never);

  expect(await backup().compareWithPeer(tablet)).toMatchObject({ localChanges: 1 });
});
