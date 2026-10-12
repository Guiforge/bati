import type { WarmupQuest } from "@/constants/warmup";
import type { MovementPattern } from "@/db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The warm-up a hero gets on day one, against the real seeded catalogue and the real rule
 * (`unavailableMovements`), not a hand-written list of names.
 *
 * Every raise movement but one was a jump, so a first session opened on Jumping Jacks, clock
 * running, for someone back from a knee operation. And taking the jumps out is not enough by
 * itself: a new hero has not reached Squat or Lunge either, so the fallback that replaces a jump
 * ran dry and the warm-up came out a step short without saying so.
 */
describe("the warm-up on day one", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterEach(() => {
    t.sqlite.exec("DELETE FROM user_preferences");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  afterAll(() => t.close());

  const quest = (patterns: MovementPattern[], rounds = 2, reps = 8): WarmupQuest => ({
    archetype: null,
    rounds,
    restSeconds: 20,
    roundRestSeconds: null,
    exercises: patterns.map((pattern) => ({
      exercise: { pattern, secondsPerRep: 3, style: "strength" as const },
      target: { type: "reps" as const, value: reps },
    })),
  });

  const QUESTS = [
    quest(["push_horizontal", "core", "hinge", "core"]),
    quest(["squat", "squat", "core"]),
    quest(["squat", "hinge", "push_horizontal", "core"], 3, 20),
  ];

  const impact = (): Set<string> =>
    new Set(
      t.sqlite
        .prepare("SELECT enName FROM exercises WHERE impact = 1")
        .all()
        .map((row) => (row as { enName: string }).enName),
    );

  async function warmups(): Promise<string[][]> {
    const { unavailableMovements } = require("../db/exercises") as typeof import("../db/exercises");
    const { buildWarmup } = require("../constants/warmup") as typeof import("../constants/warmup");
    const unavailable = await unavailableMovements();
    return QUESTS.map((q) => buildWarmup(q, 0, unavailable).map((s) => s.exerciseName));
  }

  const fullLengths = (): number[] => {
    const { buildWarmup } = require("../constants/warmup") as typeof import("../constants/warmup");
    return QUESTS.map((q) => buildWarmup(q, 0).length);
  };

  test("the migration marks exactly the six movements that leave the ground", () => {
    expect([...impact()].sort()).toEqual([
      "Burpee",
      "High Knees",
      "Jump Squat",
      "Jumping Jack",
      "Skater Hop",
      "Star Jump",
    ]);
  });

  test("a hero with no session gets no jump, and no shorter a warm-up for it", async () => {
    const jumps = impact();
    const built = await warmups();

    expect(built.flat().filter((name) => jumps.has(name))).toEqual([]);
    expect(built.map((steps) => steps.length)).toEqual(fullLengths());
    for (const steps of built) expect(new Set(steps).size).toBe(steps.length);
  });

  test("a beginner is kept off jumps for as long as they say they are one", async () => {
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES ('trainingLevel', 'beginner')")
      .run();
    for (let i = 0; i < 5; i++) {
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, strftime('%s', 'now', '-2 days'))",
        )
        .run();
    }
    const jumps = impact();

    expect((await warmups()).flat().filter((name) => jumps.has(name))).toEqual([]);
  });

  test("after three sessions, a hero who is not a beginner gets the usual warm-up back", async () => {
    for (let i = 0; i < 3; i++) {
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, strftime('%s', 'now', '-2 days'))",
        )
        .run();
    }
    const { unavailableMovements } = require("../db/exercises") as typeof import("../db/exercises");
    const unavailable = await unavailableMovements();

    // Jump Squat stays out, for another reason: it is a rung this hero has not reached.
    expect(unavailable.has("Jumping Jack")).toBe(false);
    expect(unavailable.has("Star Jump")).toBe(false);
  });

  // With the jumps out, the one raise movement left was the Mountain Climber: a fast plank on
  // loaded wrists in front of a session that only asks for wall push-ups. The same for the Bear
  // Crawl behind it in the fallback (audit 2026-10-11, the merged tree).
  test("a hero with no session opens on the glute bridge, never on a brisk plank", async () => {
    const built = await warmups();

    for (const steps of built) expect(steps[0]).toBe("Glute Bridge");
    expect(built.flat()).not.toContain("Mountain Climber");
    expect(built.flat()).not.toContain("Bear Crawl");
  });

  test("the brisk movements come back with the jumps, after three sessions", async () => {
    for (let i = 0; i < 3; i++) {
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, strftime('%s', 'now', '-2 days'))",
        )
        .run();
    }
    const { unavailableMovements } = require("../db/exercises") as typeof import("../db/exercises");

    expect((await unavailableMovements()).has("Mountain Climber")).toBe(false);
  });
});
