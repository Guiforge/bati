import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { loadConfiguredQuest } from "@/db/questConfig";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";

/**
 * Home's one tap from a quest to a session: the stage's Start and the Replay tile.
 *
 * The quest screen used to sit in between, and on this path all it did was repeat the three lines
 * the stage had just shown. The session's own opening, its 3..2..1 or the warm-up wait, is where a
 * mistap is undone now, with the pause both of them carry.
 *
 * Never for a quest that reads the position: that one needs its location preamble first, which
 * the quest screen and the outing tiles own. `useSmartAction` sends those to Details instead.
 */
export function useStartQuest() {
  const router = useRouter();
  const status = useSessionStore((s) => s.status);
  const startSession = useSessionStore((s) => s.startSession);
  /** Double-tap guard, the same one the quest screen and the outing tiles keep. */
  const [isStarting, setIsStarting] = useState(false);

  // Coming back from the session must not leave Home stuck on a tap it already served.
  useFocusEffect(
    useCallback(() => {
      setIsStarting(false);
    }, []),
  );

  return async (questId: number) => {
    if (isStarting) return;
    // A live session is rejoined, never overwritten: `startSession` would orphan everything it
    // had banked. Same rule as the outing tiles.
    if (status !== "idle" && status !== "finished") {
      router.push("/session" as never);
      return;
    }

    setIsStarting(true);
    try {
      // The saved config, so this starts the quest Details would have started.
      const loaded = await loadConfiguredQuest(questId);
      if (!loaded) {
        setIsStarting(false);
        return;
      }
      // Awaited: the session screen redirects home if it mounts on an empty store.
      await startSession(loaded.quest, loaded.level);
      router.push("/session" as never);
    } catch (error) {
      setIsStarting(false);
      reportError("home.startQuest", error);
    }
  };
}
