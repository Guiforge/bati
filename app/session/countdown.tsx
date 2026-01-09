import { Redirect, useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button, YStack } from "tamagui";
import { CountdownView } from "@/src/components/session/CountdownView";
import { PausedOverlay } from "@/src/components/session/PausedOverlay";
import { useSessionStore } from "@/src/stores/session";

/**
 * Countdown Screen - Get Ready for Action
 *
 * Goal: Get the user into physical position before exercise begins.
 * - Massive, pulsing number
 * - Audio/haptic feedback on each second
 * - Hands-free interface (no interaction needed)
 */
export default function CountdownScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const status = useSessionStore((s) => s.status);
  const quest = useSessionStore((s) => s.quest);
  const finishCountdown = useSessionStore((s) => s.finishCountdown);

  useEffect(() => {
    if (status === "running") {
      router.replace("/session/exercise");
    }
  }, [router, status]);

  // Redirect if no active session
  if (status === "idle" || !quest) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <YStack flex={1} bg="$bgDarker">
      <CountdownView />
      <YStack px="$5" pb="$8" gap="$2">
        <Button
          size="$4"
          variant="outlined"
          onPress={finishCountdown}
          borderColor="$borderStrong"
          color="$textSecondary"
        >
          {t("session.skip_countdown")}
        </Button>
      </YStack>
      <PausedOverlay />
    </YStack>
  );
}
