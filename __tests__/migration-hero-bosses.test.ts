import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { createTestDb } from "./helpers/testDb";

/**
 * `0079_the_boss_is_a_creation.sql`: the voice a dev build's adventure carried (0077) moves into a
 * boss of its own. Promises, each a hero's words lost or doubled without it:
 *
 * - every voiced hero boss adventure gets one boss, named after the adventure's uuid, with the words,
 *   the weakness and the resistance it fought with, and the two 0077 columns are emptied;
 * - an unvoiced boss, a route and every seeded row are untouched;
 * - nothing else of the adventure moves (no title, no step, no `updatedAt`).
 *
 * The harness has already run the file on an empty database. This replays the two data statements on
 * rows inserted the way a phone from before 0079 holds them, taken from the real file so the test
 * cannot drift from it.
 */
const statements = (() => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "drizzle", "0079_the_boss_is_a_creation.sql"),
    "utf8",
  );
  const chunks = sql
    .split(/\n?--> statement-breakpoint\n?/g)
    .map((s) => s.trim())
    .filter(Boolean);
  assert(chunks[0]?.includes("CREATE TABLE `hero_bosses`"), "0079 no longer starts with its table");
  assert(chunks[2]?.includes("ALTER TABLE `adventures`"), "0079's ALTER moved");
  return chunks.slice(3);
})();

const t = createTestDb();
afterAll(() => t.close());

const UUID_VOICED = "0192e000-0000-7000-8000-000000000001";
const UUID_VOICE_LESS = "0192e000-0000-7000-8000-000000000002";
const UUID_LINES_ONLY = "0192e000-0000-7000-8000-000000000003";
const UUID_ROUTE = "0192e000-0000-7000-8000-000000000004";

function adventure(
  sqlite: Database.Database,
  o: { uuid: string; kind: "boss" | "route"; name?: string; lines?: string },
) {
  const quest = (sqlite.prepare("SELECT id FROM quests ORDER BY id").get() as { id: number }).id;
  sqlite
    .prepare(
      `INSERT INTO adventures (questId, enTitle, frTitle, deTitle, esTitle, author, sortOrder, kind, isActive,
         imagePath, bossImagePath, bossWeaknessMuscle, bossResistanceMuscle, createdAt, updatedAt, uuid,
         bossName, bossLinesJson)
       VALUES (?, 'Tale', 'Tale', 'Tale', 'Tale', 'hero', 1000, ?, 1, 'the_golem', ?, ?, ?, 111, 222, ?, ?, ?)`,
    )
    .run(
      quest,
      o.kind,
      o.kind === "boss" ? "assets/images/bosses/iron_golem.jpg" : null,
      o.kind === "boss" ? "chest" : null,
      o.kind === "boss" ? "legs" : null,
      o.uuid,
      o.name ?? null,
      o.lines ?? null,
    );
}

const row = (uuid: string) =>
  t.sqlite
    .prepare(
      "SELECT heroBossUuid, bossName, bossLinesJson, updatedAt, enTitle FROM adventures WHERE uuid = ?",
    )
    .get(uuid) as {
    heroBossUuid: string | null;
    bossName: string | null;
    bossLinesJson: string | null;
    updatedAt: number;
    enTitle: string;
  };

test("moves each voice into a boss named after its adventure, and leaves everything else alone", () => {
  const lines = '{"intro":[],"idle":["Again."],"crit":[],"enrage":[],"defeat":[]}';
  adventure(t.sqlite, { uuid: UUID_VOICED, kind: "boss", name: "Nightcoil", lines });
  adventure(t.sqlite, { uuid: UUID_LINES_ONLY, kind: "boss", lines });
  adventure(t.sqlite, { uuid: UUID_VOICE_LESS, kind: "boss" });
  adventure(t.sqlite, { uuid: UUID_ROUTE, kind: "route" });
  const seedBefore = t.sqlite
    .prepare("SELECT count(*) AS n FROM adventures WHERE author = 'Admin' AND heroBossUuid IS NULL")
    .get() as { n: number };

  for (const statement of statements) t.sqlite.exec(statement);

  const boss = t.sqlite.prepare("SELECT * FROM hero_bosses WHERE uuid = ?").get(UUID_VOICED) as {
    name: string;
    monster: string;
    weaknessMuscle: string;
    resistanceMuscle: string;
    linesJson: string;
    artJson: string | null;
    createdAt: number;
    updatedAt: number;
  };
  expect(boss).toMatchObject({
    name: "Nightcoil",
    monster: "assets/images/bosses/iron_golem.jpg",
    weaknessMuscle: "chest",
    resistanceMuscle: "legs",
    linesJson: lines,
    artJson: null,
    createdAt: 111,
    updatedAt: 222,
  });
  expect(row(UUID_VOICED)).toMatchObject({
    heroBossUuid: UUID_VOICED,
    bossName: null,
    bossLinesJson: null,
    updatedAt: 222,
    enTitle: "Tale",
  });
  // Lines without a name: a boss with an empty name (the painted one shows).
  expect(
    (
      t.sqlite.prepare("SELECT name FROM hero_bosses WHERE uuid = ?").get(UUID_LINES_ONLY) as {
        name: string;
      }
    ).name,
  ).toBe("");
  expect(row(UUID_LINES_ONLY).heroBossUuid).toBe(UUID_LINES_ONLY);

  // An unvoiced boss and a route have nothing to move.
  for (const uuid of [UUID_VOICE_LESS, UUID_ROUTE]) {
    expect(row(uuid)).toMatchObject({ heroBossUuid: null, bossName: null, bossLinesJson: null });
    expect(t.sqlite.prepare("SELECT 1 FROM hero_bosses WHERE uuid = ?").get(uuid)).toBeUndefined();
  }
  expect((t.sqlite.prepare("SELECT count(*) AS n FROM hero_bosses").get() as { n: number }).n).toBe(
    2,
  );
  // The game's adventures are not touched.
  expect(
    t.sqlite
      .prepare(
        "SELECT count(*) AS n FROM adventures WHERE author = 'Admin' AND heroBossUuid IS NULL",
      )
      .get(),
  ).toEqual(seedBefore);
});
