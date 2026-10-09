import type { VillageGrowth } from "@/db/village";
import { formatGrown } from "@/db/village";
import type { useSessionStore } from "@/stores/session";

type Campaign = Awaited<
  ReturnType<ReturnType<typeof useSessionStore.getState>["saveSession"]>
>["campaign"];

/**
 * Where "Continue" leads: the next step of a campaign, its page when it ended, else Home. One
 * place, because the big feast's full screen has to lead to the same road once it is closed.
 */
export function continueTarget(campaign: Campaign): { href: string; anchor: boolean } {
  if (campaign?.nextQuestId && campaign.nextRunStepId)
    return {
      href: `/quests/${campaign.nextQuestId}?runStepId=${campaign.nextRunStepId}&adventureId=${campaign.adventureId}`,
      anchor: true,
    };
  if (campaign?.isFinished) return { href: `/adventures/${campaign.adventureId}`, anchor: true };
  return { href: "/", anchor: false };
}

/** The village tab, with the levels that rose tonight so it plays the rise (see `formatGrown`). */
export const villageHref = (growth: VillageGrowth[]) =>
  `/(tabs)/village?grown=${formatGrown(growth)}`;
