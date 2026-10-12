import type { VillageGrowth } from "@/db/village";
import { formatGrown } from "@/db/village";
import { type SaveResult, useSessionStore } from "@/stores/session";

type Campaign = SaveResult["campaign"];

/** The two navigation calls the roads below use; `useRouter()` is one. */
type Navigator = {
  push: (href: never) => void;
  replace: (href: never, options?: { withAnchor?: boolean }) => void;
};

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

/**
 * "Continue": the session ends and the road `continueTarget` names replaces the victory screen.
 * The victory screen's button and the big feast's close both come here, so the stack is the same
 * whichever door the hero took.
 */
export function goOn(router: Navigator, result: SaveResult) {
  useSessionStore.getState().quitSession();
  const { href, anchor } = continueTarget(result.campaign);
  if (anchor) router.replace(href as never, { withAnchor: true });
  else router.replace(href as never);
}

/** "See your village": pushed over the victory screen, so back returns to it. */
export const seeVillage = (router: Navigator, result: SaveResult) =>
  router.push(villageHref(result.villageGrowth) as never);
