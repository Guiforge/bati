import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { useHaptics } from "@/hooks/useHaptics";
import { useSessionStore } from "@/stores/session";

export function PausedOverlay() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mediumImpact, warning } = useHaptics();
  const status = useSessionStore((s) => s.status);
  const prePauseStatus = useSessionStore((s) => s.prePauseStatus);
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const restartRound = useSessionStore((s) => s.restartRound);
  const quitSession = useSessionStore((s) => s.quitSession);

  if (status !== "paused") return null;

  // No round has begun before the first exercise, and restartRound() would jump straight to
  // "running" — skipping the rest of the warm-up and the 3-2-1 countdown with it.
  const canRestartRound = prePauseStatus !== "warmup" && prePauseStatus !== "countdown";

  const handleResume = () => {
    mediumImpact();
    resumeSession();
  };

  const handleRestartRound = () => {
    mediumImpact();
    restartRound();
  };

  const confirmQuit = () => {
    quitSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleQuit = () => {
    warning();
    // Quitting wipes the session and its saved recovery slot; one mis-tap on a button that
    // sits right under "restart round" must not cost the workout.
    Alert.alert(
      t("session.quit_confirm_title", "Abandon this session?"),
      t("session.quit_confirm_body", "This session's progress will be lost."),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        { text: t("session.quit_button"), style: "destructive", onPress: confirmQuit },
      ],
    );
  };

  return (
    <YStack
      fullscreen
      bg="$bgOverlay"
      style={{ zIndex: 1000 }}
      items="center"
      justify="center"
      gap="$6"
      p="$6"
    >
      <Card width="100%" maxW={360} bg="$surface">
        <YStack gap="$3" items="center">
          <Text fontWeight="700" fontSize={28} color="$text" style={{ textAlign: "center" }}>
            {t("session.paused_title")}
          </Text>
          <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
            {t("session.paused_subtitle")}
          </Paragraph>

          <YStack width="100%" gap="$3" pt="$2">
            <AppButton
              testID="session-resume"
              onPress={handleResume}
              variant="primary"
              accessibilityLabel={t("session.resume_button")}
              accessibilityRole="button"
            >
              {t("session.resume_button")}
            </AppButton>

            {canRestartRound ? (
              <AppButton
                testID="session-restart-round"
                onPress={handleRestartRound}
                variant="outline"
                backgroundColor="$surface2"
                pressStyle={{ opacity: 0.9 }}
                accessibilityLabel={t("session.restart_round_button")}
                accessibilityRole="button"
              >
                {t("session.restart_round_button")}
              </AppButton>
            ) : null}

            <AppButton
              testID="session-quit"
              onPress={handleQuit}
              variant="outline"
              backgroundColor="$surface2"
              pressStyle={{ opacity: 0.9 }}
              accessibilityLabel={t("session.quit_button")}
              accessibilityRole="button"
            >
              {t("session.quit_button")}
            </AppButton>
          </YStack>
        </YStack>
      </Card>
    </YStack>
  );
}
