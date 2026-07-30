import { Target } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ColorTokens, Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import {
  getBalanceRecommendation,
  getMuscleBalance,
  getPatternBalance,
  getPullDeficit,
  type MuscleBalance,
  type PatternBalance,
} from "@/db/muscleBalance";
import { useSettingsStore } from "@/stores/settings";

const MUSCLE_COLORS: Record<string, ColorTokens> = {
  arms: "$pastelPink",
  back: "$pastelBlue",
  chest: "$pastelYellow",
  abs: "$pastelGreen",
  shoulder: "$pastelPurple",
  legs: "$pastelOrange",
};

export function MuscleBalanceCard() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [balance, setBalance] = useState<MuscleBalance | null>(null);
  const [patterns, setPatterns] = useState<PatternBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Two views of the same 30 days: muscles say *what* was worked, patterns say what the
        // body was *doing*, and only the second can see a pull deficit.
        const [muscles, byPattern] = await Promise.all([
          getMuscleBalance("30d"),
          getPatternBalance("30d"),
        ]);
        setBalance(muscles);
        setPatterns(byPattern);
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false);
      }
    }
    load().catch(() => {
      // Error already handled
    });
  }, []);

  if (isLoading) {
    return (
      <Card bg="$bgLight">
        <Text color="$text" opacity={0.6}>
          {t("common.loading")}
        </Text>
      </Card>
    );
  }

  if (!balance || balance.totalVolume === 0) {
    return (
      <Card bg="$bgLight">
        <YStack gap="$2">
          <XStack items="center" gap="$2">
            <Target size={18} color="$text" />
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("journal.muscle_balance")}
            </Text>
          </XStack>
          <Text color="$text" opacity={0.6} fontSize={13}>
            {t("chart.complete_more")}
          </Text>
        </YStack>
      </Card>
    );
  }

  const recommendation = getBalanceRecommendation(balance);
  const maxVolume = Math.max(...balance.muscles.map((m) => m.volume));
  const pullDeficit = patterns ? getPullDeficit(patterns) : null;

  return (
    <Card bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Target size={18} color="$text" />
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("journal.muscle_balance")}
            </Text>
          </XStack>
          <Text
            fontSize={12}
            fontWeight="700"
            color={recommendation.status === "balanced" ? "$success" : "$primary"}
          >
            {recommendation.status === "balanced"
              ? t("journal.balance_good")
              : t("journal.balance_needs_work")}
          </Text>
        </XStack>

        <YStack gap="$2">
          {balance.muscles.map((m) => {
            const percentage = maxVolume > 0 ? (m.volume / maxVolume) * 100 : 0;
            const isWeak = balance.weakAreas.includes(m.muscle);
            const label = language === "fr" ? m.label.fr : m.label.en;

            return (
              <XStack key={m.muscle} items="center" gap="$2">
                <Text
                  fontSize={12}
                  color={isWeak ? "$primary" : "$text"}
                  fontWeight={isWeak ? "700" : "400"}
                  width={70}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <YStack flex={1}>
                  <Progress size="$2" value={percentage} bg="$background" rounded="$2">
                    <Progress.Indicator
                      bg={isWeak ? "$primary" : (MUSCLE_COLORS[m.muscle] ?? "$secondary")}
                    />
                  </Progress>
                </YStack>
                <Text fontSize={11} color="$text" opacity={0.6} width={35}>
                  {Math.round(m.percentage)}%
                </Text>
              </XStack>
            );
          })}
        </YStack>

        {recommendation.status === "needs_attention" && (
          <Text fontSize={12} color="$text" opacity={0.7}>
            {language === "fr" ? recommendation.message.fr : recommendation.message.en}
          </Text>
        )}

        {/* The muscle bars above cannot show this: a row and a push-up both count as "arms".
            Pulling is the first thing to vanish when you train without a bar. */}
        {pullDeficit ? (
          <YStack gap="$1" borderTopWidth={1} borderColor="$borderStrong" pt="$2">
            <Text fontSize={12} fontWeight="700" color="$primary">
              {t("journal.pull_deficit_title")}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.7}>
              {t("journal.pull_deficit_body", {
                pull: Math.round(pullDeficit.pullVolume),
                push: Math.round(pullDeficit.pushVolume),
              })}
            </Text>
          </YStack>
        ) : null}
      </YStack>
    </Card>
  );
}
