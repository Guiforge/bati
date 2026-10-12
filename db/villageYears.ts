import { eq, ne, sql } from "drizzle-orm";
import { getLocales } from "expo-localization";
import { db, schema } from "./client";
import { countsAsSession } from "./completed";
import { doneIn } from "./crest";
import { isSouthern } from "./crestCoat";
import { type Animal, practiceOf } from "./crestRules";
import { fetchLadderRows } from "./exercises";
import { calculateLevelFromXp } from "./userLevel";
import {
  type Age,
  agesReached,
  type Banner,
  type JournalRow,
  rungDepths,
  type SetBest,
  type Stone,
  seasons,
  stones,
  timeline,
} from "./villageYearsRules";
import { NON_REP_STYLE } from "./workUnits";

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
  /** The crest's first animal (`getCrest(now)?.animal`): the caller has it already, a second read of the journal is not worth the colour. */
  firstAnimal: Animal | null = null,
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
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    // Every session, short outings included: they stand as a reference like in `movementRecordFell`.
    // Never an outing: a walk's seconds are no record (same rule as db/personalRecords.ts).
    .where(ne(exercises.style, NON_REP_STYLE))
    .groupBy(
      completedExercises.sessionId,
      completedExercises.exerciseId,
      completedExercises.resultType,
    );
  // Not `Map.groupBy`: Hermes does not ship it.
  const bySession = new Map<number, SetBest[]>();
  for (const { sessionId, exerciseId, unit, value } of sets) {
    const list = bySession.get(sessionId);
    if (list) list.push({ exerciseId, unit, value });
    else bySession.set(sessionId, [{ exerciseId, unit, value }]);
  }

  const rows: JournalRow[] = sessions.map((s) => ({
    at: s.performedAt,
    xp: s.xp,
    counts: s.counts === 1,
    practice: practiceOf({ ...s, uuid: "" }),
    bests: bySession.get(s.id) ?? [],
  }));

  const ladder = await fetchLadderRows();
  const entries = timeline(rows, calculateLevelFromXp);
  return {
    stones: stones(entries),
    banners: seasons(entries, now, isSouthern(regionCode), firstAnimal),
    ages: agesReached(
      entries,
      rungDepths(new Map(ladder.map((r) => [r.id, r.prerequisiteExerciseId]))),
    ),
  };
}
