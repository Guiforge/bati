import type { QuestTargetType } from "./schema";
import type { Age, YearSummary } from "./villageYearsRules";

/**
 * The two big feasts the years bring, as the victory screen is told of them. Pure: what the phone
 * has already shown (`bigFeastsShown`) is a parameter, like `legendaryNews` for the legendary.
 */

/** A movement's name in every language, as the ladder rows hold it. */
export type MovementNames = { enName: string; frName: string; deName: string; esName: string };

/** The id an Age is marked under in `bigFeastsShown`: its level. */
export const ageKey = (level: number) => `age:${level}`;

/** The id an anniversary is marked under: the village's age in whole years. */
export const anniversaryKey = (years: number) => `anniversary:${years}`;

/** Under this many sessions in the year, the anniversary says the best record instead of the count. */
export const FEW_SESSIONS = 10;

export type AgeNews = Pick<Age, "level" | "source" | "reachedAtLevel" | "practice"> & {
  /** The movement the Age is named after; null for a practice or no name at all. */
  movement: MovementNames | null;
};

export type AnniversaryNews = {
  years: number;
  sessions: number;
  /** The best record of the year, with the movement's names; null when the year broke none. */
  best: {
    movement: MovementNames | null;
    unit: QuestTargetType;
    prior: number;
    value: number;
  } | null;
};

/**
 * The newest Age the hero has reached, when this phone has not shown it. Only the newest: a hero
 * who updates at level 60 sees the Age of 60 once, and the Age of 50 is never told after it.
 * `shown` undefined means the key could not be read: say nothing.
 */
export function newestAge(ages: readonly Age[], shown: readonly string[] | undefined): Age | null {
  const top = ages.at(-1);
  if (!top || !shown || shown.includes(ageKey(top.level))) return null;
  return top;
}

/**
 * The anniversary of the village, when this phone has not shown that year's. Several years away
 * are one feast: only the current count has a key, and the years before it are never told.
 * It is read off the state after the session, so a retried save says the same thing.
 */
export function anniversaryDue(
  year: YearSummary,
  shown: readonly string[] | undefined,
): YearSummary | null {
  if (year.years < 1 || !shown || shown.includes(anniversaryKey(year.years))) return null;
  return year;
}
