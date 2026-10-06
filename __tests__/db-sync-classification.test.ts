import fs from "node:fs";
import path from "node:path";

import { TABLE_SYNC } from "../db/syncTables";
import { createTestDb } from "./helpers/testDb";

/**
 * Every table of the schema is either carried to the other device by the merge, kept on this one, or unused. A new
 * table (a migration of main, a feature of the branch) fails here until somebody says which, and a "merged" one has to
 * be named in `db/merge.ts` too: a classification nobody acts on is a table that silently never syncs.
 */
const SYSTEM = new Set(["__drizzle_migrations", "sqlite_sequence"]);

function tables(): string[] {
  const t = createTestDb();
  try {
    return (
      t.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
        name: string;
      }[]
    )
      .map((r) => r.name)
      .filter((name) => !SYSTEM.has(name))
      .sort();
  } finally {
    t.close();
  }
}

test("every table of the migrated schema is classified for sync, and nothing classified is gone", () => {
  expect(Object.keys(TABLE_SYNC).sort()).toEqual(tables());
});

test("a merged table is handled by the merge or by the comparison, a local or unused one by neither", () => {
  const merge = fs.readFileSync(path.join(__dirname, "../db/merge.ts"), "utf8");
  const backup = fs.readFileSync(path.join(__dirname, "../db/backup.ts"), "utf8");
  const handled = (name: string) => merge.includes(name) || backup.includes(name);
  // A child table is merged through its parent's row (`children: { table }`), so it is named there too.
  const wrong = Object.entries(TABLE_SYNC)
    .filter(([name, how]) => (how === "merged") !== handled(name))
    .map(([name]) => name);
  expect(wrong).toEqual([]);
});
