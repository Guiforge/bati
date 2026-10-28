import { eq, inArray, ne, sql } from "drizzle-orm";
import { getLocales } from "expo-localization";
import { db, schema } from "./client";
import { countsAsSession } from "./completed";
import { doneIn } from "./crest";
import { isSouthern } from "./crestCoat";
import { type Animal, practiceOf } from "./crestRules";
import { dayKey } from "./dates";
import { fetchLadderRows } from "./exercises";
import { shortLivedQuery } from "./queryCache";
import { calculateLevelFromXp } from "./userLevel";
import type { MovementNames } from "./villageNewsRules";
import {
  type Age,
  agesReached,
  type Banner,
  type JournalRow,
  lastYear,
  rungDepths,
  type SetBest,
  type Stone,
  seasons,
  stones,
  timeline,
  type YearSummary,
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
): Promise<VillageYears & { year: YearSummary }> {
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
    year: lastYear(entries, now),
  };
}

export type MovementNamesById = Map<number, MovementNames>;

export type VillageYearsView = { years: VillageYears; names: MovementNamesById };

/** The names of these movements in every language: the facts say "Push-ups, 10 to 14". */
export async function movementNames(ids: Iterable<number>): Promise<MovementNamesById> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return new Map();
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      deName: exercises.deName,
      esName: exercises.esName,
      ruName: exercises.ruName,
    })
    .from(exercises)
    .where(inArray(exercises.id, wanted));
  return new Map(rows.map(({ id, ...n }) => [id, n]));
}

/**
 * What the Village screen reads: the years and the names their records need. Memoized with no TTL,
 * keyed on the total XP (a finished session moves it), the animal and the day (the seasons turn
 * at midnight); saving or forgetting a session clears every short-lived memo.
 */
export function loadVillageYears(totalXp: number, firstAnimal: Animal | null) {
  const now = new Date();
  return shortLivedQuery<VillageYearsView>(
    `village.years:${totalXp}:${firstAnimal}:${dayKey(now)}`,
    async () => {
      const years = await getVillageYears(now, undefined, firstAnimal);
      const ids: number[] = [];
      for (const { fact } of [...years.stones, ...years.banners]) {
        if (fact.kind === "record") ids.push(fact.exerciseId);
      }
      for (const a of years.ages) if (a.exerciseId !== null) ids.push(a.exerciseId);
      return { years, names: await movementNames(ids) };
    },
    Number.POSITIVE_INFINITY,
  );
}
