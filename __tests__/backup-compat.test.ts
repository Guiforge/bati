import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { migrate } from "./helpers/migrateTo";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Every backup an older build could have written still restores on this one.
 *
 * `db-backup.test.ts` fakes an old backup by deleting a migration row and a table, which proves
 * the validator's arithmetic and nothing about a real old file. This builds the real thing: for
 * each point in the migration journal, the app's own runner stops there, a hero plays a little,
 * and the file then goes through the path a restore takes — `validateBackup`, then the runner
 * catching it up on the next launch.
 *
 * Every journal point rather than every release tag: CI clones without tags, and a release is
 * always one of these points, so the superset costs nothing it would not have cost anyway.
 *
 * What fails here is a migration that works on a fresh install and breaks on a database with
 * data in it, or a validator that starts refusing what an older build wrote. Both reach a hero
 * as "that backup could not be restored", months after the release that caused it.
 */

/** The migration that gave adventures their uuid. */
const HERO_ADVENTURES_IDX = 76;
/** The one that let the hero name their boss. */
const BOSS_VOICE_IDX = 77;
/** The one that let a session be written down: `byHand`, `label`, `byHandEditedAt`. */
const HAND_ENTRY_IDX = 80;

type Journal = { entries: { idx: number; when: number }[] };
const journal: Journal = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8"),
);

/** Everything that defines the schema, minus the runner's own bookkeeping. */
function schemaOf(sqlite: Database.Database): string[] {
  return (
    sqlite
      .prepare(
        `SELECT type || ' ' || name || ' ' || coalesce(sql, '') AS def FROM sqlite_master
         WHERE name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY type, name`,
      )
      .all() as { def: string }[]
  ).map((row) => row.def.replace(/\s+/g, " "));
}

/**
 * A little of what a hero leaves behind, in the columns every schema since 0000 has had. A
 * session with an exercise in it once the seed has exercises to point at, which is what the
 * migrations that backfill or rebuild those tables have to carry across.
 */
function play(sqlite: Database.Database, idx: number) {
  sqlite.prepare("INSERT INTO user_preferences (key, value) VALUES ('language', 'fr')").run();
  const at = 1_750_000_000;
  const session = Number(
    sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 40, ?)",
      )
      .run(at).lastInsertRowid,
  );
  const exercise = sqlite.prepare("SELECT id FROM exercises ORDER BY id LIMIT 1").get() as
    | { id: number }
    | undefined;
  if (exercise) {
    sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', 12, ?)`,
      )
      .run(session, exercise.id, at);
  }
  // The hero's own adventure, only where `adventures.uuid` exists (0076): at an earlier point the
  // column is not there, and no build could have written one.
  if (idx >= HERO_ADVENTURES_IDX) {
    const quest = sqlite.prepare("SELECT id FROM quests ORDER BY id LIMIT 1").get() as {
      id: number;
    };
    const adventure = Number(
      sqlite
        .prepare(
          `INSERT INTO adventures (questId, enTitle, frTitle, author, uuid, sortOrder)
           VALUES (?, 'Tale', 'Tale', 'hero', '0192c000-0000-7000-8000-00000000000a', 1000)`,
        )
        .run(quest.id).lastInsertRowid,
    );
    // The boss's name, only where its column exists (0077).
    if (idx >= BOSS_VOICE_IDX) {
      sqlite.prepare("UPDATE adventures SET bossName = 'Nightcoil' WHERE id = ?").run(adventure);
    }
    for (const stepIndex of [0, 1]) {
      sqlite
        .prepare(
          "INSERT INTO adventure_steps (adventureId, stepIndex, questId, enNarrative) VALUES (?, ?, ?, 'on')",
        )
        .run(adventure, stepIndex, quest.id);
    }
  }
  // A session written down, only where `byHand` exists (0078): a row with no exercise at all.
  if (idx >= HAND_ENTRY_IDX) {
    sqlite
      .prepare(
        `INSERT INTO completed_sessions
           (userLevel, xpEarned, performedAt, durationSeconds, byHand, label, byHandEditedAt)
         VALUES ('medium', 75, ?, 2700, 'session', 'salle', 9)`,
      )
      .run(at + 1000);
  }
  return { hasExercise: exercise !== undefined };
}

const live = createTestDb();
let dir: string;
let freshSchema: string[];

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-compat-"));
  const fresh = new Database(":memory:");
  await migrate(fresh);
  freshSchema = schemaOf(fresh);
  fresh.close();
});

afterAll(() => {
  live.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("a backup from any earlier migration point", () => {
  test.each(journal.entries.map((entry) => entry.idx))(
    "written at migration %i, validates, catches up, and keeps its data",
    async (idx) => {
      // What an older build had on disk, written by the runner that build shipped.
      const old = new Database(":memory:");
      await migrate(old, idx);
      const { hasExercise } = play(old, idx);
      // The identity `stampDatabaseIdentity` writes at every launch, so its snapshots carry it.
      const { BATI_APPLICATION_ID } = require("../db/backup") as typeof import("../db/backup");
      const { SCHEMA_VERSION } =
        require("../db/schemaVersion") as typeof import("../db/schemaVersion");
      old.pragma(`application_id = ${BATI_APPLICATION_ID}`);
      old.pragma(`user_version = ${SCHEMA_VERSION}`);
      const file = path.join(dir, `at-${idx}.db`);
      fs.writeFileSync(file, old.serialize());
      old.close();

      // This build's verdict on it.
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(live));
      const { validateBackup } = require("../db/backup") as typeof import("../db/backup");
      expect(await validateBackup(file)).toEqual({ ok: true });

      // The next launch, on the restored file.
      const restored = new Database(file);
      try {
        await migrate(restored);
        expect(schemaOf(restored)).toEqual(freshSchema);
        expect(
          restored.prepare("SELECT value FROM user_preferences WHERE key = 'language'").get(),
        ).toEqual({ value: "fr" });
        // `performedAt` rather than `xpEarned`, which a migration deliberately recomputes.
        expect(
          restored.prepare("SELECT performedAt FROM completed_sessions ORDER BY performedAt").all(),
        ).toEqual([
          { performedAt: 1_750_000_000 },
          ...(idx >= HAND_ENTRY_IDX ? [{ performedAt: 1_750_001_000 }] : []),
        ]);
        // The session written down comes back whole, with no exercise to hold it up.
        expect(
          restored
            .prepare(
              "SELECT byHand, label, byHandEditedAt AS at FROM completed_sessions WHERE byHand IS NOT NULL",
            )
            .all(),
        ).toEqual(idx >= HAND_ENTRY_IDX ? [{ byHand: "session", label: "salle", at: 9 }] : []);
        expect(restored.prepare("SELECT resultValue FROM completed_exercises").all()).toEqual(
          hasExercise ? [{ resultValue: 12 }] : [],
        );
        const heroAdventures = idx >= HERO_ADVENTURES_IDX;
        expect(
          restored
            .prepare(
              `SELECT a.uuid AS uuid, count(s.id) AS steps FROM adventures a
               JOIN adventure_steps s ON s.adventureId = a.id WHERE a.author = 'hero'`,
            )
            .get(),
        ).toEqual(
          heroAdventures
            ? { uuid: "0192c000-0000-7000-8000-00000000000a", steps: 2 }
            : { uuid: null, steps: 0 },
        );
        // Written at 77 and kept; NULL when the point is 76 and the runner caught it up.
        expect(
          restored.prepare("SELECT bossName FROM adventures WHERE author = 'hero'").get(),
        ).toEqual(
          heroAdventures ? { bossName: idx >= BOSS_VOICE_IDX ? "Nightcoil" : null } : undefined,
        );
      } finally {
        restored.close();
      }
    },
  );
});

describe("the notebook", () => {
  test("a backup holding a photo and a note restores both", async () => {
    const source = createTestDb();
    try {
      source.sqlite
        .prepare(
          "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, notes, notesEditedAt) VALUES ('s1', 'medium', 40, 1750000000, 'felt good', 7)",
        )
        .run();
      source.sqlite
        .prepare(
          "INSERT INTO session_photos (uuid, sessionUuid, sortOrder, image, updatedAt) VALUES ('p1', 's1', 0, ?, 5)",
        )
        .run(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(source));
      const backupModule = require("../db/backup") as typeof import("../db/backup");
      const { SCHEMA_VERSION } =
        require("../db/schemaVersion") as typeof import("../db/schemaVersion");
      source.sqlite.pragma(`application_id = ${backupModule.BATI_APPLICATION_ID}`);
      source.sqlite.pragma(`user_version = ${SCHEMA_VERSION}`);
      const file = path.join(dir, "notebook.db");
      await backupModule.snapshotDatabaseTo(file);
      expect(await backupModule.validateBackup(file)).toEqual({ ok: true });

      const restored = new Database(file);
      try {
        expect(
          restored.prepare("SELECT image, updatedAt FROM session_photos WHERE uuid = 'p1'").get(),
        ).toEqual({ image: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), updatedAt: 5 });
        expect(
          restored.prepare("SELECT notes, notesEditedAt AS at FROM completed_sessions").get(),
        ).toEqual({ notes: "felt good", at: 7 });
      } finally {
        restored.close();
      }
    } finally {
      source.close();
    }
  });
});

describe("migration 0078", () => {
  test("adds three columns and leaves every existing row as it was: NULL means measured", async () => {
    const before = new Database(":memory:");
    await migrate(before, HAND_ENTRY_IDX - 1);
    before
      .prepare(
        `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, durationSeconds, outing, leaguesM)
         VALUES ('medium', 120, 1750000000, 1800, 'walk', 2400)`,
      )
      .run();
    await migrate(before);
    expect(
      before
        .prepare(
          "SELECT xpEarned, durationSeconds, outing, leaguesM, byHand, label, byHandEditedAt FROM completed_sessions",
        )
        .all(),
    ).toEqual([
      {
        xpEarned: 120,
        durationSeconds: 1800,
        outing: "walk",
        leaguesM: 2400,
        byHand: null,
        label: null,
        byHandEditedAt: null,
      },
    ]);
    before.close();
  });
});
