import { Calendar } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Text, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
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
        <AppButton icon={Calendar} onPress={() => router.back()} variant="secondary">
          {t("common.back", "Back")}
        </AppButton>
        <H2 color="$text">{t("scheduling.title", "Weekly Schedule")}</H2>

        {suggestion?.shouldRest && (
          <Card bg="$surface" p="$4">
            <YStack gap="$2">
              <Text fontWeight="900" fontSize={18} color="$text">
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
