import type { Animal } from "./crestRules";
import { type AgeNews, type AnniversaryNews, anniversaryDue, newestAge } from "./villageNewsRules";
import { getVillageYears, movementNames } from "./villageYears";

/**
 * What the years have to announce tonight: an Age and the anniversary, each null when this phone
 * has shown it or there is none. One replay of the journal (`getVillageYears`), called once after
 * the session is saved: nothing here is written, the feast marks itself when it is shown.
 */
export async function readVillageNews(
  shown: readonly string[] | undefined,
  now: Date,
  firstAnimal: Animal | null,
): Promise<{ age: AgeNews | null; anniversary: AnniversaryNews | null }> {
  const years = await getVillageYears(now, undefined, firstAnimal);
  const age = newestAge(years.ages, shown);
  const year = anniversaryDue(years.year, shown);
  const ids = [age?.exerciseId, year?.best?.exerciseId].filter((id) => id != null);
  const names = await movementNames(ids);
  return {
    age: age && {
      level: age.level,
      source: age.source,
      reachedAtLevel: age.reachedAtLevel,
      practice: age.practice,
      movement: (age.exerciseId !== null && names.get(age.exerciseId)) || null,
    },
    anniversary: year && {
      years: year.years,
      sessions: year.sessions,
      best: year.best && {
        movement: names.get(year.best.exerciseId) ?? null,
        unit: year.best.unit,
        prior: year.best.prior,
        value: year.best.value,
      },
    },
  };
}
