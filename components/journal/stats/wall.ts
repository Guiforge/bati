import type { TFunction } from "i18next";
import {
  ageOf,
  formatWallValue,
  shortDate,
  targetToBeat,
} from "@/components/journal/journalFormat";
import type { WallEntry } from "@/db/journal";
import type { AppLanguage } from "@/stores/settings";

/** The wall's arithmetic and its line of text, apart from the page so they can be checked alone. */

const DAY_MS = 24 * 60 * 60 * 1000;
/** A record older than this is an old debt, and the wall says so. */
export const STALE_RECORD_DAYS = 60;

/**
 * Whether a record has aged past being tonight's target: set long ago, and not matched this
 * season. A record first reached ten months ago and equalled last week is still within reach.
 */
function isOldRecord(entry: WallEntry, now: Date): boolean {
  return (
    entry.recordAt != null &&
    now.getTime() - entry.recordAt.getTime() > STALE_RECORD_DAYS * DAY_MS &&
    (entry.seasonBest == null || entry.best == null || entry.seasonBest < entry.best)
  );
}

/**
 * The number that beats the row tonight. A recent record is beaten by one more. An old one is not a
 * target for tonight: its season's best is, or the last result when the season has none.
 */
export function wallTarget(entry: WallEntry, now: Date): number {
  if (entry.best == null) return targetToBeat(null);
  if (!isOldRecord(entry, now)) return targetToBeat(entry.best);
  return targetToBeat(entry.seasonBest ?? entry.last ?? entry.best);
}

/**
 * When a record fell, said the way its age calls for: "set yesterday", "7 months ago", or the date.
 * Past a year it is the date with its year: "2 years ago" floored two years and eleven months.
 */
function recordWhen(t: TFunction, language: AppLanguage, at: Date, now: Date): string {
  const age = ageOf(at, now);
  switch (age.kind) {
    case "today":
      return t("journal.when_set_today");
    case "yesterday":
      return t("journal.when_set_yesterday");
    case "months":
      return t("journal.months_ago", { count: age.count });
    default:
      return shortDate(language, at, now);
  }
}

/** Stands in for the date inside a translated line, so the date can be cut out and made a link. */
const WHEN_MARK = "⁣";

/**
 * The line under a movement, in three parts: what comes before the record's date, the date, and
 * what comes after. Cut on a mark rather than built from pieces, so each language keeps its own
 * word order around the date.
 */
export function wallSub(
  t: TFunction,
  language: AppLanguage,
  entry: WallEntry,
  now: Date,
): { before: string; when: string; after: string } {
  if (entry.best == null || entry.recordAt == null) {
    return { before: t("journal.wall_never"), when: "", after: "" };
  }
  const value = (v: number) => formatWallValue(v, entry.type, language);
  const best = value(entry.best);
  let line: string;
  if (isOldRecord(entry, now) && entry.seasonBest != null) {
    line = t("journal.wall_sub_season", { season: value(entry.seasonBest), best, when: WHEN_MARK });
  } else if (entry.last != null && entry.last < entry.best) {
    // The last result is always there when it is under the record: it is the number a hero
    // compares the target against, and an audit found it hidden on the one row it mattered most.
    // A hold reads as a clock; a count says it is reps, a bare "last 11" had no unit.
    const last = value(entry.last);
    line = t("journal.wall_sub_last", {
      best,
      when: WHEN_MARK,
      last: entry.type === "time" ? last : `${last} ${t("journal.unit_reps")}`,
    });
  } else {
    line = t("journal.wall_sub", { best, when: WHEN_MARK });
  }
  const [before = "", after = ""] = line.split(WHEN_MARK);
  return { before, when: recordWhen(t, language, entry.recordAt, now), after };
}
