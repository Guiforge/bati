import { type SQL, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { ExerciseStyle, QuestTargetType } from "./schema";

/**
 * Reps and seconds share the `result_value` column, and nothing in the column says which one
 * it holds — `result_type` does. Summing the raw value therefore adds two different units:
 * a 60 s plank counted six times a 10-rep set of push-ups, which quietly skewed weak-area
 * detection, the home screen's quest suggestion, the village's building levels and the
 * journal's balance card, all from the same arithmetic.
 *
 * Seconds become rep-equivalents at the catalogue's median `secondsPerRep`, which puts a 60 s
 * hold and a 20-rep set on the same footing. The boss damage maths has used this conversion
 * since it shipped; every other aggregate now shares it instead of re-deriving it.
 *
 * Not for comparing a single result against a target — see the note on `repEquivalentSql`.
 */
export const SECONDS_PER_REP_EQUIVALENT = 3;

/**
 * The style whose work is never a rep-equivalent.
 *
 * An expedition is measured in ground covered, not repetitions, and the two must not be
 * exchangeable. Not `cardio`: that style holds eight movements across eleven slots of six
 * shipped quests, and zeroing it would silently stop every burpee quest from damaging a boss.
 * Cardio is what leaves you breathless; an expedition is what leaves the walls — see docs/designs/expeditions.md. The arithmetic is the reason, not the taste:
 * damage is `toRepEquivalent` with no ceiling and every boss carries between 278 and 1115 HP
 * for a whole campaign, so an hour's walk at 3 s per rep is 1200 damage and one-shots the
 * largest of them. A building tops out at 1000 work units, so fifty minutes would max one on
 * the first day, permanently. No conversion rate fixes that: it would have to be small enough
 * not to kill the campaign and large enough not to insult someone who walked an hour, and no
 * such number exists. So cardio contributes zero here, and earns leagues instead.
 *
 * `getStyleVolumes` in db/village.ts therefore reads `expedition` as 0 forever. That is the
 * design, not a bug to fix.
 */
export const NON_REP_STYLE: ExerciseStyle = "expedition";

/**
 * One rule per target type, in one place, in both languages the aggregates speak.
 *
 * A `Record` keyed by `QuestTargetType` rather than a pair of hand-written branches: adding a
 * member to `questTargetTypes` — `distance`, when expeditions learn to measure kilometres —
 * fails `tsc` here, at the one spot that knows what the unit means, and joins the SQL chain
 * below for free. The old shape was `if (type !== "time") return resultValue`, which is not
 * exhaustive and would have turned 5000 metres into 5000 reps of boss damage without a word.
 * Prefer a type over a test.
 */
const CONVERSIONS: Record<
  QuestTargetType,
  { of: (value: number) => number; sqlOf: (value: SQLiteColumn) => SQL }
> = {
  reps: {
    of: (value) => value,
    sqlOf: (value) => sql`${value}`,
  },
  // SQLite's ROUND rounds half away from zero for positive numbers, exactly like Math.round,
  // and the two-argument MAX is the scalar form, so a one-second hold still lands on 1 rather
  // than 0. The `* 1.0` is what forces float division — the divisor arrives as a bound
  // parameter, so a `3.0` literal cannot be spliced in.
  time: {
    of: (value) => Math.max(1, Math.round(value / SECONDS_PER_REP_EQUIVALENT)),
    sqlOf: (value) =>
      sql`MAX(1, CAST(ROUND(${value} * 1.0 / ${SECONDS_PER_REP_EQUIVALENT}) AS INTEGER))`,
  },
};

export function toRepEquivalent(
  resultValue: number,
  type: QuestTargetType | null | undefined,
  style: ExerciseStyle,
): number {
  if (style === NON_REP_STYLE) return 0;
  // Null is "the row predates the column": it meant reps then and it means reps now.
  if (type === null || type === undefined) return resultValue;
  return CONVERSIONS[type].of(resultValue);
}

/**
 * The same conversion for an aggregate that runs in SQL, folded out of the same table so the
 * two cannot drift.
 *
 * Only use this where work units are *summed*. A personal record is a comparison against a
 * target expressed in the exercise's own unit — converting there would tell a hero holding a
 * 30 s L-Sit that they had reached 10 of their 30.
 */
export function repEquivalentSql(
  value: SQLiteColumn,
  type: SQLiteColumn,
  style: SQLiteColumn,
): SQL {
  const byType = Object.entries(CONVERSIONS).reduce<SQL>(
    (fallback, [name, conversion]) =>
      sql`CASE WHEN ${type} = ${name} THEN ${conversion.sqlOf(value)} ELSE ${fallback} END`,
    // A row whose type predates the column falls through every arm, and reads as reps.
    sql`${value}`,
  );
  return sql`(CASE WHEN ${style} = ${NON_REP_STYLE} THEN 0 ELSE ${byType} END)`;
}
