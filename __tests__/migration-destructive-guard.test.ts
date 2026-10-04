import fs from "node:fs";
import path from "node:path";

/**
 * A new migration that can destroy a hero's rows says so, in the file, with a reason.
 *
 * Writing a migration stays easy: the whole price of a `DROP TABLE` or a `DELETE FROM` is one
 * comment line, `-- destructive-ok: <why the rows are safe>`. What this prevents is the migration
 * that loses data and nobody noticed it could, because the runner's ROLLBACK covers a migration
 * that throws and nothing covers one that succeeds.
 *
 * `BASELINE_IDX` is a ratchet like the cutoff in `seed-migration-guard.test.ts`: everything up to
 * it shipped before this guard existed (18 of them contain a DROP or DELETE, all reviewed by
 * hand), and it never moves. A migration above it is new and is held to the rule.
 *
 * What is deliberately not flagged: `DROP INDEX` (no rows), and `UPDATE` (0037 and 0063 are
 * UPDATEs that were reasoned about; a rule on bare UPDATE would fire on every one and teach
 * people to paste the annotation).
 */
const DRIZZLE = path.join(process.cwd(), "drizzle");
const BASELINE_IDX = 66;

const ANNOTATION = /--[ \t]*destructive-ok:[ \t]*(\S[^\n]{9,})/i;

/** Single pass, so a `--` inside a string and an apostrophe inside a comment cannot confuse it. */
const STRINGS_AND_COMMENTS = /'(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\//g;

const DESTRUCTIVE =
  /\b(DROP\s+(?:TABLE|COLUMN|VIEW|TRIGGER)|DELETE\s+FROM|INSERT\s+OR\s+REPLACE|REPLACE\s+INTO|ALTER\s+TABLE\s+\S+\s+DROP)\b/gi;

/** What in `sql` is destructive and not covered by an annotation. Empty means fine. */
function unannotatedDestructive(sql: string): string[] {
  if (ANNOTATION.test(sql)) return [];
  const code = sql.replace(STRINGS_AND_COMMENTS, " ");
  return Array.from(code.matchAll(DESTRUCTIVE), (m) => m[0].replace(/\s+/g, " ").toUpperCase());
}

function sqlFiles(): string[] {
  return fs
    .readdirSync(DRIZZLE)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

const indexOf = (file: string) => Number(file.slice(0, 4));

describe("new migrations that can destroy rows carry a reason", () => {
  test("every migration above the baseline is either harmless or annotated", () => {
    const offenders: string[] = [];
    for (const file of sqlFiles()) {
      if (indexOf(file) <= BASELINE_IDX) continue;
      const found = unannotatedDestructive(fs.readFileSync(path.join(DRIZZLE, file), "utf8"));
      if (found.length > 0) {
        offenders.push(`${file}: ${found.join(", ")} (add "-- destructive-ok: <reason>")`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("the baseline still names the last migration that shipped without this guard", () => {
    // Raising it would exempt a migration written after the guard existed.
    expect(sqlFiles().find((f) => indexOf(f) === BASELINE_IDX)).toBe(
      "0066_the_quest_that_names_itself.sql",
    );
  });
});

describe("the scanner itself", () => {
  test("flags what loses rows", () => {
    expect(unannotatedDestructive("DROP TABLE hero_things;")).toEqual(["DROP TABLE"]);
    expect(unannotatedDestructive("ALTER TABLE a DROP COLUMN b;")).toEqual(["ALTER TABLE A DROP"]);
    expect(unannotatedDestructive("delete  from\n completed_sessions;")).toEqual(["DELETE FROM"]);
    expect(unannotatedDestructive("INSERT OR REPLACE INTO t VALUES (1);")).toEqual([
      "INSERT OR REPLACE",
    ]);
    expect(unannotatedDestructive("REPLACE INTO t VALUES (1);")).toEqual(["REPLACE INTO"]);
  });

  test("leaves alone what loses nothing", () => {
    expect(unannotatedDestructive("DROP INDEX IF EXISTS idx;")).toEqual([]);
    expect(unannotatedDestructive("UPDATE t SET a = 1;")).toEqual([]);
    expect(unannotatedDestructive("CREATE TABLE x (a integer);")).toEqual([]);
  });

  test("words inside strings and comments are not statements", () => {
    expect(unannotatedDestructive("-- we used to DROP TABLE here\nSELECT 1;")).toEqual([]);
    expect(unannotatedDestructive("INSERT INTO t VALUES ('please DELETE FROM me');")).toEqual([]);
    expect(unannotatedDestructive("/* DELETE FROM x */ SELECT 1;")).toEqual([]);
    // An apostrophe in a comment must not open a string that swallows the real statement.
    expect(unannotatedDestructive("-- don't\nDROP TABLE t;")).toEqual(["DROP TABLE"]);
    // And `--` inside a string must not start a comment that hides it.
    expect(unannotatedDestructive("SELECT '--'; DROP TABLE t;")).toEqual(["DROP TABLE"]);
  });

  test("an annotation with a real reason covers the file; an empty one does not", () => {
    expect(
      unannotatedDestructive(
        "-- destructive-ok: the old table was rebuilt as t_new and every row copied\nDROP TABLE t;",
      ),
    ).toEqual([]);
    expect(unannotatedDestructive("-- destructive-ok:\nDROP TABLE t;")).toEqual(["DROP TABLE"]);
    expect(unannotatedDestructive("-- destructive-ok: ok\nDROP TABLE t;")).toEqual(["DROP TABLE"]);
  });
});

/**
 * Three lists that must agree, and nothing else compares them: the journal says what exists, the
 * `.sql` files are what runs, and `migrations.js` is what Metro bundles. Hand-written migrations
 * make a forgotten line in the last one a migration present in git and absent from the app.
 */
describe("journal, files and bundle agree", () => {
  const journal = JSON.parse(
    fs.readFileSync(path.join(DRIZZLE, "meta", "_journal.json"), "utf8"),
  ) as { entries: { idx: number; tag: string }[] };
  const bundle = fs.readFileSync(path.join(DRIZZLE, "migrations.js"), "utf8");

  test("every journal entry has its .sql file and its bundle import", () => {
    const missing: string[] = [];
    for (const { idx, tag } of journal.entries) {
      const key = `m${String(idx).padStart(4, "0")}`;
      if (!fs.existsSync(path.join(DRIZZLE, `${tag}.sql`))) missing.push(`${tag}.sql`);
      if (!bundle.includes(`import ${key} from "./${tag}.sql"`)) missing.push(`import ${key}`);
      if (!new RegExp(`\\b${key},`).test(bundle.split("migrations:")[1] ?? "")) {
        missing.push(`${key} in the migrations map`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("no .sql file sits outside the journal", () => {
    const tags = new Set(journal.entries.map((e) => `${e.tag}.sql`));
    expect(sqlFiles().filter((f) => !tags.has(f))).toEqual([]);
  });
});
