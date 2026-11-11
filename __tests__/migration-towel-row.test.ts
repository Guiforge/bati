import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { createTestDb } from "./helpers/testDb";

/**
 * `0086_the_towel_row_retires.sql` on a phone that has used the Towel Door Row. The harness has
 * already run the file on an empty database; this puts the rows back the way a phone from before
 * 0086 holds them, adds what a hero may have built on the movement, and replays the real file's
 * statements. Promises:
 *
 * - nothing the hero did is lost: past sets, their own quest holding the movement, their own
 *   movement that happens to share its name;
 * - The Cellar Hauler trains Table Row, Dead Bug, Superman W, Superman (pull and core alternate),
 *   with every kept slot keeping its id (a saved quest config is keyed by slot id);
 * - the pull ladder starts at Table Row and the seed row is retired, the hero's row is not;
 * - replaying it changes nothing (a journal replayed after a rollback must not shuffle the quest).
 */
const statements = fs
  .readFileSync(path.join(process.cwd(), "drizzle", "0086_the_towel_row_retires.sql"), "utf8")
  .split(/\n?--> statement-breakpoint\n?/g)
  .map((s) => s.trim())
  .filter(Boolean);

const migrate = (sqlite: Database.Database) => {
  for (const statement of statements) sqlite.exec(statement);
};

const CELLAR = 22;
const TOWEL_SLOT = 107;

const idOf = (sqlite: Database.Database, name: string): number => {
  const row = sqlite
    .prepare("SELECT id FROM exercises WHERE creator = 'Admin' AND enName = ?")
    .get(name) as { id: number } | undefined;
  assert(row, `no seed movement named ${name}`);
  return row.id;
};

const cellar = (sqlite: Database.Database) =>
  sqlite
    .prepare(
      `SELECT qe.id, qe.sortOrder, e.enName, qe.targetMin, qe.targetMax FROM quest_exercises qe
       JOIN exercises e ON e.id = qe.exerciseId WHERE qe.questId = ? ORDER BY qe.sortOrder`,
    )
    .all(CELLAR) as {
    id: number;
    sortOrder: number;
    enName: string;
    targetMin: number;
    targetMax: number;
  }[];

/** The phone before 0086: the Towel Door Row slot in The Cellar Hauler, under Table Row, not retired. */
function asBefore0086(sqlite: Database.Database): void {
  const towel = idOf(sqlite, "Towel Door Row");
  const supermanW = idOf(sqlite, "Superman W");
  sqlite
    .prepare("DELETE FROM quest_exercises WHERE questId = ? AND exerciseId = ?")
    .run(CELLAR, supermanW);
  sqlite
    .prepare("UPDATE quest_exercises SET sortOrder = 1 WHERE questId = ? AND sortOrder = 2")
    .run(CELLAR);
  sqlite
    .prepare(
      `INSERT INTO quest_exercises (id, questId, exerciseId, sortOrder, targetType, targetMin, targetMax, imagesJson)
       VALUES (?, ?, ?, 2, 'reps', 8, 12, '[]')`,
    )
    .run(TOWEL_SLOT, CELLAR, towel);
  sqlite
    .prepare(
      "UPDATE exercises SET prerequisiteExerciseId = ? WHERE creator = 'Admin' AND enName = 'Table Row'",
    )
    .run(towel);
  sqlite.prepare("UPDATE exercises SET retiredAt = NULL WHERE id = ?").run(towel);
}

describe("0086: the towel door row retires", () => {
  const t = createTestDb();
  afterAll(() => t.close());

  test("keeps the hero's work, reorders The Cellar Hauler, retires only the seed row", () => {
    const db = t.sqlite;
    asBefore0086(db);
    expect(cellar(db).map((r) => r.enName)).toEqual([
      "Table Row",
      "Dead Bug",
      "Towel Door Row",
      "Superman",
    ]);
    const kept = cellar(db).filter((r) => r.enName !== "Towel Door Row");
    const towel = idOf(db, "Towel Door Row");
    const now = 1_790_000_000_000;

    // A past session on the movement, a hero quest built on it, and a hero movement of the same name.
    db.prepare(
      "INSERT INTO completed_sessions (id, userLevel, xpEarned, notes, performedAt) VALUES (900, 'medium', 40, '', ?)",
    ).run(now);
    db.prepare(
      `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, notes, performedAt)
       VALUES (900, ?, 0, 0, 'reps', 12, '', ?)`,
    ).run(towel, now);
    const heroQuest = Number(
      db
        .prepare(
          `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt)
           VALUES ('Door rows', 'Door rows', '', '', 'hero', 1, 1)`,
        )
        .run().lastInsertRowid,
    );
    db.prepare(
      `INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax, imagesJson)
       VALUES (?, ?, 0, 'reps', 10, 10, '[]')`,
    ).run(heroQuest, towel);
    const heroMove = Number(
      db
        .prepare(
          `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, createdAt, updatedAt)
           VALUES ('Towel Door Row', 'Towel Door Row', '', '', 'hero', 1, 1)`,
        )
        .run().lastInsertRowid,
    );

    migrate(db);

    const after = cellar(db);
    expect(after.map((r) => r.enName)).toEqual(["Table Row", "Dead Bug", "Superman W", "Superman"]);
    expect(after.map((r) => r.sortOrder)).toEqual([0, 1, 2, 3]);
    expect(after.find((r) => r.enName === "Superman W")).toMatchObject({
      targetMin: 10,
      targetMax: 12,
    });
    // Every kept slot keeps its id, so a saved config still reaches the same movement.
    for (const slot of kept) expect(after.find((r) => r.enName === slot.enName)?.id).toBe(slot.id);
    expect(after.some((r) => r.id === TOWEL_SLOT)).toBe(false);

    const tableRow = db
      .prepare(
        "SELECT prerequisiteExerciseId FROM exercises WHERE creator = 'Admin' AND enName = 'Table Row'",
      )
      .get() as { prerequisiteExerciseId: number | null };
    expect(tableRow.prerequisiteExerciseId).toBeNull();
    const retired = (id: number) =>
      (
        db.prepare("SELECT retiredAt FROM exercises WHERE id = ?").get(id) as {
          retiredAt: number | null;
        }
      ).retiredAt;
    expect(retired(towel)).toEqual(expect.any(Number));
    expect(retired(heroMove)).toBeNull();

    expect(
      db.prepare("SELECT COUNT(*) AS n FROM completed_exercises WHERE exerciseId = ?").get(towel),
    ).toEqual({ n: 1 });
    expect(
      db.prepare("SELECT exerciseId FROM quest_exercises WHERE questId = ?").all(heroQuest),
    ).toEqual([{ exerciseId: towel }]);

    // A second run is a no-op.
    migrate(db);
    expect(cellar(db)).toEqual(after);
  });
});
