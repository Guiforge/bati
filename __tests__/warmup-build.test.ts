import { buildWarmup, WARMUP_SEQUENCE, type WarmupQuest } from "@/constants/warmup";
import type { MovementPattern, QuestArchetype } from "@/db/schema";

function quest(patterns: (MovementPattern | null)[], archetype: QuestArchetype | null = null) {
  return {
    archetype,
    exercises: patterns.map((pattern) => ({ exercise: { pattern } })),
  } satisfies WarmupQuest;
}

const names = (q: WarmupQuest) => buildWarmup(q).map((s) => s.exerciseName);

describe("buildWarmup", () => {
  it("falls back to the shipped sequence when nothing is known about the quest", () => {
    // User-authored content leaves `pattern` null on purpose — it must not lose its warm-up.
    expect(names(quest([null, null, null]))).toEqual(WARMUP_SEQUENCE.map((s) => s.exerciseName));
    expect(names(quest([]))).toEqual(WARMUP_SEQUENCE.map((s) => s.exerciseName));
  });

  it("always keeps the four slots in order: pulse, lower, upper, spine", () => {
    const built = names(quest(["squat", "hinge", "pull_vertical", "pull_horizontal"]));

    expect(built[0]).toBe("Jumping Jack");
    expect(built.at(-1)).toBe("Cobra Stretch");
    expect(built).toHaveLength(4);
  });

  it("prepares the hips deeply when the session is built on squatting and hinging", () => {
    expect(names(quest(["squat", "hinge", "core"]))).toContain("World's Greatest Stretch");
    expect(names(quest(["squat", "squat"]))).toContain("World's Greatest Stretch");
  });

  it("leaves the hips alone when a single squat is incidental", () => {
    // One movement of a family is not what the session is about, and should not redirect it.
    expect(names(quest(["squat", "push_horizontal", "core"]))).toContain("Glute Bridge");
  });

  it("prepares the scapula when the session is built on pulling", () => {
    expect(names(quest(["pull_vertical", "pull_horizontal", "core"]))).toContain(
      "Thread the Needle",
    );
  });

  it("prepares the wrists before any vertical pressing", () => {
    // Handstand Push-Up, Pike Push-Up and L-Sit loaded wrists that nothing had touched. One is
    // enough: this is a safety step, not a matter of what the session is mostly about.
    const built = names(quest(["push_vertical", "core", "squat"]));

    expect(built).toContain("Wrist Circles");
    expect(built).toHaveLength(5);
    // Closest to the work about to load them, and never at the very end.
    expect(built.indexOf("Wrist Circles")).toBe(built.length - 2);
  });

  it("prepares the wrists for any skill quest, whatever it contains", () => {
    expect(names(quest(["core", "core"], "skill"))).toContain("Wrist Circles");
  });

  it("does not prepare wrists for a session that never loads them", () => {
    expect(names(quest(["squat", "hinge", "core"], "strength"))).not.toContain("Wrist Circles");
  });

  it("gives every step a duration, so the timer can never divide by nothing", () => {
    for (const q of [quest([null]), quest(["push_vertical"], "skill"), quest(["squat", "hinge"])]) {
      for (const s of buildWarmup(q)) expect(s.seconds).toBeGreaterThan(0);
    }
  });
});
