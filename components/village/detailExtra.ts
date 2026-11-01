// What the village detail sheet and the iso bubble (iso/Bulle.tsx) load and format the same way:
// the deeds behind a number, fetched only when opened, and the date of a deed.

import { type FinishedAdventureSummary, listFinishedRunSummaries } from "@/db/adventures";
import { type ContributingSession, getRecentContributingSessions } from "@/db/completed";
import { buildingDefinitions } from "@/db/schema";
import type { VillageSelection } from "./VillageDetailSheet";

export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/** The detail sheet's second half: the deeds behind the number, fetched only when opened. */
export type Extra =
  | { kind: "sessions"; sessions: ContributingSession[] }
  | { kind: "adventures"; adventures: FinishedAdventureSummary[] }
  | null;

export async function loadExtra(selected: VillageSelection): Promise<Extra> {
  if (selected.kind === "boss") {
    return { kind: "adventures", adventures: await listFinishedRunSummaries() };
  }

  const building = selected.building;

  // The hall lists the routes that raised it, the arena the bosses fought again: the same
  // split as the tally, so the list never shows a campaign the level did not count.
  if (building.driver === "routes" || building.driver === "rematches") {
    const summaries = await listFinishedRunSummaries();
    return {
      kind: "adventures",
      adventures:
        building.driver === "routes"
          ? summaries.filter((s) => s.kind !== "boss")
          : summaries.filter((s) => s.kind === "boss" && s.timesFinished > 1),
    };
  }

  if (building.driver === "muscle" && building.relatedMuscle) {
    return {
      kind: "sessions",
      sessions: await getRecentContributingSessions({ muscle: building.relatedMuscle }),
    };
  }

  if (building.driver === "style") {
    const style = buildingDefinitions[building.code].relatedStyle;
    if (style) {
      return { kind: "sessions", sessions: await getRecentContributingSessions({ style }) };
    }
  }

  return null;
}
