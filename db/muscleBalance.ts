import { and, count, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { MUSCLE_LABELS } from "./muscles";
import { isMovementPattern, PATTERN_LABELS, PULL_PATTERNS, PUSH_PATTERNS } from "./patterns";
import { shortLivedQuery } from "./queryCache";
import { getEligibleQuestIds } from "./quests";
import { type MovementPattern, type MuscleCode, movementPatterns, muscleCodes } from "./schema";
import { toRepEquivalent } from "./workUnits";

const { completedQuest, completedExercises, exercises, exerciseMuscles, quests, questExercises } =
  schema;

export type BalancePeriod = "7d" | "30d" | "90d" | "all";

const PERIOD_DAYS: Record<Exclude<BalancePeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Start of the window, shared by both balance views so they can never drift apart. */
function periodStart(period: BalancePeriod, now = new Date()): Date {
  if (period === "all") return new Date(0); // Unix epoch
  return new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);
}

export type MuscleVolume = {
  muscle: MuscleCode;
  label: { en: string; fr: string };
  volume: number; // Total work units — seconds converted to rep-equivalents (./workUnits)
  percentage: number; // Percentage of total training
  sessionCount: number; // Number of sessions that included this muscle
};

export type MuscleBalance = {
  period: BalancePeriod;
  startDate: Date;
  endDate: Date;
  totalVolume: number;
  totalSessions: number;
  muscles: MuscleVolume[];
  weakAreas: MuscleCode[]; // Muscles below average
  strongAreas: MuscleCode[]; // Muscles above average
  /**
   * Results whose exercise carries no muscle tag — hero-authored movements where the hero left
   * the editor's fold closed. The join above is an inner one, so they are in no bar and in no
   * total. The card prints this rather than reporting a smaller number and looking confident
   * about it: a screen that cannot know must not assert.
   */
  unclassifiedResults: number;
};

/**
 * Calculate muscle balance based on workout history.
 * Returns volume per muscle group and identifies weak/strong areas.
 */
export function getMuscleBalance(period: BalancePeriod = "30d"): Promise<MuscleBalance> {
  // Dedupes the journal-open burst: the balance card and the suggested-quests pipeline
  // both run this 4-table join within the same mount.
  return shortLivedQuery(`muscleBalance:${period}`, () => computeMuscleBalance(period));
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Muscle balance analysis requires aggregating and comparing multiple muscle groups
async function computeMuscleBalance(period: BalancePeriod = "30d"): Promise<MuscleBalance> {
  const endDate = new Date();
  const startDate = periodStart(period, endDate);

  // Get all completed exercises with their muscles in the time period
  const whereClause = period === "all" ? undefined : gte(completedQuest.performedAt, startDate);

  const rows = await db
    .select({
      sessionId: completedQuest.id,
      exerciseId: completedExercises.exerciseId,
      resultValue: completedExercises.resultValue,
      resultType: completedExercises.resultType,
      muscle: exerciseMuscles.muscle,
      performedAt: completedQuest.performedAt,
      style: exercises.style,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, sql`${completedExercises.sessionId} = ${completedQuest.id}`)
    .innerJoin(exercises, sql`${exercises.id} = ${completedExercises.exerciseId}`)
    .innerJoin(exerciseMuscles, sql`${exerciseMuscles.exerciseId} = ${exercises.id}`)
    .where(whereClause)
    .orderBy(desc(completedQuest.performedAt));

  // The same window, over the results the join above cannot see: an exercise with no muscle row.
  const unclassified = await db
    .select({ n: count() })
    .from(completedQuest)
    .innerJoin(completedExercises, sql`${completedExercises.sessionId} = ${completedQuest.id}`)
    .innerJoin(exercises, sql`${exercises.id} = ${completedExercises.exerciseId}`)
    .leftJoin(exerciseMuscles, sql`${exerciseMuscles.exerciseId} = ${exercises.id}`)
    .where(
      whereClause
        ? and(whereClause, isNull(exerciseMuscles.muscle))
        : isNull(exerciseMuscles.muscle),
    );

  // Aggregate volume by muscle
  const muscleVolumes = new Map<MuscleCode, { volume: number; sessions: Set<number> }>();

  // Initialize all muscles with 0
  for (const muscle of muscleCodes) {
    muscleVolumes.set(muscle, { volume: 0, sessions: new Set() });
  }

  // Count unique sessions
  const allSessions = new Set<number>();

  for (const row of rows) {
    if (!row.muscle) continue;
    const muscle = row.muscle as MuscleCode;
    const data = muscleVolumes.get(muscle);
    if (data) {
      data.volume += toRepEquivalent(row.resultValue, row.resultType, row.style);
      data.sessions.add(row.sessionId);
    }
    allSessions.add(row.sessionId);
  }

  // Calculate total volume and build result
  let totalVolume = 0;
  for (const [, data] of muscleVolumes) {
    totalVolume += data.volume;
  }

  const muscleResults: MuscleVolume[] = [];
  for (const muscle of muscleCodes) {
    const data = muscleVolumes.get(muscle);
    if (!data) continue;
    muscleResults.push({
      muscle,
      label: MUSCLE_LABELS[muscle],
      volume: data.volume,
      percentage: totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0,
      sessionCount: data.sessions.size,
    });
  }

  // Sort by volume descending
  muscleResults.sort((a, b) => b.volume - a.volume);

  // Identify weak and strong areas
  // A balanced distribution would be ~16.7% per muscle (6 muscles)
  const idealPercentage = 100 / muscleCodes.length;
  const weakThreshold = idealPercentage * 0.5; // Less than 50% of ideal
  const strongThreshold = idealPercentage * 1.5; // More than 150% of ideal

  const weakAreas: MuscleCode[] = [];
  const strongAreas: MuscleCode[] = [];

  for (const m of muscleResults) {
    if (m.percentage < weakThreshold && totalVolume > 0) {
      weakAreas.push(m.muscle);
    } else if (m.percentage > strongThreshold && totalVolume > 0) {
      strongAreas.push(m.muscle);
    }
  }

  return {
    period,
    startDate,
    endDate,
    totalVolume,
    totalSessions: allSessions.size,
    muscles: muscleResults,
    weakAreas,
    strongAreas,
    unclassifiedResults: unclassified[0]?.n ?? 0,
  };
}

/**
 * Get suggested muscles to focus on based on training history.
 * Returns muscles that are undertrained relative to others.
 */
export async function getSuggestedFocusAreas(limit = 2): Promise<MuscleCode[]> {
  const balance = await getMuscleBalance("30d");

  // If no training history, return empty
  if (balance.totalVolume === 0) {
    return [];
  }

  // Return the weakest areas (muscles with lowest percentage)
  const sorted = [...balance.muscles].sort((a, b) => a.percentage - b.percentage);
  return sorted.slice(0, limit).map((m) => m.muscle);
}

/**
 * Get a text recommendation based on muscle balance.
 */
export function getBalanceRecommendation(balance: MuscleBalance): {
  status: "balanced" | "needs_attention" | "no_data";
  message: { en: string; fr: string };
  focusAreas: MuscleCode[];
} {
  if (balance.totalVolume === 0) {
    return {
      status: "no_data",
      message: {
        en: "Complete workouts to see your muscle balance.",
        fr: "Termine des entraînements pour voir ton équilibre musculaire.",
      },
      focusAreas: [],
    };
  }

  if (balance.weakAreas.length === 0) {
    return {
      status: "balanced",
      message: {
        en: "Great balance! Keep up the varied training.",
        fr: "Bon équilibre ! Continue l'entraînement varié.",
      },
      focusAreas: [],
    };
  }

  const weakLabels = balance.weakAreas.slice(0, 2).map((m) => MUSCLE_LABELS[m]);
  const enNames = weakLabels.map((l) => l.en.toLowerCase()).join(" and ");
  const frNames = weakLabels.map((l) => l.fr.toLowerCase()).join(" et ");

  return {
    status: "needs_attention",
    message: {
      en: `Consider adding more ${enNames} exercises.`,
      fr: `Pense à ajouter plus d'exercices pour ${frNames}.`,
    },
    focusAreas: balance.weakAreas.slice(0, 2),
  };
}

// ------------------------------------------------------------
// Movement-pattern balance
// ------------------------------------------------------------

export type PatternVolume = {
  pattern: MovementPattern;
  label: { en: string; fr: string };
  volume: number; // Same work units as MuscleVolume
  percentage: number;
};

export type PatternBalance = {
  period: BalancePeriod;
  totalVolume: number;
  patterns: PatternVolume[];
  pushVolume: number;
  pullVolume: number;
  /** Pull work units per unit of push. Null when the hero has pushed nothing. */
  pullPerPush: number | null;
};

/**
 * Volume per movement family — the balance the muscle taxonomy cannot express.
 *
 * The research is specific about why this view has to exist: pulling is the structural weak
 * point of training without equipment (§2, §10.2), because without a bar the vertical pull
 * nearly disappears, and the failure it produces is "your pulling volume is 4 sets vs 16
 * pushing" (§10.4). Muscles cannot say that — a row and a push-up both hit "arms".
 *
 * Its own query rather than a reuse of `computeMuscleBalance`'s rows: that one joins
 * `exercise_muscles`, so an exercise tagged with three muscles appears three times, and
 * summing its volume per pattern off those rows would triple-count it.
 *
 * Exercises with no pattern (user-authored content — the column is nullable on purpose) are
 * left out entirely rather than bucketed, so they dilute no percentage.
 */
export function getPatternBalance(period: BalancePeriod = "30d"): Promise<PatternBalance> {
  return shortLivedQuery(`patternBalance:${period}`, () => computePatternBalance(period));
}

async function computePatternBalance(period: BalancePeriod): Promise<PatternBalance> {
  const startDate = periodStart(period);

  const rows = await db
    .select({
      pattern: exercises.pattern,
      resultValue: completedExercises.resultValue,
      resultType: completedExercises.resultType,
      style: exercises.style,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(period === "all" ? undefined : gte(completedQuest.performedAt, startDate));

  const volumes = new Map<MovementPattern, number>();
  for (const pattern of movementPatterns) volumes.set(pattern, 0);

  let totalVolume = 0;
  for (const row of rows) {
    if (!isMovementPattern(row.pattern)) continue;
    const units = toRepEquivalent(row.resultValue, row.resultType, row.style);
    volumes.set(row.pattern, (volumes.get(row.pattern) ?? 0) + units);
    totalVolume += units;
  }

  const sumOf = (family: readonly MovementPattern[]) =>
    family.reduce((acc, p) => acc + (volumes.get(p) ?? 0), 0);

  const pushVolume = sumOf(PUSH_PATTERNS);
  const pullVolume = sumOf(PULL_PATTERNS);

  const patterns: PatternVolume[] = movementPatterns
    .map((pattern) => ({
      pattern,
      label: PATTERN_LABELS[pattern],
      volume: volumes.get(pattern) ?? 0,
      percentage: totalVolume > 0 ? ((volumes.get(pattern) ?? 0) / totalVolume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  return {
    period,
    totalVolume,
    patterns,
    pushVolume,
    pullVolume,
    pullPerPush: pushVolume > 0 ? pullVolume / pushVolume : null,
  };
}

/**
 * Pulling should not sit far below pushing. Below half is the point where it is worth saying
 * something — the hero is not "a bit unbalanced", they are building a posture problem.
 *
 * ponytail: one flat ratio, not a per-pattern model. The research gives a direction, not a
 * number; refine it if heroes start reporting the nudge as noise.
 */
const PULL_DEFICIT_RATIO = 0.5;

/** Enough push volume that the ratio means something — one warm-up's worth would not. */
const MIN_PUSH_VOLUME_TO_JUDGE = 100;

export function getPullDeficit(
  balance: PatternBalance,
): { pullVolume: number; pushVolume: number } | null {
  if (balance.pushVolume < MIN_PUSH_VOLUME_TO_JUDGE) return null;
  if (balance.pullPerPush == null || balance.pullPerPush >= PULL_DEFICIT_RATIO) return null;
  return { pullVolume: balance.pullVolume, pushVolume: balance.pushVolume };
}

export type SuggestedQuest = {
  id: number;
  enTitle: string;
  frTitle: string;
  matchingMuscles: MuscleCode[];
  matchScore: number; // Higher = better match for weak areas
};

/**
 * Get quests that focus on weak muscle areas.
 * Ranks quests by how many weak-area muscles they target.
 */
/** Muscles worked during yesterday's sessions — used to demote, never to exclude. */
async function getMusclesTrainedYesterday(): Promise<Set<MuscleCode>> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  start.setDate(start.getDate() - 1);

  const rows = await db
    .select({ muscle: exerciseMuscles.muscle })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, completedExercises.exerciseId))
    .where(and(gte(completedQuest.performedAt, start), lt(completedQuest.performedAt, end)));

  return new Set(rows.map((r) => r.muscle as MuscleCode));
}

export async function getSuggestedQuestsForWeakAreas(limit = 3): Promise<SuggestedQuest[]> {
  const focusAreas = await getSuggestedFocusAreas(3);

  if (focusAreas.length === 0) {
    return [];
  }

  // Get all quests with their exercises and muscles
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      muscle: exerciseMuscles.muscle,
    })
    .from(quests)
    .innerJoin(questExercises, eq(questExercises.questId, quests.id))
    .innerJoin(exercises, eq(exercises.id, questExercises.exerciseId))
    .innerJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(inArray(exerciseMuscles.muscle, focusAreas));

  // Group by quest and count matching muscles
  const questMap = new Map<
    number,
    { enTitle: string; frTitle: string; muscles: Set<MuscleCode> }
  >();

  for (const row of rows) {
    if (!questMap.has(row.questId)) {
      questMap.set(row.questId, {
        enTitle: row.enTitle,
        frTitle: row.frTitle,
        muscles: new Set(),
      });
    }
    const muscle = row.muscle as MuscleCode;
    if (focusAreas.includes(muscle)) {
      questMap.get(row.questId)?.muscles.add(muscle);
    }
  }

  // Build result and sort by match score
  const results: SuggestedQuest[] = [];
  for (const [id, data] of questMap) {
    results.push({
      id,
      enTitle: data.enTitle,
      frTitle: data.frTitle,
      matchingMuscles: [...data.muscles],
      matchScore: data.muscles.size,
    });
  }

  // Never suggest a quest the hero cannot actually train: no bar, no bar quest, and no
  // handstand push-ups for someone who just told us they are starting out.
  const eligible = await getEligibleQuestIds();
  const trainable = results.filter((r) => eligible.has(r.id));
  const pool = trainable.length > 0 ? trainable : results;

  // Muscles trained yesterday are demoted rather than excluded — the 48 h guidance is about
  // recovery, but a hard filter here could empty a list that is already down to weak areas.
  const restingMuscles = await getMusclesTrainedYesterday();
  const score = (r: SuggestedQuest) =>
    r.matchScore - r.matchingMuscles.filter((m) => restingMuscles.has(m)).length;

  pool.sort((a, b) => score(b) - score(a) || a.id - b.id);

  return pool.slice(0, limit);
}
