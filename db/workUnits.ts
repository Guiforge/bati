import { sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { QuestTargetType } from "./schema";

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

export function toRepEquivalent(
  resultValue: number,
  type: QuestTargetType | null | undefined,
): number {
  if (type !== "time") return resultValue;
  return Math.max(1, Math.round(resultValue / SECONDS_PER_REP_EQUIVALENT));
}

/**
 * The same conversion for an aggregate that runs in SQL.
 *
 * Kept identical to `toRepEquivalent` on purpose: SQLite's `ROUND` rounds half away from zero
 * for positive numbers, exactly like `Math.round`, and the two-argument `MAX` is the scalar
 * form, so a one-second hold still lands on 1 rather than 0. The `* 1.0` is what forces float
 * division — the divisor arrives as a bound parameter, so a `3.0` literal cannot be spliced in.
 *
 * Only use this where work units are *summed*. A personal record is a comparison against a
 * target expressed in the exercise's own unit — converting there would tell a hero holding a
 * 30 s L-Sit that they had reached 10 of their 30.
 */
export function repEquivalentSql(value: SQLiteColumn, type: SQLiteColumn) {
  return sql`CASE WHEN ${type} = 'time' THEN MAX(1, CAST(ROUND(${value} * 1.0 / ${SECONDS_PER_REP_EQUIVALENT}) AS INTEGER)) ELSE ${value} END`;
}
