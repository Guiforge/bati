import fs from "node:fs";
import path from "node:path";
import { createTestDb } from "./helpers/testDb";

/**
 * `0037_xp_measures_effort.sql` — the one place the XP change reaches backwards.
 *
 * The formula rewrite left every journalled `xpEarned` alone on purpose: nobody should be
 * demoted by an update. But `most_xp` is a *per-session* record read live off `MAX(xpEarned)`
 * (`db/personalRecords.ts`), so the session that exploited the rest bug would have stood as an
 * unbeatable "Most XP" forever — in the app of the person who reported the bug. The migration
 * clamps only the sessions whose XP has no relation to the work they journalled.
 *
 * The bar is deliberately generous: three times the session's rep-equivalents. An honest session
 * under the old formula could reach ~2.5× that (a slow movement plus the daily ×1.5); a session
 * spent waiting has no bound at all.
 */
describe("0037: retroactive XP clamp", () => {
  const t = createTestDb();
  afterAll(() => t.close());

  /** The migration has already run on this database (the harness replays the journal). */
  const migration = fs.readFileSync(
    path.join(process.cwd(), "drizzle", "0037_xp_measures_effort.sql"),
    "utf8",
  );

  function seedSession(id: number, xpEarned: number, sets: [string, number][]): void {
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (id, userLevel, xpEarned, notes, performedAt) VALUES (?, 'medium', ?, '', ?)",
      )
      .run(id, xpEarned, Date.now());

    const insert = t.sqlite.prepare(
      "INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, notes, performedAt) VALUES (?, 1, 0, ?, ?, ?, '', ?)",
    );
    sets.forEach(([type, value], i) => {
      insert.run(id, i, type, value, Date.now());
    });
  }

  const xpOf = (id: number): number =>
    (
      t.sqlite.prepare("SELECT xpEarned FROM completed_sessions WHERE id = ?").get(id) as {
        xpEarned: number;
      }
    ).xpEarned;

  test("clamps the exploit and leaves honest sessions untouched", () => {
    // The bug as reported: five hours of rest, one token set, 3600 XP.
    seedSession(1, 3600, [["reps", 12]]);
    // 15 × 12 reps — 180 XP under the new formula, 360 under the old.
    seedSession(
      2,
      360,
      Array.from<never, [string, number]>({ length: 15 }, () => ["reps", 12]),
    );
    // A slow mobility session that also caught the daily ×1.5 — the closest an honest hero gets.
    seedSession(
      3,
      405,
      Array.from<never, [string, number]>({ length: 12 }, () => ["time", 45]),
    );

    t.sqlite.exec(migration);

    // 3 × 12 rep-equivalents. The work is what it is.
    expect(xpOf(1)).toBe(36);
    expect(xpOf(2)).toBe(360);
    expect(xpOf(3)).toBe(405);
  });

  test("is idempotent — a second run moves nothing", () => {
    const before = [1, 2, 3].map(xpOf);
    t.sqlite.exec(migration);
    expect([1, 2, 3].map(xpOf)).toEqual(before);
  });

  test("never drops a session below the floor a completed session is worth", () => {
    seedSession(4, 2000, [["reps", 1]]);
    t.sqlite.exec(migration);

    expect(xpOf(4)).toBeGreaterThanOrEqual(10);
  });
});
