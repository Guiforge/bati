/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { figuresThatMoved, GOLDEN_NOW, measureHero, pinClock } from "./helpers/goldenHero";
import { migrate } from "./helpers/migrateTo";
import { clientMock } from "./helpers/testDb";

/**
 * The golden hero, but arriving by update: a hero is built on the schema of every earlier build,
 * trains for three years there, and the app then catches up to this one. Their figures must
 * survive the trip.
 *
 * `golden-hero.test.ts` freezes what a hero reads on today's schema. It cannot see a migration
 * that, on a database with three years in it, quietly recomputes or drops something. This is the
 * test that can, and `backup-compat.test.ts` (one session, one point) does not.
 *
 * The points of the journal from 2 on (the first with quests to cycle through), sampled below; the seed runs
 * the same SQL the dev seeder does (`historyStatements`), written with the columns every schema
 * since 0000 has.
 *
 * What may legitimately differ is written down, not tolerated:
 *  - 0037 clamps `xpEarned` to what the logged reps are worth, so a hero seeded before it loses a
 *    few XP and never gains any. From 0037 on, XP is exactly what was written.
 *  - The outing migrations re-file sessions of ground quests as outings: they stop counting as
 *    workouts and stay in the journal and in the XP.
 *  - Quests and their slots changed over the journal, so a hero seeded early trained on other
 *    movements: their records are not today's golden records. Their *counts* and the figures that
 *    do not depend on content (sessions, exercise rows, flame, level) are.
 *  - From `FULL_EQUALITY_FROM` on, nothing legitimate differs: the whole hero is the golden hero.
 *    Move it down when content stops changing; never up to make a failure go away.
 */
const FULL_EQUALITY_FROM = 54; // sampled points only: 54 is not one, 56 is the first

const golden = JSON.parse(
  fs.readFileSync(path.join(__dirname, "golden", "hero-3-years.json"), "utf8"),
).hero;

const journal: { entries: { idx: number }[] } = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8"),
);
// Not every point: each one replays the whole journal twice, so the cost of the file grows with
// the square of the journal and every migration would add a slower test. The first point with
// quests, every third one, and always the last ten, where a migration is most likely to have just
// moved something. `backup-compat.test.ts` still visits every point with one session.
const all = journal.entries.map((e) => e.idx).filter((idx) => idx >= 2);
const points = all.filter((_, i) => i === 0 || i % 3 === 0 || i >= all.length - 10);

function scalar(sqlite: Database.Database, query: string): number {
  return (sqlite.prepare(query).get() as { n: number }).n;
}

describe("a three-year hero updated from any earlier build", () => {
  test.each(points)(
    "trained on the schema at migration %i, keeps its figures after the update",
    async (idx) => {
      const sqlite = new Database(":memory:");
      sqlite.pragma("foreign_keys = ON");
      try {
        await migrate(sqlite, idx);
        const { historyStatements } =
          require("../db/historyStatements") as typeof import("../db/historyStatements");
        const [sessionsSql, exercisesSql] = historyStatements(3, Math.floor(GOLDEN_NOW / 1000));
        sqlite.exec(sessionsSql);
        sqlite.exec(exercisesSql);
        const before = {
          sessions: scalar(sqlite, "SELECT COUNT(*) AS n FROM completed_sessions"),
          exercises: scalar(sqlite, "SELECT COUNT(*) AS n FROM completed_exercises"),
          xp: scalar(sqlite, "SELECT SUM(xpEarned) AS n FROM completed_sessions"),
        };

        await migrate(sqlite);

        // Nothing is lost, whatever else moves.
        expect(scalar(sqlite, "SELECT COUNT(*) AS n FROM completed_sessions")).toBe(
          before.sessions,
        );
        expect(scalar(sqlite, "SELECT COUNT(*) AS n FROM completed_exercises")).toBe(
          before.exercises,
        );
        const xp = scalar(sqlite, "SELECT SUM(xpEarned) AS n FROM completed_sessions");
        if (idx >= 37) expect(xp).toBe(before.xp);
        else expect(xp).toBeLessThanOrEqual(before.xp);

        // The figures, read through the app's own paths on the updated database.
        jest.resetModules();
        const schema = require("../db/schema") as typeof import("../db/schema");
        jest.doMock("../db/client", () => clientMock({ db: drizzle(sqlite, { schema }), sqlite }));
        pinClock();
        try {
          const { checkForNewAchievements } =
            require("../db/achievements") as typeof import("../db/achievements");
          await checkForNewAchievements({
            durationSeconds: 1200,
            xpEarned: 80,
            performedAt: new Date(GOLDEN_NOW),
            questId: null,
            outing: null,
          });
          const hero = JSON.parse(JSON.stringify(await measureHero()));

          // Independent of which movements the hero trained on.
          // Workouts, not rows: the outing migrations (0049, "a walk is not a workout") re-file sessions of ground
          // quests as outings, so some leave this count. The rows themselves are counted above.
          expect(hero.sessions.totalSessions).toBeLessThanOrEqual(before.sessions);
          expect(hero.flame).toEqual(golden.flame);
          expect(hero.level.level).toBe(golden.level.level);
          expect(hero.village.tier).toBe(golden.village.tier);

          if (idx >= FULL_EQUALITY_FROM) {
            expect(figuresThatMoved(golden, hero)).toEqual([]);
          }
        } finally {
          jest.useRealTimers();
        }
      } finally {
        sqlite.close();
      }
    },
    60_000,
  );
});
