import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdventureDetails, getAnyActiveAdventureRun } from "@/db/adventures";
import { estimateQuestSeconds, formatDurationEstimate } from "@/db/estimate";
import { getChainTo } from "@/db/exercises";
import { getSuggestedQuestsForWeakAreas } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getOathProgress, oathNeedsExercise } from "@/db/oaths";
import { loadConfiguredQuest } from "@/db/questConfig";
import { findQuestWithExercise } from "@/db/quests";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** What the stage shows: a scene to walk into, whether it is an adventure or tonight's quest. */
export type SmartScene = {
  title: string;
  imagePath: string | null;
  /** Adventures only: steps done out of steps total. */
  progress?: { done: number; total: number };
  /** Quests only: "4 exercises · Strength · ≈ 20 min". */
  meta?: string;
};

export type SmartActionConfig = {
  label: string;
  subtext: string;
  onPress: () => void;
  variant: "adventure" | "quest" | "gallery";
  scene: SmartScene | null;
};

export function useSmartAction() {
  const router = useRouter();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [config, setConfig] = useState<SmartActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const determineAction = useCallback(
    // ponytail: priority waterfall — the order *is* the feature, so it reads better flat than
    //           split. Ceiling: a table of {predicate, action} once a seventh case lands.
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
    async (isCancelled: () => boolean) => {
      /**
       * A quest turned into the one thing on Home: the scene announces it, the button opens it.
       *
       * The quest is loaded here rather than on tap, so the scene can name what it is offering
       * instead of a generic illustration. Only the detail screen starts a session — Home never
       * pushes a session route, it hands over the quest and lets the hero commit there.
       */
      const questAction = async (
        questId: number,
        subtext: string,
      ): Promise<SmartActionConfig | null> => {
        const loaded = await loadConfiguredQuest(questId);
        if (!loaded) return null;

        const { quest } = loaded;
        const seconds = estimateQuestSeconds(quest);

        return {
          // Not "Start Quest": the detail screen owns that verb, and two synonymous buttons
          // across two screens is what made the old flow unreadable. This one only promises
          // what it does — it shows you the quest.
          label: t("home.see_quest", "See the quest"),
          subtext,
          variant: "quest",
          scene: {
            title: localizedTitle(quest, language),
            imagePath: quest.imagePath,
            meta: [
              t("quests.exercises", {
                count: quest.exercises.length,
                defaultValue: `${quest.exercises.length} exercises`,
              }),
              quest.archetype ? t(`quests.archetype_${quest.archetype}`) : null,
              t("quests.estimate", {
                duration: formatDurationEstimate(seconds),
                defaultValue: `≈ ${formatDurationEstimate(seconds)}`,
              }),
            ]
              .filter(Boolean)
              .join(" · "),
          },
          onPress: () => router.push(`/quests/${questId}` as never, { withAnchor: true }),
        };
      };

      try {
        // 1. An adventure already under way outranks any suggestion: the hero committed to it.
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
            scene: {
              title,
              imagePath: details?.adventure.imagePath ?? null,
              progress: { done: stepsDone, total: steps.length },
            },
          });
          setIsLoading(false);
          return;
        }

        // 2. The oath the hero swore, walked one rung at a time. This is the whole spine: an
        //    objective they chose, the ladder that leads to it, and the session that climbs it.
        //    Above the weak-area rule on purpose — balance is the app's opinion, the oath is theirs.
        const oath = await getOathProgress();
        const oathExerciseId =
          oath && !oath.isFulfilled && oathNeedsExercise(oath.oath.metric)
            ? oath.oath.exerciseId
            : null;

        if (oathExerciseId !== null && !isCancelled()) {
          const chain = await getChainTo(oathExerciseId);
          const rung = chain ? chain.rungs[chain.position - 1] : null;
          // Train where the hero stands, not where they are headed: the top of the chain is the
          // oath, the rung under their feet is tonight.
          const targetId = rung?.exercise.id ?? oathExerciseId;
          const questId = await findQuestWithExercise(targetId);

          if (questId !== null && !isCancelled()) {
            // A full sentence, not the compact "Marche 2/5 · Rowing inversé" the ladder uses
            // elsewhere: on the exercise screen the ladder is drawn right there to explain
            // itself, and here it is not. Home is where the hero meets it cold.
            const goal = oath?.exerciseName?.[language] ?? "";
            const rungName = rung
              ? language === "fr"
                ? rung.exercise.frName
                : rung.exercise.enName
              : goal;
            const subtext =
              chain && rung
                ? t("home.oath_focus_chain", {
                    goal,
                    position: chain.position,
                    total: chain.rungs.length,
                    name: rungName,
                  })
                : t("home.oath_focus_simple", { goal });

            const action = await questAction(questId, subtext);
            if (action && !isCancelled()) {
              setConfig(action);
              setIsLoading(false);
              return;
            }
          }
        }

        // 3. No oath to serve: fall back to what the last 30 days say is lagging.
        const suggestions = await getSuggestedQuestsForWeakAreas(1);
        const suggestion = suggestions[0];
        if (suggestion && !isCancelled()) {
          const muscles = suggestion.matchingMuscles
            .map((m) => MUSCLE_LABELS[m]?.[language] ?? m)
            .join(", ");

          const action = await questAction(
            suggestion.id,
            t("home.focus_on", { muscles, defaultValue: `Focus: ${muscles}` }),
          );
          if (action && !isCancelled()) {
            setConfig(action);
            setIsLoading(false);
            return;
          }
        }

        // 4. Nothing to go on — a day-one hero. Say so honestly and open the gallery.
        if (!isCancelled()) {
          setConfig({
            label: t("home.pick_quest_label", "Pick a quest"),
            subtext: t("home.quick_workout", "Quick Workout"),
            variant: "gallery",
            scene: null,
            onPress: () => router.push("/(tabs)/quests" as never),
          });
        }
      } catch (error) {
        // The widget's own default config covers the UI; the failure itself must be visible.
        reportError("home.smartAction", error);
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
      determineAction(() => cancelled).catch((e) => reportError("home.smartAction", e));
      return () => {
        cancelled = true;
      };
    }, [determineAction]),
  );

  return { config, isLoading };
}
