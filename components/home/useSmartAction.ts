import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FIRST_QUEST_TITLE } from "@/constants/onboarding";
import { getAdventureDetails, getAnyActiveAdventureRun } from "@/db/adventures";
import { estimateQuestSeconds, formatDurationEstimate } from "@/db/estimate";
import { getChainTo } from "@/db/exercises";
import { hasOutdoorSlot } from "@/db/expeditions";
import { getSuggestedQuestsForWeakAreas } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { getOathProgress, oathNeedsExercise } from "@/db/oaths";
import { listOutings } from "@/db/outings";
import { loadConfiguredQuest } from "@/db/questConfig";
import { findQuestWithExercise, listQuestTemplates } from "@/db/quests";
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
  /** Why this scene when it is not the usual one: "Day one", "Adventure". */
  kicker?: string;
};

export type SmartActionConfig = {
  label: string;
  subtext: string;
  /** Where the scene leads: the adventure, the gallery, or the quest screen (Details). */
  onPress: () => void;
  variant: "adventure" | "quest" | "gallery";
  scene: SmartScene | null;
  /**
   * The quest the stage's Start runs itself, or null when its button only navigates. Null for a
   * quest that reads the position: its location notice lives on the quest screen, and a system
   * dialog arriving over a countdown with nothing having warned the hero is what that notice is for.
   */
  startQuestId: number | null;
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
       * A quest turned into the one thing on Home: the scene announces it, the button starts it.
       *
       * The quest is loaded here rather than on tap, so the scene can name what it is offering
       * instead of a generic illustration. This hook never starts anything itself: it says which
       * quest, `useStartQuest` runs it, and `onPress` opens it for the hero who wants to look.
       */
      const questAction = async (
        questId: number,
        subtext: string,
        kicker?: string,
      ): Promise<SmartActionConfig | null> => {
        const loaded = await loadConfiguredQuest(questId);
        if (!loaded) return null;

        const { quest } = loaded;
        const seconds = estimateQuestSeconds(quest);
        const startable = !hasOutdoorSlot(quest);

        return {
          // "Start" when the tap starts, "See the quest" when it only opens the screen that does:
          // one verb per button, and the verb says what the tap does.
          label: startable ? t("home.start", "Start") : t("home.see_quest", "See the quest"),
          subtext,
          variant: "quest",
          startQuestId: startable ? questId : null,
          scene: {
            title: localizedTitle(quest, language),
            imagePath: quest.imagePath,
            kicker,
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
            // The step's own screen starts it: it has a narrative to tell first.
            startQuestId: null,
            onPress: () => router.push(`/adventures/${active.adventureId}` as never),
            scene: {
              title,
              imagePath: details?.adventure.imagePath ?? null,
              progress: { done: stepsDone, total: steps.length },
              kicker: t("home.kicker_adventure", "Adventure"),
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

        // 2b. An oath in leagues names no exercise, so the chain above cannot serve it, and the
        //     muscle rule below never will: an outing carries no muscles by design (0041). The
        //     first door out is the answer; the hero picks the duration on the quest screen.
        if (oath && !oath.isFulfilled && oath.oath.metric === "leagues" && !isCancelled()) {
          const outing = (await listOutings())[0];
          if (outing) {
            const action = await questAction(
              outing.quest.id,
              t("home.oath_focus_simple", {
                goal: t("oath.metric_leagues", { count: oath.oath.target }),
              }),
            );
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

        // 4. Nothing to go on — a day-one hero. Offer back the session onboarding just offered:
        //    eight minutes, four movements, no equipment. It goes through `questAction` like every
        //    other case, so the card names the quest, shows its art and its minutes instead of the
        //    empty band a hero met here before, one screen after agreeing to do exactly this.
        const templates = await listQuestTemplates();
        const onRamp = templates.find((tpl) => tpl.enTitle === FIRST_QUEST_TITLE);
        if (onRamp && !isCancelled()) {
          // The onboarding step's own title, not a second copy of it: the hero met these words
          // one screen ago, and the offer is the same offer.
          const action = await questAction(
            onRamp.id,
            t("onboarding.first_session_title"),
            t("home.kicker_day_one", "Day one"),
          );
          if (action && !isCancelled()) {
            setConfig(action);
            setIsLoading(false);
            return;
          }
        }

        // 5. The seed is gone, or it would not load. The gallery is still an honest answer.
        if (!isCancelled()) {
          setConfig({
            label: t("home.pick_quest_label", "Pick a quest"),
            subtext: t("home.quick_workout", "Quick Workout"),
            variant: "gallery",
            scene: null,
            startQuestId: null,
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
