import { Target } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/src/components/common/AppButton";
import { Card } from "@/src/components/common/Card";
import {
  getBalanceRecommendation,
  getMuscleBalance,
  getSuggestedQuestsForWeakAreas,
  type MuscleBalance,
  type SuggestedQuest,
} from "@/src/db/muscleBalance";
import { useSettingsStore } from "@/src/stores/settings";

export function CoachSuggestionCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useSettingsStore();
  const [balance, setBalance] = useState<MuscleBalance | null>(null);
  const [suggestedQuests, setSuggestedQuests] = useState<SuggestedQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [balanceData, quests] = await Promise.all([
        getMuscleBalance("30d"),
        getSuggestedQuestsForWeakAreas(2),
      ]);
      setBalance(balanceData);
      setSuggestedQuests(quests);
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // Error already handled
    });
  }, [loadData]);

  // Don't show if loading, no data, or already balanced
  if (isLoading || !balance || balance.totalVolume === 0) {
    return null;
  }

  const recommendation = getBalanceRecommendation(balance);

  // If balanced, don't show the card
  if (recommendation.status === "balanced") {
    return null;
  }

  const message = language === "fr" ? recommendation.message.fr : recommendation.message.en;

  return (
    <Card bg="$pastelBlue" width="100%" maxW={420}>
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <Target size={20} color="$color" />
          <Text fontWeight="900" fontSize={16} color="$color">
            {t("coach.suggestion_title", "Coach Suggestion")}
          </Text>
        </XStack>

        <Text color="$color" fontSize={14} opacity={0.85}>
          {message}
        </Text>

        {suggestedQuests.length > 0 && (
          <YStack gap="$2">
            <Text fontWeight="700" fontSize={12} color="$color" opacity={0.7}>
              {t("coach.try_these_quests", "Try these quests:")}
            </Text>
            {suggestedQuests.map((quest) => {
              const title = language === "fr" ? quest.frTitle : quest.enTitle;
              return (
                <AppButton
                  key={quest.id}
                  variant="secondary"
                  size="$3"
                  onPress={() => router.push(`/(modals)/quest-details/${quest.id}` as never)}
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
