import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack } from "tamagui";
import { useSessionStore } from "@/src/stores/session";

export default function RestScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(30); // Default 30s rest

  const { nextExercise } = useSessionStore();

  const handleContinue = () => {
    router.replace("/session/exercise");
  };

  const handleSkipRest = () => {
    router.replace("/session/exercise");
  };

  useEffect(() => {
    if (timeLeft === 0) {
      handleContinue();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleContinue]);

  return (
    <YStack flex={1} bg="$bgDark" justifyContent="center" alignItems="center" padding="$6">
      <Text fontSize={24} color="$textSecondary" marginBottom="$4">
        {t("session.rest")}
      </Text>

      <Text fontSize={100} fontWeight="bold" color="$primary" marginBottom="$2">
        {timeLeft}
      </Text>

      <Text fontSize={16} color="$textSecondary" marginBottom="$8">
        {t("session.seconds")}
      </Text>

      {nextExercise && (
        <YStack bg="$glassBg" padding="$4" borderRadius="$4" marginBottom="$6" width="100%">
          <Text fontSize={14} color="$textSecondary" marginBottom="$2">
            {t("session.next_up")}
          </Text>
          <Text fontSize={20} fontWeight="600" color="$text">
            {nextExercise.enName}
          </Text>
        </YStack>
      )}

      <Button
        size="$4"
        variant="outlined"
        borderColor="$borderStrong"
        color="$textSecondary"
        onPress={handleSkipRest}
      >
        {t("session.skip_rest")}
      </Button>
    </YStack>
  );
}
