import { eq, sql } from "drizzle-orm";
import { getLocales } from "expo-localization";
import { db, schema } from "./client";
import { countsAsSession } from "./completed";
import { doneIn, getCrest } from "./crest";
import { isSouthern } from "./crestCoat";
import { practiceOf } from "./crestRules";
import { calculateLevelFromXp } from "./userLevel";
import {
  type Age,
  agesReached,
  type Banner,
  type JournalRow,
  rungDepths,
  type Stone,
  seasons,
  stones,
  timeline,
} from "./villageYearsRules";

const { completedExercises, completedQuest, exercises } = schema;

export type VillageYears = { stones: Stone[]; banners: Banner[]; ages: Age[] };

/**
 * The stones, banners and Ages of the village, replayed from the journal on each call (R111):
 * nothing is stored, so a merge or a deletion that changes the history changes them. Sessions are
 * read with `countsAsSession()`, XP from every session (it is what the level is made of).
 */
export async function getVillageYears(
  now: Date = new Date(),
  regionCode: string | null | undefined = getLocales()[0]?.regionCode,
): Promise<VillageYears> {
  const sessions = await db
    .select({
      id: completedQuest.id,
      performedAt: completedQuest.performedAt,
      xp: completedQuest.xpEarned,
      counts: sql<number>`${countsAsSession()}`,
      outing: completedQuest.outing,
      strength: doneIn("strength"),
      calisthenics: doneIn("calisthenics"),
      yoga: doneIn("yoga"),
      cardio: doneIn("cardio"),
    })
    .from(completedQuest)
    .leftJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .leftJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .groupBy(completedQuest.id)
    .orderBy(completedQuest.performedAt, completedQuest.uuid);

  const sets = await db
    .select({
      sessionId: completedExercises.sessionId,
      exerciseId: completedExercises.exerciseId,
      unit: completedExercises.resultType,
      value: sql<number>`MAX(${completedExercises.resultValue})`,
    })
    .from(completedExercises)
    .innerJoin(completedQuest, eq(completedQuest.id, completedExercises.sessionId))
    .where(countsAsSession())
    .groupBy(
      completedExercises.sessionId,
      completedExercises.exerciseId,
      completedExercises.resultType,
    );
  const bySession = Map.groupBy(sets, (s) => s.sessionId);

  const rows: JournalRow[] = sessions.map((s) => ({
    at: s.performedAt,
    xp: s.xp,
    counts: s.counts === 1,
    practice: practiceOf({ ...s, uuid: "" }),
    bests: (bySession.get(s.id) ?? []).map(({ exerciseId, unit, value }) => ({
      exerciseId,
      unit,
      value,
    })),
  }));

  const ladder = await db
    .select({ id: exercises.id, prerequisite: exercises.prerequisiteExerciseId })
    .from(exercises);
  const entries = timeline(rows, calculateLevelFromXp);
  const crest = await getCrest(now);
  return {
    stones: stones(entries),
    banners: seasons(entries, now, isSouthern(regionCode), crest?.animal ?? null),
    ages: agesReached(entries, rungDepths(new Map(ladder.map((r) => [r.id, r.prerequisite])))),
  };
}
