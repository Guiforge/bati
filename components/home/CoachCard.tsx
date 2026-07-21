import { Moon, Target } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import {
  getBalanceRecommendation,
  getMuscleBalance,
  getSuggestedQuestsForWeakAreas,
  type SuggestedQuest,
} from "@/db/muscleBalance";
import { getRestSuggestion } from "@/db/restSuggestions";
import { useSettingsStore } from "@/stores/settings";

type CoachState =
  | { rule: "rest"; messageKey: string; count: number }
  | { rule: "weak_area"; message: string; quests: SuggestedQuest[] }
  | { rule: "weekly_goal"; completed: number; goal: number }
  | null;

/**
 * Priority order: rest (safety) > weak-area nudge > weekly-goal progress.
 * Showing all three at once turns this into a dashboard; one clear message
 * at a time keeps it a nudge, not a report.
 */
export function CoachCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, weeklyGoal } = useSettingsStore();
  const [state, setState] = useState<CoachState>(null);
  const [isLoading, setIsLoading] = useState(true);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Priority waterfall over 3 rules, same shape as useSmartAction/getRestSuggestion
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const rest = await getRestSuggestion();
      if (rest.shouldRest) {
        setState({
          rule: "rest",
          messageKey: `journal.${rest.message}`,
          count: rest.reason === "consecutive_days" ? rest.daysInARow : rest.recentSessionCount,
        });
        return;
      }

      const balance = await getMuscleBalance("30d");
      if (balance.totalVolume > 0) {
        const recommendation = getBalanceRecommendation(balance);
        if (recommendation.status !== "balanced") {
          const quests = await getSuggestedQuestsForWeakAreas(2);
          setState({
            rule: "weak_area",
            message: language === "fr" ? recommendation.message.fr : recommendation.message.en,
            quests,
          });
          return;
        }
      }

      setState({ rule: "weekly_goal", completed: rest.recentSessionCount, goal: weeklyGoal });
    } catch {
      setState(null);
    } finally {
      setIsLoading(false);
    }
  }, [language, weeklyGoal]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        // Error already handled
      });
    }, [load]),
  );

  if (isLoading || !state) {
    return null;
  }

  if (state.rule === "rest") {
    return (
      <Card bg="$pastelBlue" width="100%">
        <YStack gap="$2">
          <XStack items="center" gap="$2">
            <Moon size={20} color="$text" />
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("coach.rest_suggestion_title", "Coach says: Rest!")}
            </Text>
          </XStack>
          <Text color="$text" fontSize={14} opacity={0.85}>
            {t(state.messageKey, { count: state.count })}
          </Text>
        </YStack>
      </Card>
    );
  }

  if (state.rule === "weak_area") {
    return (
      <Card bg="$pastelBlue" width="100%">
        <YStack gap="$3">
          <XStack items="center" gap="$2">
            <Target size={20} color="$text" />
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("coach.suggestion_title", "Coach Suggestion")}
            </Text>
          </XStack>
          <Text color="$text" fontSize={14} opacity={0.85}>
            {state.message}
          </Text>
          {state.quests.length > 0 && (
            <YStack gap="$2">
              {state.quests.map((quest) => {
                const title = language === "fr" ? quest.frTitle : quest.enTitle;
                return (
                  <AppButton
                    key={quest.id}
                    variant="secondary"
                    size="$3"
                    onPress={() => router.push(`/quests/${quest.id}` as never)}
                  >
                    {title}
                  </AppButton>
                );
              })}
            </YStack>
          )}
        </YStack>
      </Card>
    );
  }

  return (
    <Card bg="$pastelBlue" width="100%">
      <XStack items="center" justify="space-between">
        <XStack items="center" gap="$2">
          <Target size={20} color="$text" />
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("coach.weekly_goal_title", "This week")}
          </Text>
        </XStack>
        <Text fontWeight="700" fontSize={16} color="$text">
          {t("coach.weekly_goal_progress", {
            completed: state.completed,
            goal: state.goal,
            defaultValue: `${state.completed}/${state.goal} sessions`,
          })}
        </Text>
      </XStack>
    </Card>
  );
}
