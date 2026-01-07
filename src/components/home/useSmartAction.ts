import { endOfDay, startOfDay } from "date-fns";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getAnyActiveAdventureRun } from "@/src/db/adventures";
import { getSuggestedQuestsForWeakAreas } from "@/src/db/muscleBalance";
import { getScheduledSessionsInRange } from "@/src/db/scheduling";

export type SmartActionConfig = {
  label: string;
  subtext: string;
  onPress: () => void;
  variant: "plan" | "event" | "adventure" | "quest";
};

export function useSmartAction() {
  const router = useRouter();
  const [config, setConfig] = useState<SmartActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex decision logic, refactor planned
    async function determineAction() {
      try {
        // 1. Check for Scheduled Session (Today)
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);
        const sessions = await getScheduledSessionsInRange(start, end);

        const pendingSession = sessions.find((s) => s.status === "pending");

        if (pendingSession && !cancelled) {
          setConfig({
            label: "START PLANNED SESSION",
            subtext: pendingSession.quest.enTitle, // Should localize
            variant: "plan",
            onPress: () =>
              router.push({
                pathname: "/session",
                params: {
                  questId: pendingSession.questId,
                  scheduledSessionId: pendingSession.id,
                },
              } as never),
          });
          setIsLoading(false);
          return;
        }

        // 2. Check for Active Adventure
        const activeRun = await getAnyActiveAdventureRun();
        if (activeRun && !cancelled) {
          setConfig({
            label: "CONTINUE ADVENTURE",
            subtext: "Resume your journey", // Could be better
            variant: "adventure",
            onPress: () => router.push(`/adventures/${activeRun.adventureId}` as never),
          });
          setIsLoading(false);
          return;
        }

        // 3. Fallback: Suggest Quest
        const suggestions = await getSuggestedQuestsForWeakAreas(1);
        if (suggestions.length > 0 && !cancelled) {
          const suggestion = suggestions[0];
          const muscles = suggestion.matchingMuscles.join(", ");
          setConfig({
            label: "START QUEST",
            subtext: `Focus: ${muscles}`,
            variant: "quest",
            onPress: () =>
              router.push({
                pathname: "/session",
                params: { questId: suggestion.id },
              } as never),
          });
          setIsLoading(false);
          return;
        }

        // 4. Default
        if (!cancelled) {
          setConfig({
            label: "START QUEST",
            subtext: "Quick Workout",
            variant: "quest",
            onPress: () => router.push("/(tabs)/exercises" as never),
          });
        }
      } catch {
        // Error handled silently
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    determineAction();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { config, isLoading };
}
