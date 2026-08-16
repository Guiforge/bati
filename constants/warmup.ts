import { estimateQuestSeconds } from "@/db/estimate";
import type { MovementPattern, QuestArchetype } from "@/db/schema";
import type { Target } from "@/db/targets";

/**
 * The dynamic warm-up played before the first exercise of a session.
 *
 * The warm-up is the one part of a session with real evidence behind it for injury risk, and the
 * app claimed one for a long time without running it: the 3-second countdown told the hero
 * "warm-up done". Now it runs one.
 *
 * Three rules come from `docs/raw/bodyweight-app-research.md`, and each one used to be broken:
 *
 * 1. **Length follows the session.** The literature describes 5–10 min (§1). A flat five minutes
 *    in front of a six-minute quest is a warm-up nobody does twice, so the length is derived from
 *    the quest's own estimated duration instead of fixed — four steps before the shortest quest,
 *    ten before the longest, ~25 % of the session either way.
 * 2. **Dynamic before, static after** (§11). Static holds — Pigeon Pose, Standing Forward Fold,
 *    Warrior Pose, Cobra Stretch — are deliberately absent from every pool below. They are the
 *    *content* of the mobility quests, which is where held stretching belongs.
 * 3. **Variety is a motivation lever** (§3, Baz-Valle 2019), so movements rotate on the hero's
 *    session count rather than being the same four every time.
 *
 * Movements are drawn from the seeded catalogue by name, so they arrive with their own bilingual
 * labels and art and there is no second kind of content to maintain.
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
 * The four RAMP phases, in the order they are always played: raise the temperature, take the
 * joints through range, wake the patterns the session is about to use, then one movement close to
 * the real work. Intensity climbs across the sequence — that ordering is the protocol, not a
 * preference, and no budget below is allowed to reorder it.
 */
const RAISE = [
  "Jumping Jack",
  "High Knees",
  "Star Jump",
  "Skater Hop",
  "Mountain Climber",
] as const;
const MOBILISE = [
  "Cat-Cow",
  "Thread the Needle",
  "World's Greatest Stretch",
  "Downward Dog",
] as const;
const ACTIVATE = [
  "Glute Bridge",
  "Dead Bug",
  "Superman",
  "Scapular Pull-Up",
  "Wall Push-Up",
  "Bear Crawl",
] as const;

/**
 * `Jump Squat` leads and appears in no other phase, which is what guarantees the last phase can
 * always fill: `RAISE` takes at most two of its five, so at least one name here survives the
 * no-repeat rule even for a quest whose patterns say nothing.
 */
const POTENTIATE = ["Jump Squat", "High Knees", "Mountain Climber", "Star Jump"] as const;

/**
 * Wrist and forearm preparation. Non-optional on the branches that need it: hand-balancing and
 * vertical pressing load wrists and elbows far beyond what the muscles feel, connective tissue
 * adapts more slowly than muscle, and wrist/elbow overuse is the classic failure mode. See
 * `docs/raw/bodyweight-app-research.md` §8.3 and §8.6.4.
 */
const WRISTS = step("Wrist Circles");

/** What a quest gets when nothing is known about it — and what every quest got before `0024`. */
export const WARMUP_SEQUENCE: [WarmupStep, ...WarmupStep[]] = [
  // `as const` above makes these tuples, so index 0 is known to exist: no fallback branch.
  step(RAISE[0]),
  step(MOBILISE[0]),
  step(ACTIVATE[0]),
  step(POTENTIATE[0]),
];

type Family = "lower" | "pull" | "push" | "core";

/** Order matters: a quest that emphasises several families prepares them in this order. */
const FAMILIES: Family[] = ["lower", "pull", "push", "core"];

const FAMILY_PATTERNS: Record<Family, MovementPattern[]> = {
  lower: ["squat", "hinge"],
  pull: ["pull_horizontal", "pull_vertical"],
  push: ["push_horizontal", "push_vertical"],
  core: ["core"],
};

/**
 * What an emphasised family adds to the front of a phase pool. A prefix rather than a swap: the
 * specific movement is picked first, and the rest of the pool still supplies the variety.
 */
const ACTIVATE_BY_FAMILY: Partial<Record<Family, string[]>> = {
  lower: ["Glute Bridge", "Lunge"],
  pull: ["Scapular Pull-Up", "Superman"],
  push: ["Wall Push-Up", "Bear Crawl"],
};

const POTENTIATE_BY_FAMILY: Record<Family, string[]> = {
  lower: ["Jump Squat", "Lunge"],
  pull: ["Inverted Row", "Table Row"],
  push: ["Push-ups", "Wall Push-Up"],
  core: ["Dead Bug", "Bicycle Crunch"],
};

/**
 * Every movement a warm-up can ever prescribe, whatever the quest or the session count.
 *
 * These are resolved against the seeded catalogue by name at render time, so a rename or a merge
 * (`0023` did both) degrades a step to an English label and a placeholder image instead of
 * failing. `content-invariants` sweeps this list — which is why it is one export rather than a
 * test that has to guess which branches exist.
 */
/** @legacy Pool de mouvements exporté pour ses tests ; `buildWarmup` est le seul lecteur. */
export const WARMUP_MOVEMENTS: string[] = [
  ...new Set([
    ...RAISE,
    ...MOBILISE,
    ...ACTIVATE,
    ...POTENTIATE,
    ...Object.values(ACTIVATE_BY_FAMILY).flat(),
    ...Object.values(POTENTIATE_BY_FAMILY).flat(),
    WRISTS.exerciseName,
  ]),
];

/**
 * How many steps each phase gets, per total. A table rather than a distribution rule: seven rows
 * are read at a glance and cannot round the last phase away to nothing.
 */
const PHASE_BUDGET: Record<number, [number, number, number, number]> = {
  4: [1, 1, 1, 1],
  5: [1, 2, 1, 1],
  6: [1, 2, 2, 1],
  7: [2, 2, 2, 1],
  8: [2, 2, 3, 1],
  9: [2, 3, 3, 1],
  10: [2, 3, 3, 2],
};

const MIN_STEPS = 4;
const MAX_STEPS = 10;

/** Share of the session the warm-up is allowed to take. Keeps a long quest under five minutes. */
const WARMUP_SHARE = 0.25;

export type WarmupQuest = {
  archetype: QuestArchetype | null;
  rounds: number;
  restSeconds: number;
  exercises: {
    exercise: { pattern: MovementPattern | null; secondsPerRep: number };
    target: Target;
  }[];
};

/** Two of a family is an emphasis; one is incidental and should not redirect the warm-up. */
const EMPHASIS = 2;

/**
 * Steps taken from `pool`, starting at `offset` and skipping anything already used.
 *
 * The offset is what makes two consecutive sessions differ, and the shared `used` set is what
 * stops a movement appearing twice in one warm-up — `Wall Push-Up` sits in both the activation
 * and potentiation pools for a pressing quest, and doing it twice in four minutes prepares
 * nothing it did not already prepare.
 */
function take(
  pool: readonly string[],
  count: number,
  offset: number,
  used: Set<string>,
): WarmupStep[] {
  const picked: WarmupStep[] = [];

  // Rotate first, then iterate: indexing with `(offset + i) % length` is always in range, but
  // saying so to the type checker costs a branch no test can reach.
  const start = pool.length > 0 ? offset % pool.length : 0;
  for (const name of [...pool.slice(start), ...pool.slice(0, start)]) {
    if (picked.length >= count) break;
    if (used.has(name)) continue;
    used.add(name);
    picked.push(step(name));
  }

  return picked;
}

function dedupe(names: string[]): string[] {
  return [...new Set(names)];
}

/**
 * How long the warm-up should run, in steps.
 *
 * `estimateQuestSeconds` is the same estimate the quest cards show, so the warm-up can never
 * claim a proportion of a duration the rest of the app disagrees with.
 */
function stepCount(quest: WarmupQuest): number {
  const seconds = estimateQuestSeconds(quest);

  // An exercise missing `secondsPerRep` — a user-authored row, a partially hydrated quest —
  // makes the estimate NaN, and NaN survives both `Math.round` and `Math.max` to index the
  // budget table with nothing. The warm-up is the very first thing `startSession` builds, so
  // that threw before the session existed: no quest, no countdown, no way back. An unmeasurable
  // quest gets the shortest warm-up instead.
  if (!Number.isFinite(seconds)) return MIN_STEPS;

  const raw = Math.round((seconds * WARMUP_SHARE) / STEP_SECONDS);
  return Math.min(MAX_STEPS, Math.max(MIN_STEPS, raw));
}

/**
 * The warm-up for one quest: four phases of climbing intensity, filled by what the session is
 * about to load, at a length proportional to it.
 *
 * A warm-up prepares the movements that follow it, and a fixed sequence cannot. A squat day was
 * spending its upper-body slot on a bear crawl while a pull day got no scapular preparation at
 * all — and every vertical-pressing quest (Handstand Push-Up, Pike Push-Up, L-Sit) loaded wrists
 * that nothing had touched.
 *
 * `sessionCount` only rotates the choice within each phase. It never changes the length, the
 * order, or whether the wrist step is present — a hero's tenth session is not a different
 * protocol from their first.
 *
 * A quest whose exercises carry no pattern — user-authored content, where the column is nullable
 * on purpose — matches no family and falls through to the default pools.
 */
export function buildWarmup(quest: WarmupQuest, sessionCount = 0): WarmupStep[] {
  const patterns = quest.exercises
    .map((qex) => qex.exercise.pattern)
    .filter((p): p is MovementPattern => p != null);

  const emphasised = FAMILIES.filter(
    (family) => patterns.filter((p) => FAMILY_PATTERNS[family].includes(p)).length >= EMPHASIS,
  );

  const activatePool = dedupe([
    ...emphasised.flatMap((family) => ACTIVATE_BY_FAMILY[family] ?? []),
    ...ACTIVATE,
  ]);
  // One family potentiates: this phase is the single movement closest to the real work, so the
  // most emphasised pattern wins rather than every pattern getting a turn.
  const potentiatePool = dedupe([
    ...(emphasised[0] ? POTENTIATE_BY_FAMILY[emphasised[0]] : []),
    ...POTENTIATE,
  ]);

  // stepCount() only ever returns a key of PHASE_BUDGET; the index signature does not know it.
  const [raise, mobilise, activate, potentiate] = PHASE_BUDGET[stepCount(quest)] ?? [1, 1, 1, 1];
  const offset = Math.max(0, Math.trunc(sessionCount));
  const used = new Set<string>();

  // Wrists go after activation and before the work-specific movement — closest to what is about
  // to load them. Outside the budget on purpose: it is a safety step, so a short quest shortens
  // every other phase before it drops this one.
  const needsWrists = quest.archetype === "skill" || patterns.includes("push_vertical");

  return [
    ...take(RAISE, raise, offset, used),
    ...take(MOBILISE, mobilise, offset, used),
    ...take(activatePool, activate, offset, used),
    ...(needsWrists ? [WRISTS] : []),
    ...take(potentiatePool, potentiate, offset, used),
  ];
}
