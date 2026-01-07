import Database from "better-sqlite3";
import migrations from "@/src/drizzle/migrations.js";

/**
 * Execute a SQL migration file string against the given DB.
 * The SQL content uses "--> statement-breakpoint" separators.
 */
function applySqlMigration(db: Database.Database, sqlFileContent: string) {
  const parts = sqlFileContent
    .split(/\n-->\s*statement-breakpoint\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  db.exec("PRAGMA foreign_keys = ON;");
  for (const statementGroup of parts) {
    // better-sqlite3 can execute multiple statements at once, but keep it simple.
    db.exec(statementGroup);
  }
}

/** Map journal tag like "0000_schema" -> key "m0000" in migrations.migrations */
function tagToKey(tag: string): keyof typeof migrations.migrations {
  const prefix = tag.split("_")[0];
  return `m${prefix}` as keyof typeof migrations.migrations;
}

describe("SQLite migrations (drizzle/migrations.js)", () => {
  it("creates a fresh DB, runs all migrations, and exposes expected schema & seeds", () => {
    const db = new Database(":memory:");

    // Run migrations in journal order
    const entries = migrations.journal.entries.slice().sort((a, b) => a.idx - b.idx);

    for (const entry of entries) {
      const key = tagToKey(entry.tag);
      const sql = migrations.migrations[key] as unknown as string;
      expect(typeof sql).toBe("string");
      applySqlMigration(db, sql);
    }

    // Tables should exist
    const hasTable = (name: string) => {
      const row = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(name) as { name?: string } | undefined;
      return !!row?.name;
    };

    expect(hasTable("exercises")).toBe(true);
    expect(hasTable("quests")).toBe(true);
    expect(hasTable("adventures")).toBe(true);
    expect(hasTable("adventure_steps")).toBe(true);
    expect(hasTable("resource_inventory")).toBe(true);
    expect(hasTable("village_buildings")).toBe(true);

    // Columns added by later migrations should be present
    const columns = (table: string) =>
      (
        db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
          name: string;
        }>
      ).map((c) => c.name);

    const questCols = columns("quests");
    expect(questCols).toContain("imagePath"); // from 0007

    const advCols = columns("adventures");
    expect(advCols).toContain("imagePath"); // from 0007

    const stepCols = columns("adventure_steps");
    expect(stepCols).toContain("imagePath"); // from 0007

    const exerciseCols = columns("exercises");
    expect(exerciseCols).toContain("style"); // from 0005

    // Seeded resources should exist
    const resourceCount = (res: string) => {
      const r = db
        .prepare("SELECT COUNT(*) as c FROM resource_inventory WHERE resource = ?")
        .get(res) as { c: number };
      return r.c;
    };

    [
      "gold",
      "essence",
      "boss_token",
      "wood",
      "stone",
      "fire",
      "water",
      "wind",
      "grain",
      "mana",
      "leaf",
    ];

    for (const res of ["gold", "wood", "stone", "fire", "water", "mana", "leaf"]) {
      expect(resourceCount(res)).toBeGreaterThanOrEqual(0);
    }

    // Image paths for quests (from 0008)
    const questImage = (title: string) => {
      const r = db.prepare("SELECT imagePath FROM quests WHERE enTitle = ?").get(title) as
        | { imagePath?: string }
        | undefined;
      return r?.imagePath ?? null;
    };

    expect(questImage("Guard the Fortress Gate")).toBe(
      "assets/images/quests/guard_fortress_gate.jpg"
    );

    // Adventure step images should mirror quest images
    const stepImagePaths = db
      .prepare(
        `SELECT s.imagePath as stepImage, q.imagePath as questImage
         FROM adventure_steps s JOIN quests q ON q.id = s.questId
         WHERE s.imagePath IS NOT NULL LIMIT 5`
      )
      .all() as Array<{ stepImage: string; questImage: string }>;

    for (const row of stepImagePaths) {
      expect(row.stepImage).toBe(row.questImage);
    }

    db.close();
  });
});
