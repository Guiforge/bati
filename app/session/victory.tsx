import { useRouter } from "expo-router";
import { YStack, XStack, Text, Button } from "tamagui";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/stores/session";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";

export default function VictoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const {
    sessionSummary,
    clearSession
  } = useSessionStore();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleContinue = () => {
    clearSession();
    router.replace("/(tabs)");
  };

  if (!sessionSummary) {
    router.replace("/(tabs)");
    return null;
  }

  return (
    <YStack flex={1} bg="$bgDark" padding="$6" justifyContent="center" alignItems="center">
      <Text fontSize={48} fontWeight="bold" color="$primary" marginBottom="$4" textAlign="center">
        🎉 {t("session.victory_title")}
      </Text>

      <Text fontSize={18} color="$textSecondary" marginBottom="$8" textAlign="center">
        {t("session.victory_subtitle")}
      </Text>

      {/* Stats Cards */}
      <YStack width="100%" gap="$3" marginBottom="$8">
        <XStack gap="$3">
          <YStack flex={1} bg="$glassBg" padding="$4" borderRadius="$4" borderWidth={1} borderColor="$glassBorder" alignItems="center">
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("session.xp_earned")}
            </Text>
            <Text fontSize={32} fontWeight="bold" color="$primary">
              {sessionSummary.xpEarned || 0}
            </Text>
          </YStack>

          <YStack flex={1} bg="$glassBg" padding="$4" borderRadius="$4" borderWidth={1} borderColor="$glassBorder" alignItems="center">
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("session.exercises")}
            </Text>
            <Text fontSize={32} fontWeight="bold" color="$text">
              {sessionSummary.exercisesCompleted || 0}
            </Text>
          </YStack>
        </XStack>

        <YStack bg="$glassBg" padding="$4" borderRadius="$4" borderWidth={1} borderColor="$glassBorder" alignItems="center">
          <Text fontSize={14} color="$textSecondary" marginBottom="$2">
            {t("session.time_taken")}
          </Text>
          <Text fontSize={28} fontWeight="600" color="$text">
            {sessionSummary.duration ? `${Math.floor(sessionSummary.duration / 60)}:${(sessionSummary.duration % 60).toString().padStart(2, '0')}` : "0:00"}
          </Text>
        </YStack>
      </YStack>

      {/* Actions */}
      <YStack width="100%" gap="$3">
        <Button
          size="$5"
          bg="$primary"
          color="$text"
          onPress={handleContinue}
          pressStyle={{ opacity: 0.8 }}
        >
          {t("session.view_village")}
        </Button>

        <Button
          size="$4"
          variant="outlined"
          borderColor="$borderStrong"
          color="$textSecondary"
          onPress={handleContinue}
        >
          {t("common.done")}
        </Button>
      </YStack>
    </YStack>
  );
}
