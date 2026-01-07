import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack } from "tamagui";
import { useSessionStore } from "@/src/stores/session";

export default function CountdownScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(5);
  const finishCountdown = useSessionStore((state) => state.finishCountdown);
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    // If session wasn't started or already finished, redirect home
    if (status === "idle") {
      router.replace("/(tabs)");
      return;
    }

    if (countdown === 0) {
      // Finish countdown and navigate to exercise screen
      finishCountdown();
      router.replace("/session/exercise");
      return;
    }

    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, status, finishCountdown]);

  const handleSkip = () => {
    finishCountdown();
    router.replace("/session/exercise");
  };

  return (
    <YStack flex={1} bg="$bgDark" justifyContent="center" alignItems="center" padding="$6">
      <Text fontSize={24} color="$textSecondary" marginBottom="$4">
        {t("session.get_ready")}
      </Text>

      <Text fontSize={120} fontWeight="bold" color={countdown === 0 ? "$primary" : "$text"}>
        {countdown === 0 ? "GO!" : countdown}
      </Text>

      <Button
        size="$4"
        variant="outlined"
        marginTop="$8"
        onPress={handleSkip}
        borderColor="$borderStrong"
        color="$textSecondary"
      >
        {t("session.skip_countdown")}
      </Button>
    </YStack>
  );
}
