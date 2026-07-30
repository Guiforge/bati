import type { MovementPattern, QuestArchetype } from "@/db/schema";

/**
 * The dynamic warm-up played before the first exercise of a session.
 *
 * The warm-up is the one part of a session with real evidence behind it for injury risk, and the
 * app claimed one for a long time without running it: the 3-second countdown told the hero
 * "warm-up done". Now it runs one.
 *
 * Two minutes, not the five to ten the literature describes: a five-minute warm-up in front of a
 * twelve-minute quest is a warm-up nobody does twice. Movements are drawn from the seeded
 * catalogue by name, so they arrive with their own bilingual labels and art and there is no
 * second kind of content to maintain — and they are dynamic rather than static holds, which is
 * what the evidence actually supports before effort.
 *
 * Nothing here is journaled: no results, no volume, no personal records, no boss damage. A
 * warm-up is preparation, not work.
 */
export type WarmupStep = {
  /** Matches `Exercise.enName` in the seeded catalogue. */
  exerciseName: string;
  seconds: number;
};

const STEP_SECONDS = 30;

const step = (exerciseName: string): WarmupStep => ({ exerciseName, seconds: STEP_SECONDS });

/**
 * The shape every warm-up keeps: raise the temperature, prepare the hips, prepare the shoulders,
 * open the spine. `buildWarmup` only swaps *which movement fills a slot* — the order and the
 * purpose of the four are fixed, so no quest can end up with a warm-up that skips a region.
 */
const PULSE = step("Jumping Jack"); // raise temperature and heart rate
const SPINE = step("Cobra Stretch"); // open the front, extend the spine

const LOWER_DEFAULT = step("Glute Bridge"); // wake the hips before anything loads them
const LOWER_DEEP = step("World's Greatest Stretch"); // hip flexor, adductor, ankle — for squatting

const UPPER_DEFAULT = step("Bear Crawl"); // shoulders, core, coordination
const UPPER_PULL = step("Thread the Needle"); // thoracic rotation and scapula, before rowing

/**
 * Wrist and forearm preparation. Non-optional on the branches that need it: hand-balancing and
 * vertical pressing load wrists and elbows far beyond what the muscles feel, connective tissue
 * adapts more slowly than muscle, and wrist/elbow overuse is the classic failure mode. See
 * `docs/raw/bodyweight-app-research.md` §8.3 and §8.6.4.
 */
const WRISTS = step("Wrist Circles");

/** What a quest gets when nothing is known about it — and what every quest got before `0024`. */
export const WARMUP_SEQUENCE: WarmupStep[] = [PULSE, LOWER_DEFAULT, UPPER_DEFAULT, SPINE];

export type WarmupQuest = {
  archetype: QuestArchetype | null;
  exercises: { exercise: { pattern: MovementPattern | null } }[];
};

/** Two of a family is an emphasis; one is incidental and should not redirect the warm-up. */
const EMPHASIS = 2;

/**
 * The warm-up for one quest: the same four slots, filled by what the session is about to load.
 *
 * A warm-up prepares the movements that follow it, and a fixed sequence cannot. A squat day was
 * spending its upper-body slot on a bear crawl while a pull day got no scapular preparation at
 * all — and every vertical-pressing quest (Handstand Push-Up, Pike Push-Up, L-Sit) loaded wrists
 * that nothing had touched. Two substitutions and one insertion cover that, with no second
 * sequence to maintain.
 *
 * A quest whose exercises carry no pattern — user-authored content, where the column is nullable
 * on purpose — falls through every rule and gets `WARMUP_SEQUENCE` unchanged.
 */
export function buildWarmup(quest: WarmupQuest): WarmupStep[] {
  const patterns = quest.exercises
    .map((qex) => qex.exercise.pattern)
    .filter((p): p is MovementPattern => p != null);

  const count = (family: MovementPattern[]) => patterns.filter((p) => family.includes(p)).length;

  const lower = count(["squat", "hinge"]) >= EMPHASIS ? LOWER_DEEP : LOWER_DEFAULT;
  const upper =
    count(["pull_horizontal", "pull_vertical"]) >= EMPHASIS ? UPPER_PULL : UPPER_DEFAULT;

  // Wrists go last before the spine — closest to the work about to load them. One vertical push
  // is enough: unlike an emphasis, this is a safety step, not a matter of what the session is
  // mostly about.
  const needsWrists = quest.archetype === "skill" || patterns.includes("push_vertical");

  return needsWrists ? [PULSE, lower, upper, WRISTS, SPINE] : [PULSE, lower, upper, SPINE];
}
