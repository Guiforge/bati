import { buildWarmup, WARMUP_SEQUENCE, type WarmupQuest } from "@/constants/warmup";
import type { ExerciseStyle, MovementPattern, QuestArchetype } from "@/db/schema";

/**
 * A quest shaped like the real thing: `buildWarmup` reads the patterns to choose movements and
 * the targets to choose a length, so both have to be present for a test to mean anything.
 *
 * The defaults put a quest around eight minutes — the short end of the catalogue — so a test that
 * only cares about *which* movements appear gets the minimum length and stays readable.
 */
function quest(
  patterns: (MovementPattern | null)[],
  archetype: QuestArchetype | null = null,
  { rounds = 2, reps = 8, restSeconds = 20, style = "strength" as ExerciseStyle } = {},
) {
  return {
    archetype,
    rounds,
    restSeconds,
    roundRestSeconds: null,
    exercises: patterns.map((pattern) => ({
      exercise: { pattern, secondsPerRep: 3, style },
      target: { type: "reps" as const, value: reps },
    })),
  } satisfies WarmupQuest;
}

/** The longest quests in the catalogue run past twenty minutes. */
const longQuest = (patterns: (MovementPattern | null)[], archetype: QuestArchetype | null = null) =>
  quest(patterns, archetype, { rounds: 3, reps: 20, restSeconds: 45 });

const names = (q: WarmupQuest, sessionCount = 0) =>
  buildWarmup(q, sessionCount).map((s) => s.exerciseName);

/** Held stretches belong after training, never before it. */
const STATIC_HOLDS = ["Pigeon Pose", "Standing Forward Fold", "Warrior Pose", "Cobra Stretch"];

const RAISE_POOL = ["Jumping Jack", "High Knees", "Star Jump", "Skater Hop", "Mountain Climber"];
const MOBILISE_POOL = ["Cat-Cow", "Thread the Needle", "World's Greatest Stretch", "Downward Dog"];

describe("buildWarmup", () => {
  it("gives a pattern-less quest a full warm-up rather than nothing", () => {
    // User-authored content leaves `pattern` null on purpose — it must not lose its warm-up.
    expect(names(quest([null, null, null])).length).toBeGreaterThanOrEqual(4);
    expect(names(quest([])).length).toBeGreaterThanOrEqual(4);
  });

  it("still opens on a pulse raiser and reaches the work through four phases", () => {
    const built = names(quest(["squat", "hinge", "pull_vertical", "pull_horizontal"]));

    expect(RAISE_POOL).toContain(built[0]);
    expect(built.some((n) => MOBILISE_POOL.includes(n))).toBe(true);
  });

  describe("length follows the session", () => {
    it("keeps the shortest quest at the four steps it has always had", () => {
      expect(names(quest(["squat"], null, { rounds: 1, reps: 5, restSeconds: 10 }))).toHaveLength(
        4,
      );
    });

    it("gives the longest quest ten", () => {
      expect(names(longQuest(["squat", "hinge", "core", "push_horizontal"]))).toHaveLength(10);
    });

    it("never leaves the [4, 10] window, whatever the quest claims", () => {
      const absurd = quest(["squat"], null, { rounds: 99, reps: 999, restSeconds: 999 });
      const empty = quest([], null, { rounds: 1, reps: 1, restSeconds: 0 });

      expect(names(absurd)).toHaveLength(10);
      expect(names(empty)).toHaveLength(4);
    });

    it("still builds when the quest cannot be measured at all", () => {
      // A quest whose exercises carry no `secondsPerRep` estimates to NaN, and NaN survives both
      // Math.round and Math.max to index the budget table with nothing. The warm-up is the first
      // thing startSession builds, so throwing here loses the session before it exists.
      const unmeasurable = {
        archetype: null,
        rounds: 2,
        restSeconds: 30,
        roundRestSeconds: null,
        exercises: [
          {
            exercise: {
              pattern: null,
              secondsPerRep: undefined as unknown as number,
              style: "strength" as const,
            },
            target: { type: "reps" as const, value: 10 },
          },
        ],
      } satisfies WarmupQuest;

      expect(names(unmeasurable)).toHaveLength(4);
    });

    it("gives every step a duration, so the timer can never divide by nothing", () => {
      for (const q of [
        quest([null]),
        quest(["push_vertical"], "skill"),
        longQuest(["squat", "hinge"]),
      ]) {
        for (const s of buildWarmup(q)) expect(s.seconds).toBeGreaterThan(0);
      }
    });
  });

  describe("phase order", () => {
    it("raises the pulse first and reaches the work last, at every length", () => {
      for (const q of [
        quest(["squat"], null, { rounds: 1, reps: 5, restSeconds: 10 }),
        quest(["push_horizontal", "push_horizontal"]),
        longQuest(["pull_vertical", "pull_horizontal", "core"]),
      ]) {
        const built = names(q);

        expect(RAISE_POOL).toContain(built[0]);
        // Mobilisation always sits between the pulse and the work-specific end of the sequence.
        const firstMobilise = built.findIndex((n) => MOBILISE_POOL.includes(n));
        expect(firstMobilise).toBeGreaterThan(0);
        expect(firstMobilise).toBeLessThan(built.length - 1);
      }
    });

    it("never repeats a movement inside one warm-up", () => {
      // `Wall Push-Up` sits in both the activation and potentiation pools for a pressing quest.
      for (const count of [0, 1, 2, 3, 4, 5]) {
        const built = names(longQuest(["push_horizontal", "push_vertical", "core"]), count);
        expect(new Set(built).size).toBe(built.length);
      }
    });

    it("never prescribes a static hold before the work", () => {
      const everyShape = [
        quest([null]),
        quest(["squat", "hinge"]),
        quest(["pull_vertical", "pull_horizontal"]),
        quest(["push_horizontal", "push_vertical"]),
        quest(["core", "core"]),
        longQuest(["squat", "hinge", "core"], "skill"),
      ];

      for (const q of everyShape) {
        for (const sessionCount of [0, 1, 2, 3, 4, 5, 6]) {
          for (const hold of STATIC_HOLDS) {
            expect(names(q, sessionCount)).not.toContain(hold);
          }
        }
      }
    });
  });

  describe("variety", () => {
    it("gives two consecutive sessions different movements", () => {
      const q = longQuest(["squat", "hinge", "core"]);
      expect(names(q, 1)).not.toEqual(names(q, 2));
    });

    it("is deterministic — the same session count rebuilds the same warm-up", () => {
      const q = longQuest(["pull_vertical", "pull_horizontal"]);
      expect(names(q, 7)).toEqual(names(q, 7));
    });

    it("does not let the rotation change the length or the wrist rule", () => {
      // A hero's tenth session is not a different protocol from their first.
      const q = longQuest(["push_vertical", "core"], "skill");
      const lengths = new Set<number>();

      for (let i = 0; i < 12; i++) {
        const built = names(q, i);
        lengths.add(built.length);
        expect(built).toContain("Wrist Circles");
      }

      expect(lengths.size).toBe(1);
    });

    it("survives a negative or fractional session count", () => {
      const q = quest(["squat", "hinge"]);
      expect(() => names(q, -3)).not.toThrow();
      expect(names(q, 2.7)).toEqual(names(q, 2));
    });
  });

  describe("specificity", () => {
    it("prepares the hips when the session is built on squatting and hinging", () => {
      expect(names(quest(["squat", "hinge", "core"]))).toContain("Glute Bridge");
      expect(names(quest(["squat", "squat"]))).toContain("Glute Bridge");
    });

    it("leaves the hips alone when a single squat is incidental", () => {
      // One movement of a family is not what the session is about, and should not redirect it.
      const built = names(quest(["squat", "push_horizontal", "core"]));
      expect(built).not.toContain("Lunge");
    });

    it("prepares the scapula when the session is built on pulling", () => {
      expect(names(quest(["pull_vertical", "pull_horizontal", "core"]))).toContain(
        "Scapular Pull-Up",
      );
    });

    it("prepares several families when the session emphasises several", () => {
      const built = names(longQuest(["squat", "hinge", "pull_vertical", "pull_horizontal"]));

      expect(built).toContain("Glute Bridge");
      expect(built).toContain("Scapular Pull-Up");
    });
  });

  describe("wrists", () => {
    it("prepares the wrists before any vertical pressing", () => {
      // Handstand Push-Up, Pike Push-Up and L-Sit loaded wrists that nothing had touched. One is
      // enough: this is a safety step, not a matter of what the session is mostly about.
      expect(names(quest(["push_vertical", "core", "squat"]))).toContain("Wrist Circles");
    });

    it("prepares the wrists for any skill quest, whatever it contains", () => {
      expect(names(quest(["core", "core"], "skill"))).toContain("Wrist Circles");
    });

    it("does not prepare wrists for a session that never loads them", () => {
      expect(names(quest(["squat", "hinge", "core"], "strength"))).not.toContain("Wrist Circles");
    });

    it("keeps the wrist step even on the shortest possible warm-up", () => {
      // Outside the budget on purpose: a short quest must shorten some other phase, never this.
      const shortest = quest(["push_vertical"], "skill", {
        rounds: 1,
        reps: 5,
        restSeconds: 10,
      });
      const built = names(shortest);

      expect(built).toContain("Wrist Circles");
      expect(built).toHaveLength(5);
    });

    it("places the wrists after activation and before the work-specific movement", () => {
      const built = names(longQuest(["push_vertical", "core"], "skill"));
      const at = built.indexOf("Wrist Circles");

      expect(at).toBeGreaterThan(0);
      expect(at).toBe(built.length - 2);
    });
  });

  it("keeps the shipped fallback sequence usable as a four-step warm-up", () => {
    expect(WARMUP_SEQUENCE).toHaveLength(4);
    for (const s of WARMUP_SEQUENCE) expect(s.seconds).toBeGreaterThan(0);
    for (const hold of STATIC_HOLDS) {
      expect(WARMUP_SEQUENCE.map((s) => s.exerciseName)).not.toContain(hold);
    }
  });
});

/**
 * The one quest that gets no warm-up. Eight indoor steps before a walk is the wrong protocol and
 * the wrong story; an outing warms up by leaving.
 */
test("an outing has no warm-up", () => {
  expect(buildWarmup(quest(["locomotion"], "metabolic", { style: "expedition" }))).toEqual([]);
});
