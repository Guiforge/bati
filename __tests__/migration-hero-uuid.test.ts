import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { UUID_V7_RE } from "../db/uuid";
import { createTestDb } from "./helpers/testDb";

/**
 * `0066_the_quest_that_names_itself.sql`: a uuid for every hero quest and movement already on a
 * phone. Three promises, each one a sync that would go wrong without it:
 *
 * - the name is the same on two phones that already hold the row (they synced by name until now),
 *   or the first sync after updating copies every hero quest in twice;
 * - two rows can never get the same name, or the UNIQUE index fails and the migration with it,
 *   on every launch, forever;
 * - seed rows stay NULL, since they are known by their name.
 *
 * The harness has already run the whole file on an empty database. This replays its statements
 * after the two `ALTER`s, on rows inserted the way a phone from before 0066 holds them, taken from
 * the real file so the test cannot drift from it.
 */
const statements = (() => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "drizzle", "0066_the_quest_that_names_itself.sql"),
    "utf8",
  );
  const chunks = sql
    .split(/\n?--> statement-breakpoint\n?/g)
    .map((s) => s.trim())
    .filter(Boolean);
  assert(chunks[0]?.includes("ALTER TABLE `quests`"), "0066 no longer starts with its ALTERs");
  assert(chunks[1]?.includes("ALTER TABLE `exercises`"), "0066's second statement moved");
  return chunks.slice(2);
})();

/** The phone as it was before 0066: hero rows with no uuid, and no index to hold them. */
function asBefore0066(sqlite: Database.Database): void {
  sqlite.exec(`DROP INDEX IF EXISTS quests_uuid_unique;
    DROP INDEX IF EXISTS exercises_uuid_unique;
    UPDATE quests SET uuid = NULL;
    UPDATE exercises SET uuid = NULL;`);
}

const migrate = (sqlite: Database.Database) => {
  for (const statement of statements) sqlite.exec(statement);
};

function heroQuest(sqlite: Database.Database, title: string, createdAt: number): void {
  sqlite
    .prepare(
      `INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author, createdAt, updatedAt)
       VALUES (?, ?, '', '', 'hero', ?, ?)`,
    )
    .run(title, title, createdAt, createdAt);
}

function heroExercise(sqlite: Database.Database, name: string, createdAt: number): void {
  sqlite
    .prepare(
      `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, createdAt, updatedAt)
       VALUES (?, ?, '', '', 'hero', ?, ?)`,
    )
    .run(name, name, createdAt, createdAt);
}

const uuidOf = (sqlite: Database.Database, table: "quests" | "exercises", name: string) =>
  (
    sqlite
      .prepare(`SELECT uuid FROM ${table} WHERE ${table === "quests" ? "enTitle" : "enName"} = ?`)
      .get(name) as { uuid: string | null }
  ).uuid;

describe("0066: hero content names itself", () => {
  const phone = createTestDb();
  const tablet = createTestDb();
  afterAll(() => {
    phone.close();
    tablet.close();
  });

  test("every hero row gets a uuid v7 whose time is its creation, and seed rows stay unnamed", () => {
    asBefore0066(phone.sqlite);
    heroQuest(phone.sqlite, "Porch forge", 1_790_000_000);
    heroExercise(phone.sqlite, "Porch dip", 1_790_000_000);

    migrate(phone.sqlite);

    for (const uuid of [
      uuidOf(phone.sqlite, "quests", "Porch forge"),
      uuidOf(phone.sqlite, "exercises", "Porch dip"),
    ]) {
      expect(uuid).toMatch(UUID_V7_RE);
      // The first 48 bits are the unix millisecond, so the journal's order by uuid is by age.
      expect(parseInt(uuid?.replace("-", "").slice(0, 12) ?? "", 16)).toBe(1_790_000_000_000);
    }
    const unnamedSeeds = phone.sqlite
      .prepare(
        `SELECT (SELECT count(*) FROM quests WHERE author = 'Admin' AND uuid IS NOT NULL)
              + (SELECT count(*) FROM exercises WHERE creator = 'Admin' AND uuid IS NOT NULL) AS n`,
      )
      .get() as { n: number };
    expect(unnamedSeeds.n).toBe(0);
  });

  test("two phones holding the same synced row name it alike, whatever its row id", () => {
    asBefore0066(phone.sqlite);
    asBefore0066(tablet.sqlite);
    // The tablet has an extra quest first, so the same quest has another id there, as after a
    // merge (which copies titles and timestamps, never ids).
    heroQuest(tablet.sqlite, "Tablet only", 1_790_000_100);
    for (const sqlite of [phone.sqlite, tablet.sqlite]) {
      heroQuest(sqlite, "Shared drill", 1_790_000_200);
      heroExercise(sqlite, "Shared dip", 1_790_000_200);
    }

    migrate(phone.sqlite);
    migrate(tablet.sqlite);

    expect(uuidOf(tablet.sqlite, "quests", "Shared drill")).toBe(
      uuidOf(phone.sqlite, "quests", "Shared drill"),
    );
    expect(uuidOf(tablet.sqlite, "exercises", "Shared dip")).toBe(
      uuidOf(phone.sqlite, "exercises", "Shared dip"),
    );
  });

  test("names that end alike in the same second still get two names, and the index holds", () => {
    asBefore0066(phone.sqlite);
    heroQuest(phone.sqlite, "Twin", 1_790_000_300);
    heroQuest(phone.sqlite, "Twin", 1_790_000_300);
    heroExercise(phone.sqlite, "Twin", 1_790_000_300);
    heroExercise(phone.sqlite, "Twin", 1_790_000_300);

    expect(() => migrate(phone.sqlite)).not.toThrow();

    for (const table of ["quests", "exercises"] as const) {
      const twins = phone.sqlite
        .prepare(
          `SELECT uuid FROM ${table} WHERE ${table === "quests" ? "enTitle" : "enName"} = 'Twin'`,
        )
        .all() as { uuid: string }[];
      expect(twins).toHaveLength(2);
      expect(new Set(twins.map((r) => r.uuid)).size).toBe(2);
      for (const { uuid } of twins) expect(uuid).toMatch(UUID_V7_RE);
    }
  });

  test("a name the sender's language writes in more than one byte is still a well-formed uuid", () => {
    asBefore0066(phone.sqlite);
    heroQuest(phone.sqlite, "Forge du perron, été", 1_790_000_400);
    heroExercise(phone.sqlite, "Dips sur la marche, à fond", 1_790_000_400);

    migrate(phone.sqlite);

    expect(uuidOf(phone.sqlite, "quests", "Forge du perron, été")).toMatch(UUID_V7_RE);
    expect(uuidOf(phone.sqlite, "exercises", "Dips sur la marche, à fond")).toMatch(UUID_V7_RE);
  });
});
