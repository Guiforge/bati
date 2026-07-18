import { ChevronLeft } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Text, XStack, YStack } from "tamagui";

import { AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { WeeklyCalendar } from "@/components/scheduling/WeeklyCalendar";
import { getRestSuggestion, type RestSuggestion } from "@/db/restSuggestions";

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [suggestion, setSuggestion] = useState<RestSuggestion | null>(null);

  useEffect(() => {
    getRestSuggestion().then(setSuggestion);
  }, []);

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <YStack px="$4" py="$4" gap="$4">
        <XStack items="center" gap="$3">
          <AppIconButton
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("quests.go_back", "Go back")}
          >
            <ChevronLeft size={22} color="$text" strokeWidth={2.5} />
          </AppIconButton>
          <H2 color="$text">{t("scheduling.title", "Weekly Schedule")}</H2>
        </XStack>

        {suggestion?.shouldRest && (
          <Card bg="$surface" p="$4">
            <YStack gap="$2">
              <Text fontWeight="700" fontSize={18} color="$text">
                🛌 {t("coach.rest_suggestion_title", "Coach says: Rest!")}
              </Text>
              <Text color="$textSecondary" fontSize={14}>
                {suggestion.message}
              </Text>
            </YStack>
          </Card>
        )}

        <WeeklyCalendar />
      </YStack>
    </YStack>
  );
}
