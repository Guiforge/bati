import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { MUSCLE_LABELS } from "./muscles";
import { type MuscleCode, muscleCodes } from "./schema";

const { completedQuest, completedExercises, exercises, exerciseMuscles, quests, questExercises } =
  schema;

export type MuscleVolume = {
  muscle: MuscleCode;
  label: { en: string; fr: string };
  volume: number; // Total "work units" (reps + seconds)
  percentage: number; // Percentage of total training
  sessionCount: number; // Number of sessions that included this muscle
};

export type MuscleBalance = {
  period: "7d" | "30d" | "90d" | "all";
  startDate: Date;
  endDate: Date;
  totalVolume: number;
  totalSessions: number;
  muscles: MuscleVolume[];
  weakAreas: MuscleCode[]; // Muscles below average
  strongAreas: MuscleCode[]; // Muscles above average
};

/**
 * Calculate muscle balance based on workout history.
 * Returns volume per muscle group and identifies weak/strong areas.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Muscle balance analysis requires aggregating and comparing multiple muscle groups
export async function getMuscleBalance(
  period: "7d" | "30d" | "90d" | "all" = "30d",
): Promise<MuscleBalance> {
  const now = new Date();
  const endDate = now;
  let startDate: Date;

  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = new Date(0); // Unix epoch
      break;
  }

  // Get all completed exercises with their muscles in the time period
  const whereClause = period === "all" ? undefined : gte(completedQuest.performedAt, startDate);

  const rows = await db
    .select({
      sessionId: completedQuest.id,
      exerciseId: completedExercises.exerciseId,
      resultValue: completedExercises.resultValue,
      muscle: exerciseMuscles.muscle,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, sql`${completedExercises.sessionId} = ${completedQuest.id}`)
    .innerJoin(exercises, sql`${exercises.id} = ${completedExercises.exerciseId}`)
    .innerJoin(exerciseMuscles, sql`${exerciseMuscles.exerciseId} = ${exercises.id}`)
    .where(whereClause)
    .orderBy(desc(completedQuest.performedAt));

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
      data.volume += row.resultValue;
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

  // Sort by match score descending, then by id for stability
  results.sort((a, b) => b.matchScore - a.matchScore || a.id - b.id);

  return results.slice(0, limit);
}
