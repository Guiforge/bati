import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { outingLocomotion } from "@/db/expeditions";
import type { Locomotion } from "@/db/schema";
import { createTestDb } from "./helpers/testDb";

/**
 * `0049_a_walk_is_not_a_workout.sql` — the column that lets a query tell a walk from a workout.
 *
 * The rule already existed (`isOutingQuest`, the strict one) and read the *style* of a session's
 * movements, which no aggregate joins. So eight families of statistic counted a walk as training:
 * a tester's six-hour hike put his average training duration at 77 minutes and took the
 * longest-session record for good.
 *
 * The backfill reads `completed_exercises` rather than the quest, because a quest can be edited
 * or deleted after the fact and the journal cannot.
 */
describe("0049: a session says which kind it is", () => {
  const t = createTestDb();
  afterAll(() => t.close());

  /**
   * The journal backfill alone. The harness has already replayed the whole file against an empty
   * database, so re-running it whole would re-add the columns; this takes the real statement out
   * of the real file rather than keeping a copy that can drift.
   */
  const backfill = (() => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "drizzle", "0049_a_walk_is_not_a_workout.sql"),
      "utf8",
    );
    const last = sql
      .split(/\n?--> statement-breakpoint\n?/g)
      .pop()
      ?.trim();
    assert(last, "0049 has no statements");
    assert(last.includes("UPDATE `completed_sessions`"), "0049's last statement moved");
    assert(!last.includes("ALTER TABLE"), "0049's last chunk would re-add a column");
    return last;
  })();

  const idOf = (enName: string): number => {
    const row = t.sqlite
      .prepare("SELECT id FROM exercises WHERE enName = ? AND creator = 'Admin'")
      .get(enName) as { id: number } | undefined;
    assert(row, `${enName} is not in the seeded catalogue`);
    return row.id;
  };

  const locomotionOf = (enName: string): string | null =>
    (
      t.sqlite
        .prepare("SELECT locomotion FROM exercises WHERE enName = ? AND creator = 'Admin'")
        .get(enName) as { locomotion: string | null }
    ).locomotion;

  function seedSession(id: number, exerciseIds: number[]): void {
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (id, userLevel, durationSeconds, xpEarned, performedAt) VALUES (?, 'medium', 600, 100, ?)",
      )
      .run(id, Date.now());

    const insert = t.sqlite.prepare(
      "INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt) VALUES (?, ?, 0, ?, 'time', 600, ?)",
    );
    exerciseIds.forEach((exerciseId, i) => {
      insert.run(id, exerciseId, i, Date.now());
    });
  }

  const outingOf = (id: number): string | null =>
    (
      t.sqlite.prepare("SELECT outing FROM completed_sessions WHERE id = ?").get(id) as {
        outing: string | null;
      }
    ).outing;

  test("the three ways out carry how they cover ground", () => {
    expect(locomotionOf("Warden's Walk")).toBe("walk");
    expect(locomotionOf("Messenger's Run")).toBe("run");
    expect(locomotionOf("Outrider's Ride")).toBe("ride");
  });

  test("nothing that stays inside the walls claims a locomotion", () => {
    const rows = t.sqlite
      .prepare(
        "SELECT enName FROM exercises WHERE style <> 'expedition' AND locomotion IS NOT NULL",
      )
      .all();
    expect(rows).toEqual([]);
  });

  test("the journal is classified by what was performed, not by the quest", () => {
    const walk = idOf("Warden's Walk");
    const run = idOf("Messenger's Run");
    const pushUps = idOf("Push-ups");

    seedSession(1, [walk]); // a pure outing
    seedSession(2, [walk, pushUps]); // a walk and then push-ups in the yard
    seedSession(3, [pushUps]); // a workout
    seedSession(4, [run, walk]); // two ways out in one session

    t.sqlite.exec(backfill);

    expect(outingOf(1)).toBe("walk");
    // The one that `leaguesM IS NOT NULL` got wrong: it holds real work, so its minutes belong
    // in the training average and its reps are priced the way reps always were.
    expect(outingOf(2)).toBeNull();
    expect(outingOf(3)).toBeNull();
    // Cheapest of the two, so the marker and the rate cannot disagree about the same session.
    expect(outingOf(4)).toBe("walk");
  });
});

/**
 * The rule itself, away from SQL. `saveSession` and the dev seeder both call it, which is the
 * whole reason it is not spelled twice.
 */
describe("outingLocomotion", () => {
  const slot = (style: string, locomotion: Locomotion | null) => ({
    exercise: { style: style as "expedition" | "strength", locomotion },
  });

  test("a quest that never leaves the walls has none", () => {
    expect(outingLocomotion({ exercises: [slot("strength", null)] })).toBeNull();
  });

  test("a mixed quest has none — it holds real work", () => {
    expect(
      outingLocomotion({ exercises: [slot("expedition", "walk"), slot("strength", null)] }),
    ).toBeNull();
  });

  test("an empty quest has none", () => {
    expect(outingLocomotion({ exercises: [] })).toBeNull();
  });

  test("one way out is that way out", () => {
    expect(outingLocomotion({ exercises: [slot("expedition", "run")] })).toBe("run");
    expect(outingLocomotion({ exercises: [slot("expedition", "ride")] })).toBe("ride");
  });

  test("two ways out are paid at the cheaper, whichever came first", () => {
    expect(
      outingLocomotion({ exercises: [slot("expedition", "run"), slot("expedition", "walk")] }),
    ).toBe("walk");
    expect(
      outingLocomotion({ exercises: [slot("expedition", "run"), slot("expedition", "ride")] }),
    ).toBe("ride");
  });

  test("a movement that never said is a walk — unknown is not a door out", () => {
    expect(outingLocomotion({ exercises: [slot("expedition", null)] })).toBe("walk");
  });
});
