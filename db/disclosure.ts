import { count } from "drizzle-orm";
import { db, schema } from "./client";
import { countSessions } from "./completed";

/** What Home shows a hero with this much history, read from the journal and nowhere else. */
export type Disclosure = {
  /** Level line and XP bar in the strip: after the first victory. */
  level: boolean;
  /** Goal chips on the outing tiles: hidden on day one. */
  outingGoals: boolean;
  /** Oath strip under the stage: from three sessions. */
  oathStrip: boolean;
};

/** Sessions before Home invites the hero to swear an oath. */
export const OATH_AFTER_SESSIONS = 3;

/**
 * `victories`: every journal row, a short walk included, since it had a victory screen and earned
 * XP. `counted`: rows that pass `countsAsSession()`, the predicate the oaths count with, so a
 * three-minute walk does not bring the oath invitation closer.
 *
 * A pure function of the journal: two devices with the same sessions show the same Home.
 */
export function disclosureFor(victories: number, counted: number): Disclosure {
  return {
    level: victories >= 1,
    outingGoals: victories >= 1,
    oathStrip: counted >= OATH_AFTER_SESSIONS,
  };
}

export async function disclosure(): Promise<Disclosure> {
  const [[row], counted] = await Promise.all([
    db.select({ n: count() }).from(schema.completedQuest),
    countSessions(),
  ]);
  return disclosureFor(row?.n ?? 0, counted);
}
