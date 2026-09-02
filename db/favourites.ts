import { getPreference, setPreference } from "./preferences";

/**
 * The quests a hero pinned to the top of their own gallery.
 *
 * One preference holding every id, rather than the `quest:<id>:config` shape beside it. That
 * shape is right for something the quest screen reads about the quest in front of it; this is
 * read as a *set*, once, to sort thirty-seven cards, and thirty-seven reads to sort thirty-seven
 * cards is a list that gets slower the more the hero cares about it.
 *
 * Ids of quests that no longer exist are kept rather than pruned. A seed quest can disappear
 * behind a content migration and come back; a hero-authored one cannot come back, and the
 * handful of dead integers it leaves cost nothing and are ignored by every reader. Pruning would
 * mean this module knowing what a quest is, which is the one thing it is useful for not knowing.
 */
const KEY = "favourite_quests";

function parse(raw: string | null): Set<number> {
  if (raw === null) return new Set();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is number => Number.isInteger(id) && (id as number) > 0));
  } catch {
    // Untrusted text from SQLite, exactly like `parseQuestConfig`: a corrupt value costs the
    // hero their pins, never the screen that reads them.
    return new Set();
  }
}

export async function getFavouriteQuestIds(): Promise<Set<number>> {
  return parse(await getPreference(KEY));
}

/** Pins or unpins one quest, and hands back the new set so a caller can render it at once. */
export async function toggleFavouriteQuest(questId: number): Promise<Set<number>> {
  const next = parse(await getPreference(KEY));
  if (!next.delete(questId)) next.add(questId);

  await setPreference(KEY, JSON.stringify([...next]));
  return next;
}
