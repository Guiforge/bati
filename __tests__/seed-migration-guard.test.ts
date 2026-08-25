import fs from "node:fs";
import path from "node:path";

/**
 * Rule 2 of the two-population model (see `drizzle/0035_hero_exercises.sql`): every migration
 * statement that writes to `exercises` scopes itself to `creator`.
 *
 * `INSERT` needs no guard — the column defaults to 'Admin'. `UPDATE` and `DELETE` do: without one
 * they rewrite or remove a hero's row because it happens to share a name with the seed row the
 * migration meant. `0023`, `0030` and `0031` update `WHERE enName = '…'`, `0018` and `0023`
 * delete the same way, and `0009` rewrites art by name — from `0035` on, that predicate can find
 * a row the hero wrote.
 *
 * Everything before the partition is exempt, and not on trust: `db/migrate.ts` runs the whole
 * journal inside one BEGIN IMMEDIATE before the app is usable, so no hero row can exist while any
 * of them executes. That is one justification covering all of them, which is why the exemption is
 * an index cutoff rather than a list of filenames — a list would have to be re-justified per
 * entry, and the entry nobody re-justifies is the one that gets added to silence a failure.
 *
 * This is a ratchet. The cutoff never moves; see the last test.
 */
const DRIZZLE = path.join(process.cwd(), "drizzle");

/** The migration that split the name space. Everything below it predates hero rows entirely. */
const PARTITION_IDX = 35;

/** `UPDATE exercises …` / `DELETE FROM exercises …`, up to the end of the statement. */
const WRITES = /(?:UPDATE\s+`?exercises`?|DELETE\s+FROM\s+`?exercises`?)[\s\S]*?;/gi;

function sqlFiles(): string[] {
  return fs
    .readdirSync(DRIZZLE)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** `0035_hero_exercises.sql` -> 35. Drizzle names every migration with its index. */
function indexOf(file: string): number {
  return Number(file.slice(0, 4));
}

describe("seed migrations never touch hero rows", () => {
  test("every UPDATE or DELETE on `exercises` scopes itself to creator", () => {
    const offenders: string[] = [];

    for (const file of sqlFiles()) {
      if (indexOf(file) < PARTITION_IDX) continue;

      const sql = fs.readFileSync(path.join(DRIZZLE, file), "utf8");
      for (const [statement] of sql.matchAll(WRITES)) {
        if (!/creator/i.test(statement)) {
          offenders.push(`${file}: ${statement.slice(0, 90).replace(/\s+/g, " ")}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  test("every migration file carries a readable index", () => {
    // The cutoff is arithmetic on the filename, so a file drizzle-kit named differently would
    // slip past the guard as NaN rather than fail it.
    expect(sqlFiles().filter((f) => !Number.isInteger(indexOf(f)))).toEqual([]);
  });

  test("the cutoff still names the migration that created the partition", () => {
    // Raising PARTITION_IDX would exempt a migration written *after* hero rows became possible,
    // which is the one thing this file exists to prevent.
    const partition = sqlFiles().find((f) => indexOf(f) === PARTITION_IDX);
    expect(partition).toBe("0035_hero_exercises.sql");

    const sql = fs.readFileSync(path.join(DRIZZLE, "0035_hero_exercises.sql"), "utf8");
    expect(sql).toContain("exercises_admin_name_unique");
    expect(sql).toContain("exercises_hero_name_unique");
  });
});
