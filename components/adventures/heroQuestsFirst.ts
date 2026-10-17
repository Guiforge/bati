import { USER_QUEST_AUTHOR } from "@/db/quests";

/**
 * Hero quests first, then the game's: the reverse of the quest gallery, which leads with the game's.
 * An adventure is mostly built from what the hero wrote, and a stable sort keeps each group's order.
 */
export function heroQuestsFirst<T extends { author: string }>(quests: readonly T[]): T[] {
  return [...quests].sort(
    (a, b) => Number(b.author === USER_QUEST_AUTHOR) - Number(a.author === USER_QUEST_AUTHOR),
  );
}
