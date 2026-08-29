import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "../../db/schema";

type Journal = {
  entries: { idx: number; tag: string; when: number }[];
};

function splitMigrationSql(sql: string): string[] {
  // Drizzle SQL migrations include "--> statement-breakpoint" markers which are
  // not valid SQLite syntax. Split on them and execute each chunk.
  return sql
    .split(/\n?--> statement-breakpoint\n?/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyMigrations(sqlite: Database.Database): void {
  const root = process.cwd();
  const journalPath = path.join(root, "drizzle", "meta", "_journal.json");
  const journal: Journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

  // The bookkeeping table the app's runner creates (db/migrate.ts). The .sql files never mention
  // it, so without this the test database differs from a real one in the one place that matters
  // to db/backup.ts — which reads it to decide whether a backup is compatible.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `);
  const record = sqlite.prepare(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
  );

  for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
    const filePath = path.join(root, "drizzle", `${entry.tag}.sql`);
    const content = fs.readFileSync(filePath, "utf8");

    for (const stmt of splitMigrationSql(content)) {
      sqlite.exec(stmt);
    }

    record.run(entry.tag, entry.when);
  }
}

/**
 * The module shape `db/*` expects from `./client`, wired to an in-memory test db.
 *
 * `transactionOrFallback` has to be here: better-sqlite3 cannot run an async transaction
 * callback, so the real one in db/client.ts runs the body directly on that driver — which
 * is exactly what this does. A mock that omits it makes every write path throw
 * "transactionOrFallback is not a function".
 */
export function clientMock(t: { db: unknown; sqlite: Database.Database }) {
  const { sqlString } = require("../../db/sql") as typeof import("../../db/sql");
  return {
    db: t.db,
    schema: require("../../db/schema"),
    transactionOrFallback: <T>(fn: (tx: never) => Promise<T>) => fn(t.db as never),
    // The real one queues; here there is nothing to queue behind, and a stub keeps a test
    // failure inside the assertion that caused it rather than one tick later.
    serializeOnDatabase: <T>(fn: () => Promise<T>) => fn(),
    // The real one opens its own expo-sqlite connection, because the shared one always has a
    // prepared statement alive and `VACUUM INTO` refuses to run behind one. better-sqlite3 is
    // synchronous and holds none, so here it is the plain statement — which is also why this
    // stub cannot catch that bug, and why it took a device to find it.
    vacuumIntoFile: async (destinationPath: string) => {
      await Promise.resolve();
      t.sqlite.exec(`VACUUM INTO ${sqlString(destinationPath)}`);
    },
  };
}

/**
 * Log three on-target sessions on every movement, so `getQuestById` serves each quest exactly as
 * the content team wrote it.
 *
 * Since issue #33 a slot is served at the rung the hero is standing on, and on an empty journal
 * that is the bottom of every chain. A test about target maths, swaps or catalogue invariants
 * would otherwise be reading what a day-one beginner is prescribed instead of what was authored.
 * Owning everything is the shortest way to say "not that hero" — the substitution has its own file.
 */
export function ownEveryRung(t: { sqlite: Database.Database }): void {
  const ids = t.sqlite.prepare("SELECT id FROM exercises").all() as Array<{ id: number }>;
  const at = Math.floor(Date.now() / 1000);
  const session = t.sqlite.prepare(
    "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
  );
  const entry = t.sqlite.prepare(
    `INSERT INTO completed_exercises
       (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
        targetValue, performedAt)
     VALUES (?, ?, 0, ?, 'reps', 10, 'reps', 10, ?)`,
  );

  // `isEarned` wants PROGRESSION_SESSIONS_REQUIRED distinct on-target sessions.
  for (let n = 0; n < 3; n++) {
    const sessionId = Number(session.run(at - n * 86400).lastInsertRowid);
    ids.forEach((row, i) => {
      entry.run(sessionId, row.id, i, at - n * 86400);
    });
  }
}

export function createTestDb() {
  const sqlite = new Database(":memory:");

  // Stricter than the app on purpose. `db/client.ts` issues no `PRAGMA foreign_keys`, so on a
  // device SQLite leaves them OFF and every `ON DELETE` clause in the schema is decoration.
  // Enforcing them here catches a bad reference a phone would swallow — but never read a green
  // test as proof that the app enforces one. It is why `deleteUserExercise` counts rows instead
  // of trusting a constraint.
  sqlite.pragma("foreign_keys = ON");

  applyMigrations(sqlite);

  const db = drizzle(sqlite, { schema });

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}
