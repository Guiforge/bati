import { TrendingDown, TrendingUp } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { H3, Paragraph, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { getRecentSessionHistory } from "@/db/completed";
import {
  analyzeDifficultyProgression,
  type ProgressionRecommendation,
} from "@/db/difficultySuggestion";

export function DifficultyProgressionCard() {
  const { t } = useTranslation();
  const [recommendation, setRecommendation] = useState<ProgressionRecommendation | null>(null);

  useEffect(() => {
    getRecentSessionHistory(10).then((sessions) => {
      setRecommendation(analyzeDifficultyProgression(sessions));
    });
  }, []);

  if (!recommendation || recommendation.action === "maintain") return null;

  const isIncrease = recommendation.action === "increase";
  const Icon = isIncrease ? TrendingUp : TrendingDown;
  const color = isIncrease ? "$success" : "$primary";
  const bgColor = isIncrease ? "$pastelGreen" : "$pastelOrange";
  const borderColor = isIncrease ? "$success" : "$primary";

  return (
    <Card bg={bgColor} borderColor={borderColor} borderWidth={1} p="$4">
      <YStack gap="$2">
        <XStack items="center" gap="$2">
          <Icon size={20} color={color} />
          <H3 fontSize={16} color={color}>
            {t("progression.title", "Coach Suggestion")}
          </H3>
        </XStack>

        <YStack>
          <Paragraph fontWeight="700" fontSize={16} color="$color">
            {isIncrease
              ? t("progression.increase_title", "Level Up Available!")
              : t("progression.decrease_title", "Recovery Recommended")}
          </Paragraph>
          <Paragraph fontSize={14} opacity={0.8} color="$color">
            {isIncrease
              ? t(
                  "progression.increase_message",
                  "You've been crushing it lately. Try increasing the difficulty for better rewards!",
                )
              : t(
                  "progression.decrease_message",
                  "It seems tough lately. Lowering difficulty can help you maintain consistency.",
                )}
          </Paragraph>
        </YStack>
      </YStack>
    </Card>
  );
}
