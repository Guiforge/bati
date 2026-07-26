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
  | null;

/**
 * Purely reactive nudge: rest (safety) > weak-area. The chosen objective lives
 * in the Oath card, so the coach no longer echoes a weekly-goal count here —
 * one objective surface, not two competing ones. Renders nothing when neither
 * rule fires, keeping it a nudge, not a report.
 */
export function CoachCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useSettingsStore();
  const [state, setState] = useState<CoachState>(null);
  const [isLoading, setIsLoading] = useState(true);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Priority waterfall (rest > weak-area) with try/catch, same shape as getRestSuggestion
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

      // Nothing to nudge — the coach stays silent, the Oath card carries the objective.
      setState(null);
    } catch {
      setState(null);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

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

  return null;
}
