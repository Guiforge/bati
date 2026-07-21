import { eq, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { deletePreference, getPreference, setPreference } from "./preferences";
import { getStreakInfo } from "./streaks";

const { completedQuest, completedExercises, exercises } = schema;

const OATH_KEY = "oath";

/**
 * An Oath is the user's own target, expressed as a predicate over the session
 * journal. Nothing about progress is stored: only the target itself, plus the
 * timestamp of the moment it was reached (so the victory screen fires once).
 */
export type OathMetric =
  | "exercise_pr" // best single result on one exercise ("10 pull-ups in a row")
  | "exercise_volume" // cumulated reps/seconds on one exercise ("1000 push-ups")
  | "sessions" // total sessions logged
  | "streak"; // best flame ever reached

export type Oath = {
  metric: OathMetric;
  exerciseId: number | null; // required by the exercise_* metrics, null otherwise
  target: number;
  swornAt: string; // ISO
  fulfilledAt: string | null; // ISO once reached, null while in progress
};

export type OathProgress = {
  oath: Oath;
  current: number;
  target: number;
  progress: number; // 0-100, clamped
  isFulfilled: boolean;
  // Only set for the exercise_* metrics — the UI needs it to label the oath.
  exerciseName: { en: string; fr: string } | null;
};

export function oathNeedsExercise(metric: OathMetric): boolean {
  return metric === "exercise_pr" || metric === "exercise_volume";
}

function isOath(value: unknown): value is Oath {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const o = value as Partial<Oath>;
  return (
    typeof o.metric === "string" &&
    typeof o.target === "number" &&
    Number.isFinite(o.target) &&
    o.target > 0 &&
    typeof o.swornAt === "string"
  );
}

/** The single active oath, or null. One oath at a time: a list of targets is a todo list. */
export async function getOath(): Promise<Oath | null> {
  const raw = await getPreference(OATH_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isOath(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Swear a new oath, replacing any existing one. */
export async function swearOath(input: {
  metric: OathMetric;
  target: number;
  exerciseId?: number | null;
}): Promise<Oath> {
  if (!Number.isFinite(input.target) || input.target <= 0) {
    throw new Error("Oath target must be a positive number");
  }
  const exerciseId = input.exerciseId ?? null;
  if (oathNeedsExercise(input.metric) && exerciseId === null) {
    throw new Error(`Oath metric "${input.metric}" requires an exerciseId`);
  }

  const oath: Oath = {
    metric: input.metric,
    exerciseId,
    target: Math.floor(input.target),
    swornAt: new Date().toISOString(),
    fulfilledAt: null,
  };
  await setPreference(OATH_KEY, JSON.stringify(oath));
  return oath;
}

/** Abandon the current oath. */
export async function breakOath(): Promise<void> {
  await deletePreference(OATH_KEY);
}

/** Current value of the metric, read straight from the journal. */
async function measure(oath: Oath): Promise<number> {
  switch (oath.metric) {
    case "exercise_pr": {
      if (oath.exerciseId === null) {
        return 0;
      }
      const rows = await db
        .select({ value: sql<number>`COALESCE(MAX(${completedExercises.resultValue}), 0)` })
        .from(completedExercises)
        .where(eq(completedExercises.exerciseId, oath.exerciseId));
      return rows[0]?.value ?? 0;
    }
    case "exercise_volume": {
      if (oath.exerciseId === null) {
        return 0;
      }
      const rows = await db
        .select({ value: sql<number>`COALESCE(SUM(${completedExercises.resultValue}), 0)` })
        .from(completedExercises)
        .where(eq(completedExercises.exerciseId, oath.exerciseId));
      return rows[0]?.value ?? 0;
    }
    case "sessions": {
      const rows = await db.select({ value: sql<number>`COUNT(*)` }).from(completedQuest);
      return rows[0]?.value ?? 0;
    }
    case "streak": {
      const info = await getStreakInfo();
      return info.best;
    }
  }
}

async function exerciseName(oath: Oath): Promise<{ en: string; fr: string } | null> {
  if (oath.exerciseId === null) {
    return null;
  }
  const rows = await db
    .select({ en: exercises.enName, fr: exercises.frName })
    .from(exercises)
    .where(eq(exercises.id, oath.exerciseId))
    .limit(1);
  return rows[0] ?? null;
}

async function toProgress(oath: Oath): Promise<OathProgress> {
  const [current, name] = await Promise.all([measure(oath), exerciseName(oath)]);
  return {
    oath,
    current,
    target: oath.target,
    progress: Math.min(100, (current / oath.target) * 100),
    isFulfilled: oath.fulfilledAt !== null || current >= oath.target,
    exerciseName: name,
  };
}

/** Derived progress for the active oath. Nothing is written. */
export async function getOathProgress(): Promise<OathProgress | null> {
  const oath = await getOath();
  return oath ? await toProgress(oath) : null;
}

/**
 * Call after a session is journaled. Returns the oath only on the transition to
 * fulfilled, so the victory screen celebrates it exactly once.
 */
export async function checkOathFulfilled(): Promise<OathProgress | null> {
  const oath = await getOath();
  if (!oath || oath.fulfilledAt !== null) {
    return null;
  }

  if ((await measure(oath)) < oath.target) {
    return null;
  }

  const fulfilled: Oath = { ...oath, fulfilledAt: new Date().toISOString() };
  await setPreference(OATH_KEY, JSON.stringify(fulfilled));
  return await toProgress(fulfilled);
}
