import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

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

type Journal = { entries: { idx: number; when: number }[] };
const journal: Journal = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8"),
);

/** better-sqlite3 wearing the four async methods the runner expects of expo-sqlite. */
function makeClient(sqlite: Database.Database) {
  return {
    execAsync: (source: string) => {
      sqlite.exec(source);
      return Promise.resolve();
    },
    runAsync: (source: string, params: readonly unknown[] = []) =>
      Promise.resolve(sqlite.prepare(source).run(...(params as unknown[]))),
    getFirstAsync: <T>(source: string, params: readonly unknown[] = []) =>
      Promise.resolve((sqlite.prepare(source).get(...(params as unknown[])) as T) ?? null),
    getAllAsync: <T>(source: string, params: readonly unknown[] = []) =>
      Promise.resolve(sqlite.prepare(source).all(...(params as unknown[])) as T[]),
  };
}

/** The app's migration runner on `sqlite`, stopped after `maxIdx` when one is given. */
async function migrate(sqlite: Database.Database, maxIdx?: number) {
  if (maxIdx === undefined) delete process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
  else process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX = String(maxIdx);
  jest.resetModules();
  jest.doMock("../db/client", () => ({ db: { $client: makeClient(sqlite) } }));
  jest.doMock("../src/autoBackup", () => ({ backupBeforeMigrations: () => Promise.resolve() }));
  try {
    await (require("../db/migrate") as typeof import("../db/migrate")).ensureMigrations();
  } finally {
    delete process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
  }
}

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
function play(sqlite: Database.Database) {
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
      const { hasExercise } = play(old);
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
        expect(restored.prepare("SELECT performedAt FROM completed_sessions").all()).toEqual([
          { performedAt: 1_750_000_000 },
        ]);
        expect(restored.prepare("SELECT resultValue FROM completed_exercises").all()).toEqual(
          hasExercise ? [{ resultValue: 12 }] : [],
        );
      } finally {
        restored.close();
      }
    },
  );
});
