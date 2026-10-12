import { differenceInYears } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { getLocales } from "expo-localization";
import { DEFAULT_WEEKLY_QUOTA } from "@/constants/weeklyTargets";
import { db, schema } from "./client";
import { countsAsSession } from "./completed";
import { hasRareCoat, portraitSlug } from "./crestCoat";
import {
  type Animal,
  type CrestAnimals,
  type CrestSession,
  type CrestStage,
  crestAnimals,
} from "./crestRules";
import { preferences } from "./preferences";
import type { ExerciseStyle } from "./schema";
import { calculateStreakFromSessions, type FlameLevel, getFlameLevel } from "./streaks";

const { completedExercises, completedQuest, exercises } = schema;

export type Crest = CrestAnimals & {
  /** 0 until a flame of 3 days was ever held; the band is then not drawn. */
  longestFlame: FlameLevel;
  /** Whole years since the first session that counts, a year without a session included. */
  rings: number;
  /** When the 8th session that has a practice was done: "from now on" says the day it reveals. */
  revealedAt: Date;
};

/** Distinct movements done in a session, for one style. */
export const doneIn = (style: ExerciseStyle) =>
  sql<number>`COUNT(DISTINCT CASE WHEN ${exercises.style} = ${style} THEN ${completedExercises.exerciseId} END)`;

/**
 * The animal, the second one, the stages and the boar's quarters, from the journal alone: one
 * query over the sessions `countsAsSession()` accepts (a short outing is not one), the rule itself
 * in `db/crestRules.ts`. Null before the 8th session that has a practice.
 */
export async function getCrest(now: Date = new Date()): Promise<Crest | null> {
  const rows = await db
    .select({
      uuid: completedQuest.uuid,
      performedAt: completedQuest.performedAt,
      outing: completedQuest.outing,
      strength: doneIn("strength"),
      calisthenics: doneIn("calisthenics"),
      yoga: doneIn("yoga"),
      cardio: doneIn("cardio"),
    })
    .from(completedQuest)
    // No `resultValue > 0` here: `completed_exercises` already CHECKs it (drizzle/0000_schema.sql:219).
    .leftJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .leftJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(countsAsSession())
    .groupBy(completedQuest.id)
    .orderBy(completedQuest.performedAt, completedQuest.uuid);

  const sessions: CrestSession[] = rows.map((r) => ({ ...r, uuid: r.uuid ?? "" }));
  const animals = crestAnimals(sessions, await preferences.getCrestAnimal());
  const first = rows[0];
  const revealed = animals === null ? undefined : rows[animals.revealedIndex];
  if (animals === null || first === undefined || revealed === undefined) return null;

  const dates = rows.map((r) => r.performedAt);
  // The oath's quota is not read: a hero who raises it must not lose a band already earned.
  const { best } = calculateStreakFromSessions(dates, DEFAULT_WEEKLY_QUOTA, now);
  return {
    ...animals,
    longestFlame: getFlameLevel(best),
    rings: differenceInYears(now, first.performedAt),
    revealedAt: revealed.performedAt,
  };
}

/**
 * The portrait an animal on the crest wears tonight: the hero's rare coat (`crest.longestFlame`),
 * their `crestCoat` choice, the calendar and the device's region, read once and handed to the pure
 * rule. The one reader of `crestCoat`, so the choice has a consumer.
 */
export async function portraitOf(
  crest: Pick<Crest, "longestFlame">,
  animal: Animal,
  stage: CrestStage,
  now: Date = new Date(),
  delivered?: ReadonlySet<string>,
): Promise<string> {
  return portraitSlug(
    animal,
    stage,
    hasRareCoat(crest.longestFlame),
    await preferences.getCrestCoat(),
    now,
    getLocales()[0]?.regionCode,
    delivered,
  );
}
