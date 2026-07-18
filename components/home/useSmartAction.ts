import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAnyActiveAdventureRun } from "@/db/adventures";
import { getSuggestedQuestsForWeakAreas } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useSettingsStore } from "@/stores/settings";

export type SmartActionConfig = {
  label: string;
  subtext: string;
  onPress: () => void;
  variant: "plan" | "event" | "adventure" | "quest";
};

export function useSmartAction() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [config, setConfig] = useState<SmartActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Priority waterfall, refactor planned
    async function determineAction() {
      try {
        // 1. Check for Active Adventure
        const activeRun = await getAnyActiveAdventureRun();
        if (activeRun && !cancelled) {
          setConfig({
            label: t("home.continue_adventure_label", "Continue Adventure"),
            subtext: t("home.resume_journey", "Resume your journey"),
            variant: "adventure",
            onPress: () => router.push(`/adventures/${activeRun.adventureId}` as never),
          });
          setIsLoading(false);
          return;
        }

        // 2. Fallback: Suggest Quest
        const suggestions = await getSuggestedQuestsForWeakAreas(1);
        if (suggestions.length > 0 && !cancelled) {
          const suggestion = suggestions[0];
          const muscles = suggestion.matchingMuscles
            .map((m) => MUSCLE_LABELS[m]?.[language] ?? m)
            .join(", ");
          setConfig({
            label: t("home.start_quest_label", "Start Quest"),
            subtext: t("home.focus_on", { muscles, defaultValue: `Focus: ${muscles}` }),
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

        // 3. Default: no smart suggestion available, let the user pick from the quest gallery
        if (!cancelled) {
          setConfig({
            label: t("home.start_quest_label", "Start Quest"),
            subtext: t("home.quick_workout", "Quick Workout"),
            variant: "quest",
            onPress: () => router.push("/(tabs)/quests" as never),
          });
        }
      } catch {
        // Error handled silently: the widget's own default config covers this case
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    determineAction();

    return () => {
      cancelled = true;
    };
  }, [router, t, language]);

  return { config, isLoading };
}
