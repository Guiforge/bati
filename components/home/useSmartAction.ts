import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdventureDetails, getAnyActiveAdventureRun } from "@/db/adventures";
import { estimateQuestSeconds, formatDuration } from "@/db/estimate";
import { getChainTo } from "@/db/exercises";
import { getSuggestedQuestsForWeakAreas } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getOathProgress, oathNeedsExercise } from "@/db/oaths";
import { loadConfiguredQuest } from "@/db/questConfig";
import { findQuestWithExercise } from "@/db/quests";
import { localizedTitle } from "@/src/i18n/localized";
import { useSessionStore } from "@/stores/session";
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
  const { startSession } = useSessionStore();
  const [config, setConfig] = useState<SmartActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const determineAction = useCallback(
    // ponytail: priority waterfall — the order *is* the feature, so it reads better flat than
    //           split. Ceiling: a table of {predicate, action} once a seventh case lands.
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
    async (isCancelled: () => boolean) => {
      /**
       * A quest turned into the one thing on Home: the scene names it, the button runs it.
       *
       * The quest is loaded here rather than on tap, so the hero sees what they are accepting
       * before they accept it — and so pressing start has nothing left to wait for.
       */
      const questAction = async (
        questId: number,
        subtext: string,
      ): Promise<SmartActionConfig | null> => {
        const loaded = await loadConfiguredQuest(questId);
        if (!loaded) return null;

        const { quest, level } = loaded;
        const seconds = estimateQuestSeconds(quest);

        return {
          label: t("quests.start_button", "Start Quest"),
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
                duration: formatDuration(seconds, language),
                defaultValue: `≈ ${formatDuration(seconds, language)}`,
              }),
            ]
              .filter(Boolean)
              .join(" · "),
          },
          // The only "start" in the app that means training begins now: no confirmation screen
          // in between, because the scene above the button already showed what it starts.
          onPress: () => {
            startSession(quest, level)
              .then(() => router.push("/session" as never))
              .catch(() => {
                // The session screen redirects home on an empty store, so a failed start lands
                // the hero back where they already are rather than on a broken screen.
              });
          },
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
            const name = rung
              ? language === "fr"
                ? rung.exercise.frName
                : rung.exercise.enName
              : (oath?.exerciseName?.[language] ?? "");
            const detail =
              chain && rung
                ? t("progression.chain_position", {
                    position: chain.position,
                    total: chain.rungs.length,
                    name,
                  })
                : name;

            const action = await questAction(questId, t("home.oath_focus", { detail }));
            if (action && !isCancelled()) {
              setConfig(action);
              setIsLoading(false);
              return;
            }
          }
        }

        // 3. No oath to serve: fall back to what the last 30 days say is lagging.
        const suggestions = await getSuggestedQuestsForWeakAreas(1);
        if (suggestions.length > 0 && !isCancelled()) {
          const suggestion = suggestions[0];
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
      } catch {
        // Error handled silently: the widget's own default config covers this case
      } finally {
        if (!isCancelled()) setIsLoading(false);
      }
    },
    [router, t, language, startSession],
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
