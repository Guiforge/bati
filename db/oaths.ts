import { eq, gte, sql } from "drizzle-orm";
import { db, schema, type TransactionTx, transactionOrFallback } from "./client";
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
  | "streak" // best flame ever reached
  | "weekly_sessions"; // weeks that hit a session quota ("3 a week, for 8 weeks")

/** How many sessions make a week count, when the metric is `weekly_sessions`. */
export const DEFAULT_WEEKLY_TARGET = 3;

export type Oath = {
  metric: OathMetric;
  exerciseId: number | null; // required by the exercise_* metrics, null otherwise
  target: number;
  /** Sessions per week that make a week count. Only read by `weekly_sessions`. */
  weeklyTarget?: number;
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

/** Metrics measured in weeks rather than reps, sessions or days. */
export function oathNeedsWeeklyTarget(metric: OathMetric): boolean {
  return metric === "weekly_sessions";
}

/**
 * Ready-made oaths so swearing is a tap, not a guessed target number. Exercise
 * presets reference the seed exercise by `enName` (stable content); the swear
 * screen resolves it to an id and drops any preset whose exercise is missing.
 */
export type OathPreset = {
  id: string;
  metric: OathMetric;
  target: number;
  weeklyTarget?: number; // only for `weekly_sessions`
  exerciseName?: string; // matches Exercise.enName for the exercise_* metrics
};

export const OATH_PRESETS: OathPreset[] = [
  // The process goal leads the deck: habit forms over ~2-3 months, and a week you miss costs
  // one week instead of resetting anything (docs/raw/bodyweight-app-research.md §5).
  { id: "weekly_3x_8w", metric: "weekly_sessions", target: 8, weeklyTarget: 3 },
  // A 30-day flame no longer means 30 days of training in a row: the flame counts days of
  // consistency (db/streaks.ts), so this asks for a month of holding the line, rest included.
  { id: "streak_30", metric: "streak", target: 30 },
  { id: "sessions_50", metric: "sessions", target: 50 },
  { id: "pushups_1000", metric: "exercise_volume", target: 1000, exerciseName: "Push-ups" },
  // Equipment-free pull, so a hero without a bar has a back oath they can actually chase.
  { id: "table_rows_15", metric: "exercise_pr", target: 15, exerciseName: "Table Row" },
  { id: "pullups_15", metric: "exercise_pr", target: 15, exerciseName: "Pull-ups" },
  // The top of the skill ladder authored in the content plan (§2.3).
  { id: "lsit_30", metric: "exercise_pr", target: 30, exerciseName: "L-Sit" },
];

// ponytail: flat bonus, tune if oaths ever get tiers. A mini-boss-sized reward for the
// user's biggest commitment — worth a few sessions so fulfilling it visibly moves the level.
export const OATH_XP_BONUS = 250;

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
  weeklyTarget?: number;
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

  if (oathNeedsWeeklyTarget(input.metric)) {
    oath.weeklyTarget = Math.max(1, Math.floor(input.weeklyTarget ?? DEFAULT_WEEKLY_TARGET));
  }
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
      // `best`, not `current`: a flame that goes out does not undo the oath's progress. That
      // was an accident of the old implementation; it is kept on purpose.
      const info = await getStreakInfo();
      return info.best;
    }
    case "weekly_sessions":
      return await countQualifyingWeeks(oath);
  }
}

/**
 * Weeks since the oath was sworn in which the hero logged at least `weeklyTarget` sessions.
 *
 * This is the one metric that measures a habit rather than a result, and the counting is the
 * whole point: a missed week costs that week and nothing else. Nothing resets, nothing is
 * forfeited, and last week's miss cannot undo the eight weeks before it — the forgiveness a
 * strict consecutive-day streak cannot offer, expressed as a promise instead of a punishment.
 */
async function countQualifyingWeeks(oath: Oath): Promise<number> {
  const weeklyTarget = Math.max(1, oath.weeklyTarget ?? DEFAULT_WEEKLY_TARGET);
  const sworn = new Date(oath.swornAt);
  if (Number.isNaN(sworn.getTime())) return 0;

  const rows = await db
    .select({ performedAt: completedQuest.performedAt })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, sworn));

  // Weeks are counted from the day the oath was sworn, not from Monday: the hero's week starts
  // when they made the promise.
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const sessionsByWeek = new Map<number, number>();

  for (const row of rows) {
    const week = Math.floor((row.performedAt.getTime() - sworn.getTime()) / msPerWeek);
    if (week < 0) continue;
    sessionsByWeek.set(week, (sessionsByWeek.get(week) ?? 0) + 1);
  }

  let qualifying = 0;
  for (const count of sessionsByWeek.values()) {
    if (count >= weeklyTarget) qualifying++;
  }

  return qualifying;
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
 *
 * `onFulfilled` (e.g. crediting the oath's XP bonus to the session) runs in the same
 * transaction as the fulfilledAt write: a crash between the two used to mark the oath
 * fulfilled forever while the bonus was never credited, since a fulfilled oath is a
 * no-op on every later call. Committing both together removes that window.
 */
export async function checkOathFulfilled(
  onFulfilled?: (tx: TransactionTx) => Promise<void>,
): Promise<OathProgress | null> {
  const oath = await getOath();
  if (!oath || oath.fulfilledAt !== null) {
    return null;
  }

  if ((await measure(oath)) < oath.target) {
    return null;
  }

  const fulfilled: Oath = { ...oath, fulfilledAt: new Date().toISOString() };
  await transactionOrFallback(async (tx) => {
    if (onFulfilled) await onFulfilled(tx);
    await setPreference(OATH_KEY, JSON.stringify(fulfilled), tx);
  });
  return await toProgress(fulfilled);
}
