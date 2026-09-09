import type { Exercise } from "@/db/exercises";
import type { DifficultyCode, ExerciseStyle, Locomotion } from "@/db/schema";
import { computeSessionXp, estimateQuestXp, MAX_SESSION_XP, type XpSet } from "@/db/xp";

/** A movement as both entry points read one: `estimateQuestXp` also needs how it covers ground. */
type Movement = XpSet["exercise"] & Pick<Exercise, "locomotion">;

const MEDIUM: Movement = {
  secondsPerRep: 3,
  difficulty: "medium",
  style: "strength",
  locomotion: null,
};

const movement = (
  difficulty: DifficultyCode,
  secondsPerRep = 3,
  style: ExerciseStyle = "strength",
  locomotion: Locomotion | null = null,
): Movement => ({
  secondsPerRep,
  difficulty,
  style,
  locomotion,
});

/** One rep-based set: what was asked, what was done. Default tempo, so 1 rep ≈ 1 XP. */
function reps(target: number, result = target, exercise = MEDIUM): XpSet {
  return {
    exercise,
    target: { type: "reps", value: target },
    result: { type: "reps", value: result },
  };
}

function hold(target: number, result = target, exercise = MEDIUM): XpSet {
  return {
    exercise,
    target: { type: "time", value: target },
    result: { type: "time", value: result },
  };
}

/** A plausible session: 15 sets of 12 reps, 540 seconds of effort. */
const HONEST_SETS = Array.from({ length: 15 }, () => reps(12));
const HONEST_ELAPSED = 30 * 60;

/**
 * A session's ground, as `computeSessionXp` receives it: already one leg, already bounded by
 * its witness. `stores/session.ts` does both, because it is the only place that holds the
 * results and the GPS trace at once — the same division that already makes the caller compute
 * `effortCeilingSeconds`.
 */
const outing = (
  seconds: number,
  locomotion: Locomotion,
  prior = 0,
  userLevel: DifficultyCode = "medium",
) =>
  computeSessionXp({
    sets: [],
    effortCeilingSeconds: 0,
    outing: { seconds, locomotion },
    priorOutingSecondsToday: prior,
    userLevel,
  });

/** The same total ground, cut into `chunks` sessions across one day. */
function overOneDay(chunks: number, totalSeconds: number, locomotion: Locomotion): number {
  const each = totalSeconds / chunks;
  let prior = 0;
  let earned = 0;
  for (let i = 0; i < chunks; i++) {
    earned += outing(each, locomotion, prior);
    prior += each;
  }
  return earned;
}

/**
 * What a minute outside is worth, and the two things that stop it being worth more than a
 * session of training: the day's decay, and a floor that cannot be used to walk around it.
 *
 * The complaint this answers, from a tester in September 2026: a six-hour hike took him to
 * level 5 on a journal holding three short real sessions. It paid 2000 XP, which was the game's
 * per-session ceiling, reached in 2 h 05 of walking and by nothing else — the best quest in the
 * catalogue pays 383 at its targets.
 */
describe("the ground a session covered", () => {
  test("an hour is worth its rate, and nothing about the hero changes it", () => {
    expect(outing(3600, "walk")).toBe(300);
    expect(outing(3600, "ride")).toBe(300);
    expect(outing(3600, "run")).toBe(600);

    // No level multiplier out here. A walk is neither easy nor hard, it is a walk.
    expect(outing(3600, "walk", 0, "easy")).toBe(300);
    expect(outing(3600, "walk", 0, "hard")).toBe(300);
  });

  test("a ride is not worth more than a walk, because the phone cannot tell them apart", () => {
    // The mounted speed cap is 90 km/h, so an hour on a motorway credits an hour of moving time.
    // Paying that above an hour of real walking inverts the one thing the trace does know.
    expect(outing(3600, "ride")).toBe(outing(3600, "walk"));
    expect(outing(3600, "run")).toBeGreaterThan(outing(3600, "ride"));
  });

  test("what each way out pays, at the durations the catalogue suggests and past them", () => {
    expect(outing(30 * 60, "walk")).toBe(150);
    expect(outing(45 * 60, "walk")).toBe(225);
    expect(outing(2 * 3600, "walk")).toBe(450);
    expect(outing(6 * 3600, "walk")).toBe(750);
    expect(outing(45 * 60, "ride")).toBe(225);
    expect(outing(30 * 60, "run")).toBe(300);
    expect(outing(2 * 3600, "run")).toBe(900);
  });

  test("going on is worth less per minute and never worth nothing", () => {
    const first = outing(3600, "walk");
    const second = outing(3600, "walk", 3600);
    const tenth = outing(3600, "walk", 9 * 3600);

    expect(second).toBe(first / 2);
    expect(tenth).toBe(first / 4);
    expect(tenth).toBeGreaterThan(0);
  });

  test("the decay belongs to the day, so stopping and starting buys nothing", () => {
    const whole = outing(6 * 3600, "walk");
    expect(whole).toBe(750);

    // Per session this paid 1800 for the six hours worth 750, by pressing stop and start. The
    // remaining spread is one `Math.round` per session and nothing else, so it is a tolerance
    // rather than an equality — and at a fine grain it rounds *down*, never up.
    for (const chunks of [2, 3, 6, 12, 45]) {
      expect(overOneDay(chunks, 6 * 3600, "walk")).toBeGreaterThan(whole * 0.97);
      expect(overOneDay(chunks, 6 * 3600, "walk")).toBeLessThan(whole * 1.01);
    }
  });

  test("the floor does not apply to the day's second outing, or it is the way around the decay", () => {
    // A minute of walking is 1.25 XP. Floored to 10 it was an eightfold uplift, and 120 of them
    // paid 1200 against 450 for the same two hours in one piece — the decay undone by the one
    // rule it could not see.
    expect(outing(60, "walk")).toBe(10);
    expect(outing(60, "walk", 3600)).toBeLessThan(10);
    expect(overOneDay(120, 2 * 3600, "walk")).toBeLessThan(outing(2 * 3600, "walk") * 1.1);
  });

  test("a workout still floors, whatever the hero did outside first", () => {
    expect(
      computeSessionXp({
        sets: [reps(1)],
        effortCeilingSeconds: 5,
        priorOutingSecondsToday: 6 * 3600,
        userLevel: "medium",
      }),
    ).toBe(10);
  });

  test("a mixed session prices each leg in its own unit", () => {
    // Ten minutes of walking, then a set of push-ups. The walk is not worth a movement's
    // difficulty weight and the push-ups are not worth a walk's rate.
    const both = computeSessionXp({
      sets: HONEST_SETS,
      effortCeilingSeconds: HONEST_ELAPSED,
      outing: { seconds: 600, locomotion: "walk" },
      userLevel: "medium",
    });
    const setsOnly = computeSessionXp({
      sets: HONEST_SETS,
      effortCeilingSeconds: HONEST_ELAPSED,
      userLevel: "medium",
    });

    expect(both - setsOnly).toBe(outing(600, "walk"));
  });

  test("a hold that is not an outing is still held to its prescription", () => {
    const plank = movement("medium", 3, "calisthenics");
    const overrun = computeSessionXp({
      sets: [hold(60, 3600, plank)],
      effortCeilingSeconds: 3600,
      userLevel: "medium",
    });
    const asked = computeSessionXp({
      sets: [hold(60, 60, plank)],
      effortCeilingSeconds: 60,
      userLevel: "medium",
    });

    // 1.25 and no more: a phone face-up on a plank must not declare an hour.
    expect(overrun / asked).toBeCloseTo(1.25, 1);
  });
});

describe("db/xp", () => {
  test("no session is wasted — there is always a floor", () => {
    expect(computeSessionXp({ sets: [], effortCeilingSeconds: 0, userLevel: "medium" })).toBe(10);
    expect(
      computeSessionXp({ sets: [reps(1)], effortCeilingSeconds: 5, userLevel: "medium" }),
    ).toBe(10);
  });

  test("pays for the effort a session contained", () => {
    // 15 sets × 12 reps × 3s = 540s of effort, at one XP per three seconds.
    expect(
      computeSessionXp({
        sets: HONEST_SETS,
        effortCeilingSeconds: HONEST_ELAPSED,
        userLevel: "medium",
      }),
    ).toBe(180);
  });

  /**
   * The bug as reported: "a 300 minute break gives me a lot of XP".
   *
   * Elapsed time is a ceiling on how much effort could have been real, never a source of XP. A
   * session left open for three hours pays exactly what the same work paid in twenty minutes —
   * under the old `durationSeconds / 5` it paid 2160.
   */
  test("waiting earns nothing: the same work pays the same after three hours", () => {
    const brisk = computeSessionXp({
      sets: HONEST_SETS,
      effortCeilingSeconds: 20 * 60,
      userLevel: "medium",
    });
    const abandoned = computeSessionXp({
      sets: HONEST_SETS,
      effortCeilingSeconds: 3 * 60 * 60,
      userLevel: "medium",
    });

    expect(abandoned).toBe(brisk);
    expect(abandoned).toBe(180);
  });

  /**
   * The regression the first draft of this fix would have shipped.
   *
   * Paying for declared work and nothing else made tapping fifty sets through in twenty seconds
   * worth full price — closing "wait five hours" by opening something nine hundred times cheaper.
   * Effort cannot exceed the window it happened in.
   */
  test("a session tapped through in twenty seconds is worth twenty seconds", () => {
    expect(
      computeSessionXp({ sets: HONEST_SETS, effortCeilingSeconds: 20, userLevel: "medium" }),
    ).toBe(10);
  });

  /**
   * A hold's result *is* a clock — `ActiveExerciseView` records elapsed seconds and overtime is
   * unbounded — so a phone left face-up on a 30s plank declares two hours without anyone lying.
   * Reps are typed by a hero who is present; holds are not, so they get no decaying tail.
   */
  test("a hold left running is credited at its target, not at its clock", () => {
    const honest = computeSessionXp({
      sets: [hold(30)],
      effortCeilingSeconds: 60,
      userLevel: "medium",
    });
    const abandoned = computeSessionXp({
      sets: [hold(30, 2 * 60 * 60)],
      effortCeilingSeconds: 2 * 60 * 60,
      userLevel: "medium",
    });

    expect(honest).toBe(10);
    expect(abandoned).toBe(13); // the +25% allowance, and not one second more
  });

  test("beating a target pays, then resists — it never stops paying", () => {
    const met = computeSessionXp({
      sets: [reps(12)],
      effortCeilingSeconds: 300,
      userLevel: "medium",
    });
    const beaten = computeSessionXp({
      sets: [reps(12, 15)],
      effortCeilingSeconds: 300,
      userLevel: "medium",
    });
    const doubled = computeSessionXp({
      sets: [reps(12, 24)],
      effortCeilingSeconds: 300,
      userLevel: "medium",
    });

    expect(met).toBe(12);
    expect(beaten).toBe(15); // +25%, paid in full
    expect(doubled).toBe(17); // twice the reps, well short of twice the XP — but still more
    expect(doubled).toBeGreaterThan(beaten);
  });

  test("a harder movement is worth more per second than an easier one", () => {
    const ceiling = 60 * 60;
    const sets = (difficulty: "easy" | "medium" | "hard") =>
      Array.from({ length: 10 }, () => reps(12, 12, movement(difficulty)));

    expect(
      computeSessionXp({ sets: sets("easy"), effortCeilingSeconds: ceiling, userLevel: "medium" }),
    ).toBe(96);
    expect(
      computeSessionXp({
        sets: sets("medium"),
        effortCeilingSeconds: ceiling,
        userLevel: "medium",
      }),
    ).toBe(120);
    expect(
      computeSessionXp({ sets: sets("hard"), effortCeilingSeconds: ceiling, userLevel: "medium" }),
    ).toBe(300);
  });

  /**
   * At `DIFFICULTY_WEIGHT.hard = 2.5` the two quantities diverge badly, so the order matters: the
   * ceiling bounds *physical* seconds, the weight prices them. Weighting first would clip every
   * honest session of hard movements against its own clock.
   */
  test("the ceiling bounds real seconds, not what they were worth", () => {
    // 10 × 12 reps × 3s = 360 real seconds of hard work, inside a ten-minute window.
    const sets = Array.from({ length: 10 }, () => reps(12, 12, movement("hard")));

    expect(computeSessionXp({ sets, effortCeilingSeconds: 10 * 60, userLevel: "medium" })).toBe(
      300,
    );

    // Halve the window below what the work needed and the credit halves with it — it neither
    // collapses to the clock nor survives untouched.
    expect(computeSessionXp({ sets, effortCeilingSeconds: 150, userLevel: "medium" })).toBe(150);
  });

  test("the hero's chosen level still scales the reward", () => {
    const sets = Array.from({ length: 10 }, () => reps(12));
    const at = (userLevel: "easy" | "medium" | "hard") =>
      computeSessionXp({ sets, effortCeilingSeconds: 60 * 60, userLevel });

    expect(at("easy")).toBe(108);
    expect(at("medium")).toBe(120);
    expect(at("hard")).toBe(144);
  });

  /**
   * The other regression the first draft would have shipped: a per-quest cap of `nominal × 1.25`,
   * where every factor of `nominal` is typed in by the hero. Ten rounds × five exercises × 999
   * reps has a "nominal" of fifty thousand, and that draft would have paid 62 437 XP for it —
   * twenty times the exploit it was written to close. `MAX_SESSION_XP` is the only bound no
   * input can raise.
   */
  test("a hero-authored monster quest is bounded by the one cap no input can raise", () => {
    const monster = {
      rounds: 10,
      exercises: Array.from({ length: 5 }, () => ({
        exercise: MEDIUM,
        target: { type: "reps" as const, value: 999 },
      })),
    };

    expect(estimateQuestXp(monster, "medium")).toBe(MAX_SESSION_XP);

    // And performed rather than previewed, over a four-hour session.
    const performed = Array.from({ length: 50 }, () => reps(999));
    expect(
      computeSessionXp({
        sets: performed,
        effortCeilingSeconds: 4 * 60 * 60,
        userLevel: "hard",
      }),
    ).toBe(MAX_SESSION_XP);
  });

  /**
   * `docs/gameplay/progression.md` designs the 10-15 minute mobility session as a retention
   * mechanic: low-fatigue by design, done on a day the hero should not train hard, and it still
   * lights the flame. A formula that pays for effort could have quietly killed it. Holds convert
   * second for second, so it gains instead — 204 against the 180 the old clock paid.
   */
  test("a mobility session does not lose by the change", () => {
    const sets = Array.from({ length: 16 }, () => hold(45, 45, movement("easy")));

    expect(
      computeSessionXp({ sets, effortCeilingSeconds: 15 * 60, userLevel: "medium" }),
    ).toBeGreaterThan(180);
  });

  test("estimateQuestXp advertises the allowance, and reads no rest column", () => {
    const quest = {
      rounds: 3,
      exercises: Array.from({ length: 4 }, () => ({
        exercise: MEDIUM,
        target: { type: "reps" as const, value: 12 },
      })),
    };

    // 3 × 4 × 12 reps = 144 XP met exactly, 180 with the full +25% the chip advertises.
    expect(estimateQuestXp(quest, "medium")).toBe(180);
    expect(
      computeSessionXp({
        sets: Array.from({ length: 12 }, () => reps(12)),
        effortCeilingSeconds: 60 * 60,
        userLevel: "medium",
      }),
    ).toBe(144);
  });
});
