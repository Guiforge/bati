import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDurationEstimate } from "@/db/estimate";
import { decideHomeOffer, type HomeOffer } from "@/db/homeOffer";
import { getReminderDays, WEEKDAYS, type Weekday } from "@/db/reminders";
import { useReloadOnChange } from "@/hooks/useReloadOnChange";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";
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

type Router = ReturnType<typeof useRouter>;

type QuestHomeOffer = Exclude<HomeOffer, { kind: "adventure" } | { kind: "gallery" }>;

/** Why this quest, in one line under the stage. */
function questSubtext(offer: QuestHomeOffer, t: TFunction): string {
  switch (offer.kind) {
    // A full sentence, not the compact "Étape 2/5 · Rowing inversé" the ladder uses elsewhere:
    // on the exercise screen the ladder is drawn right there to explain itself, and here it is
    // not. Home is where the hero meets it cold.
    case "oath_exercise":
      return offer.rung
        ? t("home.oath_focus_chain", {
            goal: offer.goal,
            position: offer.rung.position,
            total: offer.rung.total,
            name: offer.rung.name,
          })
        : t("home.oath_focus_simple", { goal: offer.goal });
    case "oath_leagues":
      return t("home.oath_focus_simple", {
        goal: t("oath.metric_leagues", { count: offer.target }),
      });
    case "weak_muscles":
      return t("home.focus_on", {
        muscles: offer.muscles,
        defaultValue: `Focus: ${offer.muscles}`,
      });
    // The onboarding step's own title, not a second copy of it: the hero met these words one
    // screen ago, and the offer is the same offer.
    case "first_day":
      return t("onboarding.first_session_title");
  }
}

/**
 * The stage for an offer: a quest turned into the one thing on Home, the scene announcing it and
 * the button starting it, or an adventure to walk back into.
 *
 * This hook never starts anything itself: it says which quest, `useStartQuest` runs it, and
 * `onPress` opens it for the hero who wants to look. What to offer is `decideHomeOffer`'s, which
 * the reminders read too.
 */
function stageFor(
  offer: HomeOffer,
  t: TFunction,
  language: AppLanguage,
  router: Router,
  yourDay: boolean,
): SmartActionConfig {
  if (offer.kind === "adventure") {
    return {
      label: t("home.continue_adventure_label", "Continue Adventure"),
      subtext: t("home.step_progress", {
        current: offer.step,
        total: offer.total,
        defaultValue: `Step ${offer.step} of ${offer.total}`,
      }),
      variant: "adventure",
      // The step's own screen starts it: it has a narrative to tell first.
      startQuestId: null,
      onPress: () => router.push(`/adventures/${offer.adventureId}` as never),
      scene: {
        title: offer.title ?? t("home.resume_journey", "Resume your journey"),
        imagePath: offer.imagePath,
        progress: { done: offer.done, total: offer.total },
        kicker: t("home.kicker_adventure", "Adventure"),
      },
    };
  }

  if (offer.kind === "gallery") {
    return {
      label: t("home.pick_quest_label", "Pick a quest"),
      subtext: t("home.quick_workout", "Quick Workout"),
      variant: "gallery",
      scene: null,
      startQuestId: null,
      onPress: () => router.push("/(tabs)/quests" as never),
    };
  }

  const { quest, startable, seconds } = offer;
  const subtext = questSubtext(offer, t);

  return {
    // "Start" when the tap starts, "See the quest" when it only opens the screen that does:
    // one verb per button, and the verb says what the tap does.
    label: startable ? t("home.start", "Start") : t("home.see_quest", "See the quest"),
    subtext,
    variant: "quest",
    startQuestId: startable ? quest.id : null,
    scene: {
      title: localizedTitle(quest, language),
      imagePath: quest.imagePath,
      // "Your day" on one of the days the hero chose for their reminder, and only where the scene
      // has no reason of its own to say: the adventure and day one keep theirs.
      kicker:
        offer.kind === "first_day"
          ? t("home.kicker_day_one", "Day one")
          : yourDay
            ? t("home.kicker_your_day")
            : undefined,
      meta: [
        t("quests.exercises", {
          count: quest.exercises.length,
          defaultValue: `${quest.exercises.length} exercises`,
        }),
        quest.archetype ? t(`quests.archetype_${quest.archetype}`) : null,
        t("quests.estimate", {
          duration: formatDurationEstimate(seconds, language),
          defaultValue: `≈ ${formatDurationEstimate(seconds, language)}`,
        }),
      ]
        .filter(Boolean)
        .join(" · "),
    },
    onPress: () => router.push(`/quests/${quest.id}` as never, { withAnchor: true }),
  };
}

/**
 * Tonight's scene, or null when the read was abandoned.
 *
 * Outside the hook on purpose: the React Compiler cannot lower a `try` that holds `?.`, `??` or a
 * `finally`, and it used to skip the whole hook over this one. The caller owns the error path.
 */
async function decideAction(
  t: TFunction,
  language: AppLanguage,
  router: Router,
  isCancelled: () => boolean,
): Promise<SmartActionConfig | null> {
  const [offer, days] = await Promise.all([
    decideHomeOffer(language, isCancelled),
    getReminderDays(),
  ]);
  const yourDay = days[WEEKDAYS[new Date().getDay()] as Weekday] !== undefined;
  return offer && !isCancelled() ? stageFor(offer, t, language, router, yourDay) : null;
}

export function useSmartAction() {
  const router = useRouter();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [config, setConfig] = useState<SmartActionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const determineAction = useCallback(
    (isCancelled: () => boolean) =>
      decideAction(t, language, router, isCancelled)
        .then((next) => {
          if (next && !isCancelled()) setConfig(next);
        })
        // A failure keeps the stage's default config; `useReloadOnChange` reports it and tries
        // again on the next focus.
        .finally(() => {
          if (!isCancelled()) setIsLoading(false);
        }),
    [router, t, language],
  );

  // Reload on focus: coming back from a finished session must not leave a stale step count.
  // Only when something was written since, see `useReloadOnChange`.
  useReloadOnChange("home.smartAction", determineAction);

  return { config, isLoading };
}
