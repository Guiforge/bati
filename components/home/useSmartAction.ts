import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdventureDetails, getAnyActiveAdventureRun } from "@/db/adventures";
import { getSuggestedQuestsForWeakAreas } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useSettingsStore } from "@/stores/settings";

export type SmartActionConfig = {
  label: string;
  subtext: string;
  onPress: () => void;
  variant: "plan" | "event" | "adventure" | "quest";
  /** Adventure-only: what turns the hero card into a scene instead of a generic button. */
  adventure?: {
    title: string;
    imagePath: string | null;
    stepsDone: number;
    stepsTotal: number;
  };
};

export function useSmartAction() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [config, setConfig] = useState<SmartActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const determineAction = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Priority waterfall, refactor planned
    async (isCancelled: () => boolean) => {
      try {
        // 1. Check for Active Adventure
        const active = await getAnyActiveAdventureRun();
        if (active && !isCancelled()) {
          const details = await getAdventureDetails(active.adventureId);
          if (isCancelled()) return;

          const steps = active.activeRun.steps;
          const stepsDone = steps.filter((s) => s.status === "completed").length;
          const currentStep = Math.min(stepsDone + 1, steps.length);
          const title = details
            ? language === "fr"
              ? details.adventure.frTitle
              : details.adventure.enTitle
            : t("home.resume_journey", "Resume your journey");

          setConfig({
            label: t("home.continue_adventure_label", "Continue Adventure"),
            subtext: t("home.step_progress", {
              current: currentStep,
              total: steps.length,
              defaultValue: `Step ${currentStep} of ${steps.length}`,
            }),
            variant: "adventure",
            onPress: () => router.push(`/adventures/${active.adventureId}` as never),
            adventure: {
              title,
              imagePath: details?.adventure.imagePath ?? null,
              stepsDone,
              stepsTotal: steps.length,
            },
          });
          setIsLoading(false);
          return;
        }

        // 2. Fallback: Suggest Quest
        const suggestions = await getSuggestedQuestsForWeakAreas(1);
        if (suggestions.length > 0 && !isCancelled()) {
          const suggestion = suggestions[0];
          const muscles = suggestion.matchingMuscles
            .map((m) => MUSCLE_LABELS[m]?.[language] ?? m)
            .join(", ");
          setConfig({
            label: t("home.start_quest_label", "Start Quest"),
            subtext: t("home.focus_on", { muscles, defaultValue: `Focus: ${muscles}` }),
            variant: "quest",
            // The quest detail screen, not /session: only startSession fills the store, and
            // /session redirects home when it finds it empty.
            onPress: () => router.push(`/quests/${suggestion.id}` as never),
          });
          setIsLoading(false);
          return;
        }

        // 3. Default: no smart suggestion available, let the user pick from the quest gallery
        if (!isCancelled()) {
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
        if (!isCancelled()) setIsLoading(false);
      }
    },
    [router, t, language],
  );

  // Reload on focus: coming back from a finished session must not leave a stale step count.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      determineAction(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [determineAction]),
  );

  return { config, isLoading };
}
