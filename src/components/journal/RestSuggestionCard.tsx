import { Moon } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/src/components/common/Card";
import { getRestSuggestion, type RestSuggestion } from "@/src/db/restSuggestions";

export function RestSuggestionCard() {
  const { t } = useTranslation();
  const [suggestion, setSuggestion] = useState<RestSuggestion | null>(null);

  useEffect(() => {
    getRestSuggestion().then(setSuggestion);
  }, []);

  if (!suggestion || !suggestion.shouldRest) {
    return null;
  }

  const getMessage = () => {
    switch (suggestion.reason) {
      case "high_volume":
        return t("journal.rest_suggestion_high_volume", { count: suggestion.recentSessionCount });
      case "consecutive_days":
        return t("journal.rest_suggestion_consecutive", { count: suggestion.daysInARow });
      case "overtraining":
        return t("journal.rest_suggestion_overtraining", { count: suggestion.recentSessionCount });
      default:
        return "";
    }
  };

  return (
    <Card bg="$glassBg" p="$4">
      <YStack gap="$2">
        <XStack items="center" gap="$2">
          <Moon size={24} color="$text" />
          <Text fontWeight="bold" fontSize={18} color="$text">
            {t("journal.rest_suggestion_title")}
          </Text>
        </XStack>
        <Paragraph color="$text" fontSize="$3" opacity={0.85}>
          {getMessage()}
        </Paragraph>
      </YStack>
    </Card>
  );
}
