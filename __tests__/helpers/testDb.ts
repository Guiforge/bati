import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "../../src/db/schema";

type Journal = {
  entries: { idx: number; tag: string }[];
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
  const journalPath = path.join(root, "src", "drizzle", "meta", "_journal.json");
  const journal: Journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

  for (const entry of [...journal.entries].sort((a, b) => a.idx - b.idx)) {
    const filePath = path.join(root, "src", "drizzle", `${entry.tag}.sql`);
    const content = fs.readFileSync(filePath, "utf8");

    for (const stmt of splitMigrationSql(content)) {
      sqlite.exec(stmt);
    }
  }
}

export function createTestDb() {
  const sqlite = new Database(":memory:");

  // Keep SQLite behavior close to the app DB.
  sqlite.pragma("foreign_keys = ON");

  applyMigrations(sqlite);

  const db = drizzle(sqlite, { schema });

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}
